/* Портфолио Ромы: сборка страницы, звёзды, след курсоров, рамки выделения, счётчики, видео, 3D */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var mobile = window.innerWidth < 720;
  var starAcc = getComputedStyle(doc).getPropertyValue("--star-acc").trim() || "#c7647a";
  var COLORS = ["#8fb4ff", "#aab3dc", "#6f9cf5", "#b8d6ff", "#c3bce8", "#d9e2f5"];   // след и рамки: палитра сайта
  var BUILD = ["#e7a3b3", "#e8c98a", "#9fc7d9", "#b9a6d9", "#a9d3b5"];              // курсоры сборки разноцветные, как в ролике
  var scriptSrc = (document.currentScript && document.currentScript.src) || location.href;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function cursorSVG(c, w) {
    w = w || 19;
    return '<svg viewBox="0 0 16 18" width="' + w + '" height="' + Math.round(w * 1.1) + '"><path d="M1 1 L14 8 L8 9.6 L5.4 16 Z" fill="' + c +
      '" stroke="#0b0809" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  }
  function cursorEl(c, w) { var s = document.createElement("span"); s.className = "cur"; s.innerHTML = cursorSVG(c, w); return s; }

  /* ---------- звёзды: точки и крестики, мерцают, иногда падают ---------- */
  var cv = $("#sky");
  var ctx = cv.getContext("2d");
  var stars = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var COUNT = mobile ? 64 : 110;
  var SCALE = mobile ? 1.35 : 1;               // на телефоне звёзды крупнее, чтобы их было видно
  var meteor = null, nextMeteor = 2500;

  function size() {
    var w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight;
    // смена только высоты (панель браузера на телефоне) не трогает холст: без рывков
    if (W && w === W && Math.abs(h - H) < 200) return false;
    W = w; H = h;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }
  function makeStars() {
    stars = [];
    for (var i = 0; i < COUNT; i++) {
      stars.push({
        x: Math.random(), y: Math.random(),
        r: (Math.random() * 1.3 + .45) * SCALE,
        cross: Math.random() < .3,
        ph: Math.random() * Math.PI * 2,
        sp: .5 + Math.random() * 1.4,
        vy: (Math.random() * .6 + .2) / (mobile ? 6000 : 10000),
        red: Math.random() < .2
      });
    }
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (!reduce) { s.y -= s.vy; if (s.y < -.02) s.y = 1.02; }
      var a = reduce ? .6 : .2 + .8 * (.5 + .5 * Math.sin(t / 1000 * s.sp + s.ph));
      var x = s.x * W, y = s.y * H;
      ctx.globalAlpha = a;
      ctx.fillStyle = ctx.strokeStyle = s.red ? starAcc : "#f2eff0";
      if (s.cross) {
        var l = s.r * 3.2;
        ctx.lineWidth = mobile ? 1.2 : 1;
        ctx.beginPath(); ctx.moveTo(x - l, y); ctx.lineTo(x + l, y); ctx.moveTo(x, y - l); ctx.lineTo(x, y + l); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.283); ctx.fill();
      }
    }
    // падающая звезда раз в несколько секунд
    if (!reduce) {
      if (!meteor && t > nextMeteor) {
        meteor = { x: Math.random() * W * .8 + W * .1, y: Math.random() * H * .35, t0: t, len: mobile ? 90 : 140 };
        nextMeteor = t + 3500 + Math.random() * 4000;
      }
      if (meteor) {
        var p = (t - meteor.t0) / 900;
        if (p >= 1) meteor = null;
        else {
          var mx = meteor.x + p * meteor.len * 2.2, my = meteor.y + p * meteor.len * 1.1;
          var g = ctx.createLinearGradient(mx, my, mx - meteor.len, my - meteor.len * .5);
          g.addColorStop(0, "rgba(246,238,240," + (1 - p) + ")"); g.addColorStop(1, "rgba(246,238,240,0)");
          ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - meteor.len, my - meteor.len * .5); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  var running = true;
  function loop(t) { if (!running) return; draw(t); requestAnimationFrame(loop); }
  size(); makeStars();
  if (reduce) draw(0); else requestAnimationFrame(loop);
  window.addEventListener("resize", function () { if (size()) { if (reduce) draw(0); } });
  window.addEventListener("load", function () { W = 0; size(); if (reduce) draw(0); });
  document.addEventListener("visibilitychange", function () {
    if (reduce) return;
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });

  /* ---------- след из цветных курсоров: мышь и палец ---------- */
  if (!reduce) {
    var trail = $("#trail");
    var last = 0, lx = -99, ly = -99, ci = 0, live = 0, MAX = mobile ? 16 : 30;
    var spawn = function (x, y, small) {
      if (live >= MAX) return;
      live++;
      var el = cursorEl(COLORS[ci++ % COLORS.length], small ? 16 : 19);
      trail.appendChild(el);
      var ox = (Math.random() - .5) * 40, oy = 10 + Math.random() * 30, rot = (Math.random() - .5) * 50;
      var bx = x + (small ? -8 : 10), by = y + (small ? -26 : 8);   // под пальцем курсор не виден, ставим выше
      var anim = el.animate([
        { transform: "translate(" + bx + "px," + by + "px) rotate(0deg) scale(1)", opacity: .95 },
        { transform: "translate(" + (bx + ox) + "px," + (by + oy) + "px) rotate(" + rot + "deg) scale(.55)", opacity: 0 }
      ], { duration: small ? 1100 : 1500, easing: "cubic-bezier(.2,.7,.2,1)" });
      anim.onfinish = function () { el.remove(); live--; };
    };
    var near = function (x, y, gap, dist) {
      var now = performance.now(), dx = x - lx, dy = y - ly;
      if (now - last < gap || dx * dx + dy * dy < dist * dist) return false;
      last = now; lx = x; ly = y; return true;
    };
    if (finePointer) {
      window.addEventListener("pointermove", function (e) {
        if (e.pointerType === "mouse" && near(e.clientX, e.clientY, 45, 20)) spawn(e.clientX, e.clientY, false);
      }, { passive: true });
    }
    window.addEventListener("touchstart", function (e) {
      var t = e.touches[0]; if (!t) return; last = 0; near(t.clientX, t.clientY, 0, 0); spawn(t.clientX, t.clientY, true);
    }, { passive: true });
    window.addEventListener("touchmove", function (e) {
      var t = e.touches[0]; if (t && near(t.clientX, t.clientY, 55, 16)) spawn(t.clientX, t.clientY, true);
    }, { passive: true });
  }

  /* ---------- полоса прокрутки ---------- */
  var prog = $("#prog"), progQueued = false;
  function progUpdate() {
    progQueued = false;
    var max = doc.scrollHeight - window.innerHeight;
    prog.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
  }
  window.addEventListener("scroll", function () { if (!progQueued) { progQueued = true; requestAnimationFrame(progUpdate); } }, { passive: true });
  progUpdate();

  /* ---------- сборка первого экрана, как в ролике (первый визит) ---------- */
  if (doc.classList.contains("building")) buildIntro();

  function buildIntro() {
    try { localStorage.setItem("ra-built", "1"); } catch (e) {}
    var k = mobile ? .62 : 1;                       // на телефоне быстрее и легче
    var ov = document.createElement("div");
    ov.className = "bld"; ov.setAttribute("aria-hidden", "true");
    var skip = document.createElement("button");
    skip.className = "bld__skip"; skip.type = "button"; skip.textContent = "Пропустить";
    var vh = window.innerHeight, timers = [], done = false;
    var at = function (ms, fn) { timers.push(setTimeout(fn, ms * k)); };
    var rect = function (el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh * 1.05 && r.width > 0 ? r : null; };
    var put = function (el, r, pad) {
      pad = pad || 0;
      el.style.left = (r.left - pad) + "px"; el.style.top = (r.top - pad) + "px";
      el.style.width = (r.width + pad * 2) + "px"; el.style.height = (r.height + pad * 2) + "px";
      ov.appendChild(el); return el;
    };
    var box = function (r, mod, delay) {
      var b = document.createElement("div"); b.className = "bld__box" + (mod ? " bld__box--" + mod : "");
      b.style.animationDelay = (delay * k) + "ms"; return put(b, r);
    };
    var sel = function (r, delay) {
      var s = document.createElement("div"); s.className = "bld__sel";
      s.innerHTML = "<i></i><i></i><i></i><i></i><b>" + Math.round(r.width) + " × " + Math.round(r.height) + "</b>";
      s.style.animationDelay = (delay * k) + "ms"; return put(s, r, 5);
    };
    var drag = function (el, r, fx, fy, fr, delay, color) {
      el.classList.add("bld__drag");
      el.style.setProperty("--fx", fx + "px"); el.style.setProperty("--fy", fy + "px"); el.style.setProperty("--fr", (fr || 0) + "deg");
      el.style.animationDelay = (delay * k) + "ms"; el.style.animationDuration = (900 * k) + "ms";
      el.appendChild(cursorEl(color, 20));
      return put(el, r);
    };

    var parts = {
      bar: $(".top__bar"), word: $(".hero__word"), hello: $(".hello"), name: $(".name span"), pill: $(".pill"),
      lead: $(".hero__lead"), btns: $(".hero__btns"), stats: $(".stats"), photo: $(".portrait__frame")
    };
    var R = {};
    Object.keys(parts).forEach(function (key) { if (parts[key]) R[key] = rect(parts[key]); });
    var cards = $$(".mini__card").map(rect).filter(Boolean);

    // 1. серый каркас
    var order = ["bar", "word", "hello", "pill", "lead", "btns", "stats", "photo"], d = 0;
    order.forEach(function (key) { if (R[key]) { var b = box(R[key], key === "word" ? "word" : "", d); d += 60; if (key === "word") b.style.setProperty("--fs", getComputedStyle(parts.word).fontSize); } });
    cards.forEach(function (r) { box(r, "", d); d += 60; });
    if (R.name) box(R.name, "", 120);

    // 2. синие рамки с размерами
    var selOrder = ["word", "name", "lead", "photo"], sd = 380;
    selOrder.forEach(function (key) { if (R[key]) { sel(R[key], sd); sd += mobile ? 150 : 220; } });

    // 3. курсоры перетаскивают плашку, фото и карточки на места
    if (R.name) {
      var plate = document.createElement("div"); plate.className = "bld__plate"; plate.textContent = "РОМА.";
      drag(plate, R.name, mobile ? -90 : -180, mobile ? 70 : 110, -5, 500, "#e7a3b3");
    }
    if (R.photo) {
      var ph = document.createElement("div"); ph.className = "bld__ghost bld__ghost--photo";
      drag(ph, R.photo, mobile ? 60 : 140, mobile ? 50 : 90, 3, 700, "#9fc7d9");
    }
    cards.forEach(function (r, i) {
      var g = document.createElement("div"); g.className = "bld__ghost";
      g.innerHTML = "<span>0" + (i + 1) + "</span>";
      drag(g, r, mobile ? 70 : 160, mobile ? -30 : -60 + i * 20, 4, 850 + i * 160, BUILD[(i + 2) % BUILD.length]);
    });

    // 4. текст описания печатается с мигающей кареткой
    if (R.lead) {
      var tp = document.createElement("div"); tp.className = "bld__type";
      tp.style.left = R.lead.left + "px"; tp.style.top = (R.lead.top + 6) + "px"; tp.style.maxWidth = R.lead.width + "px";
      var text = mobile ? "Помогу с интернетом" : "Помогу со всем, что происходит в интернете";
      at(900, function () {
        ov.appendChild(tp);
        var i = 0, step = function () { if (done) return; tp.firstChild ? (tp.firstChild.nodeValue = text.slice(0, ++i)) : tp.appendChild(document.createTextNode(text.slice(0, ++i))); if (i < text.length) timers.push(setTimeout(step, 26)); };
        step();
      });
    }

    document.body.appendChild(ov);
    document.body.appendChild(skip);

    var finish = function (fast) {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      doc.classList.remove("building");            // настоящий дизайн проявляется под каркасом
      ov.style.transitionDuration = fast ? ".25s" : ".5s";
      ov.classList.add("bld--out"); skip.classList.add("bld__skip--out");
      setTimeout(function () { ov.remove(); skip.remove(); }, fast ? 300 : 560);
      document.removeEventListener("keydown", onKey);
    };
    var onKey = function (e) { if (e.key === "Escape") finish(true); };
    skip.addEventListener("click", function () { finish(true); });
    document.addEventListener("keydown", onKey);
    at(2450, function () { finish(false); });
  }

  /* ---------- блоки при прокрутке: синяя рамка с размером, потом содержимое ---------- */
  var items = $$(".reveal");
  function frame(el, i) {
    if (el.tagName === "OL") return;
    var head = el.classList.contains("sec__head");
    var s = document.createElement("span"); s.className = "sel"; s.setAttribute("aria-hidden", "true");
    var r = el.getBoundingClientRect();
    s.innerHTML = "<i></i><i></i><i></i><i></i>" + (head || !mobile ? "<b>" + Math.round(r.width) + " × " + Math.round(r.height) + "</b>" : "");
    if (head) s.appendChild(cursorEl(COLORS[i % COLORS.length], 19));
    s.style.animationDelay = (i * 90) + "ms";
    if (mobile) s.style.animationDuration = ".9s";
    el.appendChild(s);
    s.addEventListener("animationend", function (e) { if (e.target === s) s.remove(); });
  }
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (en) {
      var n = 0;
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        var el = x.target, i = n++;
        frame(el, i);
        el.style.setProperty("--d", (mobile ? .2 : .3) + i * .09 + "s");
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: .12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- счётчики: 12, 4, 116 и цифры проектов набегают ---------- */
  var nums = $$(".stats dt, .proj__nums dt, .mcase__num b, .card__num b").filter(function (el) { return /^\d+$/.test(el.textContent.trim()); });
  function countUp(el) {
    var to = +el.textContent.trim(), t0 = performance.now(), dur = to > 100 ? 1400 : 1000;
    el.style.minWidth = el.getBoundingClientRect().width + "px";
    el.style.display = el.tagName === "B" ? "inline-block" : "";
    var tick = function (t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window && !reduce) {
    var cio = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { cio.unobserve(x.target); var el = x.target; setTimeout(function () { countUp(el); }, doc.classList.contains("building") ? 2300 * (mobile ? .62 : 1) : 250); } });
    }, { threshold: .6 });
    nums.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- видео лендингов: грузятся рядом с экраном, играют только на экране ---------- */
  var vids = $$(".vid video");
  vids.forEach(function (v) {
    var btn = v.parentNode.querySelector(".vid__btn");
    var show = function () {
      btn.setAttribute("aria-pressed", v.paused ? "true" : "false");
      btn.setAttribute("aria-label", v.paused ? "Запустить" : "Пауза");
    };
    v.userPaused = reduce;
    v.addEventListener("play", show); v.addEventListener("pause", show); show();
    btn.addEventListener("click", function () {
      if (v.paused) {
        v.userPaused = false;
        if (active && active !== v) active.pause();
        active = v; load(v); v.play().catch(function () {});
      } else { v.userPaused = true; v.pause(); if (active === v) active = null; }
    });
  });
  function load(v) { if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); } }
  // играет одно видео: то, что ближе к центру экрана (несколько сразу сажают Chrome на 30 кадров)
  var onScreen = [], active = null, pickQueued = false;
  function pick() {
    pickQueued = false;
    var mid = window.innerHeight / 2, best = null, bd = 1e9;
    onScreen.forEach(function (v) {
      if (v.userPaused) return;
      var r = v.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid) + Math.abs(r.left + r.width / 2 - window.innerWidth / 2) * .3;
      if (d < bd) { bd = d; best = v; }
    });
    if (best === active) return;
    if (active) active.pause();
    active = best;
    if (active) { load(active); active.play().catch(function () {}); }
  }
  function queuePick() { if (!pickQueued) { pickQueued = true; requestAnimationFrame(pick); } }
  if ("IntersectionObserver" in window) {
    var nearIO = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting && !reduce) { load(x.target); nearIO.unobserve(x.target); } });
    }, { rootMargin: "300px 0px" });
    var vis = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        var v = x.target, i = onScreen.indexOf(v);
        if (x.isIntersecting && i < 0) onScreen.push(v);
        if (!x.isIntersecting && i >= 0) { onScreen.splice(i, 1); v.pause(); if (active === v) active = null; }
      });
      queuePick();
    }, { threshold: .35 });
    vids.forEach(function (v) { nearIO.observe(v); vis.observe(v); });
    window.addEventListener("scroll", function () { if (onScreen.length) queuePick(); }, { passive: true });
  }

  /* ---------- 3D: грузится, только когда раздел рядом ---------- */
  var scenes = $$(".scene");
  if (scenes.length && "IntersectionObserver" in window) {
    var started = false;
    var sio = new IntersectionObserver(function (en) {
      if (started || !en.some(function (x) { return x.isIntersecting; })) return;
      started = true; sio.disconnect();
      import(new URL("scenes.js", scriptSrc).href).then(function (m) {
        scenes.forEach(function (el) { m.mount(el, { reduce: reduce, mobile: mobile }); });
      }).catch(function () { /* без WebGL остаётся статичная картинка */ });
    }, { rootMargin: "600px 0px" });
    scenes.forEach(function (el) { sio.observe(el); });
  }
})();
