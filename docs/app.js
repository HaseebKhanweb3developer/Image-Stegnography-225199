(function () {
  "use strict";
  var C = window.CONTENT;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var preview = params.has("preview") || location.hash === "#preview" || window.PREVIEW === true;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function show(id) { $(id).hidden = false; }
  function leave(id, next) {
    var el = $(id);
    el.classList.add("leaving");
    setTimeout(function () { el.hidden = true; el.classList.remove("leaving"); if (next) next(); }, 520);
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  /* ───────── 1. countdown ───────── */
  var unlockAt = new Date(C.unlockAt).getTime();
  function startGate() {
    if (preview || Date.now() >= unlockAt) return startLock();
    show("gate");
    var t;
    var tick = function () {
      var left = unlockAt - Date.now();
      if (left <= 0) { clearInterval(t); confetti(120); leave("gate", startLock); return; }
      var s = Math.floor(left / 1000);
      $("cd-h").textContent = String(Math.floor(s / 3600)).padStart(2, "0");
      $("cd-m").textContent = String(Math.floor(s / 60) % 60).padStart(2, "0");
      $("cd-s").textContent = String(s % 60).padStart(2, "0");
    };
    t = setInterval(tick, 1000); tick();
  }

  /* ───────── 2. lock ───────── */
  function startLock() {
    if (store("ammarah-unlocked") === "1") return startEnvelope();
    show("lock");
    $("lock-q").textContent = C.lock.question;
    var tries = 0, box = $("lock-options");
    C.lock.options.forEach(function (opt, i) {
      var b = document.createElement("button");
      b.textContent = opt;
      b.style.animationDelay = (0.15 + i * 0.1) + "s";
      b.onclick = function () {
        if (i === C.lock.correct) {
          b.classList.add("right");
          document.querySelector(".padlock").classList.add("open");
          $("lock-msg").textContent = "you remembered 🤍";
          store("ammarah-unlocked", "1");
          buzz(40);
          hearts(b);
          setTimeout(function () { leave("lock", startEnvelope); }, 1300);
        } else {
          b.classList.remove("wrong"); b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; b.classList.add("wrong");
          b.style.opacity = 1;
          $("lock-msg").textContent = C.lock.wrong[Math.min(tries, C.lock.wrong.length - 1)];
          buzz([20, 40, 20]);
          tries++;
        }
      };
      box.appendChild(b);
    });
  }

  /* ───────── 3. envelope ───────── */
  function startEnvelope() {
    show("envelope");
    $("env-btn").onclick = function () {
      this.classList.add("open");
      $("envelope").classList.add("opened");
      this.onclick = null;
      buzz(30);
      setTimeout(function () {
        leave("envelope", function () {
          document.body.classList.remove("locked");
          show("site");
          window.scrollTo(0, 0);
          confetti(150);
          observe();
        });
      }, 2800);
    };
  }

  /* ───────── chapter 1: polaroids ───────── */
  $("childhood").innerHTML = C.childhood.map(function (p) {
    return '<figure class="polaroid reveal"><div class="ph"><img loading="lazy" src="' + p.src + '" alt="" data-zoom data-cap="' + esc(p.caption || "") + '"></div>' +
      "<figcaption>" + esc(p.caption || "") + "</figcaption></figure>";
  }).join("");

  /* ───────── chapter 2: swipe deck ───────── */
  var deck = $("deck"), order = C.now.map(function (_, i) { return i; }), cards = [];
  C.now.forEach(function (p, i) {
    var d = document.createElement("div");
    d.className = "dcard";
    d.innerHTML = '<img src="' + p.src + '" alt="" ' + (i > 2 ? 'loading="lazy"' : "") + ">";
    deck.appendChild(d); cards.push(d);
  });
  var tilts = [-3, 2.5, -1.5, 3, -2.5, 1.5, -3.5, 2];
  function layout() {
    order.forEach(function (idx, pos) {
      var c = cards[idx];
      c.style.zIndex = 100 - pos;
      c.style.transform = pos === 0 ? "rotate(0deg)" :
        "translate(" + (pos % 2 ? 8 : -8) * Math.min(pos, 3) + "px," + Math.min(pos, 3) * 10 + "px) rotate(" + tilts[idx % tilts.length] + "deg) scale(" + (1 - Math.min(pos, 3) * 0.04) + ")";
      c.style.opacity = pos > 3 ? 0 : 1;
    });
    var top = order[0];
    $("deck-caption").textContent = C.now[top].caption || "";
    $("deck-count").textContent = (top + 1) + " / " + C.now.length;
  }
  function advance(dir) {
    var top = cards[order[0]];
    top.style.transform = "translate(" + (dir * 130) + "%, -4%) rotate(" + (dir * 24) + "deg)";
    top.style.opacity = 0;
    setTimeout(function () {
      if (dir > 0 || dir < 0) { order.push(order.shift()); }
      top.style.transition = "none"; layout(); void top.offsetWidth; top.style.transition = "";
    }, 330);
  }
  function back() {
    order.unshift(order.pop());
    var c = cards[order[0]];
    c.style.transition = "none"; c.style.transform = "translate(-130%,-4%) rotate(-24deg)"; c.style.opacity = 0;
    void c.offsetWidth; c.style.transition = ""; layout();
  }
  $("deck-next").onclick = function () { advance(1); };
  $("deck-prev").onclick = back;
  (function drag() {
    var sx = 0, sy = 0, dx = 0, active = null, moved = false;
    deck.addEventListener("pointerdown", function (e) {
      active = cards[order[0]]; if (e.target.closest(".dcard") !== active) { active = null; return; }
      sx = e.clientX; sy = e.clientY; dx = 0; moved = false; active.classList.add("dragging");
      try { active.setPointerCapture(e.pointerId); } catch (er) {}
    });
    deck.addEventListener("pointermove", function (e) {
      if (!active) return;
      dx = e.clientX - sx; var dy = e.clientY - sy;
      if (Math.abs(dx) > 6) moved = true;
      active.style.transform = "translate(" + dx + "px," + dy * 0.2 + "px) rotate(" + dx / 14 + "deg)";
    });
    function end() {
      if (!active) return;
      var a = active; active = null; a.classList.remove("dragging");
      if (Math.abs(dx) > 80) advance(dx > 0 ? 1 : -1);
      else { layout(); if (!moved) openLightbox(C.now[order[0]].src, C.now[order[0]].caption); }
    }
    deck.addEventListener("pointerup", end);
    deck.addEventListener("pointercancel", function () { if (active) { active.classList.remove("dragging"); active = null; layout(); } });
  })();
  layout();

  /* ───────── lightbox ───────── */
  function openLightbox(src, cap) {
    $("lb-img").src = src; $("lb-cap").textContent = cap || "";
    show("lightbox");
  }
  document.addEventListener("click", function (e) {
    var pol = e.target.closest(".polaroid");
    var z = pol ? pol.querySelector("img") : e.target.closest("[data-zoom]");
    if (z) openLightbox(z.getAttribute("src"), z.getAttribute("data-cap"));
  });
  $("lightbox").onclick = function (e) { if (e.target !== $("lb-img")) $("lightbox").hidden = true; };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("lightbox").hidden = true; });

  /* ───────── chapter 3: letter ───────── */
  var paras = C.letter.trim().split(/\n\s*\n/);
  $("letter-body").innerHTML = paras.map(function (p) { return '<p class="reveal">' + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("");
  $("letter-open").onclick = function () {
    this.hidden = true; show("letter"); buzz(20);
    observe();
  };

  /* ───────── chapter 4: reasons ───────── */
  var flipped = 0, total = C.reasons.length;
  $("reasons").innerHTML = C.reasons.map(function (r, i) {
    return '<button class="card" aria-label="Reason ' + (i + 1) + '"><span class="front"><b>' + (i + 1) + '</b><i>tap</i></span><span class="back">' + esc(r) + "</span></button>";
  }).join("");
  function updateCount() {
    $("reasons-bar").style.width = (flipped / total * 100) + "%";
    $("reasons-count").textContent = flipped < total
      ? flipped + " of " + total + " opened"
      : "all 21. (i had more, but they didn't fit.)";
  }
  updateCount();
  Array.prototype.forEach.call($("reasons").children, function (card, i) {
    card.style.transitionDelay = (i % 3) * 0.06 + "s";
    card.onclick = function () {
      card.style.transitionDelay = "0s";
      if (!card.classList.contains("seen")) { card.classList.add("seen"); flipped++; updateCount(); if (flipped === total) { confetti(140); buzz([40, 30, 40]); } }
      card.classList.toggle("flipped");
    };
  });

  /* ───────── chapter 5: games ───────── */
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (t) {
    t.onclick = function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("on", x === t); });
      $("game-memory").hidden = t.dataset.tab !== "memory";
      $("game-quiz").hidden = t.dataset.tab !== "quiz";
    };
  });

  // memory
  function memoryGame() {
    var box = $("memory"), first = null, lock = false, moves = 0, found = 0;
    var deckArr = shuffle(C.memory.concat(C.memory));
    box.innerHTML = deckArr.map(function (src) {
      return '<button class="mcard" data-src="' + src + '" aria-label="card"><span class="mf">A</span><span class="mb"><img src="' + src + '" alt="" loading="lazy"></span></button>';
    }).join("");
    $("memory-status").textContent = "find all " + C.memory.length + " pairs";
    Array.prototype.forEach.call(box.children, function (c) {
      c.onclick = function () {
        if (lock || c === first || c.classList.contains("done")) return;
        c.classList.add("up");
        if (!first) { first = c; return; }
        moves++;
        if (first.dataset.src === c.dataset.src) {
          first.classList.add("done"); c.classList.add("done"); first = null; found++; buzz(25);
          $("memory-status").textContent = found < C.memory.length ? found + " of " + C.memory.length + " pairs · " + moves + " tries" : "all pairs in " + moves + " tries. you're good at finding us 🤍";
          if (found === C.memory.length) confetti(140);
        } else {
          lock = true; var f = first; first = null;
          setTimeout(function () { f.classList.remove("up"); c.classList.remove("up"); lock = false; }, 800);
          $("memory-status").textContent = found + " of " + C.memory.length + " pairs · " + moves + " tries";
        }
      };
    });
  }
  $("memory-reset").onclick = memoryGame;
  memoryGame();

  // quiz
  function quiz() {
    var i = 0, score = 0, box = $("quiz");
    function render() {
      if (i >= C.quiz.length) {
        box.innerHTML = '<div class="qcard qdone"><p class="qmeta"><span>your score</span><span></span></p><p class="score">' + score + " / " + C.quiz.length +
          '</p><p class="qreply">' + (score === C.quiz.length ? "full marks. obviously you know us." : "not bad. you still win, by default.") +
          '</p><button class="link-btn" id="q-again">play again</button></div>';
        $("q-again").onclick = function () { i = 0; score = 0; render(); };
        if (score === C.quiz.length) confetti(120);
        return;
      }
      var q = C.quiz[i];
      box.innerHTML = '<div class="qcard"><p class="qmeta"><span>question ' + (i + 1) + " of " + C.quiz.length + "</span><span>" + score + ' ♡</span></p><h3>' + esc(q.q) +
        '</h3><div class="qopts">' + q.options.map(function (o, k) { return '<button data-k="' + k + '">' + esc(o) + "</button>"; }).join("") +
        '</div><p class="qreply" aria-live="polite"></p></div>';
      Array.prototype.forEach.call(box.querySelectorAll(".qopts button"), function (b) {
        b.onclick = function () {
          var k = +b.dataset.k, ok = q.correct === -1 || k === q.correct;
          box.querySelectorAll(".qopts button").forEach(function (x, xi) {
            x.disabled = true;
            if (q.correct === -1 ? xi === k : xi === q.correct) x.classList.add("right");
          });
          if (!ok) b.classList.add("wrong"); else score++;
          box.querySelector(".qreply").textContent = ok ? q.yes : q.no;
          var n = document.createElement("button");
          n.className = "btn qnext"; n.textContent = i + 1 < C.quiz.length ? "next →" : "see score";
          n.onclick = function () { i++; render(); };
          box.querySelector(".qcard").appendChild(n);
          buzz(ok ? 25 : [20, 40, 20]);
        };
      });
    }
    render();
  }
  quiz();

  /* ───────── chapter 6: facts ───────── */
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
  var born = new Date(C.birthDate).getTime(), met = new Date(C.metDate).getTime(), now = Date.now();
  var days = (now - born) / 864e5;
  var facts = [
    { n: Math.floor(days), t: "days you've been alive" },
    { n: days * 24, t: "hours of being you" },
    { n: days * 24 * 60 * 80 / 1e6, pre: "~", suf: " million", t: "heartbeats, give or take" },
    { n: days / 29.53, pre: "~", t: "full moons you've lived under" },
    { s: "~19.7 billion km", t: "travelled through space, just by being on Earth", c: "wide accent" },
    { n: 21, t: "trips around the sun" },
    { s: "Saturday", t: "the day of the week you were born" },
    { s: "Scorpio", t: "which explains a few things" },
    { s: "Topaz & citrine", t: "your birthstones (November)" },
    { s: "Chrysanthemum", t: "your birth flower", c: "wide" },
    { n: Math.max(0, Math.floor((now - met) / 864e5)), t: "days since we first met, 27th April 2026", c: "wide accent" }
  ];
  $("facts").innerHTML = facts.map(function (f, i) {
    return '<div class="fact reveal ' + (f.c || "") + '"><b data-i="' + i + '">' + (f.s || (f.pre || "") + "0" + (f.suf || "")) + "</b><span>" + f.t + "</span></div>";
  }).join("");
  function countUp(el) {
    var f = facts[+el.dataset.i]; if (!f || f.s) return;
    var start = null, dur = 1600;
    (function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (f.pre || "") + fmt(f.n * e) + (f.suf || "");
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
    if (reduce) el.textContent = (f.pre || "") + fmt(f.n) + (f.suf || "");
  }

  /* ───────── chapter 7: cake ───────── */
  var candlesEl = $("candles"), out = 0;
  for (var ci = 0; ci < 21; ci++) {
    var cd = document.createElement("button");
    cd.className = "candle"; cd.setAttribute("aria-label", "candle " + (ci + 1));
    cd.onclick = function () { blowOne(this); };
    candlesEl.appendChild(cd);
  }
  function blowOne(c) {
    if (c.classList.contains("out")) return;
    c.classList.add("out"); out++;
    if (out === 21) {
      $("blow-btn").hidden = true; $("cake-hint").textContent = "all 21. close your eyes for a second.";
      $("wish-done").hidden = false; confetti(220); buzz([60, 40, 60]);
    }
  }
  function blowSome(n) {
    var lit = Array.prototype.filter.call(candlesEl.children, function (c) { return !c.classList.contains("out"); });
    shuffle(lit).slice(0, n).forEach(function (c, i) { setTimeout(function () { blowOne(c); }, i * 70); });
  }
  $("blow-btn").onclick = function () {
    var btn = this;
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return blowSome(21);
    btn.textContent = "blow now…";
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var Ctx = window.AudioContext || window.webkitAudioContext, ctx = new Ctx();
      var an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      var data = new Uint8Array(an.fftSize), started = Date.now();
      (function listen() {
        an.getByteTimeDomainData(data);
        var sum = 0; for (var j = 0; j < data.length; j++) { var v = (data[j] - 128) / 128; sum += v * v; }
        if (Math.sqrt(sum / data.length) > 0.18) blowSome(3);
        if (out < 21 && Date.now() - started < 30000) requestAnimationFrame(listen);
        else { stream.getTracks().forEach(function (t) { t.stop(); }); ctx.close(); if (out < 21) btn.textContent = "blow 🌬️"; }
      })();
    }).catch(function () { blowSome(21); });
  };

  /* ───────── finale ───────── */
  var F = C.finale, dodge = 0;
  $("finale-q").textContent = F.question;
  $("yes-btn").textContent = F.yes;
  $("no-btn").textContent = F.no;
  function runAway(e) {
    var no = $("no-btn");
    if (dodge >= F.dodges.length - 1) { // gives up and becomes a yes
      no.textContent = F.dodges[F.dodges.length - 1]; no.classList.remove("ghost"); no.style.transform = "";
      no.onclick = sayYes; no.onpointerenter = no.ontouchstart = null; return;
    }
    if (e) e.preventDefault();
    no.textContent = F.dodges[dodge++];
    var box = $("finale-btns"), maxX = box.clientWidth - no.offsetWidth, maxY = box.clientHeight - no.offsetHeight;
    var yes = $("yes-btn"), minY = yes.offsetTop + yes.offsetHeight + 8;
    var tx = Math.random() * Math.max(0, maxX) - no.offsetLeft, ty = minY + Math.random() * Math.max(0, maxY - minY) - no.offsetTop;
    no.style.transform = "translate(" + tx + "px," + ty + "px) rotate(" + (Math.random() * 12 - 6) + "deg)";
    buzz(15);
  }
  $("no-btn").onpointerenter = function (e) { if (e.pointerType === "mouse") runAway(e); };
  $("no-btn").ontouchstart = runAway;
  $("no-btn").onclick = function (e) { runAway(e); };
  function sayYes() {
    $("finale-btns").hidden = true;
    $("finale-promise").textContent = F.after;
    $("signoff").textContent = C.signoff;
    show("finale-after");
    confetti(260, true); buzz([80, 50, 80, 50, 120]);
  }
  $("yes-btn").onclick = sayYes;

  /* ───────── reveal on scroll ───────── */
  var io = null;
  function observe() {
    var els = document.querySelectorAll(".reveal:not(.in), .polaroid:not(.in), .fact b:not(.counted)");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    document.documentElement.classList.add("js-reveal");
    if (!io) io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        if (t.tagName === "B") { t.classList.add("counted"); countUp(t); }
        else t.classList.add("in");
        io.unobserve(t);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ───────── ambient sky: slow floating hearts & dots ───────── */
  (function sky() {
    var cv = $("sky"), cx = cv.getContext("2d"), parts = [], W, H, dpr;
    var cols = ["#f2d0d6", "#dbd3ee", "#d2e2d4", "#c9c6cf", "#f5e9c9"];
    function size() { dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener("resize", size);
    var n = W < 500 ? 16 : 26;
    for (var i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, r: 3 + Math.random() * 7, v: .15 + Math.random() * .35, a: Math.random() * 6.28, h: Math.random() < .4, c: cols[i % cols.length] });
    function heart(x, y, s) {
      cx.beginPath(); cx.moveTo(x, y + s * .3);
      cx.bezierCurveTo(x, y, x - s, y, x - s, y + s * .35); cx.bezierCurveTo(x - s, y + s * .8, x, y + s, x, y + s * 1.25);
      cx.bezierCurveTo(x, y + s, x + s, y + s * .8, x + s, y + s * .35); cx.bezierCurveTo(x + s, y, x, y, x, y + s * .3); cx.fill();
    }
    function frame() {
      cx.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.y -= p.v; p.a += .01; var x = p.x + Math.sin(p.a) * 14;
        if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
        cx.globalAlpha = .75; cx.fillStyle = p.c;
        if (p.h) heart(x, p.y, p.r); else { cx.beginPath(); cx.arc(x, p.y, p.r * .55, 0, 6.28); cx.fill(); }
      });
      if (!document.hidden) requestAnimationFrame(frame); else setTimeout(function () { requestAnimationFrame(frame); }, 500);
    }
    if (!reduce) requestAnimationFrame(frame);
  })();

  /* ───────── confetti & heart bursts ───────── */
  var cv = $("confetti"), cx = cv.getContext("2d"), bits = [], running = false;
  var colors = ["#f2d0d6", "#dbd3ee", "#d2e2d4", "#f5e9c9", "#a7a4ae", "#c47f8d"];
  function sizeC() { var dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function confetti(n, withHearts) {
    if (reduce) return;
    sizeC(); n = Math.min(n, 180);
    for (var i = 0; i < n; i++) bits.push({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .4,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6,
      vx: -1 + Math.random() * 2, vy: 3 + Math.random() * 3.5, vr: -.1 + Math.random() * .2,
      c: colors[i % colors.length], heart: withHearts && i % 3 === 0
    });
    if (!running) { running = true; requestAnimationFrame(draw); }
  }
  function hearts(el) {
    if (reduce) return;
    sizeC(); var r = el.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    for (var i = 0; i < 24; i++) {
      var a = Math.random() * 6.28, s = 3 + Math.random() * 5;
      bits.push({ x: x0, y: y0, w: 10, h: 10, r: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, vr: 0, c: colors[5 - (i % 3)], heart: true, g: .18 });
    }
    if (!running) { running = true; requestAnimationFrame(draw); }
  }
  function draw() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    bits = bits.filter(function (b) { return b.y < innerHeight + 30 && b.y > -innerHeight; });
    bits.forEach(function (b) {
      if (b.g) b.vy += b.g;
      b.x += b.vx + (b.g ? 0 : Math.sin(b.y / 40)); b.y += b.vy; b.r += b.vr;
      cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r); cx.fillStyle = b.c;
      if (b.heart) { cx.font = "16px serif"; cx.fillText("♥", -6, 6); }
      else cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r)));
      cx.restore();
    });
    if (bits.length) requestAnimationFrame(draw); else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  startGate();
})();
