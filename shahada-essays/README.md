# The Testimony — essay site

A static site for philosophical and logical essays on the shahāda, argued from
the Qur'an and tested against the Sunna, ancient texts, and material evidence.

No build step, no dependencies, no external network requests. Open
`index.html` in a browser, or serve the folder.

```
python3 -m http.server 8000 --directory shahada-essays
```

## One thing to do before this goes live

### The portrait — in place

**`assets/author.jpg`** (800×800) is the only image on the site, and it appears
in exactly one place: the small circular colophon at the foot of `about.html`.
Not the homepage, not the essay pages, not the header.

It was prepared from the source photograph by: a headshot crop with the eye line
on the upper third; a local tone lift inside the lens area so the eyes read
through the tint; a softening pass on the left lens, whose reflection otherwise
competes for attention; a radial falloff to settle the street behind the
subject; and a restrained grade toward the site's palette. **EXIF was stripped**
— the original carried camera and location metadata that should not ship with a
public site.

- To swap it, overwrite the file with any square image, 400 px or larger
- If the file is absent, the circle degrades to a neutral placeholder and the
  layout holds
- To drop the portrait entirely, delete the `<section class="colophon">` block
  from `about.html`

### Your name

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
