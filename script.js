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
    if (heroAside) parallaxItems.push({ el: heroAside, speed: 0.065, max: 42 });
    [].slice.call(document.querySelectorAll(
      '#trust > .container, #problem > .container, #flywheel > .container, #showcase > .container, #meet-ray > .container, #proof > .container, #pricing > .container, #get-started > .container'
    )).forEach(function (c) { parallaxItems.push({ el: c, speed: 0.02, max: 12 }); });
  }
  // highlighter sweep: light a marked keyword each time it scrolls into the
  // comfortable middle of the viewport (re-triggers on every scroll-in)
  var markEls = [].slice.call(document.querySelectorAll('.mark'));
  function updateMarks() {
    if (!markEls.length) return;
    var vh = window.innerHeight;
    for (var i = 0; i < markEls.length; i++) {
      var r = markEls[i].getBoundingClientRect();
      markEls[i].classList.toggle('lit', r.top < vh * 0.82 && r.bottom > vh * 0.18);
    }
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
  // marks are cheap (a few elements) and must stay responsive, so update them
  // directly on scroll rather than through the rAF throttle
  window.addEventListener('scroll', updateMarks, { passive: true });
  updateMarks();

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
      var lenis = new Lenis({ duration: 0.8, smoothWheel: true, touchMultiplier: 1.6 });
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

  /* ---- Line-by-line reveal: detect visual line breaks and mask/slide each.
     Used by the homepage hero sub and the inner-page hero heading + sub. ---- */
  function revealLines(el, baseDelay, step) {
    if (!el || el.children.length) return; // skip empty / markup-containing nodes
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    function build(animate) {
      // lay each word out as an inline span so we can read where lines wrap
      el.textContent = '';
      var words = text.split(' ');
      var spans = words.map(function (w, i) {
        var s = document.createElement('span');
        s.textContent = w + (i < words.length - 1 ? ' ' : '');
        el.appendChild(s);
        return s;
      });
      var lines = [], cur = null, top = null;
      spans.forEach(function (s) {
        var t = s.offsetTop;
        if (top === null || t - top > 2) { cur = []; lines.push(cur); top = t; }
        cur.push(s.textContent);
      });
      // rebuild as one masked, sliding line per visual line
      el.textContent = '';
      lines.forEach(function (parts, i) {
        var mask = document.createElement('span');
        mask.className = 'line-reveal';
        var inner = document.createElement('span');
        inner.className = 'line-reveal-in';
        inner.textContent = parts.join('').replace(/\s+$/, '');
        if (animate && !reduceMotion) {
          inner.style.animationDelay = (baseDelay + i * step).toFixed(2) + 's';
        } else {
          inner.style.animation = 'none';
          inner.style.transform = 'none';
        }
        mask.appendChild(inner);
        el.appendChild(mask);
      });
    }
    build(true);
    // re-split (without re-animating) on resize so wrapping stays correct and never clips
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { build(false); }, 160);
    }, { passive: true });
  }
  revealLines(document.querySelector('.hero-sub'), 0.36, 0.11);               // homepage hero sub
  revealLines(document.querySelector('.page-hero h1'), 0.12, 0.12);           // inner-page heading
  revealLines(document.querySelector('.page-hero p:not(.eyebrow)'), 0.40, 0.10); // inner-page sub

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

  /* ---- Mega-menu dropdowns (hover via CSS; click/keyboard/Esc here) ---- */
  var navItems = [].slice.call(document.querySelectorAll('.nav-group'));
  function closeMenus(except) {
    navItems.forEach(function (it) {
      if (it === except) return;
      it.classList.remove('open');
      var t = it.querySelector('.nav-trigger');
      if (t) t.setAttribute('aria-expanded', 'false');
    });
  }
  navItems.forEach(function (it) {
    var trigger = it.querySelector('.nav-trigger');
    if (!trigger) return;
    // hover is JS-driven so entering one dropdown closes the others (panels overlap neighbours)
    it.addEventListener('mouseenter', function () {
      closeMenus(it);
      it.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    });
    it.addEventListener('mouseleave', function () {
      it.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    });
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      var willOpen = !it.classList.contains('open');
      closeMenus(it);
      it.classList.toggle('open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-group')) closeMenus();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenus();
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

  /* ---- Ray chat: quick replies + auto-played production-style demo ---- */
  var chatForm = document.getElementById('chatForm');
  var chatInput = document.getElementById('chatInput');
  var chatBody = document.getElementById('chatBody');
  var quickReplies = document.getElementById('quickReplies');
  var RAY_FACE = '<span class="msg-avatar"><img class="ray-face" src="assets/ray-avatar.svg" alt=""></span>';
  var COPY_SVG = '<svg viewBox="0 0 16 16" fill="none"><rect x="5.5" y="5.5" width="8" height="8" rx="1.6" stroke="currentColor" stroke-width="1.3"/><path d="M3.5 10.5H2.8A1.3 1.3 0 0 1 1.5 9.2V2.8A1.3 1.3 0 0 1 2.8 1.5H9.2A1.3 1.3 0 0 1 10.5 2.8V3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

  // Rich, production-shaped answers (intro + bold feature list + optional sources)
  var RICH_ABOUT =
    '<p>Tenderfy is an AI-powered tender management platform designed to streamline the bid preparation process for small-to-medium enterprises and built-environment firms. Founded in 2024 and headquartered in Australia, Tenderfy replaces manual, Word-based tendering with automated workflows, significantly reducing submission times.</p>' +
    '<p class="rich-h">Key Features:</p>' +
    '<ul class="rich-list">' +
      '<li><strong>AI-Assisted Drafting:</strong> The platform\'s AI, known as "Ray," helps generate responses and ensures professional content.</li>' +
      '<li><strong>Centralized Knowledge Library:</strong> Stores documents such as resumes and case studies securely for easy access.</li>' +
      '<li><strong>Auto-fill Schedules:</strong> Automatically populates response schedules using stored company data.</li>' +
      '<li><strong>Visual Presentation:</strong> Transforms responses into high-quality, designer-grade presentations.</li>' +
      '<li><strong>Team Collaboration:</strong> Manages workflows, approvals, and compliance requirements to maintain team alignment.</li>' +
    '</ul>' +
    '<p class="rich-h">Sources:</p>' +
    '<div class="rich-sources"><span>Tender Management Software | Streamline Bids &amp; Win More …</span><span>Tenderfy Software Pricing, Alternatives &amp; More 2026</span><span>Tenderfy is an AI-driven platform designed to streamline …</span></div>';
  var RICH_HELP =
    '<p>I can help you manage and enhance your tendering process through Tenderfy. Specifically, I can:</p>' +
    '<ul class="rich-list">' +
      '<li><strong>Create and analyze tender responses:</strong> Generate, refine, and structure bid documents professionally.</li>' +
      '<li><strong>Store and retrieve documents:</strong> Manage resumes, case studies, policies, and templates securely.</li>' +
      '<li><strong>Automate responses:</strong> Populate schedules, compliance matrices, and submission forms using your stored data.</li>' +
      '<li><strong>Review and improve content:</strong> Edit, rewrite, or summarize tender content for clarity and compliance.</li>' +
      '<li><strong>Provide real-time insights:</strong> Analyze tender performance, winning ratios, and track upcoming deadlines.</li>' +
      '<li><strong>Prepare supporting materials:</strong> Build capability statements, executive summaries, and company overviews.</li>' +
    '</ul>' +
    '<p>Would you like me to focus on a specific area — like creating a tender, improving a submission, or analyzing your tender metrics?</p>';

  var responses = {
    "What is Tenderfy about?": { html: RICH_ABOUT, analyze: true },
    "How can you help me?": { html: RICH_HELP, analyze: true },
    "Draft a methodology section": { analyze: true, text: "On it. I'll draft section 4.2 from your Westgate Bridge methodology and flag anything that needs a human review before you submit." },
    "Should we bid on this tender?": { analyze: true, text: "I'd recommend BID. Capability fit is strong (82/100) — the only watch-item is the bond requirement in clause 14.3." }
  };
  var fallbackReplies = [
    "Good question. Based on the RFT, that maps to ISO 45001 — I've pre-filled 4 of 6 requirements from your library.",
    "Done — I've pulled matching content from your past submissions. Want me to insert it into the pack?",
    "I've scheduled that task and assigned it to the tender lead so nothing slips past the deadline."
  ];
  var fbIndex = 0;
  function scrollChat() { chatBody.scrollTop = chatBody.scrollHeight; }

  function addUserMessage(text) {
    var wrap = document.createElement('div');
    wrap.className = 'msg msg-user';
    wrap.innerHTML = '<div class="msg-col msg-col-right"><div class="msg-bubble msg-bubble-user"></div></div>';
    wrap.querySelector('.msg-bubble-user').textContent = text;
    chatBody.appendChild(wrap); scrollChat();
  }
  function addAnalyzing() {
    var wrap = document.createElement('div');
    wrap.className = 'msg msg-ray'; wrap.id = 'analyzingCard';
    wrap.innerHTML =
      '<div class="analyzing"><span class="an-dots">•••</span>' + RAY_FACE +
      '<div><div class="an-title">Analyzing</div><div class="an-sub">Ray found 10 sources and is now analyzing the information…</div></div></div>';
    chatBody.appendChild(wrap); scrollChat();
  }
  function addTyping() {
    var wrap = document.createElement('div');
    wrap.className = 'msg msg-ray'; wrap.id = 'typingIndicator';
    wrap.innerHTML = RAY_FACE + '<div class="msg-col"><div class="typing-bubble"><span></span><span></span><span></span></div></div>';
    chatBody.appendChild(wrap); scrollChat();
  }
  function removeById(id) { var n = document.getElementById(id); if (n) n.remove(); }
  function addRayMessage(content, isHtml) {
    var wrap = document.createElement('div');
    wrap.className = 'msg msg-ray';
    wrap.innerHTML = RAY_FACE +
      '<div class="msg-col"><div class="msg-bubble msg-bubble-ray">' + (isHtml ? content : '<p></p>') + '</div>' +
      '<button class="msg-copy" type="button" aria-label="Copy message">' + COPY_SVG + '</button></div>';
    if (!isHtml) wrap.querySelector('p').textContent = content;
    chatBody.appendChild(wrap); scrollChat();
  }
  function renderRay(r) {
    if (r && r.html) addRayMessage(r.html, true);
    else addRayMessage(r ? r.text : fallbackReplies[fbIndex++ % fallbackReplies.length], false);
  }
  function send(text) {
    if (quickReplies) { quickReplies.remove(); quickReplies = null; }
    addUserMessage(text);
    var r = responses[text];
    if (r && r.analyze) {
      addAnalyzing();
      setTimeout(function () { removeById('analyzingCard'); renderRay(r); }, 2100);
    } else {
      addTyping();
      setTimeout(function () { removeById('typingIndicator'); renderRay(r); }, 1100);
    }
  }

  // click a Ray message's copy icon → copy its text
  if (chatBody) chatBody.addEventListener('click', function (e) {
    var btn = e.target.closest('.msg-copy'); if (!btn) return;
    var bubble = btn.parentNode.querySelector('.msg-bubble');
    if (bubble && navigator.clipboard) navigator.clipboard.writeText(bubble.innerText).catch(function () {});
    btn.classList.add('copied'); setTimeout(function () { btn.classList.remove('copied'); }, 1200);
  });

  if (quickReplies) quickReplies.addEventListener('click', function (e) {
    var chip = e.target.closest('.quick-chip');
    if (chip) send(chip.textContent.trim());
  });
  // The reply bar is demo-only — it can't be typed into. Clicking it plays the
  // demo once, then the bar is disabled. No free-text chat outside the demo.
  if (chatForm) chatForm.addEventListener('submit', function (e) { e.preventDefault(); });

  var demoPlayed = false;
  function autoType(text, cb) {
    var i = 0;
    (function step() {
      chatInput.value = text.slice(0, i);
      if (i++ <= text.length) { setTimeout(step, 42); }
      else { setTimeout(cb, 320); }
    })();
  }
  function playDemo() {
    if (demoPlayed) return; demoPlayed = true;
    var q = "What is Tenderfy about?";
    autoType(q, function () {
      chatInput.value = '';
      if (chatForm) chatForm.classList.add('is-done'); // disable bar after the demo
      send(q);
    });
  }
  if (chatForm) chatForm.addEventListener('click', playDemo);

  /* ---- Task Checklist card video: start it slightly AFTER the hero/dashboard
     mockup finishes its entrance animation (heroIn on .hero-shot), so the card
     settles into place before the checklist starts playing. ---- */
  (function () {
    var tcVideo = document.querySelector('.tc-video');
    var heroShot = document.querySelector('.hero-shot');
    if (!tcVideo) return;
    var started = false;
    function startVideo() {
      if (started) return;
      started = true;
      var p = tcVideo.play();
      if (p && p.catch) p.catch(function () {});
    }
    // preferred: fire ~350ms after the dashboard mockup's entrance animation ends
    if (heroShot) {
      heroShot.addEventListener('animationend', function (e) {
        if (e.animationName === 'heroIn') setTimeout(startVideo, 350);
      });
    }
    // fallback in case animationend never fires (reduced motion edge cases, etc.)
    setTimeout(startVideo, 1800);
  })();

  onScroll();
})();
