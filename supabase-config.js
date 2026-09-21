/*
 * Bling Berry — Supabase client + shared auth helpers
 *
 * Usage in any HTML page:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="supabase-config.js"></script>
 *
 * Then use:
 *   window.bb.supabase   — the Supabase client
 *   window.bb.getUser()  — current auth user or null
 *   window.bb.getProfile() — current user's profile row or null
 *   window.bb.isAdmin()  — true if role === 'admin'
 *   window.bb.logout()   — sign out and redirect to index
 *   window.bb.requireAuth(callback) — redirect to login if not signed in
 *   window.bb.requireAdmin(callback) — redirect if not admin
 *   window.bb.updateNavAuth() — update nav Login/Account link
 */
(function () {
  "use strict";

  // ── Bling-Berry Supabase project ──
  var SUPABASE_HOST = "https://akyxczonuvmorbatcfvs.supabase.co";
  var SUPABASE_ANON = "sb_publishable_TVJpW1PNo2uhSY3chNRBxQ_UeSyhXjw";
  // Flip to true after Authentication → Providers → Google is enabled.
  var GOOGLE_AUTH_ENABLED = false;
  // ──────────────────────────────────

  function pageOrigin() {
    try { return window.location.origin || ""; } catch (e) { return ""; }
  }

  function pageHost() {
    try { return (new URL(pageOrigin()).hostname || "").toLowerCase(); } catch (e) { return ""; }
  }

  function isLoopbackHost(host) {
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
  }

  function isPrivateHost(host) {
    if (!host) return false;
    host = String(host).toLowerCase().replace(/^\[|\]$/g, "");
    if (isLoopbackHost(host) || host.endsWith(".local")) return true;
    if (host.indexOf(":") >= 0) {
      return host.indexOf("fc") === 0 || host.indexOf("fd") === 0 || host.indexOf("fe80:") === 0;
    }
    var m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return false;
    var a = Number(m[1]);
    var b = Number(m[2]);
    if (a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    return false;
  }

  // Laptop/Wi-Fi demos need the local /__sb proxy (this Mac's DNS often cannot
  // resolve *.supabase.co). A live public HTTPS site talks to Supabase directly.
  function usesLocalProxy() {
    var origin = pageOrigin();
    if (/^https:\/\//i.test(origin) && !isPrivateHost(pageHost())) return false;
    return isPrivateHost(pageHost());
  }

  function signInWithPassword(email, password) {
    email = String(email || "").trim().toLowerCase();
    function once() {
      return supabase.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
        if (!res.error) return res.data && res.data.user ? res.data.user : true;
        return Promise.reject(res.error);
      });
    }
    return once().catch(function (err) {
      var msg = (err && err.message) || "";
      if (/failed to fetch|networkerror|load failed|502|name_not_resolved/i.test(msg)) {
        return once();
      }
      return Promise.reject(err);
    });
  }

  function supabaseUrl() {
    if (usesLocalProxy()) {
      return pageOrigin().replace(/\/$/, "") + "/__sb";
    }
    return SUPABASE_HOST;
  }

  var supabase = window.supabase.createClient(supabaseUrl(), SUPABASE_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !usesLocalProxy(),
      flowType: usesLocalProxy() ? "implicit" : "pkce"
    }
  });

  var cachedProfile = null;

  function setSignedIn(on) {
    document.documentElement.classList.toggle("bb-signed-in", !!on);
  }

  function syncSignedIn() {
    getUser().then(function (user) {
      setSignedIn(!!user);
    });
  }

  function injectPriceGate() {
    if (document.getElementById("bb-price-gate")) return;
    var style = document.createElement("style");
    style.id = "bb-price-gate";
    style.textContent = [
      ".price-from,.price-amount,.price-currency,.price-num,.price-inline{display:none !important}",
      ".price-hint{display:inline-block;appearance:none;-webkit-appearance:none;border:0;background:transparent;padding:0;margin:0;font-family:Outfit,system-ui,sans-serif;font-size:0.72rem;font-weight:500;letter-spacing:0.04em;line-height:1.35;color:var(--muted,#6b5553);cursor:pointer;text-align:left;text-decoration:none;max-width:12rem}",
      ".price-hint:hover,.price-hint:focus-visible{color:var(--cherry,#902820)}",
      ".price-hint:focus-visible{outline:2px solid var(--gold-soft,#c4a484);outline-offset:3px;border-radius:4px}",
      "html:not(.bb-signed-in) .price,html:not(.bb-signed-in) .dp-price{white-space:normal;font-weight:500;color:var(--muted,#6b5553)}",
      "html.bb-signed-in .price-from{display:inline !important}",
      "html.bb-signed-in .price-amount{display:inline-flex !important}",
      "html.bb-signed-in .price-currency,html.bb-signed-in .price-num,html.bb-signed-in .price-inline{display:inline !important}",
      "html.bb-signed-in .price-hint{display:none !important}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensurePriceHints(root) {
    (root || document).querySelectorAll(".price, .dp-price").forEach(function (el) {
      if (el.querySelector(".price-hint")) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "price-hint";
      btn.textContent = "Sign in to see the price";
      el.appendChild(btn);
    });
  }

  injectPriceGate();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { ensurePriceHints(); });
  } else {
    ensurePriceHints();
  }
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      var i;
      for (i = 0; i < records.length; i++) {
        if (records[i].addedNodes && records[i].addedNodes.length) {
          ensurePriceHints();
          return;
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  supabase.auth.onAuthStateChange(function (event) {
    syncSignedIn();
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
      updateNavAuth();
    }
  });

  function getUser() {
    return supabase.auth.getUser().then(function (res) {
      return res.data && res.data.user ? res.data.user : null;
    }).catch(function () {
      return null;
    });
  }

  function getProfile() {
    if (cachedProfile) return Promise.resolve(cachedProfile);
    return getUser().then(function (user) {
      if (!user) return null;
      return supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(function (res) {
          cachedProfile = res.data || null;
          return cachedProfile;
        });
    });
  }

  function isAdmin() {
    return getProfile().then(function (p) {
      return p && p.role === "admin";
    });
  }

  function inAdminFolder() {
    return /\/admin(\/|$)/.test(window.location.pathname);
  }

  function storePath(file) {
    return inAdminFolder() ? "../" + file : file;
  }

  function logout() {
    cachedProfile = null;
    var home = storePath("index.html");
    return supabase.auth.signOut().then(function () {
      window.location.href = home;
    }, function () {
      window.location.href = home;
    });
  }

  function requireAuth(callback) {
    getUser().then(function (user) {
      if (!user) {
        window.location.href = storePath("login.html");
        return;
      }
      if (callback) callback(user);
    });
  }

  function requireAdmin(callback) {
    getUser().then(function (user) {
      if (!user) {
        window.location.href = storePath("login.html");
        return;
      }
      isAdmin().then(function (admin) {
        if (!admin) {
          window.location.href = storePath("index.html");
          return;
        }
        if (callback) callback(user);
      });
    });
  }

  function firstNameFrom(profile, user) {
    var name = "";
    if (profile && profile.name) name = profile.name;
    else if (user && user.user_metadata) {
      name = user.user_metadata.full_name || user.user_metadata.name || "";
    }
    name = String(name).trim();
    if (name) return name.split(/\s+/)[0];
    var email = (profile && profile.email) || (user && user.email) || "";
    return email.split("@")[0] || "there";
  }

  function accountWrap(el) {
    var wrap = el.closest(".nav-account");
    if (wrap) return wrap;
    wrap = document.createElement("div");
    wrap.className = "nav-account";
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    return wrap;
  }

  function closeAccountMenus(except) {
    document.querySelectorAll(".nav-account.is-open").forEach(function (wrap) {
      if (wrap === except) return;
      wrap.classList.remove("is-open");
      var btn = wrap.querySelector(".nav-auth");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function updateNavAuth() {
    getUser().then(function (user) {
      setSignedIn(!!user);
      var links = document.querySelectorAll(".nav-auth");
      if (!links.length) return;
      if (!user) {
        links.forEach(function (el) {
          var wrap = el.closest(".nav-account");
          if (wrap) {
            wrap.classList.remove("is-open", "is-in");
            var drop = wrap.querySelector(".nav-account-drop");
            if (drop) drop.remove();
          }
          el.classList.remove("is-welcome", "is-admin");
          el.removeAttribute("aria-expanded");
          el.removeAttribute("aria-haspopup");
          el.textContent = "Login";
          if (el.tagName === "BUTTON") {
            var link = document.createElement("a");
            link.className = el.className;
            link.textContent = "Login";
            link.href = inAdminFolder() ? "../login.html" : "login.html";
            el.parentNode.replaceChild(link, el);
          } else {
            el.href = inAdminFolder() ? "../login.html" : "login.html";
          }
        });
        return;
      }

      Promise.all([getProfile(), isAdmin()]).then(function (pair) {
        var profile = pair[0];
        var admin = pair[1];
        var name = firstNameFrom(profile, user);

        document.querySelectorAll(".nav-auth").forEach(function (el) {
          var wrap = accountWrap(el);
          wrap.classList.add("is-in");
          wrap.classList.remove("is-open");

          var existingDrop = wrap.querySelector(".nav-account-drop");
          if (existingDrop) existingDrop.remove();

          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = el.className.replace(/\bis-welcome\b/g, "").replace(/\bis-admin\b/g, "").trim() + " is-welcome";
          btn.setAttribute("aria-haspopup", "true");
          btn.setAttribute("aria-expanded", "false");
          btn.innerHTML =
            '<span class="nav-auth-hello">Welcome,</span> <span class="nav-auth-name"></span>' +
            '<svg class="nav-account-chevron" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
              '<path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            "</svg>";
          btn.querySelector(".nav-auth-name").textContent = name;

          var drop = document.createElement("div");
          drop.className = "nav-account-drop";

          if (admin) {
            var dash = document.createElement("a");
            dash.href = inAdminFolder() ? "index.html" : "admin/index.html";
            dash.textContent = "Dashboard";
            drop.appendChild(dash);
          }

          var out = document.createElement("button");
          out.type = "button";
          out.textContent = "Sign out";
          out.addEventListener("click", function (e) {
            e.preventDefault();
            logout();
          });
          drop.appendChild(out);

          drop.addEventListener("click", function (e) {
            e.stopPropagation();
          });

          btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var open = !wrap.classList.contains("is-open");
            closeAccountMenus(open ? wrap : null);
            wrap.classList.toggle("is-open", open);
            btn.setAttribute("aria-expanded", open ? "true" : "false");
          });

          wrap.replaceChild(btn, el);
          wrap.appendChild(drop);
        });
      });
    });
  }

  document.addEventListener("click", function () {
    closeAccountMenus();
  });

  var pendingLogin = false;

  function openLoginFromPage() {
    if (window.bb && window.bb.openLogin) window.bb.openLogin();
    else pendingLogin = true;
  }

  document.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var hint = e.target.closest(".price-hint");
    if (hint) {
      e.preventDefault();
      e.stopPropagation();
      openLoginFromPage();
      return;
    }
    var a = e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    var href = a.getAttribute("href") || "";
    if (!/(?:^|\/)login\.html(?:$|[?#])/.test(href)) return;
    if (/(?:^|\/)login\.html$/.test(window.location.pathname.replace(/\\/g, "/"))) return;
    e.preventDefault();
    openLoginFromPage();
  }, true);

  function bootMarquee() {
    if (inAdminFolder()) return;
    var file = (window.location.pathname || "").split("/").pop().toLowerCase();
    if (!file || file === "index.html" || file === "jwellery.html") return;
    var header = document.querySelector("header");
    if (!header) return;

    if (!document.getElementById("bb-marquee")) {
      var style = document.createElement("style");
      style.id = "bb-marquee";
      style.textContent = [
        ".marquee{position:relative;z-index:0;width:100%;max-width:100%;overflow:hidden;border-bottom:1px solid var(--line,#e4d4d1);padding:11px 0 7px;background:rgba(255,250,249,.92);-webkit-mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent);mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)}",
        "header .container,header .navbar{position:relative;z-index:8}",
        "header .drop,header .nav-account-drop{z-index:20}",
        ".marquee-track{display:flex;align-items:center;width:max-content;animation:bbMarqueeDrift 56s linear infinite;color:var(--muted,#6b5553);font-size:.47rem;letter-spacing:.22em;text-transform:uppercase;white-space:nowrap;will-change:transform}",
        ".marquee:hover .marquee-track{animation-play-state:paused}",
        ".marquee-set{display:flex;align-items:center;gap:.81rem;padding-right:.81rem}",
        ".marquee b{color:var(--cherry,#902820);font-weight:600}",
        "header .marquee .brand-mark,.brand-mark--marquee{height:24px;width:auto;border-radius:0}",
        "@keyframes bbMarqueeDrift{from{transform:translateX(0)}to{transform:translateX(-50%)}}",
        "@media (prefers-reduced-motion:reduce){.marquee-track{animation:none}}"
      ].join("");
      document.head.appendChild(style);
    }

    if (header.querySelector(".marquee")) return;
    var asset = storePath("assets/brand-lockup.png");
    var set = '<span class="marquee-set">' +
      '<img class="brand-mark brand-mark--marquee" src="' + asset + '" alt=""><b>·</b>' +
      "<span>Photograph well</span><b>·</b>" +
      "<span>Wear better</span><b>·</b>" +
      "<span>Honest prices</span><b>·</b>" +
      "<span>Anti tarnish</span><b>·</b>" +
      "<span>Pan India</span><b>·</b>" +
      "</span>";
    var bar = document.createElement("div");
    bar.className = "marquee";
    bar.setAttribute("aria-hidden", "true");
    bar.innerHTML = '<div class="marquee-track">' + set + set + "</div>";
    header.appendChild(bar);
  }

  function bootNavPress() {
    if (document.getElementById("bb-nav-press")) return;
    var style = document.createElement("style");
    style.id = "bb-nav-press";
    style.textContent = [
      ".navbar .nav-links > li > a,.navbar .nav-auth{",
        "transform-origin:50% 65%;",
        "touch-action:manipulation;",
        "-webkit-tap-highlight-color:transparent;",
        "transition:color .45s cubic-bezier(.45,.05,.55,.95),",
        "transform .56s cubic-bezier(.23,.12,.18,1)",
      "}",
      ".navbar .nav-links > li > a.is-nav-pressed,.navbar .nav-auth.is-nav-pressed{",
        "transform:scale(.97) translate3d(0,1.15px,0);",
        "transition-duration:.22s;",
        "transition-timing-function:cubic-bezier(.32,.08,.18,1)",
      "}",
      "@media (prefers-reduced-motion:reduce){",
        ".navbar .nav-links > li > a,.navbar .nav-auth{transition:color .2s ease}",
        ".navbar .nav-links > li > a.is-nav-pressed,.navbar .nav-auth.is-nav-pressed{transform:none}",
      "}"
    ].join("");
    document.head.appendChild(style);

    var SEL = ".navbar .nav-links > li > a, .navbar .nav-auth";

    function hit(node) {
      if (!node || !node.closest) return null;
      var el = node.closest(SEL);
      if (!el || el.closest(".drop")) return null;
      return el;
    }

    function releaseAll() {
      document.querySelectorAll(".is-nav-pressed").forEach(function (el) {
        el.classList.remove("is-nav-pressed");
      });
    }

    document.addEventListener("pointerdown", function (e) {
      if (e.button && e.button !== 0) return;
      var el = hit(e.target);
      if (!el) return;
      el.classList.add("is-nav-pressed");
    }, true);

    document.addEventListener("pointerup", releaseAll, true);
    document.addEventListener("pointercancel", releaseAll, true);
    document.addEventListener("pointerleave", function (e) {
      if (e.target === document.documentElement || e.target === document.body) releaseAll();
    }, true);
  }

  function bootLoginModal() {
    if (/(?:^|\/)login\.html$/.test(window.location.pathname.replace(/\\/g, "/"))) return;
    function start() {
      if (window.bbInitLoginModal) {
        window.bbInitLoginModal({ prefix: inAdminFolder() ? "../" : "" });
      }
      if (pendingLogin && window.bb && window.bb.openLogin) window.bb.openLogin();
    }
    if (window.bbInitLoginModal) {
      start();
      return;
    }
    var script = document.createElement("script");
    script.src = (inAdminFolder() ? "../" : "") + "login-modal.js?v=live2";
    script.onload = start;
    document.head.appendChild(script);
  }

  function authRedirectTo(path) {
    var origin = pageOrigin();
    if (!origin || origin === "null") return "";
    var host = pageHost();
    var file = path.charAt(0) === "/" ? path : "/" + path;
    if (isPrivateHost(host) && !isLoopbackHost(host)) return "";
    if (isLoopbackHost(host) || (/^https:\/\//i.test(origin) && !isPrivateHost(host))) {
      return origin.replace(/\/$/, "") + file;
    }
    return "";
  }

  function friendlyAuthError(err) {
    var msg = (err && err.message) || String(err || "");
    if (/failed to fetch|networkerror|load failed|name_not_resolved|internet_disconnected|network request failed/i.test(msg)) {
      return "Could not reach the account server. On a laptop demo, run python3 serve.py and open the http:// address it prints.";
    }
    if (/not valid json|unexpected token|unexpected end of json/i.test(msg)) {
      return "Sign-in got a bad reply. Hard-refresh and try again.";
    }
    if (/did not match the expected pattern/i.test(msg)) {
      return "This Wi-Fi address cannot be used as a login callback. Email + password still works. A live HTTPS site will not have this limit.";
    }
    if (/email not confirmed|email_not_confirmed/i.test(msg)) {
      return "This email is not confirmed. For laptop/Wi-Fi testing, in Supabase go to Authentication → Providers → Email and turn Confirm email off, then sign in. On a live HTTPS site, confirmation emails can be left on.";
    }
    if (/invalid login credentials|invalid_credentials/i.test(msg)) {
      return "Email or password is incorrect.";
    }
    if (/over_email_send_rate_limit|too many requests|rate.?limit/i.test(msg)) {
      return "Too many confirmation emails were sent. Wait, or turn Confirm email off in Supabase while testing on Wi-Fi.";
    }
    return msg || "Could not sign in.";
  }

  function tidyProductCopy(text) {
    var s = String(text == null ? "" : text);
    s = s
      .replace(/\u00E2\u0080\u0099/g, "'")
      .replace(/\u00E2\u0080\u0098/g, "'")
      .replace(/\u00E2\u0080\u009C/g, '"')
      .replace(/\u00E2\u0080\u009D/g, '"')
      .replace(/\u00E2\u0080\u0094/g, " - ")
      .replace(/\u00E2\u0080\u0093/g, " - ")
      .replace(/\u00E2\u0080\u00A6/g, "...")
      .replace(/\u00E2\u20AC\u2122/g, "'")
      .replace(/\u00E2\u20AC\u2018/g, "'")
      .replace(/\u00E2\u20AC\u0153/g, '"')
      .replace(/\u00E2\u20AC\u201D/g, '"')
      .replace(/\u00E2\u20AC\u201C/g, '"')
      .replace(/â€™/g, "'")
      .replace(/â€˜/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€\u009D/g, '"')
      .replace(/â€”/g, " - ")
      .replace(/â€“/g, " - ")
      .replace(/â€¦/g, "...")
      .replace(/[\u2018\u2019\u02BC]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2014|\u2013/g, " - ")
      .replace(/\s+-\s+/g, " - ")
      .replace(/[^\S\n]{2,}/g, " ");
    return s.trim();
  }

  // Public API
  window.bb = {
    supabase: supabase,
    getUser: getUser,
    getProfile: getProfile,
    isAdmin: isAdmin,
    logout: logout,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin,
    updateNavAuth: updateNavAuth,
    setSignedIn: setSignedIn,
    tidyProductCopy: tidyProductCopy,
    friendlyAuthError: friendlyAuthError,
    authRedirectTo: authRedirectTo,
    googleAuthEnabled: function () { return !!GOOGLE_AUTH_ENABLED; },
    usesLocalProxy: usesLocalProxy,
    signInWithPassword: signInWithPassword,
    signInWithFallback: signInWithPassword
  };

  // Auto-run nav update on DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      updateNavAuth();
      bootLoginModal();
      bootNavPress();
      bootMarquee();
    });
  } else {
    updateNavAuth();
    bootLoginModal();
    bootNavPress();
    bootMarquee();
  }
}());
