# The Testimony — essay site

A static site for philosophical and logical essays on the shahāda, argued from
the Qur'an and tested against the Sunna, ancient texts, and material evidence.

No build step, no dependencies, no external network requests. Open
`index.html` in a browser, or serve the folder.

```
python3 -m http.server 8000 --directory shahada-essays
```

## Two things to do before this goes live

### 1. Your portrait

Drop a square image at **`assets/author.jpg`**. It is the only image on the
site and it appears in exactly one place: the small circular colophon at the
very bottom of `about.html`. Not the homepage, not the essay pages, not the
header.

- Square crop, 400×400 px or larger (it renders at 56 px, so this is for
  retina density only)
- If the file is missing, the circle degrades to a neutral placeholder — the
  layout never breaks
- To remove the portrait entirely, delete the `<section class="colophon">`
  block from `about.html`

### 2. Your name

The author name is the literal placeholder `Author Name`, in `about.html`.

```
grep -rn "Author Name" shahada-essays/
```

## Layout

```
shahada-essays/
├── index.html                            essay index
├── about.html                            method, rules, colophon (portrait here)
├── essays/
│   ├── 01-the-shape-of-the-testimony.html
│   └── 02-four-witnesses.html
└── assets/
    ├── style.css                         the whole design system
    └── author.jpg                        ← you add this
```

## Writing a new essay

Copy an existing essay file, rename it `NN-slug.html`, then add an entry to the
`<ol class="toc">` in `index.html` and fix the `prev-next` links at the foot of
the neighbouring essays. The two shipped essays are marked
`Draft · placeholder` — remove that chip once the text is yours.

## The components you have

Everything below is plain HTML using classes already defined in `style.css`.

**Witness block** — one per piece of evidence. The modifier sets the colour:
`witness--quran`, `witness--sunna`, `witness--ancient`, `witness--material`.

```html
<div class="witness witness--quran">
  <p class="witness__kind">First witness · Qur'anic text</p>
  <p class="witness__ar" lang="ar" dir="rtl">…</p>   <!-- optional -->
  <p class="witness__tr">Transliteration.</p>         <!-- optional -->
  <p class="witness__en">Translation or description.</p>
  <p class="witness__src">Citation, with grading or dating method.</p>
</div>
```

**Argument block** — premises auto-number as P1, P2, …; add `class="conclusion"`
to the final `<li>` and it renders under a rule with `∴`. Optional `<p
class="formal">` for symbolic notation.

**Footnotes** — `<a class="fn-ref" href="#n1" id="r1">1</a>` in the body,
matching `<li id="n1">` in `<section class="notes">`, with `<a class="fn-ref"
href="#r1">↩</a>` to jump back.

**Section headings** — `<h2 class="section-title" data-num="i">`; the `data-num`
renders as the small label above the heading.

## Design notes

- Light and dark both defined; follows the reader's system setting, and honours
  an explicit `data-theme="light"` / `data-theme="dark"` on `<html>`
- Body text is set to a ~34 rem measure; essay pages use it, index and about
  use a wider `wrap--wide`
- Arabic uses a naskh-first font stack with `dir="rtl"`, falling back through
  system Arabic faces — no webfont is loaded, so if you want Amiri or
  Scheherazade New rendered everywhere, self-host it into `assets/` and add an
  `@font-face` rule
- Print stylesheet included: nav and footers drop, witness and argument blocks
  avoid page breaks
