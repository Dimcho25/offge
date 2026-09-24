/* ============================================================
   ქვიზო: browser behaviour (menu, quizzes, sharing, search).
   Needs render.js loaded first. No need to edit.
   ============================================================ */
(function () {
  "use strict";
  var KV = window.KV;
  var doc = document;

  /* ---------- context for this page ---------- */
  var PREVIEW = window.KV_PREVIEW || null; // set by the Studio / single-file preview
  var lib, ctx;
  function staticCtx() {
    var base = doc.documentElement.getAttribute("data-base") || "";
    var site = window.SITE || { name: "", categories: [] };
    lib = KV.buildLib(site, window.KV_INDEX || []);
    ctx = KV.makeCtx(lib, { base: base, route: doc.documentElement.getAttribute("data-route") || "home" });
  }

  /* ---------- relative dates ---------- */
  function relDates(root) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    root.querySelectorAll("time[data-rel]").forEach(function (t) {
      var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t.getAttribute("datetime") || "");
      if (!m) return;
      var d = new Date(+m[1], +m[2] - 1, +m[3]);
      var days = Math.round((today - d) / 864e5);
      if (days === 0) t.textContent = "დღეს";
      else if (days === 1) t.textContent = "გუშინ";
      else if (days > 1 && days < 7) t.textContent = days + " დღის წინ";
    });
  }

  /* ---------- sharing ---------- */
  function pageUrl() {
    var u = location.href.split("#")[0];
    return PREVIEW ? location.href : u;
  }
  function wireShare(root) {
    root.querySelectorAll("[data-share]").forEach(function (box) {
      var title = box.getAttribute("data-title") || doc.title;
      var url = pageUrl();
      box.querySelectorAll("[data-net]").forEach(function (a) {
        var net = a.getAttribute("data-net");
        if (net === "facebook") a.href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);
        if (net === "x") a.href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(title) + "&url=" + encodeURIComponent(url);
        if (net === "copy") a.onclick = function () {
          var label = a.querySelector(".sh-done");
          var show = function (text) { if (label) label.textContent = text; a.classList.add("copied"); setTimeout(function () { a.classList.remove("copied"); }, 1800); };
          var fail = function () { show("ვერ დაკოპირდა"); };
          try { navigator.clipboard.writeText(url).then(function () { show("დაკოპირდა"); }, fail); } catch (e) { fail(); }
        };
      });
    });
  }

  /* ---------- menu drawer ---------- */
  function wireDrawer(root) {
    var d = root.querySelector("[data-drawer]"), open = root.querySelector("[data-drawer-open]");
    if (!d || !open) return;
    var set = function (on) {
      d.hidden = !on; open.setAttribute("aria-expanded", String(on));
      doc.body.classList.toggle("no-scroll", on);
    };
    open.onclick = function () { set(true); };
    d.querySelectorAll("[data-drawer-close]").forEach(function (b) { b.onclick = function () { set(false); }; });
    d.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape" && !d.hidden) set(false); });
  }

  /* ---------- category filters on list pages ---------- */
  function wireFilters(root) {
    var grid = root.querySelector("[data-filter-grid]");
    if (!grid) return;
    var empty = root.querySelector("[data-filter-empty]");
    root.querySelectorAll(".flt").forEach(function (b) {
      b.onclick = function () {
        var f = b.getAttribute("data-filter");
        root.querySelectorAll(".flt").forEach(function (x) { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
        var shown = 0;
        grid.querySelectorAll("[data-cat]").forEach(function (card) {
          var on = !f || card.getAttribute("data-cat") === f;
          card.hidden = !on; if (on) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      };
    });
  }

  /* ---------- search ---------- */
  function wireSearch(root) {
    root.querySelectorAll("[data-search]").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        var q = (f.querySelector("input[name=q]").value || "").trim();
        if (PREVIEW) { e.preventDefault(); location.hash = "#/search/" + encodeURIComponent(q); }
      });
    });
    var box = root.querySelector("[data-search-results]");
    if (box && !PREVIEW) {
      var q = new URLSearchParams(location.search).get("q") || "";
      var input = root.querySelector("#page-q"); if (input) input.value = q;
      box.innerHTML = KV.searchResults(ctx, q, q ? KV.search(lib.items, q) : []);
      relDates(box);
    }
  }

  /* ---------- quiz engine ---------- */
  function wireQuiz(root) {
    var el = root.querySelector("[data-quiz]"), dataEl = root.querySelector("#quiz-data");
    if (!el || !dataEl) return;
    var quiz = JSON.parse(dataEl.textContent);
    var picks = {}, total = (quiz.questions || []).length;
    var resultBox = el.querySelector("[data-result]");
    var progN = root.querySelector("[data-qprog-n]"), progBar = root.querySelector("[data-qprog-bar]");
    function updateProg() {
      var n = Object.keys(picks).length;
      if (progN) progN.textContent = n;
      if (progBar) progBar.style.width = (total ? n / total * 100 : 0) + "%";
    }

    function nextOpen(from) {
      for (var i = from + 1; i < total; i++) if (!(i in picks)) return el.querySelector('.q[data-q="' + i + '"]');
      for (var j = 0; j < total; j++) if (!(j in picks)) return el.querySelector('.q[data-q="' + j + '"]');
      return null;
    }
    el.addEventListener("click", function (e) {
      var b = e.target.closest(".ans");
      if (!b || b.disabled) return;
      var qEl = b.closest(".q"), qi = +qEl.getAttribute("data-q"), ai = +b.getAttribute("data-a");
      var q = quiz.questions[qi];
      if (quiz.type === "trivia" && qi in picks) return;
      var first = !(qi in picks);
      picks[qi] = ai;
      updateProg();
      qEl.classList.add("done");
      qEl.querySelectorAll(".ans").forEach(function (x, j) {
        x.classList.toggle("sel", j === ai);
        x.setAttribute("aria-pressed", String(j === ai));
        if (quiz.type === "trivia") {
          x.disabled = true;
          if (q.answers[j].correct) x.classList.add("right");
          else if (j === ai) x.classList.add("wrong");
        }
      });
      if (quiz.type === "trivia") {
        var ok = q.answers[ai] && q.answers[ai].correct;
        var ex = qEl.querySelector(".explain");
        ex.innerHTML = '<strong class="' + (ok ? "ok" : "no") + '">' + (ok ? "სწორია!" : "არასწორია.") + "</strong> " + (q.explain ? KV.inline(q.explain) : "");
        ex.hidden = false;
      }
      if (Object.keys(picks).length === total) { showResult(); return; }
      if (first) {
        var nx = nextOpen(qi);
        if (nx) setTimeout(function () { nx.scrollIntoView({ behavior: smooth(), block: "start" }); }, quiz.type === "trivia" ? 900 : 350);
      }
    });
    function showResult() {
      var out = KV.scoreQuiz(quiz, picks);
      resultBox.innerHTML = KV.resultCard(ctx, quiz, out);
      resultBox.hidden = false;
      wireShare(resultBox);
      resultBox.querySelector("[data-retake]").onclick = reset;
      setTimeout(function () { resultBox.scrollIntoView({ behavior: smooth(), block: "start" }); }, 350);
    }
    function reset() {
      picks = {};
      el.querySelectorAll(".q").forEach(function (qEl) {
        qEl.classList.remove("done");
        var ex = qEl.querySelector(".explain"); ex.hidden = true; ex.innerHTML = "";
        qEl.querySelectorAll(".ans").forEach(function (x) { x.disabled = false; x.className = "ans"; x.setAttribute("aria-pressed", "false"); });
      });
      resultBox.hidden = true; resultBox.innerHTML = "";
      updateProg();
      var q0 = el.querySelector(".q"); if (q0) q0.scrollIntoView({ behavior: smooth(), block: "start" });
    }
  }
  function smooth() { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"; }

  /* ---------- opening the site straight from a folder (file://) ---------- */
  function fixFileLinks(root) {
    if (location.protocol !== "file:") return;
    root.querySelectorAll("a[href]").forEach(function (a) {
      var h = a.getAttribute("href");
      if (/^(https?:|#|mailto:|tel:)/.test(h)) return;
      var parts = h.split("?");
      if (/\/$/.test(parts[0]) || parts[0] === "" || parts[0] === "./") a.setAttribute("href", (parts[0] === "" ? "./" : parts[0]) + "index.html" + (parts[1] ? "?" + parts[1] : ""));
    });
    root.querySelectorAll("form[action]").forEach(function (f) {
      var h = f.getAttribute("action");
      if (/\/$/.test(h)) f.setAttribute("action", h + "index.html");
    });
  }

  /* ---------- today's date, reading bar, back to top ---------- */
  var DAYS = ["კვირა", "ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი"];
  var MONTHS = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
  function wireToday(root) {
    var d = new Date();
    root.querySelectorAll("[data-today]").forEach(function (el) { el.textContent = DAYS[d.getDay()] + ", " + d.getDate() + " " + MONTHS[d.getMonth()] + ", " + d.getFullYear(); });
    root.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = d.getFullYear(); });
    root.querySelectorAll("[data-to-top]").forEach(function (b) { b.onclick = function () { window.scrollTo({ top: 0, behavior: smooth() }); }; });
  }
  var scrollBound = false;
  function wireReadbar() {
    if (scrollBound) return;
    scrollBound = true;
    var tick = false;
    window.addEventListener("scroll", function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () {
        tick = false;
        var bar = doc.querySelector("[data-readbar] i"), art = doc.querySelector(".art-body");
        if (!bar || !art) return;
        var r = art.getBoundingClientRect(), h = r.height - window.innerHeight * 0.6;
        var p = Math.min(1, Math.max(0, -r.top / (h > 0 ? h : 1)));
        bar.style.width = (p * 100) + "%";
      });
    }, { passive: true });
  }

  function init(root) {
    wireToday(root); wireReadbar();
    relDates(root); wireShare(root); wireDrawer(root); wireFilters(root); wireSearch(root); wireQuiz(root); fixFileLinks(root);
  }

  /* ---------- preview mode: whole site in one page, #/addresses ---------- */
  function startPreview() {
    lib = KV.buildLib(PREVIEW.site, PREVIEW.docs);
    var mount = doc.getElementById("kv-root");
    function render() {
      var route = decodeURIComponent(location.hash.replace(/^#\/?/, "")) || PREVIEW.route || "home";
      ctx = KV.makeCtx(lib, { mode: "preview", assetBase: PREVIEW.assetBase || "", route: route });
      var p = KV.page(route, lib, ctx);
      if (route.indexOf("search") === 0) p = KV.page("search/" + encodeURIComponent(route.split("/").slice(1).join("/")), lib, ctx);
      mount.innerHTML = KV.shell(p, ctx);
      doc.title = p.title;
      init(mount);
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", render);
    render();
  }

  if (PREVIEW) startPreview();
  else { staticCtx(); init(doc); }
})();
