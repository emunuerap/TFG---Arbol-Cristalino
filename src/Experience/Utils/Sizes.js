import EventEmitter from './EventEmitter.js'

export default class Sizes extends EventEmitter {
  constructor() {
    super()

    const read = () => {
      const vv = window.visualViewport

      // Usa visualViewport si existe (mejor en iOS), si no, fallback a inner*
      const w = vv?.width ?? window.innerWidth
      const h = vv?.height ?? window.innerHeight

      this.width = Math.floor(w)
      this.height = Math.floor(h)

      // Cap de DPR más agresivo en móvil
      const isCoarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false
      const cap = isCoarse ? 1.5 : 2

      this.pixelRatio = Math.min(window.devicePixelRatio || 1, cap)

      this.trigger('resize')
    }

    // Inicial
    read()

    // Desktop / general
    window.addEventListener('resize', read, { passive: true })

    // iOS Safari / mobile viewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', read, { passive: true })
      window.visualViewport.addEventListener('scroll', read, { passive: true })
    }
  }
}
