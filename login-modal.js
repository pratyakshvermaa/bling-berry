(function () {
    "use strict";

    if (window.bbInitLoginModal) return;

    var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var CLOSE_MS = REDUCE ? 200 : 480;

    var CSS = [
        ".bb-login{position:fixed;inset:0;z-index:420;display:flex;align-items:center;justify-content:center;padding:22px 16px;pointer-events:none;visibility:hidden}",
        ".bb-login.is-ready{visibility:visible}",
        ".bb-login.is-on{pointer-events:auto}",
        ".bb-login-veil{position:absolute;inset:0;background:rgba(36,20,18,0.34);-webkit-backdrop-filter:blur(18px) saturate(1.2);backdrop-filter:blur(18px) saturate(1.2);opacity:0;transition:opacity 0.5s cubic-bezier(0.23,0.12,0.18,1)}",
        ".bb-login.is-on .bb-login-veil{opacity:1}",
        ".bb-login-card{position:relative;z-index:1;width:min(400px,100%);background:#fffaf9;border:1px solid rgba(228,212,209,0.95);border-radius:22px;padding:1.45rem 1.55rem 1.3rem;box-shadow:0 28px 80px rgba(26,18,18,0.18);opacity:0;transform:translate3d(0,1.15rem,0) scale(0.985);transition:opacity 0.52s cubic-bezier(0.23,0.12,0.18,1),transform 0.52s cubic-bezier(0.23,0.12,0.18,1)}",
        ".bb-login.is-on .bb-login-card{opacity:1;transform:none}",
        ".bb-login-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border:0;border-radius:999px;background:transparent;color:#6b5553;cursor:pointer;display:grid;place-items:center;transition:background 0.28s cubic-bezier(0.45,0.05,0.55,0.95),color 0.28s cubic-bezier(0.45,0.05,0.55,0.95),transform 160ms cubic-bezier(0.23,0.12,0.18,1)}",
        ".bb-login-close:hover{background:#f8f0f0;color:#1a1212}",
        ".bb-login-close:active{transform:scale(0.94)}",
        ".bb-login-close svg{width:14px;height:14px}",
        ".bb-login-logo{display:block;width:52px;height:auto;margin:2px auto 14px}",
        ".bb-login-card h2{font-family:'Playfair Display',Georgia,serif;font-size:1.48rem;font-weight:600;letter-spacing:-0.02em;text-align:center;color:#1a1212;margin:0 0 4px}",
        ".bb-login-card .bb-login-sub{text-align:center;color:#6b5553;font-size:0.82rem;margin:0 0 16px;line-height:1.45}",
        ".bb-login-field{margin-bottom:12px}",
        ".bb-login-field label{display:block;font-size:0.66rem;font-weight:600;letter-spacing:0.13em;text-transform:uppercase;color:#6b5553;margin-bottom:5px}",
        ".bb-login-field input{width:100%;padding:11px 12px;border:1px solid #e4d4d1;border-radius:12px;font:inherit;font-size:0.9rem;background:#f8f0f0;color:#1a1212;transition:border-color 0.4s cubic-bezier(0.45,0.05,0.55,0.95),box-shadow 0.4s cubic-bezier(0.45,0.05,0.55,0.95)}",
        ".bb-login-field input:focus{outline:none;border-color:#c4a484;box-shadow:0 0 0 3px rgba(196,164,132,0.18)}",
        ".bb-login-error{background:rgba(144,40,32,0.08);color:#902820;padding:10px 12px;border-radius:10px;font-size:0.8rem;margin-bottom:12px;display:none}",
        ".bb-login-error.is-on{display:block}",
        ".bb-login-submit{display:block;width:100%;padding:12px;border:0;border-radius:999px;background:#902820;color:#f8f0f0;font:inherit;font-weight:600;font-size:0.9rem;cursor:pointer;transition:background 0.4s cubic-bezier(0.45,0.05,0.55,0.95),transform 180ms cubic-bezier(0.23,0.12,0.18,1)}",
        ".bb-login-submit:hover{background:#721f19}",
        ".bb-login-submit:active{transform:scale(0.985)}",
        ".bb-login-submit:disabled{opacity:0.6;cursor:not-allowed}",
        ".bb-login-or{display:flex;align-items:center;gap:12px;margin:12px 0;color:#6b5553;font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase}",
        ".bb-login-or::before,.bb-login-or::after{content:'';flex:1;height:1px;background:#e4d4d1}",
        ".bb-login-google{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:11px;border:1px solid #e4d4d1;border-radius:999px;background:#fffaf9;color:#1a1212;font:inherit;font-weight:600;font-size:0.88rem;cursor:pointer;transition:border-color 0.4s cubic-bezier(0.45,0.05,0.55,0.95),background 0.4s cubic-bezier(0.45,0.05,0.55,0.95),transform 180ms cubic-bezier(0.23,0.12,0.18,1)}",
        ".bb-login-google:hover{border-color:#c4a484;background:#f8f0f0}",
        ".bb-login-google:active{transform:scale(0.985)}",
        ".bb-login-google svg{width:18px;height:18px;flex-shrink:0}",
        ".bb-login-foot{text-align:center;margin-top:14px;font-size:0.84rem;color:#6b5553}",
        ".bb-login-foot a{color:#902820;text-decoration:none;font-weight:600}",
        ".bb-login-foot a:hover{text-decoration:underline}",
        "html.bb-login-lock,body.bb-login-lock{overflow:hidden}",
        "@media (prefers-reduced-motion:reduce){.bb-login-veil,.bb-login-card{transition:opacity 0.2s ease;transform:none}}",
        "@media (prefers-reduced-transparency:reduce){.bb-login-veil{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(36,20,18,0.62)}}"
    ].join("");

    window.bbInitLoginModal = function (opts) {
        opts = opts || {};
        var prefix = opts.prefix || "";
        if (/(?:^|\/)login\.html$/.test(window.location.pathname.replace(/\\/g, "/"))) return;
        if (document.getElementById("bb-login")) return;

        var style = document.createElement("style");
        style.setAttribute("data-bb-login", "1");
        style.textContent = CSS;
        document.head.appendChild(style);

        var root = document.createElement("div");
        root.id = "bb-login";
        root.className = "bb-login";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-labelledby", "bb-login-title");
        root.setAttribute("aria-hidden", "true");
        root.innerHTML =
            '<div class="bb-login-veil" data-bb-login-close="1"></div>' +
            '<div class="bb-login-card">' +
                '<button class="bb-login-close" type="button" aria-label="Close" data-bb-login-close="1">' +
                    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' +
                "</button>" +
                '<img class="bb-login-logo" src="' + prefix + 'assets/bling-berry-logo.png" alt="">' +
                '<h2 id="bb-login-title">Welcome back</h2>' +
                '<p class="bb-login-sub">Sign in to your Bling Berry account</p>' +
                '<div class="bb-login-error" id="bb-login-error"></div>' +
                '<form id="bb-login-form" autocomplete="on">' +
                    '<div class="bb-login-field">' +
                        '<label for="bb-login-email">Email</label>' +
                        '<input type="email" id="bb-login-email" name="email" required autocomplete="email" placeholder="you@example.com">' +
                    "</div>" +
                    '<div class="bb-login-field">' +
                        '<label for="bb-login-password">Password</label>' +
                        '<input type="password" id="bb-login-password" name="password" required autocomplete="current-password" placeholder="Your password">' +
                    "</div>" +
                    '<button class="bb-login-submit" type="submit" id="bb-login-submit">Sign in</button>' +
                "</form>" +
                '<div class="bb-login-or">or</div>' +
                '<button class="bb-login-google" type="button" id="bb-login-google">' +
                    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>' +
                    "Continue with Google" +
                "</button>" +
                '<p class="bb-login-foot">Don\'t have an account? <a href="' + prefix + 'signup.html">Sign up</a></p>' +
            "</div>";

        document.body.appendChild(root);

        var form = document.getElementById("bb-login-form");
        var errEl = document.getElementById("bb-login-error");
        var btn = document.getElementById("bb-login-submit");
        var emailEl = document.getElementById("bb-login-email");
        var passEl = document.getElementById("bb-login-password");
        var lastFocus = null;
        var closeTimer = 0;
        var open = false;

        function showError(msg) {
            errEl.textContent = msg;
            errEl.classList.add("is-on");
        }

        function closeMobileNav() {
            var nav = document.getElementById("mobile-nav");
            var menuBtn = document.getElementById("menu-btn");
            if (nav) nav.classList.remove("is-open");
            if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
        }

        function setLock(on) {
            document.documentElement.classList.toggle("bb-login-lock", on);
            document.body.classList.toggle("bb-login-lock", on);
        }

        function openLogin() {
            if (open) {
                if (emailEl) emailEl.focus();
                return;
            }
            if (!window.bb) return;
            open = true;
            closeMobileNav();
            window.clearTimeout(closeTimer);
            lastFocus = document.activeElement;
            root.classList.add("is-ready");
            root.setAttribute("aria-hidden", "false");
            setLock(true);
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    root.classList.add("is-on");
                    if (emailEl) emailEl.focus();
                });
            });
        }

        function closeLogin() {
            if (!open && !root.classList.contains("is-on")) return;
            open = false;
            root.classList.remove("is-on");
            root.setAttribute("aria-hidden", "true");
            setLock(false);
            errEl.classList.remove("is-on");
            btn.disabled = false;
            btn.textContent = "Sign in";
            window.clearTimeout(closeTimer);
            closeTimer = window.setTimeout(function () {
                if (!open) root.classList.remove("is-ready");
            }, CLOSE_MS);
            if (lastFocus && lastFocus.focus) {
                try { lastFocus.focus(); } catch (err) {}
            }
        }

        root.addEventListener("click", function (e) {
            if (e.target.closest("[data-bb-login-close]")) closeLogin();
        });

        document.addEventListener("keydown", function (e) {
            if (!open) return;
            if (e.key === "Escape") {
                e.preventDefault();
                closeLogin();
                return;
            }
            if (e.key !== "Tab") return;
            var nodes = root.querySelectorAll("button, input, a");
            if (!nodes.length) return;
            var first = nodes[0];
            var last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            errEl.classList.remove("is-on");
            btn.disabled = true;
            btn.textContent = "Signing in…";

            window.bb.signInWithFallback(emailEl.value.trim(), passEl.value).then(function () {
                var path = window.location.pathname.replace(/\\/g, "/");
                if (/signup\.html$|complete-profile\.html$/.test(path)) {
                    window.location.href = prefix + "index.html";
                    return;
                }
                closeLogin();
                passEl.value = "";
                window.bb.updateNavAuth();
            }).catch(function (err) {
                showError(window.bb.friendlyAuthError ? window.bb.friendlyAuthError(err) : "Could not sign in.");
                btn.disabled = false;
                btn.textContent = "Sign in";
            });
        });

        document.getElementById("bb-login-google").addEventListener("click", function () {
            var redirectTo = window.bb.authRedirectTo
                ? window.bb.authRedirectTo("/complete-profile.html")
                : "";
            if (!redirectTo) {
                showError("On this Wi-Fi, use email and password to sign in.");
                return;
            }
            var oauth = { provider: "google" };
            oauth.options = { redirectTo: redirectTo };
            window.bb.supabase.auth.signInWithOAuth(oauth);
        });

        if (window.bb && (!window.bb.googleAuthEnabled || !window.bb.googleAuthEnabled() || !window.bb.authRedirectTo || !window.bb.authRedirectTo("/complete-profile.html"))) {
            var google = document.getElementById("bb-login-google");
            var or = root.querySelector(".bb-login-or");
            if (google) google.style.display = "none";
            if (or) or.style.display = "none";
        }

        if (window.bb) {
            window.bb.openLogin = openLogin;
            window.bb.closeLogin = closeLogin;
        }

        if (/[?&]login=1(?:&|$)/.test(window.location.search) || window.location.hash === "#login") {
            openLogin();
        }
    };
}());
