import * as THREE from 'three'
import Experience from './Experience.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export default class Renderer {
  constructor() {
    this.experience = new Experience()
    this.canvas = this.experience.canvas
    this.sizes = this.experience.sizes
    this.scene = this.experience.scene
    this.camera = this.experience.camera

    // Detect mobile-like constraints
    this.isCoarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

    this.setInstance()
    this.setPostProcess()
  }

  getPixelRatioCap() {
    // Desktop: 1.75 como ya tenías
    // Mobile: más agresivo para estabilidad
    if (this.reduceMotion) return 1.0
    if (this.isCoarse) return 1.25
    return 1.75
  }

  setInstance() {
    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isCoarse, // en móvil antialias puede costar
      alpha: false
    })

    this.instance.outputColorSpace = THREE.SRGBColorSpace
    this.instance.toneMapping = THREE.ACESFilmicToneMapping
    this.instance.toneMappingExposure = 1.2

    // En móvil, sombras suelen ser caras: baja el coste
    this.instance.shadowMap.enabled = !this.isCoarse
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap

    this.instance.setClearColor('#0e0c0f', 1)
    this.instance.setSize(this.sizes.width, this.sizes.height)
    this.instance.setPixelRatio(Math.min(this.sizes.pixelRatio, this.getPixelRatioCap()))
  }

  setPostProcess() {
    // Si reduce motion, simplifica: sin bloom fuerte
    const pr = this.instance.getPixelRatio()

    // Multisampling solo si PR == 1 y NO móvil
    const rt = new THREE.WebGLRenderTarget(this.sizes.width, this.sizes.height, {
      samples: (!this.isCoarse && pr === 1) ? 2 : 0
    })

    this.composer = new EffectComposer(this.instance, rt)
    this.composer.setSize(this.sizes.width, this.sizes.height)
    this.composer.setPixelRatio(Math.min(this.sizes.pixelRatio, this.getPixelRatioCap()))

    const renderPass = new RenderPass(this.scene, this.camera.instance)
    this.composer.addPass(renderPass)

    // Bloom: desktop fuerte, móvil suave, reduce-motion casi off
    const strength = this.reduceMotion ? 0.15 : (this.isCoarse ? 0.35 : 1.2)
    const radius = this.isCoarse ? 0.25 : 0.4
    const threshold = this.isCoarse ? 0.9 : 0.85

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.sizes.width, this.sizes.height),
      strength,
      radius,
      threshold
    )
    this.composer.addPass(this.bloomPass)
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height)
    this.instance.setPixelRatio(Math.min(this.sizes.pixelRatio, this.getPixelRatioCap()))

    this.composer.setSize(this.sizes.width, this.sizes.height)
    this.composer.setPixelRatio(Math.min(this.sizes.pixelRatio, this.getPixelRatioCap()))

    // Actualiza también el bloom resolution vector si quieres ultra correctness:
    if (this.bloomPass) {
      this.bloomPass.setSize(this.sizes.width, this.sizes.height)
    }
  }

  update() {
    this.composer.render()
  }
}
