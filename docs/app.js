(function () {
  "use strict";
  var C = window.CONTENT;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var preview = params.has("preview") || location.hash === "#preview" || window.PREVIEW === true; // add ?preview to the link to skip the countdown while testing

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function show(id) { $(id).hidden = false; }
  function leave(id, next) {
    var el = $(id);
    el.classList.add("leaving");
    setTimeout(function () { el.hidden = true; el.classList.remove("leaving"); if (next) next(); }, 480);
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function todo(label) { return '<span class="todo">✎ write something here' + (label ? " — " + label : "") + "</span>"; }

  /* ── 1. countdown gate ── */
  var unlockAt = new Date(C.unlockAt).getTime();
  function startGate() {
    if (preview || Date.now() >= unlockAt) return startLock();
    show("gate");
    var tick = function () {
      var left = unlockAt - Date.now();
      if (left <= 0) { clearInterval(t); leave("gate", startLock); return; }
      var s = Math.floor(left / 1000);
      $("cd-h").textContent = String(Math.floor(s / 3600)).padStart(2, "0");
      $("cd-m").textContent = String(Math.floor(s / 60) % 60).padStart(2, "0");
      $("cd-s").textContent = String(s % 60).padStart(2, "0");
    };
    var t = setInterval(tick, 1000); tick();
  }

  /* ── 2. lock question ── */
  function startLock() {
    if (store("ammarah-unlocked") === "1") return startEnvelope();
    show("lock");
    $("lock-q").textContent = C.lock.question;
    var tries = 0, box = $("lock-options");
    C.lock.options.forEach(function (opt, i) {
      var b = document.createElement("button");
      b.textContent = opt;
      b.onclick = function () {
        if (i === C.lock.correct) {
          b.classList.add("right");
          document.querySelector(".padlock").classList.add("open");
          $("lock-msg").textContent = "you remembered 🤍";
          store("ammarah-unlocked", "1");
          setTimeout(function () { leave("lock", startEnvelope); }, 1100);
        } else {
          b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
          $("lock-msg").textContent = C.lock.wrong[Math.min(tries, C.lock.wrong.length - 1)];
          tries++;
        }
      };
      box.appendChild(b);
    });
  }

  /* ── 3. envelope ── */
  function startEnvelope() {
    show("envelope");
    $("env-btn").onclick = function () {
      this.classList.add("open");
      this.onclick = null;
      setTimeout(function () {
        leave("envelope", function () {
          document.body.classList.remove("locked");
          show("site");
          window.scrollTo(0, 0);
          confetti(160);
          observe();
        });
      }, 1500);
    };
  }

  /* ── 4. build the page ── */
  function photos(list, id) {
    var html = list.map(function (p, i) {
      var tilt = i % 2 ? "tilt-r" : "tilt-l";
      return '<figure class="polaroid ' + tilt + ' reveal"><img loading="lazy" src="' + p.src + '" alt="">' +
        "<figcaption>" + (p.caption ? esc(p.caption) : todo()) + "</figcaption></figure>";
    }).join("");
    $(id).innerHTML = html;
  }
  photos(C.childhood, "childhood");
  photos(C.now, "now");

  $("letter-body").innerHTML = C.letter.trim()
    ? C.letter.trim().split(/\n\s*\n/).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join("")
    : todo("the letter goes here");

  // reasons
  var flipped = 0;
  $("reasons").innerHTML = C.reasons.map(function (r, i) {
    return '<button class="card reveal" aria-label="Reason ' + (i + 1) + '"><span class="front">' + (i + 1) +
      '</span><span class="back">' + (r ? esc(r) : "✎") + "</span></button>";
  }).join("");
  var counter = document.createElement("p");
  counter.className = "hand reasons-count";
  $("reasons").after(counter);
  function updateCount() {
    counter.textContent = flipped < C.reasons.length
      ? flipped + " / " + C.reasons.length + " opened"
      : "that's all 21. (i had more, but they didn't fit.)";
  }
  updateCount();
  Array.prototype.forEach.call($("reasons").children, function (card) {
    card.onclick = function () {
      if (!card.classList.contains("seen")) { card.classList.add("seen"); flipped++; updateCount(); if (flipped === C.reasons.length) confetti(120); }
      card.classList.toggle("flipped");
    };
  });

  // facts
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
  function buildFacts() {
    var born = new Date(C.birthDate).getTime(), met = new Date(C.metDate).getTime(), now = Date.now();
    var days = (now - born) / 864e5;
    var list = [
      [fmt(Math.floor(days)), "days you've been alive", ""],
      [fmt(days * 24), "hours of being you", ""],
      ["~" + fmt(days * 24 * 60 * 80 / 1e6) + " million", "heartbeats, give or take", ""],
      ["~" + fmt(days / 29.53), "full moons you've lived under", ""],
      ["~19.7 billion km", "travelled through space, just by being on Earth", "wide"],
      ["21", "trips around the sun", ""],
      ["Saturday", "the day of the week you were born", ""],
      ["Scorpio", "which explains a few things", ""],
      ["Topaz & citrine", "your birthstones (November)", ""],
      ["Chrysanthemum", "your birth flower", ""],
      [fmt(Math.max(0, Math.floor((now - met) / 864e5))), "days since 27th April 2026, the best day of my year", "wide"]
    ];
    $("facts").innerHTML = list.map(function (f) {
      return '<div class="fact reveal ' + f[2] + '"><b>' + f[0] + "</b><span>" + f[1] + "</span></div>";
    }).join("");
  }
  buildFacts();

  // cake
  var candlesEl = $("candles"), out = 0;
  for (var i = 0; i < 21; i++) {
    var c = document.createElement("button");
    c.className = "candle"; c.setAttribute("aria-label", "candle");
    c.onclick = function () { blowOne(this); };
    candlesEl.appendChild(c);
  }
  function blowOne(c) {
    if (c.classList.contains("out")) return;
    c.classList.add("out"); out++;
    if (out === 21) {
      $("blow-btn").hidden = true; $("cake-hint").textContent = "all 21. close your eyes for a second.";
      $("wish-done").hidden = false; confetti(220);
      if (navigator.vibrate) try { navigator.vibrate([60, 40, 60]); } catch (e) {}
    }
  }
  function blowSome(n) {
    var lit = Array.prototype.filter.call(candlesEl.children, function (c) { return !c.classList.contains("out"); });
    lit.sort(function () { return Math.random() - .5; }).slice(0, n).forEach(function (c, i) {
      setTimeout(function () { blowOne(c); }, i * 60);
    });
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

  // ending
  $("signoff").textContent = C.signoff;

  /* ── reveal on scroll ── */
  function observe() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ── tiny confetti ── */
  var cv = $("confetti"), cx = cv.getContext("2d"), bits = [], running = false;
  var colors = ["#f1d3d6", "#dcd5ea", "#d4e1d3", "#f4e8c8", "#a9a7ae", "#c58f99"];
  function confetti(n) {
    var dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    n = Math.min(n, 140);
    for (var i = 0; i < n; i++) bits.push({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .5,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6,
      vx: -1 + Math.random() * 2, vy: 3 + Math.random() * 3.5, vr: -.1 + Math.random() * .2,
      c: colors[i % colors.length]
    });
    if (!running) { running = true; requestAnimationFrame(draw); }
  }
  function draw() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    bits = bits.filter(function (b) { return b.y < innerHeight + 30; });
    bits.forEach(function (b) {
      b.x += b.vx + Math.sin(b.y / 40); b.y += b.vy; b.r += b.vr;
      cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r); cx.fillStyle = b.c;
      cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r))); cx.restore();
    });
    if (bits.length) requestAnimationFrame(draw); else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  startGate();
})();
