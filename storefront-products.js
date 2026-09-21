/*
 * Bind lookbook prices and copy to the products table.
 * Looks with data-slug="..." get their price and description from Admin.
 */
(function () {
  "use strict";
  if (!window.bb || !window.bb.supabase) return;

  function formatPrice(value) {
    var n = Number(value);
    if (!isFinite(n) || n <= 0) return "";
    return n.toLocaleString("en-IN");
  }

  function priceMarkup(value, withFrom) {
    var n = formatPrice(value);
    if (!n) return "";
    var from = withFrom ? '<span class="price-from">Starting from</span>' : "";
    return from +
      '<span class="price-amount"><span class="price-currency">₹</span><span class="price-num">' + n + "</span></span>" +
      '<button type="button" class="price-hint">Sign in to see the price</button>';
  }

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
      out += '<a class="look-link" href="' + escHtml(href) + '" target="_blank" rel="noopener">' + label + "</a>" + escHtml(trailing);
      last = match.index + matched.length;
    }
    out += escHtml(raw.slice(last));
    return out;
  }

  function isUrlOnly(text) {
    return /^(?:https?:\/\/\S+|(?:www\.)?(?:instagram\.com|instagr\.am|ig\.me)\/\S+)$/i.test(String(text || "").trim());
  }

  function extractReel(text) {
    var match = String(text || "").match(/\[\[reel:([^\]]+)\]\]/i);
    return match ? match[1].trim() : "";
  }

  function igUrlFromProduct(product) {
    var dedicated = String(product.instagram_url || "").trim();
    if (dedicated) return hrefFor(dedicated);
    var marked = extractReel(product.description);
    return marked ? hrefFor(marked) : "";
  }

  function stripIgUrls(text) {
    return String(text || "")
      .replace(/\[\[reel:[^\]]+\]\]/gi, " ")
      .replace(/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am|ig\.me)\/[^\s<>"']+/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function reelLabel(url) {
    if (/\/reel\//i.test(url)) return "View reel";
    if (/\/p\//i.test(url) || /\/tv\//i.test(url)) return "View post";
    return "View reel";
  }

  function setReelLink(head, href) {
    var meta = head.querySelector(".look-meta");
    if (!meta) {
      meta = document.createElement("div");
      meta.className = "look-meta";
      var price = head.querySelector(".price");
      var copyP = head.querySelector(":scope > p:not(.price)");
      if (price) head.insertBefore(meta, price);
      else if (copyP) copyP.insertAdjacentElement("afterend", meta);
      else head.appendChild(meta);
    }
    var link = meta.querySelector(".look-reel");
    if (!href) {
      if (link) link.remove();
      if (!meta.querySelector(".chip") && !meta.children.length) meta.remove();
      return;
    }
    if (!link) {
      link = document.createElement("a");
      link.className = "look-reel";
      link.target = "_blank";
      link.rel = "noopener";
      var lastChip = meta.querySelector(".chip:last-of-type");
      if (lastChip) lastChip.insertAdjacentElement("afterend", link);
      else meta.appendChild(link);
    }
    link.href = href;
    link.textContent = reelLabel(href);
    link.style.opacity = "1";
    link.style.transform = "none";
  }

  function findProduct(look, bySlug, list) {
    var slug = look.getAttribute("data-slug");
    if (slug && bySlug[slug]) return bySlug[slug];
    var heading = look.querySelector("h2");
    if (!heading) return null;
    var name = heading.textContent.replace(/\s+/g, " ").trim().toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].name || "").replace(/\s+/g, " ").trim().toLowerCase() === name) {
        return list[i];
      }
    }
    return null;
  }

  function applyLookPrices(products) {
    var bySlug = {};
    products.forEach(function (p) {
      if (p.slug) bySlug[p.slug] = p;
    });

    document.querySelectorAll(".look").forEach(function (look) {
      var product = findProduct(look, bySlug, products);
      if (!product) return;

      var head = look.querySelector(".look-head");
      if (!head) return;

      var priceEl = head.querySelector(".price");
      if (!priceEl) {
        priceEl = document.createElement("p");
        priceEl.className = "price";
        var meta = head.querySelector(".look-meta");
        var inquire = head.querySelector(".inquire-row");
        if (meta && meta.nextSibling) {
          head.insertBefore(priceEl, meta.nextSibling);
        } else if (inquire) {
          head.insertBefore(priceEl, inquire);
        } else {
          head.appendChild(priceEl);
        }
      }

      var label = priceMarkup(product.price, false);
      if (label) {
        priceEl.innerHTML = label;
        priceEl.style.display = "";
      }

      var copyP = head.querySelector(":scope > p:not(.price)");
      var descCopy = stripIgUrls(bb.tidyProductCopy ? bb.tidyProductCopy(product.description || "") : (product.description || ""));
      if (copyP && descCopy && !isUrlOnly(descCopy)) {
        copyP.innerHTML = linkify(descCopy);
      }

      setReelLink(head, igUrlFromProduct(product));
    });
  }

  function renderExtraGrid(products, category) {
    var section = document.getElementById("dynamic-products");
    var grid = document.getElementById("dp-grid");
    if (!section || !grid) return;

    var lookSlugs = {};
    document.querySelectorAll(".look[data-slug]").forEach(function (look) {
      lookSlugs[look.getAttribute("data-slug")] = true;
    });

    var extras = products.filter(function (p) {
      return p.category === category && !lookSlugs[p.slug];
    });

    if (!extras.length) {
      section.style.display = "none";
      return;
    }

    section.style.display = "";
    grid.innerHTML = extras.map(function (p) {
      var img = p.image_url
        ? '<img src="' + p.image_url + '" alt="' + escHtml(p.name) + '">'
        : "";
      var price = priceMarkup(p.price, false);
      var copy = stripIgUrls(bb.tidyProductCopy ? bb.tidyProductCopy(p.description || p.caption || "") : (p.description || p.caption || ""));
      var reel = igUrlFromProduct(p);
      return (
        '<div class="dp-card">' +
          img +
          '<div class="dp-card-info">' +
            "<h3>" + escHtml(p.name) + "</h3>" +
            (copy ? "<p>" + linkify(copy) + "</p>" : "") +
            (reel ? '<p><a class="look-reel" href="' + escHtml(reel) + '" target="_blank" rel="noopener">' + reelLabel(reel) + "</a></p>" : "") +
            (price ? '<div class="dp-price">' + price + "</div>" : "") +
            (p.stock > 0
              ? '<div class="dp-stock">In stock</div>' : '<div class="dp-stock" style="color:var(--cherry)">Out of stock</div>') +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  var pageCategory = document.body.getAttribute("data-product-category");

  bb.supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .then(function (res) {
      var products = res.data || [];
      applyLookPrices(products);
      if (pageCategory) renderExtraGrid(products, pageCategory);
    });
}());
