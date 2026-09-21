#!/usr/bin/env python3
"""Local static server + Supabase HTTPS proxy.

This is only for LAN demos. A live site should be hosted on HTTPS and talk
to Supabase directly — no Python process, no private Wi-Fi IPs.
"""
from __future__ import annotations

import gzip
import http.client
import http.server
import json
import os
import socket
import ssl
import sys
import threading
import time
import urllib.parse
import urllib.request
import zlib

ROOT = os.path.dirname(os.path.abspath(__file__))
HOST = "akyxczonuvmorbatcfvs.supabase.co"
PREFIX = "/__sb"
HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
    "accept-encoding",
}
SKIP_RESP = HOP | {
    "date",
    "server",
    "set-cookie",
    "alt-svc",
    "content-encoding",
    "strict-transport-security",
}

_cached_ip = None
_dns_lock = threading.Lock()


def resolve(host: str) -> str:
    global _cached_ip
    with _dns_lock:
        if _cached_ip:
            return _cached_ip
        try:
            _cached_ip = socket.getaddrinfo(host, 443, socket.AF_INET)[0][4][0]
            return _cached_ip
        except OSError:
            pass
        req = urllib.request.Request(
            "https://1.1.1.1/dns-query?name=%s&type=A" % urllib.parse.quote(host),
            headers={"Accept": "application/dns-json"},
        )
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, timeout=8, context=ctx) as res:
            data = json.loads(res.read().decode())
        for ans in data.get("Answer") or []:
            if ans.get("type") == 1 and ans.get("data"):
                _cached_ip = str(ans["data"])
                return _cached_ip
        raise OSError("could not resolve " + host)


def forget_dns():
    global _cached_ip
    with _dns_lock:
        _cached_ip = None


def upstream():
    ip = resolve(HOST)
    sock = socket.create_connection((ip, 443), timeout=20)
    ctx = ssl.create_default_context()
    ssock = ctx.wrap_socket(sock, server_hostname=HOST)
    conn = http.client.HTTPSConnection(HOST, timeout=20)
    conn.sock = ssock
    return conn


def sanitize_dest(dest: str) -> str:
    parts = urllib.parse.urlsplit(dest)
    kept = [
        (key, value)
        for key, value in urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
        if key.lower() not in ("redirect_to", "email_redirect_to")
    ]
    return urllib.parse.urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(kept), parts.fragment)
    )


def sanitize_body(body, content_type: str):
    if not body:
        return body
    if "json" not in (content_type or "").lower():
        return body
    try:
        data = json.loads(body.decode("utf-8"))
    except Exception:
        return body
    if not isinstance(data, dict):
        return body
    for key in list(data.keys()):
        if key.lower() in ("redirect_to", "email_redirect_to"):
            data.pop(key, None)
    return json.dumps(data).encode("utf-8")


def decode_payload(encoding: str, payload: bytes) -> bytes:
    if not payload:
        return payload
    enc = (encoding or "").lower()
    if "gzip" in enc or payload[:2] == b"\x1f\x8b":
        try:
            payload = gzip.decompress(payload)
        except Exception:
            pass
    elif "deflate" in enc:
        try:
            payload = zlib.decompress(payload)
        except Exception:
            try:
                payload = zlib.decompress(payload, -zlib.MAX_WBITS)
            except Exception:
                pass
    if payload.startswith(b"\xef\xbb\xbf"):
        payload = payload[3:]
    return payload


def lan_ips():
    found = []
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe.connect(("1.1.1.1", 80))
        ip = probe.getsockname()[0]
        probe.close()
        if ip and not ip.startswith("127."):
            found.append(ip)
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip.startswith("127.") or ip in found:
                continue
            found.append(ip)
    except OSError:
        pass
    return found


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def guess_type(self, path):
        ctype = super().guess_type(path)
        if ctype == "text/html":
            return "text/html; charset=utf-8"
        return ctype

    def do_OPTIONS(self):
        if self.path.startswith(PREFIX):
            self.proxy()
            return
        self.send_response(204)
        self.send_header("Allow", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith(PREFIX):
            self.proxy()
            return
        super().do_GET()

    def do_HEAD(self):
        if self.path.startswith(PREFIX):
            self.proxy()
            return
        super().do_HEAD()

    def do_POST(self):
        self.proxy() if self.path.startswith(PREFIX) else self.send_error(404)

    def do_PUT(self):
        self.proxy() if self.path.startswith(PREFIX) else self.send_error(404)

    def do_PATCH(self):
        self.proxy() if self.path.startswith(PREFIX) else self.send_error(404)

    def do_DELETE(self):
        self.proxy() if self.path.startswith(PREFIX) else self.send_error(404)

    def proxy(self):
        dest = sanitize_dest(self.path[len(PREFIX) :] or "/")
        if not dest.startswith("/"):
            dest = "/" + dest
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        body = sanitize_body(body, self.headers.get("Content-Type") or "")
        headers = {}
        for key, value in self.headers.items():
            if key.lower() in HOP:
                continue
            headers[key] = value
        headers["Host"] = HOST
        headers["Accept-Encoding"] = "identity"
        try:
            conn = upstream()
            conn.request(self.command, dest, body=body, headers=headers)
            res = conn.getresponse()
            encoding = res.getheader("Content-Encoding") or ""
            payload = decode_payload(encoding, res.read())
            self.send_response(res.status, res.reason)
            for key, value in res.getheaders():
                if key.lower() in SKIP_RESP:
                    continue
                self.send_header(key, value)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(payload)
            conn.close()
        except Exception as exc:
            forget_dns()
            msg = ("Could not reach Bling Berry servers: %s" % exc).encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)


def bind_server(start_port: int):
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    last = None
    for port in range(start_port, start_port + 11):
        try:
            return http.server.ThreadingHTTPServer(("0.0.0.0", port), Handler), port
        except OSError as exc:
            last = exc
    raise last


def print_urls(port, ips):
    print("", flush=True)
    print("Bling Berry local demo (not the live site).", flush=True)
    print("", flush=True)
    print("  On this computer:  http://127.0.0.1:%s" % port, flush=True)
    if ips:
        for ip in ips:
            print("  Friends on this Wi-Fi: http://%s:%s" % (ip, port), flush=True)
    else:
        print("  Friends on this Wi-Fi: http://<this-computer-ip>:%s" % port, flush=True)
    print("", flush=True)
    print("  Use http://  (not https://)", flush=True)
    print("  Keep this window open. Re-run after joining a new Wi-Fi.", flush=True)
    print("  Local signup needs Confirm email OFF in Supabase.", flush=True)
    print("  Live site: host these files on HTTPS. Login goes straight to Supabase.", flush=True)
    print("", flush=True)


def watch_ips(port):
    last = lan_ips()
    while True:
        time.sleep(8)
        current = lan_ips()
        if current != last:
            last = current
            forget_dns()
            print("Wi-Fi address changed.", flush=True)
            print_urls(port, current)


def main():
    start_port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.chdir(ROOT)
    server, port = bind_server(start_port)
    print_urls(port, lan_ips())
    threading.Thread(target=watch_ips, args=(port,), daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped", flush=True)


if __name__ == "__main__":
    main()
