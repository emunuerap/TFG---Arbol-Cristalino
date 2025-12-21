// proCursor.js
// ------------------------------------------------------------
// Pro Cursor: core + magnet snap (no rompe scroll/UI)
// ------------------------------------------------------------

export function initProCursor(options = {}) {
    const {
      coreSelector = '#cursor-core',
      targetSelector =
        'a, button, input, textarea, select, [role="button"], [data-cursor="target"], .is-clickable, .section-card, .section-enter-button',
      magnetRadius = 90,
      magnetStrength = 0.55, // 0..1
      followSmooth = 0.30,
      snapSmooth = 0.22,
      addTargetClass = 'is-target',
      addDownClass = 'is-down',
    } = options
  
    const core = document.querySelector(coreSelector)
    if (!core) {
      return { destroy() {} }
    }
  
    // Respeta reduced motion 
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const FOLLOW = reduceMotion ? 1 : followSmooth
    const SNAP = reduceMotion ? 1 : snapSmooth
  
    let raf = 0
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let tx = x
    let ty = y
  
    let snapped = false
    let snapTarget = null
  
    const clamp01 = (v) => Math.max(0, Math.min(1, v))
    const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)
  
    const isCandidate = (el) => el?.closest?.(targetSelector) || null
  
    const centerOf = (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
  
    const updateSnap = () => {
      const el = document.elementFromPoint(tx, ty)
      const candidate = isCandidate(el)
  
      if (!candidate) {
        snapped = false
        snapTarget = null
        core.classList.remove(addTargetClass)
        return
      }
  
      const c = centerOf(candidate)
      const d = dist(tx, ty, c.x, c.y)
  
      if (d <= magnetRadius) {
        snapped = true
        snapTarget = candidate
        core.classList.add(addTargetClass)
      } else {
        snapped = false
        snapTarget = null
        core.classList.remove(addTargetClass)
      }
    }
  
    const onMove = (e) => {
      tx = e.clientX
      ty = e.clientY
      updateSnap()
    }
  
    const onDown = () => core.classList.add(addDownClass)
    const onUp = () => core.classList.remove(addDownClass)
  
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('blur', onUp)
  
    const tick = () => {
      raf = requestAnimationFrame(tick)
  
      let goalX = tx
      let goalY = ty
  
      if (snapped && snapTarget) {
        const c = centerOf(snapTarget)
        const d = dist(tx, ty, c.x, c.y)
        const t = clamp01(1 - d / magnetRadius) // 0 lejos, 1 cerca del centro
        const pull = magnetStrength * t
        goalX = tx + (c.x - tx) * pull
        goalY = ty + (c.y - ty) * pull
      }
  
      const smooth = snapped ? SNAP : FOLLOW
      x += (goalX - x) * smooth
      y += (goalY - y) * smooth
  
      core.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
    }
  
    tick()
  
    return {
      destroy() {
        if (raf) cancelAnimationFrame(raf)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerdown', onDown)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('blur', onUp)
        core.classList.remove(addTargetClass)
        core.classList.remove(addDownClass)
      },
    }
  }
  