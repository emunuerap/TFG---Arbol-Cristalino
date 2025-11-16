import * as THREE from 'three'
import Sizes from './Utils/Sizes.js'
import Time from './Utils/Time.js'
import Scroll from './Utils/Scroll.js'
import Camera from './Camera.js'
import Renderer from './Renderer.js'
import World from './World/World.js'
import { Howl } from 'howler'

let instance = null

export default class Experience {
  constructor(_canvas) {
    this.callbacks = {}

    if (instance) {
      console.warn('Experience: Instance already exists.')
      return instance
    }
    instance = this

    if (!_canvas) {
      console.error('Experience: Canvas element not provided!')
      return
    }

    this.canvas = _canvas

    try {
      this.sizes = new Sizes()
      this.time = new Time()
      this.scene = new THREE.Scene()
      this.scroll = new Scroll()
      this.camera = new Camera()
      this.renderer = new Renderer()
      this.world = new World()

      if (this.camera.buildPathFromWorld && this.world) {
        this.camera.buildPathFromWorld(this.world)
      }
    } catch (error) {
      console.error('Experience: CRITICAL ERROR during initialization!', error)
      alert('Failed to initialize Experience. Check console.')
      return
    }

    this.state = 'intro'
    this.transitionProgress = 0
    console.log(`Experience: Initial state = '${this.state}'`)

    this.audio = new Howl({
      src: ['/audio/ambient.mp3'],
      loop: true,
      volume: 0.3,
      autoplay: false
    })

    this.sizes.on('resize', this.resize.bind(this))
    this.time.on('tick', this.update.bind(this))
    this.on('start-transition', this.startMainTransition.bind(this))
  }

  on(names, callback) {
    names.split(' ').forEach((raw) => {
      const name = raw.trim()
      if (!name) return
      if (!this.callbacks[name]) this.callbacks[name] = []
      this.callbacks[name].push(callback)
    })
    return this
  }

  off(names) {
    names.split(' ').forEach((raw) => {
      const name = raw.trim()
      if (!name) return
      if (this.callbacks[name]) this.callbacks[name] = []
    })
    return this
  }

  trigger(name, args) {
    const list = this.callbacks[name] || []
    list.forEach((cb) => {
      try {
        cb.apply(this, args || [])
      } catch (e) {
        console.error(`Error in listener for '${name}':`, e)
      }
    })
  }

  startMainTransition() {
    if (this.state !== 'intro') {
      console.warn('Experience: startMainTransition called when state != intro')
      return
    }

    console.log('Experience: Starting main transition...')
    this.state = 'main-transition'
    this.transitionProgress = 0

    this.world?.intro?.fadeOut?.()
    this.world?.show?.()

    setTimeout(() => {
      if (this.camera?.buildPathFromWorld && this.world) {
        this.camera.buildPathFromWorld(this.world)
      }
    }, 100)
  }

  resize() {
    this.camera?.resize()
    this.renderer?.resize()
    this.world?.resize()
  }

  update() {
    if (!this.camera || !this.renderer || !this.world || !this.time) return

    try {
      if (this.state === 'intro') {
        this.camera.updateIntro()
        this.world.intro?.update?.()
      } else if (this.state === 'main-transition') {
        const duration = 3000
        const delta = Math.max(0, this.time.delta || 16)
        this.transitionProgress = Math.min(
          1,
          this.transitionProgress + delta / duration
        )

        const t = 0.5 - 0.5 * Math.cos(this.transitionProgress * Math.PI)

        this.camera.updateTransition(t)
        this.world.updateTransition?.(t)
        this.world.intro?.update?.()

        if (this.transitionProgress >= 1) {
          console.log('Experience: Transition complete. Entering MAIN.')
          this.state = 'main'
          this.world.onTransitionEnd?.()
          this.camera.reframeFromWorld?.(this.world)
          this.camera.updateMain(true)
        }
      } else if (this.state === 'main') {
        // Scroll + movimiento de cámara
        this.camera.updateMain()
        // El resto de animaciones del mundo (incluye atmósfera por sección)
        this.world.update()
      }

      this.renderer.update()
    } catch (error) {
      console.error('Experience: Error in update loop:', error)
      this.time?.stop?.()
    }
  }

  destroy() {
    console.log('Experience: Destroying...')
    this.audio?.stop()
    this.time?.stop?.()
    this.sizes?.off?.('resize')
    this.time?.off?.('tick')
    this.off('start-transition')
    this.scroll?.destroy?.()

    this.scene?.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      const m = child.material
      if (Array.isArray(m)) m.forEach((mat) => mat?.dispose?.())
      else m?.dispose?.()
    })

    this.camera?.controls?.dispose?.()
    this.renderer?.instance?.dispose?.()

    this.canvas = null
    this.sizes = null
    this.time = null
    this.scene = null
    this.scroll = null
    this.camera = null
    this.renderer = null
    this.world = null
    this.callbacks = {}
    instance = null

    console.log('Experience: Destroy complete.')
  }
}
