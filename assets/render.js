/* ============================================================
   ქვიზო: page renderer
   Shared by build.js (turns content files into real web pages)
   and the browser (search page, quiz results).
   You don't need to edit this file to add or remove content.
   ============================================================ */
(function (root, factory) {
  var KV = factory();
  if (typeof module === "object" && module.exports) module.exports = KV;
  else root.KV = KV;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ---------- helpers ---------- */
  var MONTHS = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || "");
    return m ? +m[3] + " " + MONTHS[+m[2] - 1] + ", " + m[1] : "";
  }
  var TR = { "ა": "a", "ბ": "b", "გ": "g", "დ": "d", "ე": "e", "ვ": "v", "ზ": "z", "თ": "t", "ი": "i", "კ": "k", "ლ": "l", "მ": "m", "ნ": "n", "ო": "o", "პ": "p", "ჟ": "zh", "რ": "r", "ს": "s", "ტ": "t", "უ": "u", "ფ": "p", "ქ": "k", "ღ": "gh", "ყ": "q", "შ": "sh", "ჩ": "ch", "ც": "ts", "ძ": "dz", "წ": "ts", "ჭ": "ch", "ხ": "kh", "ჯ": "j", "ჰ": "h" };
  function slugify(s) {
    var out = String(s || "").toLowerCase().split("").map(function (c) { return TR[c] != null ? TR[c] : c; }).join("");
    out = out.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (out.length > 60) out = out.slice(0, 61).replace(/-[^-]*$/, ""); // cut at a word break
    return out || "item";
  }
  // **bold**, *italic*, [link](https://...)
  function inline(t) {
    return esc(t)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function paras(t) {
    return String(t || "").split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean)
      .map(function (p) { return "<p>" + inline(p).replace(/\n/g, "<br>") + "</p>"; }).join("");
  }
  function jsonScript(id, data) {
    return '<script type="application/json" id="' + id + '">' + JSON.stringify(data).replace(/</g, "\\u003c") + "</script>";
  }
  function readMinutes(a) {
    var words = 0;
    (a.blocks || []).forEach(function (b) { words += String((b.title || "") + " " + (b.text || "")).split(/\s+/).filter(Boolean).length; });
    return Math.max(1, Math.round(words / 180));
  }

  /* ---------- icons (inline SVG) ---------- */
  function svg(w, body, vb) { return '<svg viewBox="' + (vb || "0 0 24 24") + '" width="' + w + '" height="' + w + '" aria-hidden="true" focusable="false">' + body + "</svg>"; }
  var I = {
    menu: svg(22, '<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    close: svg(22, '<path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    search: svg(19, '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    trend: svg(15, '<path d="M4 16l6-6 4 4 6-7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7h5v5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
    arrow: svg(15, '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
    up: svg(16, '<path d="M6 14l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
    clock: svg(13, '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    quiz: svg(12, '<path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="18.5" r="1.6" fill="currentColor"/>'),
    fb: svg(18, '<path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z"/>'),
    x: svg(16, '<path fill="currentColor" d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/>'),
    ig: svg(18, '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/>'),
    tt: svg(18, '<path fill="currentColor" d="M16.6 3c.3 2.2 1.6 3.7 3.9 3.9v3a7 7 0 0 1-3.9-1.2v6.2a5.9 5.9 0 1 1-5.9-5.9c.3 0 .7 0 1 .1v3.1a2.9 2.9 0 1 0 1.9 2.7V3h3z"/>'),
    yt: svg(18, '<path fill="currentColor" d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM10 15V9l5.2 3L10 15z"/>'),
    link: svg(18, '<path d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>'),
    check: svg(16, '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
    redo: svg(17, '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>')
  };
  function socialIcon(label) {
    var l = String(label || "").toLowerCase();
    if (/facebook/.test(l)) return I.fb;
    if (/instagram/.test(l)) return I.ig;
    if (/tiktok/.test(l)) return I.tt;
    if (/youtube/.test(l)) return I.yt;
    if (/^x$|twitter/.test(l)) return I.x;
    return I.link;
  }

  /* ---------- library & addresses ---------- */
  function buildLib(site, docs) {
    var cats = {};
    (site.categories || []).forEach(function (c) { cats[c.id] = c; });
    var items = (docs || []).filter(function (d) { return d && !d.draft && d.id; })
      .slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    return {
      site: site, cats: cats, items: items,
      quizzes: items.filter(function (i) { return i.kind === "quiz"; }),
      articles: items.filter(function (i) { return i.kind === "article"; })
    };
  }
  function pathOf(route) {
    if (!route || route === "home") return "";
    if (route === "404") return "404.html";
    return route.replace(/\/?$/, "/");
  }
  function itemRoute(it) { return it.kind + "/" + it.id; }
  function makeCtx(lib, o) {
    o = o || {};
    var mode = o.mode || "static", base = o.base || "";
    var assetBase = o.assetBase != null ? o.assetBase : base;
    var ctx = { lib: lib, site: lib.site, mode: mode, base: base, route: o.route || "home" };
    ctx.url = function (r) {
      if (mode === "preview") return "#/" + (r === "home" ? "" : r);
      return (base + pathOf(r)) || "./";
    };
    ctx.asset = function (s) {
      if (!s) return "";
      return /^(https?:|data:|blob:)/.test(s) ? s : assetBase + String(s).replace(/^\/+/, "");
    };
    ctx.searchAction = mode === "preview" ? "#/search" : base + "search/";
    return ctx;
  }
  function cat(ctx, id) { return ctx.lib.cats[id] || { id: id || "", name: id || "", color: "#555" }; }

  /* ---------- images ---------- */
  function sized(src, w, h) {
    try {
      var u = new URL(src);
      u.searchParams.set("w", String(w)); u.searchParams.set("auto", "format"); u.searchParams.set("fit", "crop");
      if (h) u.searchParams.set("h", String(h));
      if (!u.searchParams.get("q")) u.searchParams.set("q", "80");
      return u.toString();
    } catch (e) { return src; }
  }
  function pic(ctx, src, w, alt, extra) {
    if (!src) return "";
    var isUnsplash = /^https:\/\/images\.unsplash\.com\//.test(src);
    var s = isUnsplash ? sized(src, w) : ctx.asset(src);
    var srcset = isUnsplash ? ' srcset="' + esc(sized(src, w)) + " 1x, " + esc(sized(src, w * 2)) + ' 2x"' : "";
    return '<img src="' + esc(s) + '"' + srcset + ' alt="' + esc(alt || "") + '" loading="lazy" decoding="async"' + (extra || "") + ">";
  }
  function media(ctx, it, w) {
    if (it.image) return pic(ctx, it.image, w, "");
    var c = cat(ctx, it.category);
    return '<span class="noimg" style="--c:' + esc(c.color) + '"><span>' + esc(c.name) + "</span></span>";
  }
  function badge(it) { return it.kind === "quiz" ? '<span class="badge-quiz">' + I.quiz + "ქვიზი</span>" : ""; }
  function time(d) { return d ? '<time datetime="' + esc(d) + '" data-rel>' + fmtDate(d) + "</time>" : ""; }
  function qCount(it) { var n = it.qn != null ? it.qn : (it.questions || []).length; return it.kind === "quiz" && n ? n + " კითხვა" : ""; }

  /* ---------- logo ---------- */
  function logo(ctx, cls) {
    var s = ctx.site, src = s.logo ? ctx.asset(s.logo) : "";
    return '<a class="logo ' + (cls || "") + '" href="' + ctx.url("home") + '" aria-label="' + esc(s.name) + ' · მთავარი გვერდი">' +
      (src ? '<img class="logo-img" src="' + esc(src) + '" alt="' + esc(s.name) + '" onerror="this.parentNode.classList.add(\'logo-fallback\');this.remove()">' : "") +
      '<span class="logo-word">' + esc(s.name) + "</span></a>";
  }

  /* ---------- cards ---------- */
  function kicker(ctx, it, cls) {
    var c = cat(ctx, it.category);
    return '<a class="kicker ' + (cls || "") + '" href="' + ctx.url("category/" + c.id) + '" style="--c:' + esc(c.color) + '">' + esc(c.name) + "</a>";
  }
  function metaLine(it, withAuthor) {
    var parts = [];
    if (withAuthor && it.author) parts.push('<span class="by">' + esc(it.author) + "</span>");
    if (it.date) parts.push(time(it.date));
    var q = qCount(it); if (q) parts.push("<span>" + q + "</span>");
    return parts.length ? '<div class="meta">' + parts.join('<span class="sep" aria-hidden="true"></span>') + "</div>" : "";
  }
  // big story: image, kicker, headline, dek, byline
  function leadCard(ctx, it) {
    var href = ctx.url(itemRoute(it));
    return '<article class="card card-lead" data-cat="' + esc(it.category) + '"><a class="card-media r16" href="' + href + '" tabindex="-1" aria-hidden="true">' + media(ctx, it, 1100) + badge(it) + "</a>" +
      '<div class="card-body">' + kicker(ctx, it) + '<h2 class="card-title"><a href="' + href + '">' + esc(it.title) + "</a></h2>" +
      (it.description ? '<p class="card-dek">' + esc(it.description) + "</p>" : "") + metaLine(it, true) + "</div></article>";
  }
  // standard card: image on top
  function gridCard(ctx, it, big) {
    var href = ctx.url(itemRoute(it));
    return '<article class="card' + (big ? " card-big" : "") + '" data-cat="' + esc(it.category) + '"><a class="card-media r3" href="' + href + '" tabindex="-1" aria-hidden="true">' + media(ctx, it, big ? 800 : 560) + badge(it) + "</a>" +
      '<div class="card-body">' + kicker(ctx, it) + '<h3 class="card-title"><a href="' + href + '">' + esc(it.title) + "</a></h3>" +
      (big && it.description ? '<p class="card-dek">' + esc(it.description) + "</p>" : "") + metaLine(it, false) + "</div></article>";
  }
  // feed row: image left, text right
  function rowCard(ctx, it) {
    var href = ctx.url(itemRoute(it));
    return '<article class="row" data-cat="' + esc(it.category) + '">' +
      '<a class="row-media r3" href="' + href + '" tabindex="-1" aria-hidden="true">' + media(ctx, it, 520) + badge(it) + "</a>" +
      '<div class="row-body">' + kicker(ctx, it) + '<h3 class="row-title"><a href="' + href + '">' + esc(it.title) + "</a></h3>" +
      (it.description ? '<p class="row-dek">' + esc(it.description) + "</p>" : "") + metaLine(it, true) + "</div></article>";
  }
  // text-only headline
  function miniCard(ctx, it) {
    var href = ctx.url(itemRoute(it));
    return '<li class="mini">' + kicker(ctx, it) + '<a class="mini-title" href="' + href + '">' + esc(it.title) + "</a>" + metaLine(it, false) + "</li>";
  }
  function popPanel(ctx, title, items) {
    if (!items.length) return "";
    return '<section class="panel pop"><h2 class="panel-h">' + esc(title) + '</h2><ol class="pop-list">' +
      items.map(function (it, i) {
        return '<li><a href="' + ctx.url(itemRoute(it)) + '"><span class="pop-n">' + (i + 1) + '</span><span class="pop-title">' + esc(it.title) + '</span><span class="pop-media">' + media(ctx, it, 200) + "</span></a></li>";
      }).join("") + "</ol></section>";
  }
  function followPanel(ctx) {
    var social = (ctx.site.footer && ctx.site.footer.social) || [];
    if (!social.length) return "";
    return '<section class="panel follow"><h2 class="panel-h">გამოგვყევი</h2><p>ახალი ქვიზები ყოველ დღე, პირველი შენ ნახე.</p><div class="follow-btns">' +
      social.map(function (s) { return '<a class="follow-btn" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + socialIcon(s.label) + "<span>" + esc(s.label) + "</span></a>"; }).join("") + "</div></section>";
  }
  function popular(ctx, kind, n, not) {
    var pool = ctx.lib.items.filter(function (i) { return (!kind || i.kind === kind) && i !== not; });
    var hot = pool.filter(function (i) { return i.trending || i.featured; });
    var rest = pool.filter(function (i) { return hot.indexOf(i) < 0; });
    return hot.concat(rest).slice(0, n);
  }
  function side(ctx, not) {
    return '<aside class="side"><div class="side-in">' + popPanel(ctx, "პოპულარული ქვიზები", popular(ctx, "quiz", 5, not)) + followPanel(ctx) + "</div></aside>";
  }
  function shareBar(title, extraCls, labels) {
    var l = function (t) { return labels ? "<span>" + t + "</span>" : ""; };
    return '<div class="share ' + (extraCls || "") + '" data-share data-title="' + esc(title) + '">' +
      '<a class="sh sh-fb" data-net="facebook" href="#" target="_blank" rel="noopener" aria-label="გაზიარება Facebook-ზე">' + I.fb + l("Facebook") + "</a>" +
      '<a class="sh sh-x" data-net="x" href="#" target="_blank" rel="noopener" aria-label="გაზიარება X-ზე">' + I.x + l("X") + "</a>" +
      '<button class="sh sh-link" type="button" data-net="copy" aria-label="ბმულის კოპირება">' + I.link + l("ბმული") + '<span class="sh-done">დაკოპირდა</span></button></div>';
  }
  function byline(ctx, it, extra) {
    var c = cat(ctx, it.category);
    var a = it.author || ctx.site.name;
    return '<div class="byline"><span class="avatar" style="--c:' + esc(c.color) + '">' + esc(a.charAt(0)) + '</span><div><div class="by-name">' + esc(a) + '</div><div class="by-date">' + time(it.date) + (extra || "") + "</div></div></div>";
  }
  function figure(ctx, src, credit, w, cls) {
    if (!src) return "";
    return '<figure class="' + (cls || "fig") + '">' + pic(ctx, src, w || 1200, "") + (credit ? "<figcaption>" + esc(credit) + "</figcaption>" : "") + "</figure>";
  }
  function crumbs(ctx, list) {
    return '<nav class="crumbs" aria-label="ნავიგაცია"><a href="' + ctx.url("home") + '">მთავარი</a>' +
      list.map(function (x) { return '<span aria-hidden="true">/</span>' + (x[1] ? '<a href="' + ctx.url(x[1]) + '">' + esc(x[0]) + "</a>" : "<span>" + esc(x[0]) + "</span>"); }).join("") + "</nav>";
  }
  function pageHead(ctx, o) {
    return '<header class="phead' + (o.color ? " tinted" : "") + '"' + (o.color ? ' style="--c:' + esc(o.color) + '"' : "") + '><div class="wrap">' +
      (o.crumbs ? crumbs(ctx, o.crumbs) : "") + (o.eyebrow ? '<p class="phead-eyebrow">' + esc(o.eyebrow) + "</p>" : "") +
      '<h1 class="phead-title">' + esc(o.title) + "</h1>" + (o.dek ? '<p class="phead-dek">' + esc(o.dek) + "</p>" : "") + (o.extra || "") + "</div></header>";
  }
  function sectionHead(title, moreHref, moreLabel, color) {
    return '<div class="sec-head"' + (color ? ' style="--c:' + esc(color) + '"' : "") + '><h2 class="sec-title">' + esc(title) + "</h2>" +
      (moreHref ? '<a class="sec-more" href="' + moreHref + '">' + esc(moreLabel || "ყველა") + " " + I.arrow + "</a>" : "") + "</div>";
  }

  /* ---------- video: YouTube, Vimeo, TikTok, Instagram, Facebook links, or an uploaded video file ---------- */
  function videoEmbed(ctx, url) {
    url = String(url || "").trim();
    if (!url) return null;
    var m;
    if ((m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(url)))
      return { src: "https://www.youtube-nocookie.com/embed/" + m[1] + "?rel=0", tall: /\/shorts\//.test(url) };
    if ((m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url))) return { src: "https://player.vimeo.com/video/" + m[1] };
    if ((m = /tiktok\.com\/.*\/video\/(\d+)/.exec(url))) return { src: "https://www.tiktok.com/embed/v2/" + m[1], tall: true };
    if ((m = /instagram\.com\/(?:[\w.]+\/)?(?:p|reel|reels|tv)\/([\w-]+)/.exec(url))) return { src: "https://www.instagram.com/p/" + m[1] + "/embed", tall: true };
    if (/facebook\.com\/.+\/videos\/|facebook\.com\/watch|fb\.watch\//.test(url)) return { src: "https://www.facebook.com/plugins/video.php?show_text=false&href=" + encodeURIComponent(url) };
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return { file: ctx.asset(url) };
    return null;
  }
  function video(ctx, b) {
    var link = b.url || b.file, v = videoEmbed(ctx, link), cap = [b.caption, b.credit].filter(Boolean).join(" · ");
    if (!v) return link ? '<p class="video-link"><a href="' + esc(link) + '" target="_blank" rel="noopener">▶ ' + esc(b.caption || "ვიდეოს ნახვა") + "</a></p>" : "";
    var inner = v.file
      ? '<video src="' + esc(v.file) + '" controls playsinline preload="metadata"></video>'
      : '<iframe src="' + esc(v.src) + '" title="' + esc(b.caption || "ვიდეო") + '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    return '<figure class="fig video' + (v.tall ? " video-tall" : "") + '"><div class="video-box">' + inner + "</div>" + (cap ? "<figcaption>" + esc(cap) + "</figcaption>" : "") + "</figure>";
  }

  /* ---------- header / footer ---------- */
  function shell(page, ctx) {
    var site = ctx.site, cur = ctx.route;
    var nav = (site.nav || []).map(function (n) {
      var on = cur === n.route || (n.route === "quizzes" && cur.indexOf("quiz/") === 0) || (n.route === "articles" && cur.indexOf("article/") === 0);
      return '<a href="' + ctx.url(n.route) + '"' + (on ? ' class="on" aria-current="page"' : "") + ">" + esc(n.label) + "</a>";
    }).join("");
    var catLinks = (site.categories || []).map(function (c) {
      return '<a href="' + ctx.url("category/" + c.id) + '"><span class="cdot" style="--c:' + esc(c.color) + '"></span>' + esc(c.name) + "</a>";
    }).join("");
    var pageKeys = ["about", "contact", "privacy"].filter(function (k) { return site.pages && site.pages[k]; });
    var pageLinks = pageKeys.map(function (k) { return '<a href="' + ctx.url(k) + '">' + esc(site.pages[k].title) + "</a>"; }).join("");
    var social = (site.footer && site.footer.social) || [];
    var socialIcons = social.map(function (s) { return '<a class="soc" href="' + esc(s.url) + '" target="_blank" rel="noopener" aria-label="' + esc(s.label) + '">' + socialIcon(s.label) + "</a>"; }).join("");
    var hot = ctx.lib.items.filter(function (i) { return i.trending; }).slice(0, 4);
    var ticker = cur === "home" && hot.length ? '<div class="ticker"><div class="wrap ticker-in"><span class="ticker-label">' + I.trend + "ცხელი თემები</span>" +
      hot.map(function (i) { return '<a href="' + ctx.url(itemRoute(i)) + '">' + esc(i.title) + "</a>"; }).join("") + "</div></div>" : "";

    return '<a class="skip" href="#main">გადასვლა შინაარსზე</a>' +
      '<div class="topbar"><div class="wrap topbar-in"><span class="today" data-today></span><div class="topbar-right">' + pageLinks + '<span class="topbar-soc">' + socialIcons + "</span></div></div></div>" +
      '<header class="hd"><div class="wrap hd-main">' +
      '<button class="icon-btn hd-burger" type="button" data-drawer-open aria-label="მენიუ" aria-expanded="false">' + I.menu + "</button>" +
      logo(ctx, "logo-hd") +
      '<div class="hd-tools"><form class="hd-search" action="' + ctx.searchAction + '" role="search" data-search><input name="q" type="search" placeholder="მოძებნე ქვიზი ან სტატია" aria-label="ძებნა" id="hd-q"><button class="icon-btn" aria-label="ძებნა">' + I.search + "</button></form>" +
      '<a class="btn btn-sm hd-cta" href="' + ctx.url("quizzes") + '">ქვიზები</a></div></div>' +
      '<nav class="hd-nav" aria-label="მთავარი მენიუ"><div class="wrap hd-nav-in">' +
      '<a class="trend-dot" href="' + ctx.url("trending") + '" aria-label="ტრენდში">' + I.trend + "</a>" + nav + "</div></nav></header>" + ticker +
      '<div class="drawer" data-drawer hidden><div class="drawer-bg" data-drawer-close></div><div class="drawer-panel" role="dialog" aria-label="მენიუ">' +
      '<div class="drawer-top">' + logo(ctx, "logo-drawer") + '<button class="icon-btn" type="button" data-drawer-close aria-label="დახურვა">' + I.close + "</button></div>" +
      '<form class="drawer-search" action="' + ctx.searchAction + '" role="search" data-search><input name="q" type="search" placeholder="ძებნა" aria-label="ძებნა"><button class="icon-btn" aria-label="ძებნა">' + I.search + "</button></form>" +
      '<div class="drawer-sec"><a href="' + ctx.url("quizzes") + '">ქვიზები</a><a href="' + ctx.url("trending") + '">ტრენდში</a><a href="' + ctx.url("articles") + '">სტატიები</a></div>' +
      '<div class="drawer-label">კატეგორიები</div><div class="drawer-sec drawer-cats">' + catLinks + "</div>" +
      '<div class="drawer-sec drawer-small">' + pageLinks + '</div><div class="drawer-soc">' + socialIcons + "</div></div></div>" +
      '<main id="main" class="' + (page.cls || "") + '">' + page.html + "</main>" +
      '<footer class="ft"><div class="wrap ft-top">' +
      '<div class="ft-brand">' + logo(ctx, "logo-ft") + "<p>" + esc(site.tagline) + '</p><div class="ft-soc">' + socialIcons + "</div></div>" +
      '<div class="ft-col"><h2>კატეგორიები</h2><div class="ft-links ft-links-2">' + catLinks + "</div></div>" +
      '<div class="ft-col"><h2>' + esc(site.name) + '</h2><div class="ft-links"><a href="' + ctx.url("quizzes") + '">ქვიზები</a><a href="' + ctx.url("articles") + '">სტატიები</a><a href="' + ctx.url("trending") + '">ტრენდში</a><a href="' + ctx.url("search") + '">ძებნა</a></div></div>' +
      '<div class="ft-col"><h2>ინფორმაცია</h2><div class="ft-links">' + pageLinks + "</div></div>" +
      '</div><div class="wrap ft-bottom"><span>© <span data-year>' + new Date().getFullYear() + "</span> " + esc(site.name) + '. ყველა უფლება დაცულია.</span><button class="to-top" type="button" data-to-top>ზემოთ ' + I.up + "</button></div></footer>";
  }

  /* ---------- pages ---------- */
  var pages = {};

  pages.home = function (ctx) {
    var L = ctx.lib, used = [];
    var take = function (list, n) { var out = list.filter(function (i) { return used.indexOf(i) < 0; }).slice(0, n); used = used.concat(out); return out; };
    var lead = take(L.items.filter(function (i) { return i.featured; }).concat(L.items), 1)[0];
    var seconds = take(L.items.filter(function (i) { return i.featured || i.trending; }).concat(L.items), 2);
    var latest = L.items.filter(function (i) { return i !== lead && seconds.indexOf(i) < 0; }).slice(0, 6);
    if (!lead) return { title: ctx.site.name, description: ctx.site.tagline, cls: "p-home", html: '<div class="wrap"><p class="empty">აქ ჯერ არაფერია. დაამატე პირველი ქვიზი.</p></div>' };

    var hero = '<section class="wrap hero"><div class="hero-lead">' + leadCard(ctx, lead) + "</div>" +
      '<div class="hero-mid">' + seconds.map(function (i) { return gridCard(ctx, i); }).join("") + "</div>" +
      '<aside class="hero-latest"><h2 class="panel-h">უახლესი</h2><ol class="mini-list">' + latest.map(function (i) { return miniCard(ctx, i); }).join("") + "</ol></aside></section>";

    var quizzes = L.quizzes.slice(0, 4);
    var quizBand = quizzes.length ? '<section class="band"><div class="wrap">' + sectionHead("ქვიზები", ctx.url("quizzes"), "ყველა ქვიზი") +
      '<div class="grid4">' + quizzes.map(function (i) { return gridCard(ctx, i); }).join("") + "</div></div></section>" : "";

    var feed = L.items.filter(function (i) { return i !== lead && seconds.indexOf(i) < 0; }).slice(0, 8);
    var feedBlock = '<div class="wrap cols"><section class="feed">' + sectionHead("ყველა სიახლე", ctx.url("articles"), "სტატიები") + feed.map(function (i) { return rowCard(ctx, i); }).join("") + "</section>" + side(ctx) + "</div>";

    var catBlocks = (ctx.site.categories || []).map(function (c) {
      var items = L.items.filter(function (i) { return i.category === c.id; });
      if (items.length < 4) return "";
      return '<section class="wrap cat-block">' + sectionHead(c.name, ctx.url("category/" + c.id), "მეტი", c.color) +
        '<div class="grid4">' + items.slice(0, 4).map(function (i) { return gridCard(ctx, i); }).join("") + "</div></section>";
    }).filter(Boolean).slice(0, 3).join("");

    return { title: ctx.site.name + " · " + ctx.site.tagline, description: ctx.site.tagline, image: lead.image, cls: "p-home", html: hero + quizBand + feedBlock + catBlocks };
  };

  function filterBar(ctx, items) {
    var used = (ctx.site.categories || []).filter(function (c) { return items.some(function (i) { return i.category === c.id; }); });
    return '<div class="filters" role="group" aria-label="კატეგორიის ფილტრი"><button class="flt on" type="button" data-filter="" aria-pressed="true">ყველა</button>' +
      used.map(function (c) { return '<button class="flt" type="button" data-filter="' + esc(c.id) + '" aria-pressed="false" style="--c:' + esc(c.color) + '"><span class="cdot"></span>' + esc(c.name) + "</button>"; }).join("") + "</div>";
  }
  pages.quizzes = function (ctx) {
    var q = ctx.lib.quizzes;
    return {
      title: "ქვიზები · " + ctx.site.name, description: "პიროვნების ტესტები, ტრივია და გასართობი ქვიზები ქართულად.", cls: "p-list",
      html: pageHead(ctx, { crumbs: [["ქვიზები"]], title: "ქვიზები", dek: "გაიგე, ვინ ხარ სინამდვილეში, ან შეამოწმე, რამდენი იცი.", extra: filterBar(ctx, q) }) +
        '<div class="wrap cols"><section><div class="grid3" data-filter-grid>' + q.map(function (i) { return gridCard(ctx, i); }).join("") + '</div><p class="empty" data-filter-empty hidden>ამ კატეგორიაში ქვიზები ჯერ არ არის.</p></section>' + side(ctx) + "</div>"
    };
  };
  pages.articles = function (ctx) {
    var a = ctx.lib.articles;
    return {
      title: "სტატიები · " + ctx.site.name, description: "სიები, ისტორიები და რჩევები.", cls: "p-list",
      html: pageHead(ctx, { crumbs: [["სტატიები"]], title: "სტატიები", dek: "სიები, ისტორიები და რჩევები ყოველი დღისთვის.", extra: filterBar(ctx, a) }) +
        '<div class="wrap cols"><section class="feed" data-filter-grid>' + a.map(function (i) { return rowCard(ctx, i); }).join("") + '<p class="empty" data-filter-empty hidden>ამ კატეგორიაში სტატიები ჯერ არ არის.</p></section>' + side(ctx) + "</div>"
    };
  };
  pages.trending = function (ctx) {
    var t = ctx.lib.items.filter(function (i) { return i.trending || i.featured; });
    if (!t.length) t = ctx.lib.items.slice(0, 10);
    return {
      title: "ტრენდში · " + ctx.site.name, description: "რას ავსებენ და კითხულობენ ახლა ყველაზე მეტად.", cls: "p-list",
      html: pageHead(ctx, { crumbs: [["ტრენდში"]], title: "ტრენდში", dek: "რას ავსებენ და კითხულობენ ახლა ყველაზე მეტად." }) +
        '<div class="wrap cols"><ol class="rank">' + t.map(function (it, i) {
          return '<li><span class="rank-n">' + (i + 1) + "</span>" + rowCard(ctx, it) + "</li>";
        }).join("") + "</ol>" + side(ctx) + "</div>"
    };
  };
  pages.category = function (ctx, id) {
    var c = ctx.lib.cats[id];
    if (!c) return pages["404"](ctx);
    var items = ctx.lib.items.filter(function (i) { return i.category === id; });
    var nq = items.filter(function (i) { return i.kind === "quiz"; }).length;
    var body = items.length
      ? '<div class="cat-top">' + leadCard(ctx, items[0]) + '<div class="cat-top-side">' + items.slice(1, 3).map(function (i) { return gridCard(ctx, i); }).join("") + "</div></div>" +
        (items.length > 3 ? '<div class="feed">' + items.slice(3).map(function (i) { return rowCard(ctx, i); }).join("") + "</div>" : "")
      : '<p class="empty">აქ ჯერ არაფერია.</p>';
    return {
      title: c.name + " · " + ctx.site.name, description: c.name + ": ქვიზები და სტატიები.", cls: "p-list",
      html: pageHead(ctx, { crumbs: [[c.name]], eyebrow: "კატეგორია", title: c.name, color: c.color, dek: nq + " ქვიზი · " + (items.length - nq) + " სტატია" }) +
        '<div class="wrap cols"><section>' + body + "</section>" + side(ctx) + "</div>"
    };
  };
  pages.search = function (ctx, q) {
    q = q ? decodeURIComponent(q) : "";
    var res = q ? search(ctx.lib.items, q) : [];
    return {
      title: "ძებნა · " + ctx.site.name, description: "", cls: "p-list",
      html: pageHead(ctx, { crumbs: [["ძებნა"]], title: "ძებნა", extra:
        '<form class="big-search" action="' + ctx.searchAction + '" data-search role="search"><input name="q" type="search" value="' + esc(q) + '" placeholder="მაგ.: ხინკალი, ძაღლი, ფილმი" aria-label="ძებნა" id="page-q"><button class="btn">' + I.search + " ძებნა</button></form>" }) +
        '<div class="wrap cols"><section class="feed" data-search-results>' + searchResults(ctx, q, res) + "</section>" + side(ctx) + "</div>"
    };
  };
  function search(items, q) {
    q = String(q).toLowerCase().trim();
    return items.filter(function (i) { return (i.title + " " + (i.description || "")).toLowerCase().indexOf(q) >= 0; });
  }
  function searchResults(ctx, q, res) {
    if (!q) return '<p class="empty">ჩაწერე სიტყვა და დააჭირე „ძებნას“.</p>';
    return '<p class="res-count">„' + esc(q) + "“: " + res.length + " შედეგი</p>" + (res.length ? res.map(function (i) { return rowCard(ctx, i); }).join("") : '<p class="empty">ვერაფერი მოიძებნა. სცადე სხვა სიტყვა.</p>');
  }

  pages.quiz = function (ctx, id) {
    var q = ctx.lib.quizzes.filter(function (x) { return x.id === id; })[0];
    if (!q) return pages["404"](ctx);
    var c = cat(ctx, q.category), total = (q.questions || []).length;
    var qs = (q.questions || []).map(function (qq, i) {
      var answers = qq.answers || [];
      var pics = answers.length && answers.every(function (a) { return a.image; });
      var cols = pics ? (answers.length % 3 === 0 ? " cols3" : "") : "";
      var num = '<span class="q-num">კითხვა ' + (i + 1) + " / " + total + "</span>";
      var head = qq.image
        ? '<div class="q-head has-img">' + pic(ctx, qq.image, 1200, "") + '<h2 class="q-text">' + num + esc(qq.text) + "</h2></div>"
        : '<div class="q-head"><h2 class="q-text">' + num + esc(qq.text) + "</h2></div>";
      return '<li class="q" data-q="' + i + '" id="q' + (i + 1) + '">' + head +
        '<div class="answers' + (pics ? " pics" : "") + cols + '">' + answers.map(function (a, j) {
          return '<button class="ans" type="button" data-a="' + j + '" aria-pressed="false">' +
            (pics ? '<span class="ans-media">' + pic(ctx, a.image, 520, "") + "</span>" : "") +
            '<span class="ans-row"><span class="tick" aria-hidden="true">' + I.check + '</span><span class="ans-text">' + esc(a.text) + "</span></span></button>";
        }).join("") + "</div>" + '<div class="explain" hidden aria-live="polite"></div></li>';
    }).join("");
    var more = ctx.lib.quizzes.filter(function (x) { return x !== q; }).slice(0, 4);
    return {
      title: q.title, description: q.description, image: q.image, cls: "p-quiz",
      html:
        '<header class="qhead" style="--c:' + esc(c.color) + '"><div class="wrap qhead-in"><div class="qhead-text">' +
        crumbs(ctx, [["ქვიზები", "quizzes"], [c.name, "category/" + c.id]]) +
        '<h1 class="qhead-title">' + esc(q.title) + "</h1>" + (q.description ? '<p class="dek">' + esc(q.description) + "</p>" : "") +
        '<div class="qhead-foot">' + byline(ctx, q, '<span class="sep" aria-hidden="true"></span>' + total + " კითხვა") + shareBar(q.title) + "</div></div>" +
        (q.image ? '<div class="qhead-media">' + pic(ctx, q.image, 900, "") + '<span class="badge-quiz badge-lg">' + I.quiz + "ქვიზი</span></div>" : "") +
        "</div></header>" +
        '<div class="wrap cols"><div class="quiz" data-quiz style="--c:' + esc(c.color) + '">' +
        '<div class="qprog" data-qprog><span class="qprog-text"><b data-qprog-n>0</b> / ' + total + ' პასუხი</span><span class="qprog-bar"><i data-qprog-bar></i></span></div>' +
        '<ol class="qs">' + qs + "</ol>" +
        '<section class="result" data-result hidden aria-live="polite"></section>' +
        (q.imageCredit ? '<p class="credit-line">' + esc(q.imageCredit) + "</p>" : "") +
        jsonScript("quiz-data", { type: q.type, title: q.title, questions: q.questions, results: q.results }) +
        "</div>" + side(ctx, q) + "</div>" +
        (more.length ? '<section class="band band-last"><div class="wrap">' + sectionHead("კიდევ ქვიზები", ctx.url("quizzes"), "ყველა ქვიზი") + '<div class="grid4">' + more.map(function (i) { return gridCard(ctx, i); }).join("") + "</div></div></section>" : "")
    };
  };

  pages.article = function (ctx, id) {
    var a = ctx.lib.articles.filter(function (x) { return x.id === id; })[0];
    if (!a) return pages["404"](ctx);
    var c = cat(ctx, a.category), n = 0;
    var body = (a.blocks || []).map(function (b) {
      if (b.type === "p") return paras(b.text);
      if (b.type === "h") return '<h2 class="art-h">' + esc(b.text) + "</h2>";
      if (b.type === "quote") return "<blockquote><p>" + inline(b.text) + "</p>" + (b.by ? "<cite>" + esc(b.by) + "</cite>" : "") + "</blockquote>";
      if (b.type === "image") return figure(ctx, b.image, [b.caption, b.credit].filter(Boolean).join(" · "), 1200);
      if (b.type === "video") return video(ctx, b);
      if (b.type === "item") {
        n++;
        return '<section class="li"><h2 class="li-h"><span class="li-n">' + n + '</span><span>' + esc(b.title) + "</span></h2>" + (b.video ? video(ctx, { url: b.video, credit: b.credit }) : figure(ctx, b.image, b.credit, 1200)) + paras(b.text) + "</section>";
      }
      return "";
    }).join("");
    var related = ctx.lib.items.filter(function (i) { return i !== a && i.category === a.category; })
      .concat(ctx.lib.items.filter(function (i) { return i !== a && i.category !== a.category; })).slice(0, 4);
    var author = a.author || ctx.site.name;
    return {
      title: a.title, description: a.description, image: a.image, cls: "p-article",
      html: '<div class="readbar" data-readbar aria-hidden="true"><i></i></div>' +
        '<div class="wrap cols"><article class="art">' +
        crumbs(ctx, [[c.name, "category/" + c.id]]) +
        '<h1 class="art-title">' + esc(a.title) + "</h1>" + (a.description ? '<p class="dek">' + esc(a.description) + "</p>" : "") +
        '<div class="art-by">' + byline(ctx, a, '<span class="sep" aria-hidden="true"></span>' + readMinutes(a) + " წთ საკითხავი") + shareBar(a.title) + "</div>" +
        figure(ctx, a.image, a.imageCredit, 1400, "fig cover") +
        '<div class="art-body">' + body + "</div>" +
        '<div class="author-box"><span class="avatar avatar-lg" style="--c:' + esc(c.color) + '">' + esc(author.charAt(0)) + '</span><div><p class="ab-label">ავტორი</p><p class="ab-name">' + esc(author) + '</p><p class="ab-text">წერს ' + esc(ctx.site.name) + "-ისთვის: " + esc(c.name) + ".</p></div></div>" +
        '<div class="art-end"><span>მოგეწონა? გაუზიარე მეგობრებს</span>' + shareBar(a.title, "share-dark", true) + "</div>" +
        "</article>" + side(ctx) + "</div>" +
        (related.length ? '<section class="band band-last"><div class="wrap">' + sectionHead("შეიძლება მოგეწონოს") + '<div class="grid4">' + related.map(function (i) { return gridCard(ctx, i); }).join("") + "</div></div></section>" : "")
    };
  };

  function simplePage(key) {
    return function (ctx) {
      var p = (ctx.site.pages || {})[key];
      if (!p) return pages["404"](ctx);
      var extra = "";
      if (key === "contact") {
        if (p.email) extra += '<p class="contact-mail">ელ-ფოსტა: <strong class="selectable">' + esc(p.email) + "</strong></p>";
        if (p.formspree) extra += '<form class="form" action="https://formspree.io/f/' + esc(p.formspree) + '" method="POST"><label for="c-name">სახელი</label><input id="c-name" name="name" required><label for="c-mail">ელ-ფოსტა</label><input id="c-mail" type="email" name="email" required><label for="c-msg">შეტყობინება</label><textarea id="c-msg" name="message" rows="5" required></textarea><button class="btn">გაგზავნა</button></form>';
      }
      return {
        title: p.title + " · " + ctx.site.name, description: "", cls: "p-page",
        html: pageHead(ctx, { crumbs: [[p.title]], title: p.title }) + '<div class="wrap"><div class="prose">' + paras(p.body) + extra + "</div></div>"
      };
    };
  }
  pages.about = simplePage("about");
  pages.contact = simplePage("contact");
  pages.privacy = simplePage("privacy");
  pages["404"] = function (ctx) {
    return {
      title: "გვერდი ვერ მოიძებნა · " + ctx.site.name, description: "", cls: "p-page",
      html: '<div class="wrap nf"><p class="nf-code">404</p><h1 class="art-title">ეს გვერდი ვერ მოიძებნა</h1><p class="dek">შეიძლება წაიშალა ან მისამართი შეიცვალა.</p><a class="btn" href="' + ctx.url("home") + '">მთავარ გვერდზე</a></div>'
    };
  };

  function page(route, lib, ctx) {
    var parts = String(route || "home").replace(/^\/+|\/+$/g, "").split("/");
    var name = parts[0] || "home", arg = parts.slice(1).join("/");
    var fn = pages[name] || pages["404"];
    return fn(ctx, arg);
  }

  /* ---------- quiz results (used in the browser) ---------- */
  function scoreQuiz(quiz, picks) {
    var qs = quiz.questions || [];
    if (quiz.type === "trivia") {
      var score = 0;
      qs.forEach(function (q, i) { var a = (q.answers || [])[picks[i]]; if (a && a.correct) score++; });
      var rs = (quiz.results || []).slice().sort(function (a, b) { return (b.min || 0) - (a.min || 0); });
      var r = rs.filter(function (x) { return score >= (x.min || 0); })[0] || rs[rs.length - 1];
      return { result: r, score: score, total: qs.length };
    }
    var tally = {};
    qs.forEach(function (q, i) { var a = (q.answers || [])[picks[i]]; if (a && a.result) tally[a.result] = (tally[a.result] || 0) + 1; });
    var best = null;
    (quiz.results || []).forEach(function (r) { if (best === null || (tally[r.id] || 0) > (tally[best.id] || 0)) best = r; });
    return { result: best };
  }
  function resultCard(ctx, quiz, out) {
    var r = out.result || { title: "", text: "" };
    return '<div class="rc">' + (r.image ? '<div class="rc-media">' + pic(ctx, r.image, 1000, "") + "</div>" : "") +
      '<div class="rc-body"><p class="rc-label">შენ მიიღე:</p><h2 class="rc-title">' + esc(r.title) + "</h2>" +
      (quiz.type === "trivia" ? '<p class="rc-score"><strong>' + out.score + "/" + out.total + "</strong> სწორი პასუხი</p>" : "") +
      (r.text ? '<div class="rc-text">' + paras(r.text) + "</div>" : "") +
      '<div class="rc-foot"><p class="rc-share-label">გაუზიარე შედეგი</p>' + shareBar("მე მივიღე „" + r.title + "“ · " + quiz.title, "share-lg", true) +
      '<button class="btn-line" type="button" data-retake>' + I.redo + " თავიდან გავლა</button></div></div></div>";
  }

  /* ---------- checks (used by the Studio and build.js) ---------- */
  function validate(doc, site) {
    var errors = [], warnings = [];
    var cats = (site && site.categories || []).map(function (c) { return c.id; });
    if (!doc || typeof doc !== "object") return { errors: ["ფაილი ცარიელია ან დაზიანებულია."], warnings: [] };
    if (doc.kind !== "quiz" && doc.kind !== "article") errors.push('"kind" must be "quiz" or "article".');
    if (!doc.title) errors.push("Add a title.");
    if (!doc.id || !/^[a-z0-9-]+$/.test(doc.id)) errors.push("The web address may only use a–z, 0–9 and dashes.");
    if (!doc.category) errors.push("Choose a category.");
    else if (cats.length && cats.indexOf(doc.category) < 0) warnings.push('Category "' + doc.category + '" is not one of your Categories.');
    if (!doc.image) warnings.push("No cover image. Cards will show a colored placeholder.");
    if (doc.date && !/^\d{4}-\d{2}-\d{2}$/.test(doc.date)) errors.push("Date must look like 2026-09-23.");
    if (doc.kind === "quiz") {
      var qs = doc.questions || [], rs = doc.results || [];
      if (doc.type !== "personality" && doc.type !== "trivia") errors.push("Choose a quiz type.");
      if (!qs.length) errors.push("Add at least one question.");
      if (rs.length < (doc.type === "trivia" ? 1 : 2)) errors.push(doc.type === "trivia" ? "Add at least one result." : "Add at least two results.");
      var ids = rs.map(function (r) { return r.id; });
      rs.forEach(function (r, i) { if (!r.title) errors.push("Result " + (i + 1) + " needs a title."); });
      var used = {};
      qs.forEach(function (q, i) {
        var n = "Question " + (i + 1);
        var as = q.answers || [];
        if (!q.text) errors.push(n + " has no text.");
        if (as.length < 2) errors.push(n + " needs at least two answers.");
        as.forEach(function (a, j) {
          if (!a.text && !a.image) errors.push(n + ", answer " + (j + 1) + " is empty.");
          if (doc.type === "personality") {
            if (!a.result) errors.push(n + ", answer " + (j + 1) + ": choose which result it counts toward.");
            else if (ids.indexOf(a.result) < 0) errors.push(n + ", answer " + (j + 1) + " points to a result that no longer exists.");
            else used[a.result] = 1;
          }
        });
        if (doc.type === "trivia") {
          var right = as.filter(function (a) { return a.correct; }).length;
          if (right !== 1) errors.push(n + ": mark exactly one correct answer.");
        }
        var withImg = as.filter(function (a) { return a.image; }).length;
        if (withImg && withImg < as.length) warnings.push(n + ": only some answers have pictures. Pictures show only when every answer has one.");
      });
      if (doc.type === "personality") rs.forEach(function (r) { if (!used[r.id]) warnings.push('Result "' + (r.title || r.id) + '" can never be reached. No answer counts toward it.'); });
      if (doc.type === "trivia" && rs.length && !rs.some(function (r) { return (r.min || 0) === 0; })) errors.push("One result must start at score 0.");
    }
    if (doc.kind === "article") {
      if (!(doc.blocks || []).length) errors.push("Add some content blocks.");
    }
    return { errors: errors, warnings: warnings };
  }

  // Everything below is used by build.js and site.js.
  return {
    esc: esc, fmtDate: fmtDate, slugify: slugify, inline: inline, paras: paras, icons: I,
    buildLib: buildLib, makeCtx: makeCtx, pathOf: pathOf, itemRoute: itemRoute,
    page: page, shell: shell, rowCard: rowCard, gridCard: gridCard, search: search, searchResults: searchResults,
    scoreQuiz: scoreQuiz, resultCard: resultCard, validate: validate, pic: pic
  };
});
