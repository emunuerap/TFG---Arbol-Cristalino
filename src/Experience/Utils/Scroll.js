import EventEmitter from './EventEmitter.js'

export default class Scroll extends EventEmitter {
  constructor() {
    super()
    // Emit an event on any scroll — used for UI bits (not required for camera anymore)
    window.addEventListener('scroll', () => this.trigger('scroll'), { passive: true })
  }
}
