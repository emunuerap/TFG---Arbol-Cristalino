// script.js
// ------------------------------------------------------------
// Árbol Cristalino · Script principal (limpio)
// ------------------------------------------------------------

import * as THREE from 'three'
import Experience from './Experience/Experience.js'

// XR (Raíces · Interacción)
import { initDnaLoader } from './XR/dnaLoader.js'
import { initConstellation } from './XR/constellation.js'
import { initXrZones } from './XR/xrZones.js'

// DataSystems (Raíces · Sistemas)
import { initDataSystems } from './DataSystems/dataSystems.js'

// Cursores
import { initTubesCursor } from './Experience/Utils/tubesCursor.js'
import { initProCursor } from './Experience/Utils/proCursor.js'

// ------------------------------------------------------------
// 0) Helpers
// ------------------------------------------------------------

const q = (sel, root = document) => root.querySelector(sel)
const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel))
const clamp01 = (x) => Math.max(0, Math.min(1, x))

// GSAP / Plugins (si estamos en window)
const GSAP = typeof window !== 'undefined' ? window.gsap : null
const ScrollTrigger = typeof window !== 'undefined' ? window.ScrollTrigger : null
const Flip = typeof window !== 'undefined' ? window.Flip : null
if (GSAP && ScrollTrigger && Flip) GSAP.registerPlugin(ScrollTrigger, Flip)

// ------------------------------------------------------------
// 1) Estado global
// ------------------------------------------------------------

let experience = null

// UI refs
const ui = {
  mainUI: null,
  bar: null,
  thumb: null,
  muteBtn: null,
  scrollPrompt: null,
  sectionsContainer: null,
  sectionCards: [],
  exitBtn: null,
  rootsHud: null,
  branchesHud: null,
  crownHud: null,
}

// scroll + secciones
let isInImmersiveSection = false
let isScrollbarVisible = false
let hideTimer = null
let canShowScrollPrompt = false

let lastT = 0
let activeSectionIndex = -1

let hasShownPromptOnce = false
let showPromptTimeout = null
let scrollPromptVisible = false

const PROMPT_T_THRESHOLD = 0.03 // ajusta: 0.02–0.06 suele ir bien

function setScrollPromptVisible(show) {
  if (!ui.scrollPrompt) return
  if (show === scrollPromptVisible) return
  scrollPromptVisible = show
  ui.scrollPrompt.classList.toggle('hidden', !show)
}

function updateScrollPromptFromT(t) {
  if (!experience || experience.state !== 'main') return setScrollPromptVisible(false)
  if (isInImmersiveSection) return setScrollPromptVisible(false)

  const show = (typeof t === 'number' && t <= PROMPT_T_THRESHOLD)
  setScrollPromptVisible(show)
}

let returnToSectionIndex = -1

function getSectionCenterT(sectionIndex) {
  const count = ui.sectionCards.length
  const bounds = makeSectionBounds(count)
  const b = bounds?.[sectionIndex]
  if (!b) return lastT || 0

  const midNorm = (b.start + b.end) * 0.5
  return MIN_T_FOR_SECTIONS + midNorm * (MAX_T_FOR_SECTIONS - MIN_T_FOR_SECTIONS)
}

function scrollToT(t) {
  const doc = document.documentElement
  const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight)
  const y = THREE.MathUtils.clamp(t, 0, 1) * maxScroll
  window.scrollTo(0, y)
}


// cursores
let tubesCursorApp = null
let proCursorApp = null

// DataSystems cleanup
let dataModule = null
let dsResizeObserver = null
let dsResizeHandler = null

// Branches cleanup
let branchesInited = false
let branchesTriggers = []

// ------------------------------------------------------------
// 2) Setup UI refs
// ------------------------------------------------------------

function bindUIRefs() {
  ui.mainUI = q('.ui-container')
  ui.bar = q('.custom-scrollbar')
  ui.thumb = q('.custom-scrollbar-thumb')
  ui.muteBtn = q('#mute-btn')
  ui.scrollPrompt = q('#scroll-prompt')

  ui.sectionsContainer = q('.sections-container')
  ui.sectionCards = ui.sectionsContainer ? qa('.section-card', ui.sectionsContainer) : []

  ui.exitBtn = q('#section-exit-btn')

  ui.rootsHud = q('.roots-immersive-hud')
  ui.branchesHud = q('.branches-immersive-hud')
  ui.crownHud = q('.crown-immersive-hud')
}

function initCrownToggles() {
  const hud = ui.crownHud
  if (!hud) return

  const btns = Array.from(hud.querySelectorAll('.crown-toggle-btn'))
  const texts = Array.from(hud.querySelectorAll('.crown-mode-text'))

  btns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()

      const mode = btn.dataset.crownMode
      if (!mode) return

      btns.forEach(b => b.classList.toggle('is-active', b === btn))
      texts.forEach(t => t.classList.toggle('is-active', t.dataset.crownModeText === mode))
    })
  })
}

// ------------------------------------------------------------
// 3) Scroll enabling / UI show
// ------------------------------------------------------------

// Scroll Prompt (Scroll to explore)
// ---------------------------------
// Regla: solo depende de 't' (scroll progress) en el estado MAIN.
// - Si t <= umbral: mostramos (fade-in CSS)
// - Si t > umbral o estamos en inmersivo: ocultamos (fade-out CSS)
// No usamos listeners wheel/scroll para evitar conflictos y “flashes”.


function enableMainScrollUI() {
  if (ui.mainUI) {
    ui.mainUI.classList.remove('is-hidden')
    ui.mainUI.classList.add('is-visible')
  }
  // altura para scroll “virtual”
  if (!document.body.style.height) document.body.style.height = '500vh'
  document.body.style.overflowY = 'scroll'
}

function disableDocumentScroll() {
  // corta scroll del documento (modo inmersivo)
  document.body.style.overflow = 'hidden'
}

function restoreDocumentScroll() {
  // vuelve al modo normal (usa overflow-y scroll del setup)
  document.body.style.overflow = ''
}

// ------------------------------------------------------------
// 4) Scrollbar personalizada
// ------------------------------------------------------------

function updateScrollbarThumb(t) {
  if (!ui.bar || !ui.thumb) return

  const trackH = ui.bar.clientHeight
  const minThumb = 40
  const thumbH = Math.max(minThumb, trackH * 0.14)
  const y = (trackH - thumbH) * THREE.MathUtils.clamp(t || 0, 0, 1)

  ui.thumb.style.height = `${thumbH}px`
  ui.thumb.style.transform = `translateY(${y}px)`
}

function showScrollbar() {
  if (!ui.bar || isScrollbarVisible) return
  isScrollbarVisible = true
  ui.bar.style.opacity = '1'
  ui.bar.style.pointerEvents = 'auto'
}

function hideScrollbar() {
  if (!ui.bar || !isScrollbarVisible) return
  isScrollbarVisible = false
  ui.bar.style.opacity = '0'
  ui.bar.style.pointerEvents = 'none'
}

function onScrollActivity(t) {
  if (!experience || experience.state !== 'main') return
  updateScrollbarThumb(t)
  showScrollbar()
  clearTimeout(hideTimer)
  hideTimer = setTimeout(hideScrollbar, 800)
}

// ------------------------------------------------------------
// 5) Secciones: bounds + activación
// ------------------------------------------------------------

function makeSectionBounds(count) {
  // Si tienes 3 secciones, respetamos tu “timing” actual
  if (count === 3) {
    return [
      { start: 0.0, end: 0.3 },
      { start: 0.38, end: 0.7 },
      { start: 0.78, end: 1.0 },
    ]
  }

  // Fallback: repartir uniforme
  const bounds = []
  const step = 1 / Math.max(1, count)
  for (let i = 0; i < count; i++) {
    const start = i * step
    const end = i === count - 1 ? 1 : (i + 1) * step
    bounds.push({ start, end })
  }
  return bounds
}

const MIN_T_FOR_SECTIONS = 0.1
const MAX_T_FOR_SECTIONS = 0.9

function crossfadeTitleSubtitle(subtitleText, titleColor) {
  const subtitleEl = q('.subtitle')
  const titleEl = q('.title')
  if (!subtitleEl || !titleEl) return
  subtitleEl.textContent = subtitleText
  if (titleColor) titleEl.style.color = titleColor
}

function setActiveSection(index, localT) {
  if (!experience || !experience.world) return
  if (isInImmersiveSection) return

  if (index === activeSectionIndex && index !== -1) {
    experience.world.setSection?.(index, localT)
    return
  }

  activeSectionIndex = index

  ui.sectionCards.forEach((card, i) => {
    card.classList.toggle('is-active', i === index)
  })

  if (index === -1) {
    crossfadeTitleSubtitle('Portfolio Interactivo', '#ffffff')
    return
  }

  if (index >= 0 && index < ui.sectionCards.length) {
    experience.world.setSection?.(index, localT)
    experience.world.updateScrollbarMarks?.(index)
  }
}

// ------------------------------------------------------------
// 6) Inmersivo: enter / exit
// ------------------------------------------------------------

function enterImmersiveSection(sectionIndex, source = 'ui') {
  if (!experience || experience.state !== 'main') return

  returnToSectionIndex = sectionIndex

  isInImmersiveSection = true
  disableDocumentScroll()

  document.body.classList.add('is-section-immersive')
  document.body.classList.remove(
    'is-section-immersive-roots',
    'is-section-immersive-branches',
    'is-section-immersive-crown'
  )

  if (sectionIndex === 0) document.body.classList.add('is-section-immersive-roots')
  if (sectionIndex === 1) document.body.classList.add('is-section-immersive-branches')
  if (sectionIndex === 2) document.body.classList.add('is-section-immersive-crown')

  document.body.classList.remove('immersive-0', 'immersive-1', 'immersive-2')
  document.body.classList.add(`immersive-${sectionIndex}`)

  ui.sectionCards.forEach((card) => {
    const cardIndex = Number(card.dataset.section ?? -1)
    card.classList.toggle('is-immersive-active', cardIndex === sectionIndex)
  })

  // UI cleanup
  clearTimeout(showPromptTimeout)
  if (ui.scrollPrompt) ui.scrollPrompt.classList.add('hidden')
  hideScrollbar()

  // 3D enter
  experience.enterImmersiveSection?.(sectionIndex)

  // HUD enter hooks
  if (sectionIndex === 1) {
    enterBranchesHUD()
  
    // opcional: pequeño delay para que el “handoff” sea premium
ui.branchesHud?.classList.add('is-entering')
setTimeout(() => ui.branchesHud?.classList.remove('is-entering'), 900)

    //  Siempre empezar Ramas desde el inicio
    const branchesScroll = ui.branchesHud
      ? ui.branchesHud.querySelector('[data-branches-scroll]')
      : null
  
    if (branchesScroll) {
      branchesScroll.scrollTop = 0
      // por si hay inertia rara en algunos navegadores:
      branchesScroll.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  
    //  Refresh para que ScrollTrigger calcule posiciones con scrollTop=0
    requestAnimationFrame(() => {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh(true)
    })
  }
  
  if (sectionIndex === 2 && typeof window.playCrownIntro === 'function') {
    setTimeout(() => window.playCrownIntro(), 100)
  }
}

function exitImmersiveSection() {
  if (!experience) return

  // pausa módulos “externos”
  try {
    dataModule?.exit?.()
  } catch (e) {}
  try {
    exitBranchesHUD()
  } catch (e) {}

  isInImmersiveSection = false

  document.body.classList.remove(
    'is-section-immersive',
    'is-section-immersive-roots',
    'is-section-immersive-branches',
    'is-section-immersive-crown',
    'immersive-0',
    'immersive-1',
    'immersive-2'
  )

  ui.sectionCards.forEach((card) => card.classList.remove('is-immersive-active'))

  restoreDocumentScroll()
  experience.exitImmersiveSection?.()

  requestAnimationFrame(() => {
    const tNow = experience?.camera?.computeT?.()
    updateScrollPromptFromT(tNow ?? 0)
  })

  requestAnimationFrame(() => {
    const t = getSectionCenterT(returnToSectionIndex)
    scrollToT(t)
  })
  
}

// ------------------------------------------------------------
// 7) Raíces HUD (XR + DataSystems + Timeline/Map)
// ------------------------------------------------------------

function initRootsHUD() {
  if (!ui.rootsHud) return

  const rootsHud = ui.rootsHud
  const globalDetailScroll = q('.roots-detail-scroll', rootsHud)

  const rootsPills = qa('.roots-pill', rootsHud)
  const rootsPanels = qa('[data-root-panel]', rootsHud)

  const ROOT_KEY_MAP = {
    gastronomia: 'gastro',
    interaccion: 'digital',
    sistemas: 'data',
  }

  // ---------------- XR panel ----------------
  const xrPanel = q('[data-root-panel="interaccion"]', rootsHud)
  const xrLoader = xrPanel ? q('.xr-loader', xrPanel) : null
  const xrLoaderCanvas = xrPanel ? q('.xr-loader-canvas', xrPanel) : null
  const xrMain = xrPanel ? q('.xr-main', xrPanel) : null
  const xrConstellationCanvas = xrPanel ? q('.xr-constellation-canvas', xrPanel) : null

  let xrSceneInitialized = false
  let xrLoaderRunning = false

  const playXrLoader = () => {
    if (!xrPanel || !xrLoader || !xrLoaderCanvas || !xrMain) return
    if (xrLoaderRunning) return
    xrLoaderRunning = true

    xrLoader.style.display = 'block'
    xrLoader.style.opacity = '1'
    xrLoader.style.transform = 'none'
    xrLoader.style.filter = 'none'
    xrLoader.style.transition = 'none'
    xrLoader.classList.remove('is-fading-out')
    xrLoader.classList.add('is-dna-active')

    xrMain.classList.add('xr-main-prehidden', 'is-hidden')
    xrMain.classList.remove('is-fading-in')

    requestAnimationFrame(() => {
      initDnaLoader({
        canvas: xrLoaderCanvas,
        text: 'EDUARDO PORLAN',
        subtitle: 'XR · Digital Interaction',
        onComplete: () => {
          xrLoader.classList.remove('is-dna-active')
          xrLoader.classList.add('is-fading-out')
          xrLoader.style.transition =
            'opacity 0.55s ease-out, transform 0.55s ease-out, filter 0.55s ease-out'
          xrLoader.style.opacity = '0'
          xrLoader.style.transform = 'scale(0.96)'
          xrLoader.style.filter = 'blur(4px)'

          setTimeout(() => {
            xrLoader.style.display = 'none'
            xrLoader.classList.remove('is-fading-out')

            xrMain.classList.remove('is-hidden', 'xr-main-prehidden')
            xrMain.style.opacity = '0'
            xrMain.style.transform = 'translateY(20px) scale(0.97)'
            xrMain.style.filter = 'blur(8px)'
            xrMain.style.transition =
              'opacity 0.6s ease-out, transform 0.6s ease-out, filter 0.6s ease-out'

            requestAnimationFrame(() => {
              xrMain.style.opacity = '1'
              xrMain.style.transform = 'translateY(0) scale(1)'
              xrMain.style.filter = 'blur(0px)'
            })

            if (!xrSceneInitialized) {
              if (xrConstellationCanvas && !xrConstellationCanvas.dataset.initialized) {
                initConstellation(xrConstellationCanvas)
                xrConstellationCanvas.dataset.initialized = 'true'
              }
              initXrZones()
              xrSceneInitialized = true
            }

            xrLoaderRunning = false
          }, 550)
        },
      })
    })
  }

  // ---------------- DataSystems panel ----------------
  const dataPanel = q('[data-root-panel="sistemas"]', rootsHud)
  const dataCanvas = dataPanel ? q('.data-reactor-canvas', dataPanel) : null

  const ds = dataPanel
    ? {
        shell: q('.ds-reactor-shell', dataPanel),
        chips: qa('.ds-chip', dataPanel),
        microLabel: q('#ds-micro-label', dataPanel),
        microDesc: q('#ds-micro-desc', dataPanel),
        zones: qa('.ds-zone', dataPanel),
      }
    : { shell: null, chips: [], microLabel: null, microDesc: null, zones: [] }

  const DS_COPY = {
    raw: { label: 'DATOS CRUDOS', desc: 'Alto ruido, densidad variable y sin estructura definida.' },
    filter: {
      label: 'FILTRADO',
      desc: 'Señal emergiendo: restricciones, eliminación de outliers y alineación.',
    },
    flow: { label: 'FLUJO', desc: 'Menos unidades, trayectorias claras y ritmo estable.' },
  }
  const DS_ZONE_COPY = {
    input: { label: 'ENTRADA', desc: 'Noise reduction · limpiar y preparar la materia prima.' },
    processing: { label: 'PROCESO', desc: 'Pattern detection · estructurar, agrupar, transformar.' },
    output: { label: 'SALIDA', desc: 'System optimization · decisiones y acciones con intención.' },
  }

  let dsProgress = 0
  let dsState = 'raw'
  let dsHoverZone = null
  let dataUIWired = false
  let dataSceneInitialized = false

  const setDsMicro = (label, desc) => {
    if (ds.microLabel) ds.microLabel.textContent = label
    if (ds.microDesc) ds.microDesc.textContent = desc
  }

  const setDsChipsActive = (state) => {
    ds.chips.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.dsState === state))
  }

  const stateFromProgress = (p) => (p < 0.34 ? 'raw' : p < 0.67 ? 'filter' : 'flow')

  const applyProgress = (p, { silentState = false } = {}) => {
    dsProgress = clamp01(p)
    dataModule?.setProgress?.(dsProgress)

    const autoState = stateFromProgress(dsProgress)
    if (!silentState && autoState !== dsState) {
      dsState = autoState
      setDsChipsActive(dsState)
      dataModule?.setState?.(dsState)
      if (!dsHoverZone) setDsMicro(DS_COPY[dsState].label, DS_COPY[dsState].desc)
    }
  }

  const setState = (state) => {
    dsState = state
    setDsChipsActive(state)
    dataModule?.setState?.(state)
    if (!dsHoverZone) setDsMicro(DS_COPY[state].label, DS_COPY[state].desc)

    const map = { raw: 0.05, filter: 0.52, flow: 0.95 }
    applyProgress(map[state] ?? 0.05, { silentState: true })
  }

  const wireDataUIOnce = () => {
    if (dataUIWired) return
    dataUIWired = true

    ds.chips.forEach((btn) => {
      btn.addEventListener('click', () => {
        const st = btn.dataset.dsState
        if (!st) return
        setState(st)
        dataModule?.setIntensity?.(0.65)
      })
    })

    ds.zones.forEach((z) => {
      z.addEventListener('mouseenter', () => {
        dsHoverZone = z.dataset.dsZone
        const c = DS_ZONE_COPY[dsHoverZone]
        if (c) setDsMicro(c.label, c.desc)
        dataModule?.setFocus?.(dsHoverZone)
        dataModule?.setIntensity?.(0.75)
      })
      z.addEventListener('mouseleave', () => {
        dsHoverZone = null
        setDsMicro(DS_COPY[dsState].label, DS_COPY[dsState].desc)
        dataModule?.setFocus?.(null)
      })
    })

    if (ds.shell) {
      let dragging = false
      let startY = 0
      let startP = 0

      const setMouseFromEvent = (e) => {
        const r = ds.shell.getBoundingClientRect()
        const nx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1
        const ny = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1
        dataModule?.setMouseNorm?.(nx, -ny)
      }

      ds.shell.addEventListener('pointerenter', (e) => {
        setMouseFromEvent(e)
        dataModule?.setIntensity?.(0.25)
      })

      ds.shell.addEventListener('pointermove', (e) => {
        setMouseFromEvent(e)
        if (!dragging) dataModule?.setIntensity?.(0.12)
      })

      ds.shell.addEventListener('pointerdown', (e) => {
        dragging = true
        startY = e.clientY
        startP = dsProgress
        ds.shell.setPointerCapture?.(e.pointerId)
        setMouseFromEvent(e)
        dataModule?.setIntensity?.(1.0)
      })

      ds.shell.addEventListener('pointermove', (e) => {
        if (!dragging) return
        const h = ds.shell.getBoundingClientRect().height || 1
        const dy = (startY - e.clientY) / h
        applyProgress(startP + dy * 1.15)
        setMouseFromEvent(e)
        dataModule?.setIntensity?.(0.9)
      })

      ds.shell.addEventListener('pointerup', () => (dragging = false))
      ds.shell.addEventListener('pointercancel', () => (dragging = false))
      ds.shell.addEventListener('pointerleave', () => {
        dragging = false
        dataModule?.setIntensity?.(0.0)
      })

      ds.shell.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault()
          applyProgress(dsProgress + e.deltaY * -0.0012)
          dataModule?.setIntensity?.(0.55)
        },
        { passive: false }
      )
    }

    setState('raw')
  }

  const enterDataPanel = () => {
    if (!dataCanvas) return

    if (!dataSceneInitialized) {
      dataModule = initDataSystems(dataCanvas)
      dataSceneInitialized = true
      wireDataUIOnce()

      dsResizeHandler = () => requestAnimationFrame(() => dataModule?.resize?.())
      dataModule?.resize?.()

      try {
        dsResizeObserver = new ResizeObserver(() => dsResizeHandler?.())
        if (ds.shell) dsResizeObserver.observe(ds.shell)
        else dsResizeObserver.observe(dataCanvas)
      } catch (e) {}

      window.addEventListener('resize', dsResizeHandler, { passive: true })
    }

    dataModule?.enter?.()
    requestAnimationFrame(() => dataModule?.resize?.())
    setTimeout(() => dataModule?.resize?.(), 120)
  }

  const exitDataPanel = () => {
    try {
      dataModule?.setFocus?.(null)
      dataModule?.setIntensity?.(0)
      dataModule?.exit?.()
    } catch (e) {}
  }

  // ---------------- Reveal helpers ----------------
  const initBlockReveal = (block, scrollRoot) => {
    if (!block || !GSAP) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const children = Array.from(entry.target.children)
          if (!children.length) return

          GSAP.fromTo(
            children,
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 1.4, ease: 'expo.out', stagger: 0.18 }
          )
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.2, root: scrollRoot || null, rootMargin: '0px 0px -10% 0px' }
    )

    observer.observe(block)
  }

  const preparePanelBlocks = (panel) => {
    if (!panel || !GSAP) return
    const panelScroll = q('.roots-detail-scroll', panel) || globalDetailScroll || null
    const blocks = qa('.roots-panel-header, .roots-icons, .roots-gallery, .roots-timeline', panel)

    blocks.forEach((block) => {
      Array.from(block.children).forEach((el) => GSAP.set(el, { y: 50, opacity: 0 }))
      initBlockReveal(block, panelScroll)
    })
  }

  // ---------------- Pills navigation ----------------
  rootsPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const rawKey = pill.dataset.root
      if (!rawKey) return

      rootsPills.forEach((p) => p.classList.remove('is-active'))
      pill.classList.add('is-active')

      rootsPanels.forEach((panel) => {
        const visible = panel.dataset.rootPanel === rawKey

        // si salimos de sistemas, pausamos
        if (panel.dataset.rootPanel === 'sistemas' && !visible) exitDataPanel()

        panel.classList.toggle('is-hidden', !visible)
        panel.style.display = visible ? 'block' : 'none'

        if (visible) {
          preparePanelBlocks(panel)
          const scrollEl = q('.roots-detail-scroll', panel) || globalDetailScroll
          if (scrollEl) scrollEl.scrollTop = 0

          if (rawKey === 'gastronomia') {
            initGastroTimelineAndMap(panel)
            requestAnimationFrame(() => panel.__gastroRefresh?.())
          }
          if (rawKey === 'interaccion') playXrLoader()
          if (rawKey === 'sistemas') enterDataPanel()
        }
      })

      experience?.world?.setRootsMood?.(ROOT_KEY_MAP[rawKey])
    })
  })

  // default panel
  setTimeout(() => {
    const defaultPanel = q('[data-root-panel="gastronomia"]', rootsHud)
    if (defaultPanel) {
      defaultPanel.classList.remove('is-hidden')
      defaultPanel.style.display = 'block'
      preparePanelBlocks(defaultPanel)
      initGastroTimelineAndMap(defaultPanel)
      requestAnimationFrame(() => defaultPanel.__gastroRefresh?.())

      const scrollEl = q('.roots-detail-scroll', defaultPanel) || globalDetailScroll
      if (scrollEl) scrollEl.scrollTop = 0
    }
  }, 400)

  // ------------------------------------------------------------
  // Timeline + Map (Gastronomía) — FIXED
  // ------------------------------------------------------------

  const MAP_PERIOD_GROUPS = {
    '2010-2015': ['Murcia'],
    '2014-2019': ['Londres', 'USA', 'Austria'],
    '2019-2023': ['Barcelona', 'NY'],
    '2023-hoy': ['Helsinki'],
  }

  function initGastroTimelineAndMap(gastroPanel) {
    if (!gastroPanel) return
    if (gastroPanel.dataset.gastroWired === 'true') return
    gastroPanel.dataset.gastroWired = 'true'

    const timelineItems = Array.from(gastroPanel.querySelectorAll('.roots-timeline-item'))
    const timelinePanels = Array.from(gastroPanel.querySelectorAll('.roots-timeline-panel'))
    const timelineTitle = document.getElementById('timeline-active-title')

    let currentPeriod = '2010-2015'
    const getActivePeriod = () => currentPeriod

    const timelineRoot = gastroPanel.querySelector('.roots-timeline')
    const trackEl = timelineRoot ? timelineRoot.querySelector('.roots-timeline-track') : null
    const markerEl = timelineRoot ? timelineRoot.querySelector('.roots-timeline-marker') : null

    // Si NO queremos “bolita flotante” adicional (porque ya hay bolitas en cada nodo),
    // dejamos esto en false.
    const USE_FLOATING_MARKER = false
    if (markerEl && !USE_FLOATING_MARKER) {
      markerEl.style.display = 'none'
      markerEl.style.pointerEvents = 'none'
    }

    // Evita que el track / overlays bloqueen clicks
    if (trackEl) trackEl.style.pointerEvents = 'none'
    timelineItems.forEach((btn) => {
      btn.style.pointerEvents = 'auto'
      btn.style.position = btn.style.position || 'relative'
      btn.style.zIndex = btn.style.zIndex || '3'
    })

    const updateIndicator = (activeBtn, { instant = false } = {}) => {
      if (!activeBtn || !trackEl) return

      const rootRect = trackEl.getBoundingClientRect()
      const r = activeBtn.getBoundingClientRect()
      const centerX = r.left + r.width / 2 - rootRect.left
      const pct = Math.max(0, Math.min(1, centerX / Math.max(1, rootRect.width))) * 100

      // CSS var (tu CSS usa ::after con --timeline-progress)
      if (!GSAP || instant) {
        trackEl.style.setProperty('--timeline-progress', `${pct}%`)
        if (markerEl && USE_FLOATING_MARKER) markerEl.style.left = `${pct}%`
        return
      }

      const curr =
        parseFloat(getComputedStyle(trackEl).getPropertyValue('--timeline-progress')) || 0
      const obj = { v: curr }

      GSAP.to(obj, {
        v: pct,
        duration: 0.85,
        ease: 'expo.out',
        onUpdate: () => trackEl.style.setProperty('--timeline-progress', `${obj.v}%`),
      })

      if (markerEl && USE_FLOATING_MARKER) {
        GSAP.to(markerEl, { left: `${pct}%`, duration: 0.75, ease: 'expo.out' })
      }
    }

    // -------- Map refs --------
    const mapNodes = Array.from(gastroPanel.querySelectorAll('.roots-map-node'))
    const mapInner = gastroPanel.querySelector('.roots-map-inner')
    const pathSvg = gastroPanel.querySelector('.roots-map-path')

    const detail = {
      title: gastroPanel.querySelector('.roots-map-title'),
      years: gastroPanel.querySelector('.roots-map-years'),
      role: gastroPanel.querySelector('.roots-map-role'),
      style: gastroPanel.querySelector('.roots-map-style'),
      ach: gastroPanel.querySelector('.roots-map-achievement'),
    }

    //  importante: el SVG encima puede bloquear clicks si no tiene pointer-events:none
    const connections = gastroPanel.querySelector('.roots-map-connections')
    if (connections) connections.style.pointerEvents = 'none'

    const projectLatLonToPercent = (lat, lon) => {
      const x = ((lon + 180) / 360) * 100
      const y = ((90 - lat) / 180) * 100
      return { x, y }
    }

    const buildPath = () => {
      if (!pathSvg || !mapInner || mapNodes.length < 2) return

      const activeNodes = mapNodes.filter(
        (n) => n.classList.contains('is-active') || n.classList.contains('is-in-period')
      )
      if (activeNodes.length < 2) {
        pathSvg.setAttribute('d', '')
        return
      }

      const ordered = activeNodes.sort(
        (a, b) => parseInt(a.dataset.order || '0', 10) - parseInt(b.dataset.order || '0', 10)
      )

      const getLocalCoords = (el) => ({
        x: el.offsetLeft + el.offsetWidth / 2,
        y: el.offsetTop + el.offsetHeight / 2,
      })

      const start = getLocalCoords(ordered[0])
      let d = `M ${start.x} ${start.y}`

      for (let i = 0; i < ordered.length - 1; i++) {
        const p1 = getLocalCoords(ordered[i])
        const p2 = getLocalCoords(ordered[i + 1])
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2 - 40
        d += ` Q ${midX} ${midY} ${p2.x} ${p2.y}`
      }

      pathSvg.setAttribute('d', d)

      // “reflow kick” por si animamos stroke-dasharray en CSS
      pathSvg.style.display = 'none'
      pathSvg.offsetHeight
      pathSvg.style.display = 'block'
    }

    const positionNodes = () => {
      if (!mapInner || !mapNodes.length) return

      const rootStyle = getComputedStyle(document.documentElement)
      const globalX = parseFloat(rootStyle.getPropertyValue('--nodes-offset-x')) || 0
      const globalY = parseFloat(rootStyle.getPropertyValue('--nodes-offset-y')) || 0

      mapNodes.forEach((node) => {
        const lat = parseFloat(node.dataset.lat)
        const lon = parseFloat(node.dataset.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return

        const { x, y } = projectLatLonToPercent(lat, lon)
        const localX = parseFloat(node.dataset.offsetX || '0')
        const localY = parseFloat(node.dataset.offsetY || '0')

        node.style.left = `calc(${x}% + ${globalX}px + ${localX}px)`
        node.style.top = `calc(${y}% + ${globalY}px + ${localY}px)`
        node.style.pointerEvents = 'auto'
      })

      setTimeout(buildPath, 50)
    }

    const setActivePlace = (node) => {
      if (!node) return
      mapNodes.forEach((n) => n.classList.remove('is-active'))
      node.classList.add('is-active')

      const card = gastroPanel.querySelector('.roots-map-floating-card')
      if (!card) return

      card.style.opacity = 0
      card.style.transform = 'translateY(10px)'

      setTimeout(() => {
        if (detail.title) detail.title.textContent = node.dataset.place || 'Ubicación'
        if (detail.years) detail.years.textContent = node.dataset.years || '---'
        if (detail.role) detail.role.textContent = node.dataset.role || '---'
        if (detail.style) detail.style.textContent = node.dataset.style || ''
        if (detail.ach) detail.ach.textContent = node.dataset.achievement || '---'

        card.style.opacity = 1
        card.style.transform = 'translateY(0)'
      }, 120)
    }

    const setActivePeriod = (period, { instant = false } = {}) => {
      currentPeriod = period

      timelineItems.forEach((btn) => {
        const isActive = btn.dataset.period === period
        btn.classList.toggle('is-active', isActive)

        if (isActive && timelineTitle) {
          if (instant || !GSAP) {
            timelineTitle.textContent = btn.dataset.title || period
            timelineTitle.style.opacity = '1'
          } else {
            timelineTitle.style.opacity = 0
            setTimeout(() => {
              timelineTitle.textContent = btn.dataset.title || period
              timelineTitle.style.opacity = 1
            }, 200)
          }
        }
      })

      timelinePanels.forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.periodPanel === period)
      })

      const places = MAP_PERIOD_GROUPS[period] || []
      const activeNodesList = []

      mapNodes.forEach((node) => {
        const place = node.dataset.place || ''
        const inGroup = places.some((p) => place.includes(p))
        node.classList.toggle('is-in-period', inGroup)
        node.classList.toggle('is-inactive', !inGroup)
        node.classList.remove('is-active')
        if (inGroup) activeNodesList.push(node)
      })

      if (activeNodesList.length > 0) setActivePlace(activeNodesList[activeNodesList.length - 1])

      buildPath()

      const activeBtn = timelineItems.find((b) => b.dataset.period === period)
      updateIndicator(activeBtn, { instant })
    }

    // --- WIRING (solo una vez, sin duplicados) ---
    if (!gastroPanel.__timelineWired) {
      gastroPanel.__timelineWired = true

      // Click timeline
      timelineItems.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          const p = btn.dataset.period
          if (!p) return
          setActivePeriod(p, { instant: false })
        })
      })

      // Click map nodes
      mapNodes.forEach((node) => node.addEventListener('click', () => setActivePlace(node)))

      // Scroll-sync (opcional) para el scroll interno del panel
      const scrollerEl =
        gastroPanel.querySelector('.roots-detail-scroll') ||
        gastroPanel.closest('.roots-detail-scroll') ||
        null

      const ENABLE_TIMELINE_SCROLL_SYNC = false

if (ENABLE_TIMELINE_SCROLL_SYNC && GSAP && ScrollTrigger && scrollerEl && timelinePanels.length) {
  timelinePanels.forEach((panel) => {
    ScrollTrigger.create({
      trigger: panel,
      scroller: scrollerEl,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => {
        const p = panel.dataset.periodPanel
        if (p && p !== getActivePeriod()) setActivePeriod(p, { instant: true })
      },
      onEnterBack: () => {
        const p = panel.dataset.periodPanel
        if (p && p !== getActivePeriod()) setActivePeriod(p, { instant: true })
      },
    })
  })
  requestAnimationFrame(() => ScrollTrigger.refresh(true))
}

    }

    // exponemos refresh cuando el panel reaparece (display:none -> block)
    gastroPanel.__gastroRefresh = () => {
      positionNodes()
      const curr = timelineItems.find((b) => b.classList.contains('is-active'))
      if (curr) setActivePeriod(curr.dataset.period, { instant: true })
      else setActivePeriod('2010-2015', { instant: true })
    }

    // boot cuando ya hay layout real
    requestAnimationFrame(() => {
      positionNodes()
      setTimeout(() => {
        setActivePeriod('2010-2015', { instant: true })
      }, 150)
    })

    window.addEventListener('resize', gastroPanel.__gastroRefresh, { passive: true })
  }

  // Exponemos exit para el botón general de salida
  window.__rootsExitDataPanel = exitDataPanel
}

// ------------------------------------------------------------
// 8) XR Zones (clicks SAFE)
// ------------------------------------------------------------

function initXRZonesClickUI() {
  const xrZones = qa('.xr-zone')
  if (!xrZones.length) return

  const titleEl = q('#xr-zone-detail-title')
  const textEl = q('#xr-zone-detail-text')

  const XR_ZONE_CONTENT = {
    light: {
      title: 'Light as Interface',
      text: `La luz define estados, jerarquía y ritmo. Uso gradientes, sombras suaves
y cambios de temperatura de color para marcar qué es interactivo y qué
estado tiene la escena (idle, foco, transición).`,
    },
    space: {
      title: 'Space as Interface',
      text: `La posición de la cámara, la profundidad y el framing son parte de la UI.
Mover la cámara no es un efecto: es una manera de explicar al usuario
qué ha cambiado y hacia dónde debe mirar.`,
    },
    motion: {
      title: 'Motion as UI',
      text: `Las animaciones no son decoración: cuentan una historia. Elasticidad,
timings y delays explican qué elemento responde, qué se está cargando
y cuándo un estado ha terminado de asentarse.`,
    },
    thresholds: {
      title: 'Thresholds',
      text: `Diseño los umbrales como portales: cambios de luz, blur, niebla o
scroll que marcan el paso entre escenas, capas de información o modos
(overview, focus, XR, etc.).`,
    },
  }

  const handleClick = (zoneEl) => {
    const zoneKey = zoneEl?.dataset?.zone
    const content = XR_ZONE_CONTENT[zoneKey]
    if (!content) return

    xrZones.forEach((z) => z.classList.remove('is-active'))
    zoneEl.classList.add('is-active')

    if (titleEl) titleEl.textContent = content.title
    if (textEl) textEl.textContent = content.text

    // si existe, highlight en la constelación
    if (window.xrConstellation && typeof window.xrConstellation.highlightNode === 'function') {
      window.xrConstellation.highlightNode(zoneKey)
    }
  }

  xrZones.forEach((zoneEl) => zoneEl.addEventListener('click', () => handleClick(zoneEl)))
}

// ------------------------------------------------------------
// 9) Branches HUD (ScrollTrigger + Flip)
// ------------------------------------------------------------

function initBranchesHUD() {
  if (branchesInited) return
  if (!ui.branchesHud || !GSAP || !ScrollTrigger || !Flip) return

  const branchesHud = ui.branchesHud
  const branchesScroll = q('[data-branches-scroll]', branchesHud)
  const branchesProxy = q('.branches-canvas-proxy', branchesHud)
  if (!branchesScroll || !branchesProxy) return

  const panels = qa('.branch-panel', branchesHud)

  const moveProxyTo = (slot, { instant = false } = {}) => {
    const state = Flip.getState(branchesProxy)
    slot.appendChild(branchesProxy)

    if (instant) {
      Flip.from(state, { duration: 0, absolute: true })
      return
    }

    Flip.from(state, {
      duration: 0.95,
      ease: 'expo.inOut',
      absolute: true,
      onEnter: (els) => GSAP.fromTo(els, { opacity: 0.7 }, { opacity: 0.95, duration: 0.25 }),
    })
  }

  const fireRamasCue = (panel, type) => {
    const idx = Number(panel?.dataset?.branch ?? 0)
    const project = window.__ramasProjects?.[idx]
    const cue = project?.cues?.[type] || null
    const payload = { type, idx, cue, project }
    experience?.trigger?.('ramas-cue', [payload])
  }

  // reveals
  panels.forEach((panel) => {
    const items = qa('.branch-reveal', panel)
    GSAP.set(items, { y: 40, opacity: 0 })

    const st = ScrollTrigger.create({
      trigger: panel,
      scroller: branchesScroll,
      start: 'top 70%',
      onEnter: () => {
        GSAP.to(items, {
          y: 0,
          opacity: 1,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.1,
          overwrite: true,
        })
      },
    })

    branchesTriggers.push(st)
  })

  // flip proxy
  panels.forEach((panel) => {
    const slot = q('[data-canvas-slot]', panel)
    if (!slot) return

    const st = ScrollTrigger.create({
      trigger: panel,
      scroller: branchesScroll,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => {
        moveProxyTo(slot)
        const idx = Number(panel.dataset.branch ?? 0)
        window.__ramas?.setProxyMedia?.(idx)
        window.__ramas?.emitCue?.('enter', idx)
        fireRamasCue(panel, 'enter')
      },
      onEnterBack: () => {
        moveProxyTo(slot)
        const idx = Number(panel.dataset.branch ?? 0)
        window.__ramas?.setProxyMedia?.(idx)
        window.__ramas?.emitCue?.('enterBack', idx)
        fireRamasCue(panel, 'enterBack')
      },
    })

    branchesTriggers.push(st)
  })

  // init al primer slot
  const firstSlot = q('[data-canvas-slot]', branchesHud)
  if (firstSlot) {
    const state = Flip.getState(q('.branches-canvas-proxy', branchesHud))
    firstSlot.appendChild(branchesProxy)
    Flip.from(state, { duration: 0, absolute: true })
  }

  branchesInited = true
  requestAnimationFrame(() => ScrollTrigger.refresh(true))
}

function enterBranchesHUD() {
  initBranchesHUD()
  //  reactiva triggers si estaban deshabilitados
  try { branchesTriggers.forEach((t) => t.enable && t.enable()) } catch (e) {}
  requestAnimationFrame(() => ScrollTrigger?.refresh?.(true))
}

function exitBranchesHUD() {
 //  evita callbacks/Flip en el frame de salida (sin destruirlos)
  try { branchesTriggers.forEach((t) => t.disable && t.disable(false)) } catch (e) {}

  //  opcional: oculta proxy 1 frame para evitar flash al cambiar clases
  const proxy = ui.branchesHud ? q('.branches-canvas-proxy', ui.branchesHud) : null
  if (proxy && GSAP) GSAP.set(proxy, { opacity: 0 })
}

// ------------------------------------------------------------
// 10) Crown HUD (scramble + tabs)
// ------------------------------------------------------------

class TextScramble {
  constructor(el) {
    this.el = el
    this.chars = '!<>-_\\/[]{}—=+*^?#________'
    this.update = this.update.bind(this)
  }
  setText(newText) {
    const oldText = this.el.innerText
    const length = Math.max(oldText.length, newText.length)
    const promise = new Promise((resolve) => (this.resolve = resolve))
    this.queue = []
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || ''
      const to = newText[i] || ''
      const start = Math.floor(Math.random() * 40)
      const end = start + Math.floor(Math.random() * 40)
      this.queue.push({ from, to, start, end })
    }
    cancelAnimationFrame(this.frameRequest)
    this.frame = 0
    this.update()
    return promise
  }
  update() {
    let output = ''
    let complete = 0
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i]
      if (this.frame >= end) {
        complete++
        output += to
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.chars[Math.floor(Math.random() * this.chars.length)]
          this.queue[i].char = char
        }
        output += `<span class="dud" style="color:#e0c3fc;opacity:0.8;text-shadow:0 0 10px rgba(224,195,252,0.5);">${char}</span>`
      } else {
        output += from
      }
    }
    this.el.innerHTML = output
    if (complete === this.queue.length) this.resolve()
    else {
      this.frameRequest = requestAnimationFrame(this.update)
      this.frame++
    }
  }
}

function initCrownHUD() {
  if (!ui.crownHud) return

  window.playCrownIntro = () => {
    if (!GSAP) return
    const crownHud = ui.crownHud
    const elems = qa(
      '.crown-sublead, .crown-tabs-nav, .crown-tab-content, .crown-context, .crown-footer',
      crownHud
    )
    GSAP.fromTo(
      elems,
      { y: 40, opacity: 0, filter: 'blur(10px)' },
      {
        y: 0,
        opacity: 1,
        filter: 'blur(0px)',
        stagger: 0.1,
        duration: 1.2,
        ease: 'power3.out',
        overwrite: true,
      }
    )

    const titleEl = q('.crown-lead', crownHud)
    if (titleEl) {
      const fx = new TextScramble(titleEl)
fx.setText('Ingeniería Creativa\ny Estrategia de Datos')

// mood inicial coherente con el tab activo
experience?.world?.crown?.setMood?.('architecture')
    }
  }

  // Tabs conectadas al 3D
  const tabs = qa('.crown-tab-btn', ui.crownHud)
  const panels = qa('.crown-panel', ui.crownHud)

  tabs.forEach((tab) => {
    const eventType = window.matchMedia('(hover: hover)').matches ? 'mouseenter' : 'click'
    tab.addEventListener(eventType, () => {
      const target = tab.dataset.crownPillar
      if (!target) return

      tabs.forEach((t) => t.classList.remove('is-active'))
      panels.forEach((p) => p.classList.remove('is-active'))

      tab.classList.add('is-active')
      const panel = q(`[data-crown-panel="${target}"]`, ui.crownHud)
      if (panel) {
        panel.classList.add('is-active')
        if (GSAP)
          GSAP.fromTo(panel.children, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05 })
      }

      experience?.world?.crown?.setMood?.(target)
    })
  })

  // Fix scroll bleeding (HUD wheel)
  ui.crownHud.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false })
  ui.crownHud.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false })
}

// ------------------------------------------------------------
// 11) Cursor init
// ------------------------------------------------------------

async function initCursors() {
  try {
    tubesCursorApp = await initTubesCursor()
    window.__cursor = tubesCursorApp || null
  } catch (e) {
    console.warn('TubesCursor failed', e)
  }

  try {
    proCursorApp = initProCursor()
    window.__proCursor = proCursorApp || null
  } catch (e) {
    console.warn('ProCursor failed', e)
  }
}

// ------------------------------------------------------------
// 12) Experience init + event wiring
// ------------------------------------------------------------

function initExperience() {
  const canvas = q('canvas.experience-canvas')
  if (!canvas) {
    console.error("script.js: Canvas '.experience-canvas' not found")
    return null
  }

  try {
    if (!window.__experience) {
      experience = new Experience(canvas)
      window.__experience = experience
      console.log('script.js: Experience initialized.')
    } else {
      experience = window.__experience
      console.log('script.js: Experience already exists.')
    }

    // mostrar UI cuando realmente estamos listos
    // ------------------------------------------------------------
    // UI MAIN entry (title -> prompt -> audio)
    // ------------------------------------------------------------
    const showUIWhenReady = () => {
      if (experience?.state !== 'main') return

      enableMainScrollUI()

      const titleEl = q('.title')
      const subtitleEl = q('.subtitle')

      if (!GSAP || !titleEl || !subtitleEl) {
        canShowScrollPrompt = true
        return
      }

      canShowScrollPrompt = false
      if (ui.scrollPrompt) ui.scrollPrompt.classList.add('hidden')

      GSAP.set([subtitleEl, titleEl], { opacity: 0, y: 18, filter: 'blur(10px)' })

      const tl = GSAP.timeline({ defaults: { ease: 'expo.out' } })

      tl.to(subtitleEl, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.0 }, 0)
      tl.to(titleEl, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1 }, 0.08)

      tl.add(() => {
        canShowScrollPrompt = true
        if (ui.scrollPrompt) {
          ui.scrollPrompt.classList.remove('hidden')
        }
        scrollPromptVisible = true
      }, 0.65)
      

      if (ui.scrollPrompt) {
      }

      requestAnimationFrame(() => {
        const tNow = experience?.camera?.computeT?.()
        updateScrollPromptFromT(tNow ?? 0)
      })
      
    }

    // engancha SOLO a main-ready
    experience.on?.('main-ready', showUIWhenReady)
  } catch (e) {
    console.error('script.js: Error initializing Experience:', e)
    experience = null
  }
}

// ------------------------------------------------------------
// 13) Scroll progress binding
// ------------------------------------------------------------

function bindScrollProgress() {
  if (!experience) return

  const SECTION_COUNT = ui.sectionCards.length
  const SECTION_BOUNDS = makeSectionBounds(SECTION_COUNT)

  experience.on?.('scroll-progress', (t) => {
    if (!experience || experience.state !== 'main') return
    if (isInImmersiveSection) return

    const clamped = THREE.MathUtils.clamp(t, 0, 1)
    const delta = Math.abs(clamped - lastT)
    lastT = clamped

    updateScrollPromptFromT(clamped)




    if (delta > 0.0005) onScrollActivity(clamped)

    if (!SECTION_COUNT) return

    if (clamped < MIN_T_FOR_SECTIONS) {
      setActiveSection(-1, 0)
      return
    }

    let normalized = (clamped - MIN_T_FOR_SECTIONS) / (MAX_T_FOR_SECTIONS - MIN_T_FOR_SECTIONS)
    normalized = THREE.MathUtils.clamp(normalized, 0, 1)

    let targetIndex = -1
    let localT = 0

    for (let i = 0; i < SECTION_COUNT; i++) {
      const bounds = SECTION_BOUNDS[i]
      if (!bounds) continue
      if (normalized >= bounds.start && normalized <= bounds.end) {
        targetIndex = i
        localT = (normalized - bounds.start) / Math.max(1e-6, bounds.end - bounds.start)
        break
      }
    }

    setActiveSection(targetIndex, localT)
  })
}

// ------------------------------------------------------------
// 14) UI events (enter/exit buttons, resize thumb)
// ------------------------------------------------------------

function bindUIEvents() {
  // Enter buttons (un solo listener, capture, sin duplicados)
  document.addEventListener(
    'click',
    (event) => {
      const btn = event.target.closest('.section-enter-button')
      if (!btn) return
      event.preventDefault()
      event.stopImmediatePropagation()

      const raw = btn.dataset.section
      const sectionIndex = Number(raw)
      if (!Number.isFinite(sectionIndex)) {
        console.warn('[ENTER BTN] data-section inválido', raw, btn)
        return
      }
      enterImmersiveSection(sectionIndex, 'ui')
    },
    true
  )

  // Exit button
  if (ui.exitBtn) ui.exitBtn.addEventListener('click', exitImmersiveSection)

  // Resize thumb
  window.addEventListener(
    'resize',
    () => {
      if (!experience || experience.state !== 'main') return
      const t = experience.camera?.computeT?.()
      if (typeof t === 'number') updateScrollbarThumb(t)
    },
    { passive: true }
  )
}

// ------------------------------------------------------------
// 15) Audio mute (con fade)
// ------------------------------------------------------------

function bindAudioMute() {
  if (!ui.muteBtn || !experience || !experience.audio) return

  let isAudioOn = experience.audio.playing()
  const FADE_DURATION = 2500
  const TARGET_VOLUME = 0.3

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

  const fadeTo = (sound, from, to, duration) => {
    const start = performance.now()
    const step = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeInOutCubic(progress)
      const volume = from + (to - from) * eased
      sound.volume(volume)
      if (progress < 1) requestAnimationFrame(step)
      else if (to === 0) sound.stop()
    }
    requestAnimationFrame(step)
  }

  const applyUI = () => {
    ui.muteBtn.classList.toggle('playing', isAudioOn)
    ui.muteBtn.classList.toggle('muted', !isAudioOn)
  }

  applyUI()

  ui.muteBtn.addEventListener('click', () => {
    const sound = experience.audio
    isAudioOn = !isAudioOn
    applyUI()

    try {
      if (isAudioOn) {
        if (!sound.playing()) sound.play()
        sound.volume(0)
        fadeTo(sound, 0, TARGET_VOLUME, FADE_DURATION)
      } else {
        fadeTo(sound, sound.volume(), 0, FADE_DURATION)
      }
    } catch (err) {
      console.error('Error toggling ethereal fade:', err)
      isAudioOn = sound.playing()
      applyUI()
    }
  })

  experience.audio.on?.('play', () => {
    isAudioOn = true
    applyUI()
  })
  experience.audio.on?.('stop', () => {
    isAudioOn = false
    applyUI()
  })
  experience.audio.on?.('end', () => {
    isAudioOn = false
    applyUI()
  })
}

// ------------------------------------------------------------
// 16) Cleanup
// ------------------------------------------------------------

function bindCleanup() {
  window.addEventListener('beforeunload', () => {
    try {
      dataModule?.dispose?.()
    } catch (e) {}

    try {
      tubesCursorApp?.destroy?.()
      window.__cursor = null
    } catch (e) {}

    try {
      proCursorApp?.destroy?.()
      window.__proCursor = null
    } catch (e) {}

    try {
      dsResizeObserver?.disconnect?.()
    } catch (e) {}

    if (dsResizeHandler) window.removeEventListener('resize', dsResizeHandler)

    try {
      experience?.destroy?.()
    } catch (e) {}
  })
}

// ------------------------------------------------------------
// 17) Boot
// ------------------------------------------------------------

window.addEventListener('DOMContentLoaded', async () => {
  bindUIRefs()
  initCrownToggles()

  // aseguramos que la UI arranca oculta (por si el CSS no la deja oculta)
  if (ui.mainUI) {
    ui.mainUI.classList.add('is-hidden')
    ui.mainUI.classList.remove('is-visible')
  }
  if (ui.bar) {
    ui.bar.style.opacity = '0'
    ui.bar.style.pointerEvents = 'none'
  }

  canShowScrollPrompt = false
  if (ui.scrollPrompt) ui.scrollPrompt.classList.add('hidden')

  // deja el mute “soft” en intro (pero presente)

  initExperience()

  // HUD modules
  initRootsHUD()
  initBranchesHUD()
  initCrownHUD()
  initXRZonesClickUI()

  // UI + scroll binding
  bindUIEvents()
  bindScrollProgress()
  bindAudioMute()
  bindCleanup()

  // cursors
  await initCursors()
})
