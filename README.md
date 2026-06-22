# Tenderfy — Landing site prototype

A multi-page marketing-site prototype for **Tenderfy**, the AI-powered tendering platform for construction, civil, engineering, and trades firms across Australia & New Zealand.

Static site — plain HTML, CSS, and vanilla JS, no build step.

## Pages
- `index.html` — Home (hero, problem, old-vs-new, flywheel, output showcase, Ray spotlight, case study, pricing, closing CTA)
- `product.html` — Product feature deep-dive with interactive mockups
- `solutions.html` — Industry verticals (tabbed)
- `pricing.html` — Plans + billing toggle + FAQ
- `about.html` — Story, team, contact
- `trust.html` — Trust Centre (security & data residency)
- `ai-policy.html` — Ray AI policy
- `insights.html` — Articles

## Structure
- `styles.css` — all styling and design tokens (brand teal `#1D9E75`, Teal-50, amber CTA accent, Outfit type)
- `script.js` — interactions (chat demo, tabs, FAQ, billing toggle, scroll reveals, count-ups, pointer tilt, marquee)
- `partials.js` — shared header & footer injected into every page (set `<body data-page="…">` for active nav)

## Run locally
Any static server, e.g.:

```bash
npx serve .
```

> Prototype only. Client logos, screenshots, and some imagery are placeholders pending real assets.
