/*
 * Bling Berry — Admin dashboard logic
 * CRUD for products, image upload, auth guard
 */
(function () {
    "use strict";

    var sb = bb.supabase;
    var products = [];
    var users = [];
    var currentUserId = "";
    var editingId = null;
    var deleteTargetId = null;

    /* ── DOM refs ── */
    var form        = document.getElementById("product-form");
    var formTitle   = document.getElementById("form-title");
    var nameIn      = document.getElementById("p-name");
    var captionIn   = document.getElementById("p-caption");
    var descIn      = document.getElementById("p-desc");
    var igIn        = document.getElementById("p-instagram");
    var priceIn     = document.getElementById("p-price");
    var categoryIn  = document.getElementById("p-category");
    var stockIn     = document.getElementById("p-stock");
    var sortIn      = document.getElementById("p-sort");
    var fileIn      = document.getElementById("p-image");
    var thumbPreview = document.getElementById("thumb-preview");
    var submitBtn   = document.getElementById("form-submit");
    var cancelBtn   = document.getElementById("form-cancel");
    var tableBody   = document.getElementById("product-tbody");
    var emptyState  = document.getElementById("empty-state");
    var usersBody   = document.getElementById("users-tbody");
    var usersEmpty  = document.getElementById("users-empty");
    var usersSub    = document.getElementById("users-subtitle");
    var toast       = document.getElementById("toast");
    var confirmOverlay = document.getElementById("confirm-overlay");
    var confirmName = document.getElementById("confirm-name");
    var confirmYes  = document.getElementById("confirm-yes");
    var confirmNo   = document.getElementById("confirm-no");

    /* ── Auth guard ── */
    bb.requireAdmin(function (user) {
        currentUserId = user && user.id ? user.id : "";
        loadProducts();
        if ((window.location.hash || "").replace("#", "") === "users") {
            showView("users");
        }
    });

    document.querySelectorAll(".admin-tabs [data-view]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            showView(btn.getAttribute("data-view"));
        });
    });
    window.addEventListener("hashchange", function () {
        var view = (window.location.hash || "").replace("#", "");
        showView(view === "users" ? "users" : "products");
    });

    function showView(view) {
        var next = view === "users" ? "users" : "products";
        document.querySelectorAll(".admin-view").forEach(function (panel) {
            panel.classList.toggle("is-on", panel.id === "view-" + next);
        });
        document.querySelectorAll(".admin-tabs [data-view]").forEach(function (btn) {
            var on = btn.getAttribute("data-view") === next;
            btn.classList.toggle("is-on", on);
            btn.setAttribute("aria-selected", on ? "true" : "false");
        });
        if (window.location.hash.replace("#", "") !== (next === "products" ? "" : next)) {
            if (next === "products") {
                if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
            } else {
                history.replaceState(null, "", "#users");
            }
        }
        if (next === "users") loadUsers();
    }

    function loadUsers() {
        sb.from("profiles")
            .select("id, name, email, role, auth_provider, created_at")
            .order("role", { ascending: true })
            .order("created_at", { ascending: false })
            .then(function (res) {
                if (res.error) {
                    showToast("Could not load users: " + res.error.message);
                    return;
                }
                users = res.data || [];
                renderUsers();
            });
    }

    function accessCopy(role) {
        if (role === "admin") {
            return { pill: "Admin", desc: "Dashboard, catalogue, and prices" };
        }
        return { pill: "Customer", desc: "Signed-in prices on the store" };
    }

    function formatJoined(iso) {
        if (!iso) return "";
        var d = new Date(iso);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }

    function displayName(raw, email) {
        var name = String(raw || "")
            .replace(/[\u00B9\u00B2\u00B3\u2070-\u207F]/g, "")
            .replace(/\s+/g, " ")
            .trim();
        if (name) return name;
        var local = String(email || "").split("@")[0];
        return local || "Member";
    }

    function initialsFor(name) {
        var parts = String(name || "").split(" ").filter(Boolean);
        if (!parts.length) return "B";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    function renderUsers() {
        usersBody.innerHTML = "";
        if (!users.length) {
            usersEmpty.style.display = "";
            usersSub.textContent = "Who can sign in, and what they can reach.";
            return;
        }
        usersEmpty.style.display = "none";
        var adminCount = users.filter(function (u) { return u.role === "admin"; }).length;
        usersSub.textContent = users.length + (users.length === 1 ? " account" : " accounts") +
            " · " + adminCount + (adminCount === 1 ? " admin" : " admins");

        users.forEach(function (u) {
            var access = accessCopy(u.role);
            var email = String(u.email || "").trim();
            var name = displayName(u.name, email);
            var provider = String(u.auth_provider || "email").replace(/_/g, " ");
            provider = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Email";
            var joined = formatJoined(u.created_at);
            var isYou = currentUserId && u.id === currentUserId;
            var isAdmin = u.role === "admin";

            var row = document.createElement("article");
            row.className = "people-row";

            var identity = document.createElement("div");
            identity.className = "people-identity";

            var avatar = document.createElement("div");
            avatar.className = "people-avatar" + (isAdmin ? " is-admin" : "");
            avatar.textContent = initialsFor(name);
            avatar.setAttribute("aria-hidden", "true");

            var who = document.createElement("div");
            who.className = "people-who";

            var nameRow = document.createElement("div");
            nameRow.className = "people-name-row";

            var nameEl = document.createElement("div");
            nameEl.className = "people-name";
            nameEl.textContent = name;
            nameRow.appendChild(nameEl);

            if (isYou) {
                var you = document.createElement("span");
                you.className = "you-chip";
                you.textContent = "You";
                nameRow.appendChild(you);
            }

            var emailEl = document.createElement("div");
            emailEl.className = "people-email";
            emailEl.textContent = email || "No email";

            who.appendChild(nameRow);
            who.appendChild(emailEl);
            identity.appendChild(avatar);
            identity.appendChild(who);

            var side = document.createElement("div");
            side.className = "people-access";

            var pill = document.createElement("span");
            pill.className = "access-pill " + (isAdmin ? "is-admin" : "is-customer");
            pill.textContent = access.pill;

            var desc = document.createElement("span");
            desc.className = "access-desc";
            desc.textContent = access.desc;

            var meta = document.createElement("div");
            meta.className = "people-meta";
            meta.textContent = [provider, joined].filter(Boolean).join("  ·  ");

            side.appendChild(pill);
            side.appendChild(desc);
            side.appendChild(meta);

            row.appendChild(identity);
            row.appendChild(side);
            usersBody.appendChild(row);
        });
    }

    /* ── Toast ── */
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add("is-on");
        setTimeout(function () { toast.classList.remove("is-on"); }, 2600);
    }

    function showSaveError(error) {
        var message = (error && error.message) || "Could not save";
        if (/instagram_url/i.test(message)) {
            showToast("Run alter-instagram-url.sql in Supabase, then save again");
            return;
        }
        showToast("Error: " + message);
    }

    /* ── Load products ── */
    function loadProducts() {
        sb.from("products")
            .select("*")
            .order("updated_at", { ascending: false })
            .order("created_at", { ascending: false })
            .then(function (res) {
                products = res.data || [];
                renderTable();
                cleanLegacyInstagramLinks();
                cleanGarbledCopy();
            });
    }

    /* ── Render table ── */
    function renderTable() {
        tableBody.innerHTML = "";

        if (!products.length) {
            emptyState.style.display = "";
            return;
        }
        emptyState.style.display = "none";

        products.forEach(function (p) {
            var tr = document.createElement("tr");
            var imgSrc = productImageSrc(p.image_url);
            var visibleDesc = tidyCopy(stripReelMarker(stripIgFromText(p.description || "")));
            var reel = reelFromProduct(p);
            tr.innerHTML =
                '<td><img class="thumb" src="' + escHtml(imgSrc) + '" alt=""></td>' +
                '<td><div class="cell-name" title="' + escHtml(p.name || "") + '">' + escHtml(p.name || "") + '</div></td>' +
                '<td><div class="cell-copy">' +
                    (p.caption ? '<div class="cap" title="' + escHtml(tidyCopy(stripIgFromText(p.caption))) + '">' + escHtml(tidyCopy(stripIgFromText(p.caption))) + '</div>' : "") +
                    (visibleDesc ? '<div class="desc">' + linkify(visibleDesc) + '</div>' : "") +
                    (reel ? '<div class="desc"><a href="' + escHtml(reel) + '" target="_blank" rel="noopener">View reel</a></div>' : "") +
                '</div></td>' +
                '<td class="cell-price">₹' + Number(p.price).toLocaleString("en-IN") + '</td>' +
                '<td class="cell-cat">' + escHtml(p.category || "") + '</td>' +
                '<td>' + p.stock + '</td>' +
                '<td class="actions-cell"><div class="actions">' +
                    '<button class="edit-btn" data-id="' + p.id + '">Edit</button>' +
                    '<button class="del-btn" data-id="' + p.id + '">Delete</button>' +
                '</div></td>';
            tableBody.appendChild(tr);
        });

        tableBody.querySelectorAll(".edit-btn").forEach(function (btn) {
            btn.addEventListener("click", function () { startEdit(btn.dataset.id); });
        });
        tableBody.querySelectorAll(".del-btn").forEach(function (btn) {
            btn.addEventListener("click", function () { confirmDelete(btn.dataset.id); });
        });
    }

    /* ── Form submit (add / update) ── */
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = editingId ? "Saving…" : "Adding…";

        var file = fileIn.files[0];
        var proceed = file ? uploadImage(file) : Promise.resolve(null);

        proceed.then(function (imageUrl) {
            var igUrl = normalizeUrl(igIn ? igIn.value : "");
            var row = {
                name: nameIn.value.trim(),
                caption: tidyCopy(captionIn.value.trim()),
                description: withReelMarker(tidyCopy(descIn.value.trim()), igUrl),
                instagram_url: igUrl,
                price: parseFloat(priceIn.value) || 0,
                category: categoryIn.value,
                stock: parseInt(stockIn.value, 10) || 0,
                sort_order: parseInt(sortIn.value, 10) || 0
            };
            if (imageUrl) row.image_url = imageUrl;

            var send = function (payload) {
                if (editingId) {
                    payload.updated_at = new Date().toISOString();
                    return sb.from("products").update(payload).eq("id", editingId);
                }
                if (!imageUrl) payload.image_url = payload.image_url || "";
                return sb.from("products").insert(payload);
            };

            return send(row).then(function (res) {
                if (res.error && /instagram_url/i.test(res.error.message || "")) {
                    var fallback = {};
                    Object.keys(row).forEach(function (key) {
                        if (key !== "instagram_url") fallback[key] = row[key];
                    });
                    return send(fallback);
                }
                return res;
            }).then(function (res) {
                if (res.error) { showSaveError(res.error); return; }
                showToast(editingId ? "Product updated" : "Product added");
                resetForm();
                loadProducts();
            });
        }).catch(function (err) {
            showToast("Error: " + err.message);
        }).finally(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = editingId ? "Save changes" : "Add product";
        });
    });

    /* ── Image upload ── */
    function uploadImage(file) {
        var ext = file.name.split(".").pop();
        var path = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;

        return sb.storage.from("product-images").upload(path, file, {
            cacheControl: "3600",
            upsert: false
        }).then(function (res) {
            if (res.error) throw res.error;
            var urlRes = sb.storage.from("product-images").getPublicUrl(path);
            return urlRes.data.publicUrl;
        });
    }

    /* ── Image preview ── */
    fileIn.addEventListener("change", function () {
        if (fileIn.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                thumbPreview.src = e.target.result;
                thumbPreview.classList.add("is-on");
            };
            reader.readAsDataURL(fileIn.files[0]);
        }
    });

    /* ── Edit ── */
    function startEdit(id) {
        var p = products.find(function (x) { return x.id === id; });
        if (!p) return;
        editingId = id;
        formTitle.textContent = "Edit product";
        submitBtn.textContent = "Save changes";
        cancelBtn.style.display = "";

        nameIn.value = p.name || "";
        captionIn.value = tidyCopy(stripIgFromText(p.caption || ""));
        descIn.value = tidyCopy(stripReelMarker(stripIgFromText(p.description || "")));
        if (igIn) igIn.value = p.instagram_url || extractReel(p.description) || "";
        priceIn.value = p.price;
        categoryIn.value = p.category;
        stockIn.value = p.stock;
        sortIn.value = p.sort_order;

        if (p.image_url) {
            thumbPreview.src = productImageSrc(p.image_url);
            thumbPreview.classList.add("is-on");
        }

        form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /* ── Cancel edit ── */
    cancelBtn.addEventListener("click", function () {
        resetForm();
    });

    function resetForm() {
        editingId = null;
        form.reset();
        formTitle.textContent = "Add new product";
        submitBtn.textContent = "Add product";
        cancelBtn.style.display = "none";
        thumbPreview.classList.remove("is-on");
        thumbPreview.src = "";
    }

    /* ── Delete ── */
    function confirmDelete(id) {
        deleteTargetId = id;
        var p = products.find(function (x) { return x.id === id; });
        confirmName.textContent = p ? p.name : "this product";
        confirmOverlay.classList.add("is-on");
    }

    confirmNo.addEventListener("click", function () {
        confirmOverlay.classList.remove("is-on");
        deleteTargetId = null;
    });

    confirmYes.addEventListener("click", function () {
        if (!deleteTargetId) return;
        confirmOverlay.classList.remove("is-on");

        sb.from("products").delete().eq("id", deleteTargetId).then(function (res) {
            if (res.error) { showToast("Error: " + res.error.message); return; }
            showToast("Product deleted");
            if (editingId === deleteTargetId) resetForm();
            deleteTargetId = null;
            loadProducts();
        });
    });

    /* ── Logout ── */
    document.getElementById("logout-btn").addEventListener("click", function (e) {
        e.preventDefault();
        bb.logout();
    });

    /* ── Helpers ── */
    function productImageSrc(url) {
        if (!url) return "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>";
        if (/^https?:\/\//i.test(url) || url.indexOf("data:") === 0) return url;
        return "../" + url.replace(/^\.\.\//, "");
    }

    function escHtml(s) {
        var d = document.createElement("div");
        d.textContent = s == null ? "" : String(s);
        return d.innerHTML;
    }
    function normalizeUrl(value) {
        var v = String(value || "").trim();
        if (!v) return "";
        if (!/^https?:\/\//i.test(v)) v = "https://" + v;
        return v;
    }
    function extractReel(text) {
        var match = String(text || "").match(/\[\[reel:([^\]]+)\]\]/i);
        return match ? match[1].trim() : "";
    }
    function tidyCopy(text) {
        return window.bb && window.bb.tidyProductCopy
            ? window.bb.tidyProductCopy(text)
            : String(text == null ? "" : text);
    }
    function stripReelMarker(text) {
        return String(text || "").replace(/\[\[reel:[^\]]+\]\]/gi, " ").replace(/\s{2,}/g, " ").trim();
    }
    function withReelMarker(description, igUrl) {
        var base = stripReelMarker(description);
        if (!igUrl) return base;
        return (base ? base + "\n\n" : "") + "[[reel:" + igUrl + "]]";
    }
    function reelFromProduct(p) {
        var url = String(p.instagram_url || "").trim() || extractReel(p.description);
        return url ? hrefFor(url) : "";
    }
    function stripIgFromText(text) {
        var reels = [];
        var kept = String(text || "").replace(/\[\[reel:[^\]]+\]\]/gi, function (marker) {
            reels.push(marker);
            return " %%REEL" + (reels.length - 1) + "%% ";
        });
        kept = kept
            .replace(/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am|ig\.me)\/[^\s<>"']+/gi, " ")
            .replace(/\s{2,}/g, " ")
            .trim();
        reels.forEach(function (marker, i) {
            kept = kept.replace("%%REEL" + i + "%%", marker);
        });
        return kept.replace(/\s{2,}/g, " ").trim();
    }
    function cleanGarbledCopy() {
        var dirty = products.filter(function (p) {
            return tidyCopy(p.description || "") !== String(p.description || "")
                || tidyCopy(p.caption || "") !== String(p.caption || "");
        });
        if (!dirty.length) return;
        var chain = Promise.resolve();
        dirty.forEach(function (p) {
            chain = chain.then(function () {
                var nextDesc = tidyCopy(p.description || "");
                var nextCap = tidyCopy(p.caption || "");
                return sb.from("products").update({
                    description: nextDesc,
                    caption: nextCap
                }).eq("id", p.id).then(function (res) {
                    if (res.error) return;
                    p.description = nextDesc;
                    p.caption = nextCap;
                });
            });
        });
        chain.then(function () { renderTable(); });
    }
    function cleanLegacyInstagramLinks() {
        var dirty = products.filter(function (p) {
            return stripIgFromText(p.description) !== String(p.description || "").trim()
                || stripIgFromText(p.caption) !== String(p.caption || "").trim();
        });
        if (!dirty.length) return;
        var chain = Promise.resolve();
        dirty.forEach(function (p) {
            chain = chain.then(function () {
                var nextDesc = stripIgFromText(p.description);
                var nextCap = stripIgFromText(p.caption);
                return sb.from("products").update({
                    description: nextDesc,
                    caption: nextCap
                }).eq("id", p.id).then(function (res) {
                    if (res.error) return;
                    p.description = nextDesc;
                    p.caption = nextCap;
                });
            });
        });
        chain.then(function () { renderTable(); });
    }
    function isIgUrl(url) {
        return /(instagram\.com|instagr\.am|ig\.me)/i.test(url);
    }

    function hrefFor(url) {
        var href = /^https?:\/\//i.test(url) ? url : "https://" + url;
        if (!isIgUrl(href)) return href;
        try {
            var parsed = new URL(href);
            parsed.search = "";
            parsed.hash = "";
            return parsed.toString();
        } catch (e) {
            return href.split("?")[0].split("#")[0];
        }
    }

    function linkify(text) {
        var raw = String(text || "");
        var urlRe = /((?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am|ig\.me)\/[^\s<>"']+|https?:\/\/[^\s<>"']+)/gi;
        var out = "";
        var last = 0;
        var match;
        while ((match = urlRe.exec(raw))) {
            var matched = match[0];
            var trailing = "";
            var url = matched.replace(/[.,;:!?)]+$/g, function (m) {
                trailing = m;
                return "";
            });
            out += escHtml(raw.slice(last, match.index));
            var href = hrefFor(url);
            var label = isIgUrl(url)
                ? "Instagram"
                : escHtml(url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""));
            out += '<a href="' + escHtml(href) + '" target="_blank" rel="noopener">' + label + "</a>" + escHtml(trailing);
            last = match.index + matched.length;
        }
        out += escHtml(raw.slice(last));
        return out;
    }
}());
