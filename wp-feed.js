/* WordPress REST feed → renders live articles into the static site.
   WordPress is the content backend only; presentation stays native to this site.
   - insights.html: featured slot + article grid (falls back to hard-coded cards)
   - article.html:  full-post reader; extracts clean content from Elementor markup */
(function () {
  'use strict';

  // After the Option B cutover, change to 'https://blog.tenderfy.org/wp-json/wp/v2'
  var WP_API = 'https://tenderfy.org/wp-json/wp/v2';

  /* ---------- shared helpers ---------- */
  function decode(html) {
    var t = document.createElement('textarea');
    t.innerHTML = html || '';
    return t.value;
  }
  function excerptText(html, max) {
    var d = document.createElement('div');
    d.innerHTML = html || '';
    var text = (d.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length > max) text = text.slice(0, max).replace(/\s+\S*$/, '') + '…';
    return text;
  }
  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function thumbOf(post, wantLarge) {
    var m = post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0];
    if (!m) return null;
    var sizes = m.media_details && m.media_details.sizes;
    var pick = sizes && (wantLarge
      ? (sizes.large || sizes.medium_large || sizes.full)
      : (sizes.medium_large || sizes.large || sizes.medium));
    return (pick && pick.source_url) || m.source_url || null;
  }
  function categorySlugs(post) {
    var groups = (post._embedded && post._embedded['wp:term']) || [];
    var slugs = [];
    groups.forEach(function (g) {
      (g || []).forEach(function (t) { if (t.taxonomy === 'category') slugs.push(t.slug); });
    });
    return slugs;
  }
  // "In the Press! – Title" posts get their own tag; prefix is stripped from the title
  function tagAndTitle(post) {
    var title = decode(post.title.rendered);
    var m = title.match(/^in the press!?\s*[–—-]\s*(.+)$/i);
    if (m) return { tag: 'In the Press', title: m[1] };
    return { tag: 'Tenderfy', title: title };
  }
  // hash-based so the slug survives clean-URL redirects on any host (query kept as fallback)
  function readerUrl(post) { return 'article.html#' + encodeURIComponent(post.slug); }

  /* ---------- insights.html: featured + grid ---------- */
  var onArticlePage = !!document.getElementById('artContent');
  var grid = onArticlePage ? null : document.querySelector('.article-grid');
  var featured = document.querySelector('.featured-article');

  function renderCard(post) {
    var tt = tagAndTitle(post);
    var a = document.createElement('a');
    a.className = 'article-card';
    a.href = readerUrl(post);
    var thumb = thumbOf(post);
    a.innerHTML =
      '<div class="article-thumb">' + (thumb ? '<img class="article-img" alt="" loading="lazy" />' : '') + '</div>' +
      '<div class="article-body">' +
        '<span class="article-tag"></span>' +
        '<h3></h3>' +
        '<p></p>' +
        '<span class="article-meta"></span>' +
      '</div>';
    if (thumb) a.querySelector('.article-img').src = thumb;
    a.querySelector('.article-tag').textContent = tt.tag;
    a.querySelector('h3').textContent = tt.title;
    a.querySelector('p').textContent = excerptText(post.excerpt && post.excerpt.rendered, 170);
    a.querySelector('.article-meta').textContent = fmtDate(post.date);
    return a;
  }

  function renderFeatured(post) {
    if (!featured) return;
    var tt = tagAndTitle(post);
    featured.href = readerUrl(post);
    featured.removeAttribute('data-toast');
    var img = featured.querySelector('.featured-thumb img');
    var thumb = thumbOf(post, true);
    if (img && thumb) { img.src = thumb; img.alt = tt.title; }
    var h2 = featured.querySelector('h2');
    if (h2) h2.textContent = tt.title;
    var tag = featured.querySelector('.article-tag');
    if (tag) tag.textContent = 'Featured · ' + tt.tag;
    var sub = featured.querySelector('.section-sub');
    if (sub) sub.textContent = excerptText(post.excerpt && post.excerpt.rendered, 220);
    var meta = featured.querySelector('.article-meta');
    if (meta) meta.textContent = fmtDate(post.date);
  }

  if (grid || featured) {
    fetch(WP_API + '/posts?per_page=13&_embed=wp:featuredmedia,wp:term&_fields=id,slug,link,title,excerpt,date,_links,_embedded')
      .then(function (r) { if (!r.ok) throw new Error('WP API ' + r.status); return r.json(); })
      .then(function (posts) {
        if (!posts || !posts.length) return;
        // featured slot: prefer the 'featured' category, else the newest post
        var feat = posts.find(function (p) { return categorySlugs(p).indexOf('featured') !== -1; }) || posts[0];
        renderFeatured(feat);
        var rest = posts.filter(function (p) { return p.id !== feat.id; }).slice(0, 9);
        if (grid && rest.length) {
          grid.innerHTML = '';
          rest.forEach(function (p) { grid.appendChild(renderCard(p)); });
        }
      })
      .catch(function () { /* API unreachable — static fallback cards stay */ });
  }

  /* ---------- article.html: full-post reader ---------- */
  var artContent = document.getElementById('artContent');
  if (!artContent) return;

  var artTitle = document.getElementById('artTitle');
  var artTag = document.getElementById('artTag');
  var artMeta = document.getElementById('artMeta');
  var artHero = document.getElementById('artHero');

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

  // Serialize a node keeping only safe inline markup; Elementor spans/divs are unwrapped.
  var KEEP = { A: 1, STRONG: 1, B: 1, EM: 1, I: 1, BR: 1, LI: 1, UL: 1, OL: 1 };
  function serialize(node) {
    var out = '';
    node.childNodes.forEach(function (c) {
      if (c.nodeType === 3) { out += escapeHtml(c.nodeValue); return; }
      if (c.nodeType !== 1) return;
      var tag = c.tagName.toUpperCase();
      if (tag === 'SVG' || tag === 'STYLE' || tag === 'SCRIPT' || tag === 'BUTTON' || tag === 'FORM') return;
      if (KEEP[tag]) {
        if (tag === 'BR') { out += '<br/>'; return; }
        if (tag === 'A') {
          var href = c.getAttribute('href') || '#';
          if (!/^https?:|^mailto:|^\//i.test(href)) href = '#';
          out += '<a href="' + escapeAttr(href) + '" target="_blank" rel="noopener">' + serialize(c) + '</a>';
          return;
        }
        var t = tag.toLowerCase();
        out += '<' + t + '>' + serialize(c) + '</' + t + '>';
      } else {
        out += serialize(c); // unwrap unknown wrappers, keep their text
      }
    });
    return out;
  }

  // Walk Elementor markup and pull out real content in document order.
  function extractContent(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var picked = [];
    var pickedSet = [];
    function hasPickedAncestor(n) {
      for (var a = n.parentElement; a; a = a.parentElement) {
        if (pickedSet.indexOf(a) !== -1) return true;
      }
      return false;
    }
    doc.body.querySelectorAll('h1,h2,h3,h4,p,ul,ol,blockquote,img').forEach(function (n) {
      if (hasPickedAncestor(n)) return;
      if (n.tagName === 'IMG') {
        var src = n.getAttribute('src') || '';
        if (!/^https?:/i.test(src) || /\.svg(\?|$)/i.test(src)) return;
        var w = parseInt(n.getAttribute('width'), 10) || 0;
        if (w && w < 80) return; // icons
        var img = document.createElement('img');
        img.src = src; img.alt = n.getAttribute('alt') || ''; img.loading = 'lazy';
        picked.push(img); pickedSet.push(n);
        return;
      }
      var text = (n.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      var tag = n.tagName.toLowerCase();
      if (tag === 'h1') tag = 'h2'; // the page's h1 is the article title
      var el = document.createElement(tag);
      el.innerHTML = serialize(n);
      picked.push(el); pickedSet.push(n);
    });
    return postProcess(picked);
  }

  /* Clean up Elementor widget artifacts:
     duplicated counter text, orphan numeric headings, single-item icon lists,
     sentence-long icon-box "headings". */
  function normText(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function postProcess(parts) {
    // 1) drop duplicates: same text as the previous block, or a block that merely
    //    repeats/extends the previous one or two blocks (Elementor counters render twice)
    var pass1 = [];
    parts.forEach(function (el) {
      if (el.tagName === 'IMG') { pass1.push(el); return; } // images bypass text dedupe
      var txt = normText(el).toLowerCase();
      if (!txt) return;
      var prev = pass1[pass1.length - 1];
      var prevTxt = prev ? normText(prev).toLowerCase() : null;
      var prev2 = pass1[pass1.length - 2];
      // a block that merely restates the previous two blocks joined (split counters)
      if (prev && prev2 && txt === (normText(prev2) + ' ' + normText(prev)).toLowerCase()) return;
      if (prevTxt) {
        if (txt === prevTxt) return;
        if (txt.length > prevTxt.length && txt.indexOf(prevTxt) === 0) {
          var prev2 = pass1[pass1.length - 2];
          pass1.pop();
          if (prev2 && txt.indexOf(normText(prev2).toLowerCase()) === 0) pass1.pop();
          pass1.push(el); return;
        }
        if (prevTxt.indexOf(txt) === 0) return;
      }
      pass1.push(el);
    });
    // 2) structural fixes
    var pass2 = [];
    pass1.forEach(function (el) {
      var tag = el.tagName;
      var txt = normText(el);
      // single-item icon list = a section title in disguise
      if ((tag === 'UL' || tag === 'OL') && el.children.length === 1 && txt.length < 70) {
        var h = document.createElement('h2'); h.textContent = txt; pass2.push(h); return;
      }
      // short numeric heading (counter number) → bold lead merged into the next paragraph
      if (/^H[2-4]$/.test(tag) && txt.length <= 10 && /\d/.test(txt)) {
        el.__counter = txt; pass2.push(el); return;
      }
      // sentence-long icon-box titles read better as emphasised body text
      if (/^H[34]$/.test(tag) && txt.length > 80) {
        var p = document.createElement('p'); p.innerHTML = '<strong>' + el.innerHTML + '</strong>'; pass2.push(p); return;
      }
      pass2.push(el);
    });
    // 3) merge counter numbers into their caption paragraphs
    var pass3 = [];
    for (var i = 0; i < pass2.length; i++) {
      var el = pass2[i];
      if (el.__counter) {
        var next = pass2[i + 1];
        if (next && next.tagName === 'P') {
          next.insertBefore(document.createTextNode(' '), next.firstChild);
          var strong = document.createElement('strong');
          strong.textContent = el.__counter;
          next.insertBefore(strong, next.firstChild);
          continue; // the paragraph is pushed on its own turn
        }
        continue; // orphan number with no caption — drop it
      }
      pass3.push(el);
    }
    // 4) consecutive-heading runs read as a broken wall of headlines.
    //    H3/H4 runs of 2+ fold entirely into a bulleted list; H2 runs of 3+
    //    keep the first as the section heading and fold the rest.
    var out = [];
    var run = [];
    function toList(headings) {
      var ul = document.createElement('ul');
      headings.forEach(function (h) {
        var li = document.createElement('li');
        li.innerHTML = h.innerHTML;
        ul.appendChild(li);
      });
      return ul;
    }
    function flushRun() {
      if (!run.length) { return; }
      var subs = run.filter(function (h) { return h.tagName !== 'H2'; });
      var h2s = run.filter(function (h) { return h.tagName === 'H2'; });
      if (run.length >= 2 && subs.length === run.length) {
        out.push(toList(run));               // pure H3/H4 run → all bullets
      } else if (h2s.length >= 3 && h2s.length === run.length) {
        out.push(run[0]);                    // pure H2 run → keep first, fold rest
        out.push(toList(run.slice(1)));
      } else if (run.length >= 3) {
        out.push(run[0]);                    // mixed long run → same treatment
        out.push(toList(run.slice(1)));
      } else {
        run.forEach(function (h) { out.push(h); });
      }
      run = [];
    }
    pass3.forEach(function (el) {
      if (/^H[234]$/.test(el.tagName)) { run.push(el); return; }
      flushRun();
      out.push(el);
    });
    flushRun();
    return out;
  }

  function fail(msg) {
    artTitle.textContent = 'Article not found';
    artContent.innerHTML = '';
    var p = document.createElement('p');
    p.textContent = msg;
    var back = document.createElement('p');
    back.innerHTML = '<a href="insights.html">Browse all insights →</a>';
    artContent.appendChild(p); artContent.appendChild(back);
  }

  var slug = decodeURIComponent((location.hash || '').replace(/^#/, '')) ||
             new URLSearchParams(location.search).get('slug');
  if (!slug) { fail('No article was specified.'); return; }
  // load the newly selected article when navigating between posts on this page
  window.addEventListener('hashchange', function () { location.reload(); });

  fetch(WP_API + '/posts?slug=' + encodeURIComponent(slug) + '&_embed=wp:featuredmedia,wp:term&_fields=id,slug,title,content,date,_links,_embedded')
    .then(function (r) { if (!r.ok) throw new Error('WP API ' + r.status); return r.json(); })
    .then(function (posts) {
      var post = posts && posts[0];
      if (!post) { fail('This article may have been moved or unpublished.'); return; }
      var tt = tagAndTitle(post);
      document.title = tt.title + ' — Tenderfy';
      artTitle.textContent = tt.title;
      artTag.textContent = tt.tag;
      var hero = thumbOf(post, true);
      if (hero) { artHero.src = hero; artHero.alt = tt.title; artHero.hidden = false; }
      var parts = extractContent(post.content && post.content.rendered || '');
      if (!parts.length) {
        fail('This article could not be displayed.');
        return;
      }
      var words = parts.reduce(function (n, el) { return n + (el.textContent || '').split(/\s+/).length; }, 0);
      artMeta.textContent = fmtDate(post.date) + ' · ' + Math.max(1, Math.round(words / 200)) + ' min read';
      artContent.innerHTML = '';
      parts.forEach(function (el) { artContent.appendChild(el); });
      buildToc();
      loadMoreInsights(post.id);
    })
    .catch(function () { fail('The article service is unreachable right now — please try again shortly.'); });

  // "On this page" rail — built from the article's section headings.
  // Links scroll without touching location.hash (a hash change reloads the article).
  function buildToc() {
    var tocList = document.getElementById('artTocList');
    var toc = document.getElementById('artToc');
    if (!tocList || !toc) return;
    var heads = Array.prototype.slice.call(artContent.querySelectorAll('h2'));
    if (heads.length < 3) return;
    heads.forEach(function (h, i) {
      h.id = 'section-' + (i + 1);
      var a = document.createElement('a');
      a.href = '#';
      a.textContent = h.textContent;
      a.setAttribute('data-target', h.id);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var t = document.getElementById(this.getAttribute('data-target'));
        if (!t) return;
        if (window.__lenis) window.__lenis.scrollTo(t, { offset: -110 });
        else t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      tocList.appendChild(a);
    });
    toc.hidden = false;
    var links = Array.prototype.slice.call(tocList.children);
    function spy() {
      var line = window.innerHeight * 0.3;
      var active = null;
      heads.forEach(function (h) { if (h.getBoundingClientRect().top < line) active = h.id; });
      links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-target') === active); });
    }
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  // "More insights" — three other recent articles at the foot of the reader
  function loadMoreInsights(currentId) {
    var moreGrid = document.getElementById('moreGrid');
    if (!moreGrid) return;
    fetch(WP_API + '/posts?per_page=4&_embed=wp:featuredmedia,wp:term&_fields=id,slug,link,title,excerpt,date,_links,_embedded')
      .then(function (r) { return r.json(); })
      .then(function (posts) {
        var rest = (posts || []).filter(function (p) { return p.id !== currentId; }).slice(0, 3);
        if (!rest.length) return;
        rest.forEach(function (p) { moreGrid.appendChild(renderCard(p)); });
        var wrap = document.getElementById('moreInsights');
        if (wrap) wrap.hidden = false;
      })
      .catch(function () {});
  }
})();
