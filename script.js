(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Header shadow + scroll progress + back-to-top ---- */
  var header = document.getElementById('siteHeader');
  var progress = document.getElementById('scrollProgress');
  var toTop = document.getElementById('toTop');
  var heroEl = document.getElementById('hero');

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('scrolled', y > 12);

    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docH > 0 ? (y / docH) * 100 : 0;
    progress.style.width = pct + '%';

    // slide the hero's warm focal point left -> right while the hero scrolls past
    if (heroEl) heroEl.style.setProperty('--hsp', Math.min(y / window.innerHeight, 1).toFixed(4));

    toTop.classList.toggle('show', y > 600);
    updateSpy();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

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
