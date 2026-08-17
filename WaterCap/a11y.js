/* ─────────────────────────────────────────────────────────────────────
   Accessibility menu — shared, identical copy on all Peocl sites.
   No dependencies, no build step. Loaded from <head> (not deferred) so
   saved preferences are on <html> before the first paint; the menu
   itself is built once the DOM is ready.

   Text resizing scales each element's own computed font-size rather
   than the root size, because these pages are laid out in px — a
   root-size change would move nothing. Layout media queries stay
   untouched, so this is a text-only resize (WCAG 1.4.4).
   ───────────────────────────────────────────────────────────────────── */
(function () {
  'use strict'

  var KEY = 'peocl.a11y'
  var SCALES = [1, 1.15, 1.3, 1.5]
  var root = document.documentElement

  var TOGGLES = [
    { id: 'contrast', cls: 'a11y-contrast', icon: '◐' },
    { id: 'grayscale', cls: 'a11y-grayscale', icon: '🌗' },
    { id: 'links', cls: 'a11y-links', icon: '🔗' },
    { id: 'font', cls: 'a11y-font', icon: '🔤' },
    { id: 'motion', cls: 'a11y-no-motion', icon: '⏸' },
    { id: 'cursor', cls: 'a11y-cursor', icon: '➤' },
  ]

  var TEXT = {
    he: {
      dir: 'rtl',
      fab: 'פתיחת תפריט נגישות',
      title: 'תפריט נגישות',
      close: 'סגירת תפריט הנגישות',
      size: 'גודל טקסט',
      bigger: 'הגדלת הטקסט',
      smaller: 'הקטנת הטקסט',
      contrast: 'ניגודיות גבוהה',
      grayscale: 'גווני אפור',
      links: 'הדגשת קישורים',
      font: 'גופן קריא',
      motion: 'עצירת אנימציות',
      cursor: 'סמן עכבר גדול',
      reset: 'איפוס כל ההגדרות',
      statement: 'הצהרת נגישות',
      on: 'פעיל',
      announce: function (pct) {
        return 'גודל הטקסט: ' + pct + ' אחוז'
      },
    },
    en: {
      dir: 'ltr',
      fab: 'Open the accessibility menu',
      title: 'Accessibility menu',
      close: 'Close the accessibility menu',
      size: 'Text size',
      bigger: 'Increase text size',
      smaller: 'Decrease text size',
      contrast: 'High contrast',
      grayscale: 'Grayscale',
      links: 'Highlight links',
      font: 'Readable font',
      motion: 'Stop animations',
      cursor: 'Large cursor',
      reset: 'Reset all settings',
      statement: 'Accessibility statement',
      on: 'on',
      announce: function (pct) {
        return 'Text size ' + pct + ' percent'
      },
    },
  }

  /* ── State ──────────────────────────────────────────────────────────── */

  var state = { size: 0 }
  TOGGLES.forEach(function (t) {
    state[t.id] = false
  })

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || '{}')
      if (typeof saved.size === 'number' && saved.size >= 0 && saved.size < SCALES.length) {
        state.size = saved.size
      }
      TOGGLES.forEach(function (t) {
        if (saved[t.id] === true) state[t.id] = true
      })
    } catch (e) {
      /* private mode / disabled storage — run with defaults */
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch (e) {
      /* nothing we can do, and nothing that should break the page */
    }
  }

  /* ── Applying state ─────────────────────────────────────────────────── */

  function applyClasses() {
    TOGGLES.forEach(function (t) {
      root.classList.toggle(t.cls, state[t.id])
    })
  }

  // Original computed font size per element, measured while unscaled.
  var baseSizes = new WeakMap()
  var scaled = []

  function scalableElements() {
    var out = []
    var all = document.body ? document.body.querySelectorAll('*') : []
    for (var i = 0; i < all.length; i++) {
      var el = all[i]
      if (el.closest('.a11y-ui')) continue
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'BR') continue
      out.push(el)
    }
    return out
  }

  function applyTextScale() {
    if (!document.body) return
    var factor = SCALES[state.size]

    // Clear previous inline sizes so measurements below are of the real design.
    scaled.forEach(function (el) {
      el.style.removeProperty('font-size')
    })
    scaled = []

    if (factor === 1) {
      document.body.style.removeProperty('font-size')
      return
    }

    var els = scalableElements()
    els.forEach(function (el) {
      if (!baseSizes.has(el)) {
        baseSizes.set(el, parseFloat(window.getComputedStyle(el).fontSize) || 0)
      }
    })
    var bodyBase = parseFloat(window.getComputedStyle(document.body).fontSize) || 16
    document.body.style.fontSize = (bodyBase * factor).toFixed(2) + 'px'
    els.forEach(function (el) {
      var base = baseSizes.get(el)
      if (!base) return
      el.style.fontSize = (base * factor).toFixed(2) + 'px'
      scaled.push(el)
    })
  }

  // clamp()/vw-based sizes are viewport dependent, so re-measure after a resize.
  var resizeTimer = null
  window.addEventListener(
    'resize',
    function () {
      if (state.size === 0) return
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(function () {
        scaled.forEach(function (el) {
          el.style.removeProperty('font-size')
        })
        document.body.style.removeProperty('font-size')
        baseSizes = new WeakMap()
        scaled = []
        applyTextScale()
      }, 250)
    },
    { passive: true }
  )

  // "Stop animations" also has to stop media that plays by itself.
  var autoplayed = []
  function applyMotion() {
    var videos = document.querySelectorAll('video')
    for (var i = 0; i < videos.length; i++) {
      var v = videos[i]
      if (state.motion) {
        if (v.autoplay || !v.paused) {
          if (autoplayed.indexOf(v) === -1) autoplayed.push(v)
          v.autoplay = false
          v.pause()
        }
      } else if (autoplayed.indexOf(v) !== -1) {
        v.autoplay = true
        var p = v.play()
        if (p && p.catch) p.catch(function () {})
      }
    }
    if (!state.motion) autoplayed = []
  }

  /* ── Menu UI ────────────────────────────────────────────────────────── */

  var ui = null // { fab, panel, refs… }

  function lang() {
    return (root.getAttribute('lang') || 'en').toLowerCase().indexOf('he') === 0 ? 'he' : 'en'
  }
  function t() {
    return TEXT[lang()]
  }

  var ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="3.9" r="2.1"/>' +
    '<path d="M19.9 7.3a1.1 1.1 0 0 0-1.3-.85l-4.4 1a9.9 9.9 0 0 1-4.4 0l-4.4-1A1.1 1.1 0 0 0 5.3 8.6l3.9.87v3.05L7.4 19a1.15 1.15 0 0 0 2.2.66l1.7-5.16h1.4l1.7 5.16a1.15 1.15 0 0 0 2.2-.66l-1.8-6.48V9.47l3.9-.87c.6-.13 1-.72.9-1.3z"/>' +
    '</svg>'

  function build() {
    var fab = document.createElement('button')
    fab.type = 'button'
    fab.className = 'a11y-ui a11y-fab'
    fab.id = 'a11y-fab'
    fab.setAttribute('aria-expanded', 'false')
    fab.setAttribute('aria-controls', 'a11y-panel')
    fab.innerHTML = ICON

    var panel = document.createElement('div')
    panel.className = 'a11y-ui a11y-panel'
    panel.id = 'a11y-panel'
    panel.hidden = true
    panel.setAttribute('role', 'group')
    panel.setAttribute('aria-labelledby', 'a11y-panel-title')

    var optsHtml = TOGGLES.map(function (o) {
      return (
        '<button type="button" class="a11y-opt" data-a11y="' +
        o.id +
        '" aria-pressed="false">' +
        '<span class="a11y-opt-icon" aria-hidden="true">' +
        o.icon +
        '</span>' +
        '<span class="a11y-opt-text" data-label="' +
        o.id +
        '"></span>' +
        '<span class="a11y-opt-state" data-state="' +
        o.id +
        '"></span>' +
        '</button>'
      )
    }).join('')

    panel.innerHTML =
      '<div class="a11y-panel-head">' +
      '<h2 id="a11y-panel-title"></h2>' +
      '<button type="button" class="a11y-close" data-a11y-close>' +
      '<span aria-hidden="true">✕</span></button>' +
      '</div>' +
      '<div class="a11y-size">' +
      '<span class="a11y-size-label" data-label="size"></span>' +
      '<button type="button" class="a11y-step" data-a11y-size="-1">A−</button>' +
      '<span class="a11y-size-value" data-size-value></span>' +
      '<button type="button" class="a11y-step" data-a11y-size="1">A+</button>' +
      '</div>' +
      '<div class="a11y-opts">' +
      optsHtml +
      '</div>' +
      '<div class="a11y-foot">' +
      '<button type="button" class="a11y-reset" data-a11y-reset></button>' +
      '<a class="a11y-statement" href="accessibility.html"></a>' +
      '</div>' +
      '<p class="sr-only" aria-live="polite" data-a11y-live></p>'

    document.body.appendChild(fab)
    document.body.appendChild(panel)

    ui = {
      fab: fab,
      panel: panel,
      live: panel.querySelector('[data-a11y-live]'),
      sizeValue: panel.querySelector('[data-size-value]'),
      minus: panel.querySelector('[data-a11y-size="-1"]'),
      plus: panel.querySelector('[data-a11y-size="1"]'),
    }

    fab.addEventListener('click', function () {
      setOpen(panel.hidden)
    })
    panel.querySelector('[data-a11y-close]').addEventListener('click', function () {
      setOpen(false)
      fab.focus()
    })
    panel.querySelector('[data-a11y-reset]').addEventListener('click', reset)
    panel.querySelectorAll('[data-a11y-size]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        step(parseInt(btn.getAttribute('data-a11y-size'), 10))
      })
    })
    panel.querySelectorAll('[data-a11y]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-a11y')
        state[id] = !state[id]
        applyClasses()
        if (id === 'motion') applyMotion()
        save()
        render()
      })
    })

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) {
        setOpen(false)
        fab.focus()
      }
    })
    document.addEventListener('click', function (e) {
      if (panel.hidden) return
      if (panel.contains(e.target) || fab.contains(e.target)) return
      setOpen(false)
    })

    // The sites switch language at runtime; keep the menu in step.
    new MutationObserver(render).observe(root, {
      attributes: true,
      attributeFilter: ['lang'],
    })

    render()
  }

  function setOpen(open) {
    ui.panel.hidden = !open
    ui.fab.setAttribute('aria-expanded', open ? 'true' : 'false')
    if (open) ui.panel.querySelector('.a11y-close').focus()
  }

  function step(dir) {
    var next = Math.min(SCALES.length - 1, Math.max(0, state.size + dir))
    if (next === state.size) return
    state.size = next
    applyTextScale()
    save()
    render()
    var pct = Math.round(SCALES[state.size] * 100)
    ui.live.textContent = t().announce(pct)
  }

  function reset() {
    state.size = 0
    TOGGLES.forEach(function (o) {
      state[o.id] = false
    })
    applyClasses()
    applyTextScale()
    applyMotion()
    save()
    render()
    ui.fab.focus()
  }

  function render() {
    if (!ui) return
    var d = t()
    ui.fab.setAttribute('aria-label', d.fab)
    ui.fab.title = d.fab
    ui.panel.setAttribute('dir', d.dir)
    ui.panel.querySelector('#a11y-panel-title').textContent = d.title
    var close = ui.panel.querySelector('.a11y-close')
    close.setAttribute('aria-label', d.close)
    close.title = d.close
    ui.panel.querySelectorAll('[data-label]').forEach(function (el) {
      el.textContent = d[el.getAttribute('data-label')]
    })
    ui.minus.setAttribute('aria-label', d.smaller)
    ui.plus.setAttribute('aria-label', d.bigger)
    ui.minus.disabled = state.size === 0
    ui.plus.disabled = state.size === SCALES.length - 1
    ui.sizeValue.textContent = Math.round(SCALES[state.size] * 100) + '%'
    ui.panel.querySelector('[data-a11y-reset]').textContent = d.reset
    ui.panel.querySelector('.a11y-statement').textContent = d.statement
    TOGGLES.forEach(function (o) {
      var btn = ui.panel.querySelector('[data-a11y="' + o.id + '"]')
      btn.setAttribute('aria-pressed', state[o.id] ? 'true' : 'false')
      ui.panel.querySelector('[data-state="' + o.id + '"]').textContent = state[o.id] ? d.on : ''
    })
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */

  load()
  applyClasses() // before first paint, so saved settings don't flash

  function ready() {
    build()
    applyTextScale()
    applyMotion()
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready)
  } else {
    ready()
  }
})()
