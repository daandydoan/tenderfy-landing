/* Shared header + footer injected into every page.
   Each page sets <body data-page="product"> etc. to highlight the active nav item.
   Mount points: <div id="mount-header"></div> near top of <body>,
                 <div id="mount-footer"></div> near the end of <body>. */
(function () {
  'use strict';

  var LOGO = '<svg class="logo-svg" width="119" height="32" viewBox="0 0 119 32" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tenderfy">'
    + '<path d="M6.25164 4.05972H3.10368V8.56611H0V11.0898H3.10368V18.4052C3.10368 19.2864 3.1162 20.0751 3.14125 20.7711C3.17166 21.4884 3.36388 22.1895 3.70349 22.8216C4.07607 23.5566 4.69032 24.1403 5.44258 24.4743C6.27058 24.8376 7.16266 25.0317 8.0665 25.0451C9.07248 25.0727 10.0784 24.987 11.0652 24.7895V22.1306C10.1506 22.2763 9.22157 22.3091 8.29897 22.2282C7.51419 22.1431 6.94193 21.7901 6.58217 21.1691C6.38095 20.7952 6.27537 20.3771 6.27486 19.9523C6.25989 19.4716 6.25241 18.9058 6.25241 18.2548V11.0898H11.0652V8.56611H6.25164V4.05972Z" fill="white"/>'
    + '<path d="M24.5431 9.26493C23.3835 8.49859 21.9791 8.11547 20.3299 8.11557C18.7506 8.11557 17.3662 8.4711 16.1768 9.18214C14.9801 9.90095 14.0147 10.949 13.3954 12.2016C12.7306 13.5035 12.3983 15.0407 12.3984 16.8131C12.3984 18.4856 12.7358 19.9552 13.4105 21.222C14.0555 22.458 15.0383 23.4845 16.2441 24.1815C17.4586 24.8875 18.8705 25.2405 20.4798 25.2406C21.9885 25.2578 23.4708 24.8437 24.7531 24.047C26.0346 23.2483 27.0356 22.0691 27.6167 20.6736L24.5428 19.6973C24.182 20.4841 23.6014 21.1493 22.8712 21.6124C22.1044 22.0722 21.2229 22.304 20.3296 22.2808C18.8402 22.2808 17.7007 21.7927 16.9111 20.8164C16.2583 20.009 15.8798 18.9221 15.7665 17.564H27.8264C27.9463 15.6213 27.719 13.9439 27.1442 12.5318C26.5695 11.1197 25.7024 10.0307 24.5428 9.26478M16.9114 12.3819C17.701 11.3904 18.8805 10.8946 20.45 10.8946C21.869 10.8946 22.9261 11.3453 23.6212 12.2466C24.1439 12.9249 24.4756 13.8813 24.6161 15.1158H15.8336C15.9992 13.9885 16.3585 13.0772 16.9113 12.3819" fill="white"/>'
    + '<path d="M43.7696 12.0063C43.5173 11.3112 43.1498 10.6637 42.6826 10.091C42.1802 9.48393 41.5471 8.99861 40.8309 8.67143C40.0711 8.31091 39.1315 8.1307 38.0121 8.1308C36.5525 8.1308 35.308 8.44628 34.2787 9.07725C33.6578 9.45585 33.1095 9.94263 32.6596 10.5146V8.5663H29.8555V24.7897H33.034V16.3474C33.0156 15.5195 33.1244 14.6937 33.3566 13.899C33.5313 13.3008 33.833 12.7475 34.2411 12.277C34.6 11.8773 35.0502 11.5706 35.5531 11.3832C36.0621 11.1963 36.6003 11.1022 37.1424 11.1053C38.0019 11.1053 38.6991 11.2805 39.234 11.6311C39.7624 11.9747 40.1916 12.4513 40.4785 13.0132C40.7769 13.5951 40.9795 14.2216 41.0783 14.8683C41.1814 15.5116 41.2341 16.1621 41.2358 16.8137V24.7902H44.4146V15.7771C44.4084 15.1939 44.3633 14.6118 44.2796 14.0346C44.1818 13.3425 44.0109 12.6627 43.7699 12.0067" fill="white"/>'
    + '<path d="M58.2158 9.67713C58.0414 9.51994 57.8587 9.37221 57.6685 9.23458C56.6239 8.48875 55.3369 8.11568 53.8076 8.11537C52.2881 8.11537 50.9762 8.48844 49.8718 9.23458C48.7549 9.99516 47.87 11.0507 47.3151 12.2842C46.6968 13.6595 46.3896 15.1547 46.4156 16.6628C46.3917 18.1701 46.6961 19.6644 47.3076 21.0417C47.8538 22.2799 48.7307 23.343 49.8415 24.1137C50.9362 24.8647 52.2381 25.2402 53.7474 25.2402C55.2967 25.2402 56.5962 24.8622 57.6459 24.106C57.9802 23.8638 58.2914 23.5911 58.5755 23.2913V24.7902H61.3642V3.15863H58.2158V9.67713ZM58.1258 19.6371C57.8662 20.4416 57.3696 21.1485 56.7014 21.665C56.0514 22.1558 55.2118 22.4012 54.1824 22.4012C53.1827 22.4012 52.3555 22.1458 51.7008 21.635C51.0272 21.0983 50.5181 20.3823 50.2316 19.5692C49.8954 18.6377 49.7302 17.6529 49.7442 16.6625C49.7307 15.6795 49.8958 14.7022 50.2316 13.7785C50.5223 12.9637 51.04 12.2495 51.7233 11.7205C52.3929 11.2098 53.2476 10.9544 54.2873 10.9544C55.2666 10.9544 56.0738 11.1948 56.7089 11.6755C57.3682 12.1909 57.859 12.8918 58.1184 13.6883C58.4385 14.6465 58.5931 15.6523 58.5757 16.6625C58.5931 17.6722 58.441 18.6776 58.1258 19.6368" fill="white"/>'
    + '<path d="M87.2843 8.48359C86.7566 8.51832 86.2353 8.61929 85.7327 8.78413C85.2412 8.94247 84.7781 9.17822 84.3607 9.48253C83.931 9.77272 83.5554 10.1363 83.2511 10.5566C83.109 10.7514 82.9788 10.9547 82.8613 11.1653V8.56576H80.0723V24.7895H83.2361V16.6027C83.2332 15.989 83.2986 15.3768 83.431 14.7776C83.5527 14.2219 83.7682 13.6911 84.0683 13.208C84.3973 12.6999 84.8364 12.2725 85.353 11.9578C85.8695 11.6431 86.4503 11.4491 87.052 11.3903C87.6418 11.3264 88.2381 11.3672 88.8137 11.5107V8.56576C88.3093 8.47498 87.7956 8.44722 87.2843 8.48313" fill="white"/>'
    + '<path d="M97.3423 2.75287C96.8409 2.78667 96.3477 2.89817 95.8804 3.08341C95.3618 3.29389 94.8996 3.62311 94.5308 4.0447C94.202 4.40627 93.9541 4.83409 93.8038 5.29949C93.6602 5.74764 93.5721 6.21178 93.5415 6.68145C93.5116 7.14705 93.4963 7.58516 93.4957 7.99577V8.56655H90.8125V11.0904H93.4963V24.79H96.6301V11.0898H100.723V8.56594H96.6301V7.39439C96.6301 6.72353 96.8125 6.20529 97.1773 5.83967C97.5422 5.47404 98.0944 5.29128 98.8339 5.29138H100.723V2.70773H98.685C98.275 2.70773 97.8276 2.72278 97.3429 2.75287" fill="white"/>'
    + '<path d="M115.347 8.56644L110.778 20.76L105.991 8.56644H102.723L109.275 24.7201L106.606 32H109.59L118.526 8.56644H115.347Z" fill="white"/>'
    + '<path d="M69.806 26.4095C68.8664 26.4099 67.9382 26.2043 67.0864 25.807C66.2346 25.4098 65.4799 24.8306 64.8753 24.1101C64.2707 23.3896 63.8308 22.5452 63.5866 21.6362C63.3423 20.7273 63.2996 19.7758 63.4615 18.8486L66.0637 4.06391C66.2898 2.77942 67.0159 1.63751 68.0824 0.889396C69.1488 0.141281 70.4682 -0.15176 71.7503 0.0747415C73.0325 0.301243 74.1722 1.02873 74.919 2.09717C75.6657 3.1656 75.9582 4.48747 75.7321 5.77196L74.9041 10.4758C74.6419 11.9573 73.8036 13.2741 72.5733 14.1372C71.3431 15.0002 69.8213 15.339 68.3419 15.0792L68.7469 12.778C69.6171 12.9307 70.5122 12.7313 71.2359 12.2236C71.9596 11.7159 72.4528 10.9414 72.6072 10.0699L73.4351 5.36615C73.4976 5.03076 73.4932 4.68628 73.4221 4.35261C73.3509 4.01895 73.2145 3.70272 73.0206 3.42224C72.8267 3.14175 72.5792 2.90256 72.2924 2.71851C72.0056 2.53446 71.6853 2.40919 71.3499 2.34996C71.0145 2.29072 70.6708 2.2987 70.3385 2.37343C70.0062 2.44815 69.6919 2.58814 69.414 2.78529C69.1361 2.98245 68.8999 3.23286 68.7191 3.52204C68.5384 3.81122 68.4167 4.13343 68.361 4.47004L65.759 19.2547C65.6656 19.7855 65.6774 20.3294 65.7938 20.8556C65.9103 21.3817 66.129 21.8798 66.4375 22.3212C66.7461 22.7627 67.1384 23.1389 67.5921 23.4285C68.0457 23.7181 68.5519 23.9153 69.0817 24.0089C69.6114 24.1024 70.1544 24.0906 70.6796 23.9739C71.2047 23.8573 71.7018 23.6381 72.1425 23.329C72.5831 23.0199 72.9587 22.6269 73.2477 22.1724C73.5367 21.7178 73.7336 21.2107 73.827 20.68L75.7772 9.59954L78.0741 10.0055L76.1239 21.086C75.8614 22.5748 75.0849 23.9238 73.9301 24.897C72.7752 25.8702 71.3156 26.4057 69.8066 26.4098" fill="#FFBC4A"/>'
    + '</svg>';

  var ARROW = '<svg class="arrow" viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var NAV = [
    ['Product', 'product.html', 'product'],
    ['Solution', 'solutions.html', 'solutions'],
    ['Pricing', 'pricing.html', 'pricing'],
    ['About', 'about.html', 'about'],
    ['Insights', 'insights.html', 'insights']
  ];

  function navLinks(active, mobile) {
    return NAV.map(function (n) {
      var cls = mobile ? '' : 'nav-link' + (n[2] === active ? ' active' : '');
      return '<a href="' + n[1] + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + n[0] + '</a>';
    }).join('');
  }

  function headerHTML(active) {
    return ''
      + '<div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>'
      + '<header class="site-header" id="siteHeader"><div class="header-inner">'
      +   '<div class="header-left">'
      +     '<a href="index.html" class="logo" aria-label="Tenderfy home">' + LOGO + '</a>'
      +     '<nav class="nav-links" aria-label="Primary">' + navLinks(active, false) + '</nav>'
      +   '</div>'
      +   '<div class="header-right">'
      +     '<a href="#" class="btn btn-ghost-light" data-action="login">Log in</a>'
      +     '<a href="pricing.html" class="btn btn-secondary btn-sm">Book a Demo ' + ARROW + '</a>'
      +   '</div>'
      +   '<button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>'
      + '</div>'
      + '<div class="mobile-menu" id="mobileMenu">' + navLinks(active, true)
      +   '<div class="mobile-menu-actions"><a href="#" class="btn btn-ghost-dark" data-action="login">Log in</a><a href="pricing.html" class="btn btn-secondary">Book a Demo</a></div>'
      + '</div></header>';
  }

  function col(title, links) {
    return '<div class="footer-col"><h4>' + title + '</h4>'
      + links.map(function (l) { return '<a href="' + l[1] + '">' + l[0] + '</a>'; }).join('') + '</div>';
  }

  function footerHTML() {
    return ''
      + '<footer class="footer" id="footer"><div class="container footer-grid">'
      + '<div class="footer-brand">' + LOGO
      +   '<p class="footer-tag">AI-powered tendering for construction, civil, engineering, and trades across Australia &amp; New Zealand.</p></div>'
      + col('Product', [['Product', 'product.html'], ['Integrations', 'product.html#integrations'], ['Trust Centre', 'trust.html'], ['Pricing', 'pricing.html']])
      + col('Solutions', [['Construction', 'solutions.html#construction'], ['Civil', 'solutions.html#civil'], ['Engineering', 'solutions.html#engineering'], ['Infrastructure', 'solutions.html#infrastructure'], ['HVAC & Trades', 'solutions.html#hvac'], ['Government', 'solutions.html#government']])
      + col('Resources', [['Insights', 'insights.html'], ['AI Policy', 'ai-policy.html'], ['Trust Centre', 'trust.html'], ['Terms & Privacy', '#']])
      + col('Company', [['About Us', 'about.html'], ['Our Story', 'about.html#our-story'], ['Book a Demo', 'pricing.html']])
      + '</div>'
      + '<div class="container footer-bottom"><span>© 2026 Tenderfy. All rights reserved.</span><span>Made in Australia 🇦🇺 &amp; New Zealand 🇳🇿</span></div></footer>'
      + '<button class="to-top" id="toTop" aria-label="Back to top"><svg viewBox="0 0 20 20" fill="none"><path d="M10 16V4M5 9l5-5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
      + '<div class="toast" id="toast"></div>';
  }

  var active = (document.body.getAttribute('data-page')) || '';
  var h = document.getElementById('mount-header');
  var f = document.getElementById('mount-footer');
  if (h) h.outerHTML = headerHTML(active);
  if (f) f.outerHTML = footerHTML();
})();
