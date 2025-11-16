import * as THREE from 'three'
import Experience from './Experience/Experience.js'

const experienceCanvas = document.querySelector('canvas.experience-canvas')
let experience = null

if (experienceCanvas) {
  try {
    if (!window.__experience) {
      experience = new Experience(experienceCanvas)
      window.__experience = experience
      console.log('script.js: Experience initialized.')
    } else {
      experience = window.__experience
      console.log('script.js: Experience already exists.')
    }
  } catch (error) {
    console.error('script.js: Failed to initialize Experience!', error)
    document.body.innerHTML = 'Error initializing 3D experience. Please check the console.'
  }
} else {
  console.error("script.js: Canvas element '.experience-canvas' not found!")
}

/* ---------- UI elements ---------- */
const mainUI = document.querySelector('.ui-container')
const titleContainer = document.querySelector('.title-container')
const bar = document.querySelector('.custom-scrollbar')
const thumb = document.querySelector('.custom-scrollbar-thumb')
const muteBtn = document.getElementById('mute-btn')
const scrollPrompt = document.getElementById('scroll-prompt')

const sectionsContainer = document.querySelector('.sections-container')
const sectionCards = sectionsContainer
  ? Array.from(sectionsContainer.querySelectorAll('.section-card'))
  : []

let hideTimer = null
let isScrolling = false

/* ---------- Secciones ligadas al scroll ---------- */
const SECTION_COUNT = sectionCards.length
// Rango de scroll global (t) donde empiezan/terminan las secciones
const MIN_T_FOR_SECTIONS = 0.1
const MAX_T_FOR_SECTIONS = 0.9

// Rango normalizado [0,1] -> subrangos por sección (con zonas neutras entre medias)
const SECTION_BOUNDS = [
  { start: 0.0, end: 0.3 }, // Sección 0: largo
  { start: 0.38, end: 0.7 }, // Sección 1
  { start: 0.78, end: 1.0 }, // Sección 2
]

let lastT = 0
let activeSectionIndex = -1
let last3DSection = -1

/* ---------- Scrollbar helpers ---------- */
function updateScrollbarThumb(t) {
  if (!bar || !thumb) return
  const trackH = bar.clientHeight
  const minThumb = 40
  const thumbH = Math.max(minThumb, trackH * 0.14)
  const y = (trackH - thumbH) * THREE.MathUtils.clamp(t || 0, 0, 1)
  thumb.style.height = `${thumbH}px`
  thumb.style.transform = `translateY(${y}px)`
}

function showScrollbar() {
  if (!bar || isScrolling) return
  isScrolling = true
  bar.style.opacity = '1'
  bar.style.pointerEvents = 'auto'
}

function hideScrollbar() {
  if (!bar || !isScrolling) return
  isScrolling = false
  bar.style.opacity = '0'
  bar.style.pointerEvents = 'none'
}

function onScrollStart(t) {
  if (!experience || experience.state !== 'main') return
  updateScrollbarThumb(t)
  showScrollbar()
  clearTimeout(hideTimer)
}

function onScrollEnd(t) {
  if (!experience || experience.state !== 'main') return
  updateScrollbarThumb(t)
  hideTimer = setTimeout(hideScrollbar, 800)
}

/* ---------- Activar / desactivar secciones DOM + 3D ---------- */
function setActiveSection(index, localT) {
  if (!experience || !experience.world) return

  // DOM
  if (index === activeSectionIndex && index !== -1) {
    // Solo actualizamos el "localT" en el mundo 3D
    experience.world.setSection?.(index, localT)
    return
  }

  activeSectionIndex = index

  sectionCards.forEach((card, i) => {
    card.classList.toggle('is-active', i === index)
  })

  // Mundo 3D
  if (index >= 0 && index < SECTION_COUNT) {
    last3DSection = index
    experience.world.setSection?.(index, localT)
    experience.world.updateScrollbarMarks?.(index)
  } else if (last3DSection >= 0) {
    // En zonas neutras mantenemos el último mundo 3D, pero ocultamos la card
    experience.world.setSection?.(last3DSection, 1.0)
    experience.world.updateScrollbarMarks?.(last3DSection)
  }
}

/* ---------- Transición: mostrar UI + activar scroll ---------- */

if (experience && mainUI) {
  experience.on('start-transition', () => {
    console.log("script.js: 'start-transition' received (UI).")

    mainUI.classList.remove('is-hidden')
    mainUI.classList.add('is-visible')

    // Damos bastante recorrido de scroll a la página
    document.body.style.height = '500vh'
    document.body.style.overflowY = 'scroll'

    // Mostrar el prompt de scroll al entrar en la escena principal
    if (scrollPrompt) {
      scrollPrompt.classList.remove('hidden')
    }
  })
}

/* ---------- SCROLLBAR REACTIVO + SECCIONES ---------- */

if (experience) {
  experience.on('scroll-progress', (t) => {
    if (experience.state !== 'main') return

    const clamped = THREE.MathUtils.clamp(t, 0, 1)
    const delta = Math.abs(clamped - lastT)
    lastT = clamped

    // Mostrar / ocultar el prompt de scroll según posición
    if (scrollPrompt) {
      if (clamped > 0.03) {
        scrollPrompt.classList.add('hidden')
      } else {
        scrollPrompt.classList.remove('hidden')
      }
    }

    // Scrollbar
    if (delta > 0.0005) {
      onScrollStart(clamped)
      onScrollEnd(clamped)
    }

    // Sin secciones DOM -> nada más que hacer
    if (!SECTION_COUNT) return

    // Antes de MIN_T_FOR_SECTIONS: pantalla de bienvenida, sin secciones
    if (clamped < MIN_T_FOR_SECTIONS) {
      setActiveSection(-1, 0)
      return
    }

    // Normalizamos a [0,1] sólo en el rango útil
    let normalized = (clamped - MIN_T_FOR_SECTIONS) / (MAX_T_FOR_SECTIONS - MIN_T_FOR_SECTIONS)
    normalized = THREE.MathUtils.clamp(normalized, 0, 1)

    let targetIndex = -1
    let localT = 0

    for (let i = 0; i < SECTION_COUNT; i++) {
      const bounds = SECTION_BOUNDS[i]
      if (!bounds) continue
      if (normalized >= bounds.start && normalized <= bounds.end) {
        targetIndex = i
        localT = (normalized - bounds.start) / (bounds.end - bounds.start)
        break
      }
    }

    setActiveSection(targetIndex, localT)
  })
}

/* ---------- Ajuste de scrollbar en resize ---------- */

window.addEventListener(
  'resize',
  () => {
    if (!experience || experience.state !== 'main') return
    if (experience.camera?.computeT) {
      const t = experience.camera.computeT()
      updateScrollbarThumb(t)
    }
  },
  { passive: true }
)

/* ---------- MUTE BUTTON (igual que tenías) ---------- */

if (muteBtn && experience && experience.audio) {
  let audioUnlocked = false
  let isAudioOn = experience.audio.playing()
  const FADE_DURATION = 2500
  const TARGET_VOLUME = 0.3

  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

  const fadeTo = (sound, from, to, duration) => {
    const start = performance.now()
    const step = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeInOutCubic(progress)
      const volume = from + (to - from) * eased
      sound.volume(volume)
      if (progress < 1) {
        requestAnimationFrame(step)
      } else if (to === 0) {
        sound.stop()
      }
    }
    requestAnimationFrame(step)
  }

  const applyUI = () => {
    if (isAudioOn) {
      muteBtn.classList.add('playing')
      muteBtn.classList.remove('muted')
    } else {
      muteBtn.classList.add('muted')
      muteBtn.classList.remove('playing')
    }
  }

  applyUI()

  muteBtn.addEventListener('click', () => {
    if (!audioUnlocked) audioUnlocked = true

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

  experience.audio.on('play', () => {
    isAudioOn = true
    applyUI()
  })
  experience.audio.on('stop', () => {
    isAudioOn = false
    applyUI()
  })
  experience.audio.on('end', () => {
    isAudioOn = false
    applyUI()
  })
}

/* ---------- Cleanup ---------- */

window.addEventListener('beforeunload', () => {
  experience?.destroy?.()
})
