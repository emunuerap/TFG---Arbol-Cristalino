// src/scrollBleedLock.js
// Bloquea el "scroll chaining" (scroll bleed) en iOS/Safari
// para contenedores con overflow: auto/scroll.

const isIOS = () => {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent || ''
    const iOSDevice = /iPad|iPhone|iPod/.test(ua)
    const iPadOS13 = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
    return iOSDevice || iPadOS13
  }
  
  export function lockScrollBleed(el) {
    if (!el) return () => {}
    if (!isIOS()) return () => {}
  
    let startY = 0
  
    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length !== 1) return
      startY = e.touches[0].clientY
    }
  
    const onTouchMove = (e) => {
      if (!e.touches || e.touches.length !== 1) return
  
      const y = e.touches[0].clientY
      const dy = y - startY
      const up = dy > 0     // dedo baja => scroll up (contenido hacia abajo)
      const down = dy < 0   // dedo sube => scroll down (contenido hacia arriba)
  
      const scrollTop = el.scrollTop
      const scrollHeight = el.scrollHeight
      const height = el.clientHeight
  
      const atTop = scrollTop <= 0
      const atBottom = scrollTop + height >= scrollHeight - 1
  
      // Si estamos en un borde y el usuario intenta "pasarlo", prevenimos
      if ((atTop && up) || (atBottom && down)) {
        e.preventDefault()
      }
    }
  
    // Importante: passive:false para poder hacer preventDefault en iOS
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
  
    // Cleanup
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }
  