(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Header shadow + scroll progress + back-to-top ---- */
  var header = document.getElementById('siteHeader');
  var progress = document.getElementById('scrollProgress');
  var toTop = document.getElementById('toTop');
  // brand gradients whose warm focal point slides left -> right on scroll:
  //  - top-of-page heroes track scroll from the top
  //  - mid-page gradient sections track their own progress through the viewport
  var topGrads = [].slice.call(document.querySelectorAll('.hero, .page-hero'));
  var midGrads = [].slice.call(document.querySelectorAll('.section-gradient'));
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---- Parallax depth: conflict-free wrappers move at their own rate as they
     scroll through the viewport. Driven from onScroll, which Lenis fires every
     frame during inertia, so it stays in sync with the smooth scroll. ---- */
  var parallaxItems = [];
  if (!reduceMotion) {
    var heroAside = document.querySelector('.hero-aside');
    if (heroAside) parallaxItems.push({ el: heroAside, speed: 0.10, max: 64 });
    [].slice.call(document.querySelectorAll(
      '#trust > .container, #problem > .container, #flywheel > .container, #showcase > .container, #meet-ray > .container, #proof > .container, #pricing > .container, #get-started > .container'
    )).forEach(function (c) { parallaxItems.push({ el: c, speed: 0.035, max: 20 }); });
  }
  function updateParallax() {
    if (!parallaxItems.length) return;
    var vc = window.innerHeight / 2;
    for (var i = 0; i < parallaxItems.length; i++) {
      var p = parallaxItems[i];
      var r = p.el.getBoundingClientRect();
      var off = (vc - (r.top + r.height / 2)) * p.speed;
      if (off > p.max) off = p.max; else if (off < -p.max) off = -p.max;
      p.el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
    }
  }

  var lastY = window.scrollY;
  function updateHeaderVisibility(y) {
    // always show near the top; otherwise hide on scroll-down, reveal on scroll-up
    if (y < 80) { header.classList.remove('hide'); }
    else if (Math.abs(y - lastY) > 5) {
      header.classList.toggle('hide', y > lastY);
    }
    lastY = y;
  }

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('scrolled', y > 12);
    updateHeaderVisibility(y);

    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docH > 0 ? (y / docH) * 100 : 0;
    progress.style.width = pct + '%';

    // slide the warm focal point left -> right across the brand gradients
    var vh = window.innerHeight;
    for (var i = 0; i < topGrads.length; i++) {
      topGrads[i].style.setProperty('--hsp', clamp01(y / vh).toFixed(4));
    }
    for (var j = 0; j < midGrads.length; j++) {
      var r = midGrads[j].getBoundingClientRect();
      midGrads[j].style.setProperty('--hsp', clamp01((vh - r.top) / (vh + r.height)).toFixed(4));
    }

    updateParallax();
    toTop.classList.toggle('show', y > 600);
    updateSpy();
  }
  // rAF-throttle: coalesce burst scroll events into one update per frame
  var scrollTicking = false;
  function onScrollRaf() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () { onScroll(); scrollTicking = false; });
  }
  window.addEventListener('scroll', onScrollRaf, { passive: true });

  // Only run the idle gradient animation while its section is on-screen, so
  // off-screen gradients aren't repainted every frame (saves CPU/GPU + battery).
  if ('IntersectionObserver' in window && !reduceMotion) {
    var gradAnimObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.style.animationPlayState = en.isIntersecting ? 'running' : 'paused';
      });
    }, { rootMargin: '120px' });
    topGrads.concat(midGrads).forEach(function (el) {
      el.style.animationPlayState = 'paused';
      gradAnimObs.observe(el);
    });
  }

  toTop.addEventListener('click', function () {
    if (window.__lenis) window.__lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---- Smooth inertia scrolling (dapper-style) via Lenis, loaded on demand ---- */
  if (!reduceMotion) {
    var ls = document.createElement('script');
    ls.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js';
    ls.onload = function () {
      if (!window.Lenis) return;
      var lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.6 });
      window.__lenis = lenis;
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      // route in-page anchor links through Lenis so they ease instead of jump
      document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          var id = a.getAttribute('href');
          if (id.length > 1 && document.querySelector(id)) {
            e.preventDefault();
            lenis.scrollTo(id, { offset: -90 });
          }
        });
      });
    };
    document.head.appendChild(ls);
  }

  /* ---- Hero sub: reveal line-by-line (detect visual line breaks, mask each) ---- */
  (function () {
    var sub = document.querySelector('.hero-sub');
    if (!sub) return;
    var text = sub.textContent.replace(/\s+/g, ' ').trim();
    function build(animate) {
      // lay each word out as an inline span so we can read where lines wrap
      sub.textContent = '';
      var words = text.split(' ');
      var spans = words.map(function (w, i) {
        var s = document.createElement('span');
        s.textContent = w + (i < words.length - 1 ? ' ' : '');
        sub.appendChild(s);
        return s;
      });
      var lines = [], cur = null, top = null;
      spans.forEach(function (s) {
        var t = s.offsetTop;
        if (top === null || t - top > 2) { cur = []; lines.push(cur); top = t; }
        cur.push(s.textContent);
      });
      // rebuild as one masked, sliding line per visual line
      sub.textContent = '';
      lines.forEach(function (parts, i) {
        var mask = document.createElement('span');
        mask.className = 'line-reveal';
        var inner = document.createElement('span');
        inner.className = 'line-reveal-in';
        inner.textContent = parts.join('').replace(/\s+$/, '');
        if (animate && !reduceMotion) {
          inner.style.animationDelay = (0.36 + i * 0.11).toFixed(2) + 's';
        } else {
          inner.style.animation = 'none';
          inner.style.transform = 'none';
        }
        mask.appendChild(inner);
        sub.appendChild(mask);
      });
    }
    build(true);
    // re-split (without re-animating) on resize so wrapping stays correct and never clips
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { build(false); }, 160);
    }, { passive: true });
  })();

  /* ---- Scroll-spy nav highlighting ---- */
  var navLinks = [].slice.call(document.querySelectorAll('.nav-link'));
  var spyTargets = navLinks
    .map(function (a) {
      var id = a.getAttribute('href');
      var el = id && id.charAt(0) === '#' ? document.querySelector(id) : null;
      return el ? { link: a, el: el } : null;
    })
    .filter(Boolean);

  function updateSpy() {
    if (!spyTargets.length) return; // inner pages: keep the partials-set active nav item
    var pos = window.scrollY + window.innerHeight * 0.35;
    var current = null;
    spyTargets.forEach(function (t) {
      if (t.el.offsetTop <= pos) current = t;
    });
    navLinks.forEach(function (a) { a.classList.remove('active'); });
    if (current) current.link.classList.add('active');
  }

  /* ---- Mobile menu ---- */
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  hamburger.addEventListener('click', function () {
    var open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
  });
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---- Toast helper ---- */
  var toast = document.getElementById('toast');
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  document.querySelectorAll('[data-toast]').forEach(function (el) {
    el.addEventListener('click', function () { showToast(el.getAttribute('data-toast')); });
  });
  document.querySelectorAll('[data-action="login"]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); showToast('Log in — prototype only'); });
  });
  document.querySelectorAll('.plan .plan-cta').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showToast('Selected the ' + btn.closest('.plan').querySelector('.plan-name').textContent + ' plan');
    });
  });

  /* ---- Industry chips → toast ---- */
  document.querySelectorAll('.hero-aside .chip').forEach(function (chip) {
    if (chip.classList.contains('chip-more')) {
      chip.addEventListener('click', function () { showToast('20+ industries supported'); });
    } else {
      chip.addEventListener('click', function () { showToast('Built for ' + chip.textContent.trim()); });
    }
  });

  /* ---- Count-up + progress-bar fill on reveal ---- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var dur = 1200, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    // safety: guarantee the final value even if rAF is throttled
    setTimeout(function () { el.textContent = target + suffix; }, dur + 250);
  }

  /* ---- Unified scroll reveal ---- */
  var revealEls = [].slice.call(document.querySelectorAll(
    '.section-head, .problem-card, .fw-card, .ray-feat, .chat, .ray-features, .trust-title, .logos-row, .trust-backed, .placeholder, .case-study, .doc-page, .closing-inner, .compare-col'
  ));
  revealEls.forEach(function (el) { el.classList.add('reveal'); });
  // plans keep their own transform (scale), so fade only
  var fadeEls = [].slice.call(document.querySelectorAll('.plan'));
  fadeEls.forEach(function (el) { el.classList.add('reveal-fade'); });
  revealEls = revealEls.concat(fadeEls);

  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        // stagger siblings within a grid
        var sibs = [].slice.call(el.parentNode.children).filter(function (c) { return c.classList.contains('reveal') || c.classList.contains('reveal-fade'); });
        var idx = sibs.indexOf(el);
        el.style.transitionDelay = (Math.max(idx, 0) % 4 * 0.05) + 's';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
    // fail-open: if IntersectionObserver never delivers (throttled/hidden tab), never leave content hidden
    setTimeout(function () {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    }, 3500);

    // count-ups + bar fills
    var numObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.hasAttribute('data-count')) countUp(el);
        if (el.hasAttribute('data-fill')) el.style.width = el.getAttribute('data-fill') + '%';
        numObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-count],[data-fill]').forEach(function (el) { numObs.observe(el); });
    // fail-open: ensure final numbers/bars even if the observer never fires
    setTimeout(function () {
      document.querySelectorAll('[data-count]').forEach(function (el) {
        if (!el.dataset.done) el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
      });
      document.querySelectorAll('[data-fill]').forEach(function (el) {
        if (el.style.width === '0%' || !el.style.width) el.style.width = el.getAttribute('data-fill') + '%';
      });
    }, 4000);
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
    document.querySelectorAll('[data-count]').forEach(function (el) {
      el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || '');
    });
    document.querySelectorAll('[data-fill]').forEach(function (el) { el.style.width = el.getAttribute('data-fill') + '%'; });
  }

  /* ---- Pointer tilt on mockups ---- */
  function addTilt(el, max) {
    if (reduceMotion || window.matchMedia('(hover: none)').matches) return;
    var raf = null;
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        el.style.transform = 'rotateY(' + (px * max) + 'deg) rotateX(' + (-py * max) + 'deg) translateY(-4px)';
      });
    });
    el.addEventListener('mouseleave', function () {
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = '';
    });
  }
  var tc = document.getElementById('tenderCard');
  if (tc) addTilt(tc, 7);
  document.querySelectorAll('.device-card').forEach(function (d) { addTilt(d, 9); });

  /* ---- Tabs (solutions) ---- */
  var tabBtns = [].slice.call(document.querySelectorAll('.tab-btn'));
  if (tabBtns.length) {
    function activateTab(id) {
      tabBtns.forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-tab') === id); });
      document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.toggle('active', p.id === id); });
    }
    tabBtns.forEach(function (b) {
      b.addEventListener('click', function () { activateTab(b.getAttribute('data-tab')); });
    });
    if (location.hash) {
      var id = location.hash.slice(1);
      var el = document.getElementById(id);
      if (el && el.classList.contains('tab-panel')) activateTab(id);
    }
  }

  /* ---- Billing toggle (pricing) ---- */
  var billing = document.getElementById('billingToggle');
  if (billing) {
    var btOpts = [].slice.call(billing.querySelectorAll('.bt-opt'));
    btOpts.forEach(function (o) {
      o.addEventListener('click', function () {
        btOpts.forEach(function (x) { x.classList.remove('active'); });
        o.classList.add('active');
        var annual = o.getAttribute('data-billing') === 'annual';
        document.querySelectorAll('[data-monthly]').forEach(function (el) {
          el.textContent = el.getAttribute(annual ? 'data-annual' : 'data-monthly');
        });
        var note = document.getElementById('billingNote');
        if (note) note.textContent = annual ? 'billed annually · save 17%' : 'billed monthly';
      });
    });
  }

  /* ---- FAQ accordions ---- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
    });
  });

  /* ---- Output showcase rail ---- */
  var rail = document.getElementById('showcaseRail');
  if (rail) {
    var prev = document.getElementById('railPrev');
    var next = document.getElementById('railNext');
    function railStep() {
      var card = rail.querySelector('.doc-page');
      var w = card ? card.getBoundingClientRect().width : 320;
      return w + 28; // card + gap
    }
    if (prev) prev.addEventListener('click', function () { rail.scrollBy({ left: -railStep(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { rail.scrollBy({ left: railStep(), behavior: 'smooth' }); });
  }

  /* ---- Ray chat ---- */
  var chatForm = document.getElementById('chatForm');
  var chatInput = document.getElementById('chatInput');
  var chatBody = document.getElementById('chatBody');

  var rayReplies = [
    "On it. I'll draft that from your Westgate Bridge methodology and flag anything that needs a human review.",
    "Done — I've pulled matching content from your library. Want me to insert it into the submission?",
    "Good question. Based on the RFT, that section maps to ISO 45001. I've pre-filled 4 of 6 requirements.",
    "I'd recommend BID. Capability fit is strong; the only watch-item is the bond requirement in clause 14.3.",
    "I've scheduled that task and assigned it to the tender lead. Nothing will slip past the deadline."
  ];
  var replyIndex = 0;
  function scrollChat() { chatBody.scrollTop = chatBody.scrollHeight; }

  function addUserMessage(text) {
    var wrap = document.createElement('div');
    wrap.className = 'msg msg-user';
    wrap.innerHTML =
      '<div class="msg-col msg-col-right"><div class="msg-bubble msg-bubble-user"></div></div>' +
      '<span class="msg-avatar msg-avatar-user">Y</span>';
    wrap.querySelector('.msg-bubble-user').textContent = text;
    chatBody.appendChild(wrap); scrollChat();
  }
  function addTyping() {
    var wrap = document.createElement('div');
    wrap.className = 'msg msg-ray'; wrap.id = 'typingIndicator';
    wrap.innerHTML =
      '<span class="msg-avatar">R</span>' +
      '<div class="msg-col"><div class="typing-bubble"><span></span><span></span><span></span></div></div>';
    chatBody.appendChild(wrap); scrollChat();
  }
  function addRayMessage(text) {
    var wrap = document.createElement('div');
    wrap.className = 'msg msg-ray';
    wrap.innerHTML =
      '<span class="msg-avatar">R</span>' +
      '<div class="msg-col"><span class="msg-name">Ray</span>' +
      '<div class="msg-bubble msg-bubble-ray"><p></p></div></div>';
    wrap.querySelector('p').textContent = text;
    chatBody.appendChild(wrap); scrollChat();
  }
  if (chatForm) chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = chatInput.value.trim();
    if (!text) return;
    addUserMessage(text);
    chatInput.value = '';
    addTyping();
    setTimeout(function () {
      var t = document.getElementById('typingIndicator');
      if (t) t.remove();
      addRayMessage(rayReplies[replyIndex % rayReplies.length]);
      replyIndex++;
    }, 1100);
  });

  onScroll();
})();
