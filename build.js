#!/usr/bin/env node
/* ============================================================
   off.ge: build
   Reads content/ (edited in Pages CMS) and writes the finished website to _site/.
   GitHub runs this for you automatically on every upload.
   To run it on your own computer:  node build.js
   No packages to install. Needs Node.js 18 or newer.
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const KV = require("./assets/render.js");

const ROOT = __dirname;
const OUT = path.join(ROOT, "_site");
const problems = [];
const notes = [];

/* ---------- 1. settings (content/site.json + content/categories/*.json) ---------- */
function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/^\uFEFF/, ""));
}
// Accepts "dimcho25.github.io/offge", "https://off.ge/" etc. Returns "https://…" without a trailing slash, or "".
function cleanUrl(u) {
  u = String(u || "").trim().replace(/\/+$/, "");
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { new URL(u); return u; }
  catch (e) { notes.push(`! Site settings: "Website address" (${u}) doesn't look like a web address, so it was ignored.`); return ""; }
}
function loadSite() {
  let raw;
  try { raw = readJSON("content/site.json"); }
  catch (e) {
    console.error("\n✗ content/site.json could not be read: " + e.message + "\n  Open Site settings in Pages CMS and save it again.\n");
    process.exit(1);
  }
  const page = (p, fallback) => ({ title: (p && p.title) || fallback, body: (p && p.body) || "", email: p && p.email, formspree: p && p.formspree });
  const site = {
    name: raw.name || "off.ge",
    tagline: raw.tagline || "",
    logo: raw.logo || "",
    url: cleanUrl(raw.url),
    nav: (raw.nav || []).filter((n) => n && n.label && n.route).map((n) => ({ label: n.label, route: String(n.route).replace(/^\/+|\/+$/g, "") })),
    pages: { about: page(raw.about, "ჩვენ შესახებ"), contact: page(raw.contact, "კონტაქტი"), privacy: page(raw.privacy, "კონფიდენციალურობა") },
    footer: { social: (raw.social || []).filter((s) => s && s.label && s.url) }
  };
  // categories: one file each, sorted by "order"
  const dir = path.join(ROOT, "content", "categories");
  site.categories = (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => /\.json$/i.test(f)).map((f) => {
    try {
      const c = readJSON("content/categories/" + f);
      c.id = KV.slugify(c.id || f.replace(/\.json$/i, ""));
      c.color = /^#[0-9a-f]{3,8}$/i.test(c.color || "") ? c.color : "#555555";
      c.name = c.name || c.id;
      return c;
    } catch (e) { problems.push(`✗ content/categories/${f}: could not be read (${e.message}). Skipped.`); return null; }
  }).filter(Boolean).sort((a, b) => (+a.order || 999) - (+b.order || 999) || a.name.localeCompare(b.name));
  site.logo = resolveLogo(site);
  site.favicon = raw.favicon ? String(raw.favicon).replace(/^\/+/, "")
    : ["images/favicon.png", "images/favicon.svg", "images/favicon.ico"].filter((f) => fs.existsSync(path.join(ROOT, f)))[0] || "assets/icon.svg";
  return site;
}

// Your logo: the file chosen in Site settings, otherwise images/logo.svg / .png / .webp / .jpg, otherwise the placeholder.
function resolveLogo(site) {
  const tries = [];
  if (site.logo) tries.push(String(site.logo).replace(/^\/+/, ""));
  ["svg", "png", "webp", "jpg", "jpeg"].forEach((e) => tries.push("images/logo." + e));
  tries.push("images/logo-placeholder.svg");
  for (const t of tries) {
    if (/^https?:/.test(t)) return t;
    if (fs.existsSync(path.join(ROOT, t))) return t;
  }
  if (site.logo) notes.push(`! Site settings: logo file "${site.logo}" was not found. Showing the site name as text.`);
  return "";
}

/* ---------- 2. content files ---------- */
function readFolder(folder, kind, site) {
  const dir = path.join(ROOT, "content", folder);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".json")).sort().map((f) => {
    const rel = "content/" + folder + "/" + f;
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8").replace(/^\uFEFF/, ""));
    } catch (e) {
      problems.push(`✗ ${rel}: this is not a valid quiz/article file (${e.message}). Skipped.`);
      return null;
    }
    normalize(doc, kind, f);
    const check = KV.validate(doc, site);
    if (check.errors.length) {
      problems.push(`✗ ${rel} was skipped:\n    - ` + check.errors.join("\n    - "));
      return null;
    }
    check.warnings.forEach((w) => notes.push(`! ${rel}: ${w}`));
    doc._file = rel;
    return doc;
  }).filter(Boolean);
}

/* ---------- 2b. make CMS entries match what the templates expect ---------- */
function normalize(doc, kind, file) {
  doc.kind = doc.kind || kind;
  doc.id = KV.slugify(doc.slug || doc.id || doc.title || file.replace(/\.json$/i, ""));
  if (doc.category && typeof doc.category === "object") doc.category = doc.category.id || doc.category.name || "";
  if (typeof doc.category === "string" && /[\/.]/.test(doc.category)) doc.category = path.basename(doc.category).replace(/\.json$/i, "");
  if (doc.date) doc.date = String(doc.date).slice(0, 10);
  ["image", "imageCredit", "description", "author"].forEach((k) => { if (doc[k] == null) delete doc[k]; });
  if (doc.kind === "quiz") {
    doc.type = doc.type === "trivia" ? "trivia" : "personality";
    doc.results = (doc.results || []).filter(Boolean).map((r, i) => Object.assign({}, r, { id: r.id || "r" + (i + 1), min: Number(r.min) || 0 }));
    doc.questions = (doc.questions || []).filter(Boolean).map((q) => Object.assign({}, q, {
      answers: (q.answers || []).filter(Boolean).map((a) => {
        const out = Object.assign({}, a, { correct: a.correct === true || a.correct === "true" });
        // answers point to results by number ("1" = first result) in the CMS
        if (doc.type === "personality" && a.result != null && /^\d+$/.test(String(a.result))) {
          const r = doc.results[Number(a.result) - 1];
          out.result = r ? r.id : "missing-" + a.result;
        }
        return out;
      })
    }));
  }
  if (doc.kind === "article") doc.blocks = (doc.blocks || []).filter(Boolean).map((b) => Object.assign({}, b, { type: b.type || b._block || "p" }));
}

/* ---------- 3. pictures pasted into the Studio become real image files ---------- */
function extractMedia(value) {
  if (typeof value === "string") {
    const m = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,(.+)$/s.exec(value);
    if (!m) return value;
    const buf = Buffer.from(m[2], "base64");
    const ext = { jpeg: "jpg", jpg: "jpg", png: "png", webp: "webp", gif: "gif", "svg+xml": "svg" }[m[1]];
    const name = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16) + "." + ext;
    const dest = path.join(OUT, "media", name);
    if (!fs.existsSync(dest)) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, buf); }
    return "media/" + name;
  }
  if (Array.isArray(value)) return value.map(extractMedia);
  if (value && typeof value === "object") {
    const o = {};
    for (const k of Object.keys(value)) o[k] = extractMedia(value[k]);
    return o;
  }
  return value;
}

/* ---------- 4. helpers ---------- */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (f.startsWith(".")) continue;
    const s = path.join(src, f), d = path.join(dest, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}
const esc = KV.esc;
const FONTS = "https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wdth,wght@62.5..100,400..900&family=Noto+Serif+Georgian:wght@700..900&display=swap";

function ogImage(src, abs) {
  if (!src) return "";
  if (/^https:\/\/images\.unsplash\.com\//.test(src)) {
    const u = new URL(src); u.searchParams.set("w", "1200"); u.searchParams.set("h", "630"); u.searchParams.set("fit", "crop"); u.searchParams.set("auto", "format");
    return u.toString();
  }
  if (/^https?:/.test(src)) return src;
  return abs ? abs + String(src).replace(/^\/+/, "") : "";
}

function htmlDoc(p, ctx, route, version) {
  const site = ctx.site, base = ctx.base;
  const abs = site.url ? site.url.replace(/\/+$/, "") + "/" : "";
  const canonical = abs && route !== "404" ? abs + KV.pathOf(route) : "";
  const img = ogImage(p.image, abs);
  const isPost = /^(quiz|article)\//.test(route);
  const needsIndex = route === "search";
  return `<!DOCTYPE html>
<html lang="ka" data-base="${base}" data-route="${esc(route)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description || site.tagline || "")}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">\n` : ""}<meta property="og:type" content="${isPost ? "article" : "website"}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description || site.tagline || "")}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">\n` : ""}${img ? `<meta property="og:image" content="${esc(img)}">\n<meta name="twitter:card" content="summary_large_image">\n` : ""}<meta name="theme-color" content="#ffffff">
<link rel="icon" href="${base}${site.favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${base}assets/style.css?v=${version}">
</head>
<body>
${KV.shell(p, ctx)}
${needsIndex ? `<script src="${base}data/index.js?v=${version}"></script>\n` : ""}<script src="${base}assets/render.js?v=${version}"></script>
<script src="${base}assets/site.js?v=${version}"></script>
</body>
</html>
`;
}

/* ---------- 5. build ---------- */
function build() {
  const t0 = Date.now();
  const site = loadSite();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  let docs = readFolder("quizzes", "quiz", site).concat(readFolder("articles", "article", site));
  // same web address used twice → the older one keeps it, the newer one gets "-2"
  const seen = {};
  docs.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || a._file.localeCompare(b._file));
  docs = docs.filter((d) => {
    const key = d.kind + "/" + d.id;
    if (seen[key]) {
      let n = 2; while (seen[d.kind + "/" + d.id + "-" + n]) n++;
      notes.push(`! ${d._file} has the same web address as ${seen[key]}, so it was given "${d.id}-${n}". Set a different "Web address" in the CMS to choose your own.`);
      d.id = d.id + "-" + n;
    }
    seen[d.kind + "/" + d.id] = d._file; return true;
  });
  docs = docs.map((d) => { const { _file, ...rest } = d; return extractMedia(rest); });

  copyDir(path.join(ROOT, "assets"), path.join(OUT, "assets"));
  copyDir(path.join(ROOT, "images"), path.join(OUT, "images"));

  const version = crypto.createHash("sha1").update(["style.css", "render.js", "site.js"].map((f) => fs.readFileSync(path.join(ROOT, "assets", f))).join("")).digest("hex").slice(0, 8);
  const lib = KV.buildLib(site, docs);

  const routes = ["home", "quizzes", "articles", "trending", "search", "404"]
    .concat(Object.keys(site.pages || {}).filter((k) => ["about", "contact", "privacy"].includes(k)))
    .concat(site.categories.map((c) => "category/" + c.id))
    .concat(lib.items.map((i) => KV.itemRoute(i)));

  for (const route of routes) {
    let base;
    if (route === "404") {
      try { base = site.url ? new URL(site.url + "/").pathname : "/"; } catch (e) { base = "/"; }
    } else {
      base = "../".repeat(KV.pathOf(route).split("/").filter(Boolean).length);
    }
    const ctx = KV.makeCtx(lib, { base, route });
    const p = KV.page(route, lib, ctx);
    const file = route === "404" ? path.join(OUT, "404.html") : path.join(OUT, KV.pathOf(route), "index.html");
    write(file, htmlDoc(p, ctx, route, version));
  }

  // search index (small) + full library (for the Studio's "Load from my site")
  const index = lib.items.map((i) => ({
    kind: i.kind, id: i.id, title: i.title, description: i.description, category: i.category,
    date: i.date, image: i.image, trending: !!i.trending, featured: !!i.featured,
    qn: i.kind === "quiz" ? (i.questions || []).length : undefined
  }));
  const miniSite = { name: site.name, logo: site.logo, tagline: site.tagline, categories: site.categories, nav: site.nav, pages: site.pages, footer: site.footer };
  write(path.join(OUT, "data", "index.js"), "window.SITE=" + JSON.stringify(miniSite) + ";\nwindow.KV_INDEX=" + JSON.stringify(index) + ";\n");
  write(path.join(OUT, "data", "library.json"), JSON.stringify({ built: new Date().toISOString(), items: lib.items }));
  write(path.join(OUT, ".nojekyll"), "");

  if (site.url) {
    const abs = site.url.replace(/\/+$/, "") + "/";
    const urls = routes.filter((r) => r !== "404" && r !== "search").map((r) => `<url><loc>${esc(abs + KV.pathOf(r))}</loc></url>`);
    write(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
    write(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${abs}sitemap.xml\n`);
  }

  // report
  console.log(`\n${site.name}: ${lib.quizzes.length} quizzes, ${lib.articles.length} articles, ${routes.length} pages → _site/  (${Date.now() - t0} ms)`);
  if (notes.length) console.log("\nNotes:\n" + notes.join("\n"));
  if (problems.length) {
    console.log("\nFiles that need fixing (the rest of the site was still published):\n" + problems.join("\n"));
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "### Files that need fixing\n\n```\n" + problems.join("\n") + "\n```\n");
    }
  }
  console.log("");
}

build();
