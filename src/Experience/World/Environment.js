import * as THREE from 'three'
import Experience from '../Experience.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

export default class Environment {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene

    this.coreLight = null
    this.ambientLight = null
    this.moonLight = null

    this.setBackgroundAndReflections()
    this.setLights()
    this.setFog()
  }

  setBackgroundAndReflections() {
    const rgbeLoader = new RGBELoader()
    rgbeLoader.load(
      '/textures/night.hdr',
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping
        this.scene.background = null
        this.scene.environment = texture
        console.log('Environment: HDRI cargado correctamente para reflejos.')
      },
      undefined,
      (err) => {
        console.error('Error al cargar el HDRI. El mar se verá negro.', err)
        this.scene.background = new THREE.Color(0x000000)
        this.scene.environment = null
      }
    )
  }

  setLights() {
    // Luz principal (Core)
    this.coreLight = new THREE.PointLight(0xffffff, 8, 100)
    this.coreLight.position.set(0, 10, 0)
    this.scene.add(this.coreLight)

    // Luz ambiental
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
    this.scene.add(this.ambientLight)

    // Luz direccional (Luna)
    this.moonLight = new THREE.DirectionalLight(0xa0c0ff, 0)
    this.moonLight.position.set(-10, 10, 5)
    this.moonLight.castShadow = true
    this.moonLight.shadow.mapSize.set(1024, 1024)
    this.moonLight.shadow.camera.far = 30
    this.scene.add(this.moonLight)
  }

  setFog() {
    this.scene.fog = new THREE.FogExp2(0x000000, 0.03)
  }

  // Versión básica: asignación directa por sección
  updateLight(sectionId) {
    const fogColors = ['#001a33', '#1a2a0f', '#0a0a1f']
    const coreLightColors = ['#88ccff', '#a8e6a1', '#e0c3fc']
    const moonColors = ['0xa0c0ff', '#f5f8b5', '#e0c3fc']
    const ambientColors = [0x102040, 0x203010, 0x101020]

    if (this.scene.fog) {
      this.scene.fog.color.set(fogColors[sectionId])
      this.scene.fog.density = sectionId === 0 ? 0.04 : 0.02
    }
    if (this.coreLight) {
      this.coreLight.color.set(coreLightColors[sectionId])
      this.coreLight.intensity = sectionId === 0 ? 3.0 : 5.0
    }
    if (this.moonLight) {
      this.moonLight.color.set(moonColors[sectionId])
      this.moonLight.intensity = sectionId === 0 ? 1.5 : 0
    }
    if (this.ambientLight) {
      this.ambientLight.color.set(ambientColors[sectionId])
      this.ambientLight.intensity = sectionId === 0 ? 1.0 : 0.1
    }
  }

  // Versión pro: mezcla entre dos atmósferas
  updateLightBlend(fromId, toId, alpha) {
    const fogColors = ['#001a33', '#1a2a0f', '#0a0a1f']
    const coreLightColors = ['#88ccff', '#a8e6a1', '#e0c3fc']
    const moonColors = ['#a0c0ff', '#f5f8b5', '#e0c3fc']
    const ambientColors = [0x102040, 0x203010, 0x101020]

    const dens = [0.04, 0.028, 0.022]

    const f = THREE.MathUtils.clamp(alpha, 0, 1)

    const fogFrom = new THREE.Color(fogColors[fromId] || '#000000')
    const fogTo = new THREE.Color(fogColors[toId] || '#000000')
    const fogMix = fogFrom.clone().lerp(fogTo, f)

    if (this.scene.fog) {
      this.scene.fog.color.copy(fogMix)
      const dFrom = dens[fromId] || 0.03
      const dTo = dens[toId] || 0.03
      this.scene.fog.density = THREE.MathUtils.lerp(dFrom, dTo, f)
    }

    if (this.coreLight) {
      const cFrom = new THREE.Color(coreLightColors[fromId] || '#ffffff')
      const cTo = new THREE.Color(coreLightColors[toId] || '#ffffff')
      this.coreLight.color.copy(cFrom.lerp(cTo, f))

      const iFrom = fromId === 0 ? 3.0 : 5.0
      const iTo = toId === 0 ? 3.0 : 5.0
      this.coreLight.intensity = THREE.MathUtils.lerp(iFrom, iTo, f)
    }

    if (this.moonLight) {
      const mFrom = new THREE.Color(moonColors[fromId] || '#ffffff')
      const mTo = new THREE.Color(moonColors[toId] || '#ffffff')
      this.moonLight.color.copy(mFrom.lerp(mTo, f))

      const imFrom = fromId === 0 ? 1.5 : 0.0
      const imTo = toId === 0 ? 1.5 : 0.0
      this.moonLight.intensity = THREE.MathUtils.lerp(imFrom, imTo, f)
    }

    if (this.ambientLight) {
      const aFrom = new THREE.Color(ambientColors[fromId] || 0x111111)
      const aTo = new THREE.Color(ambientColors[toId] || 0x111111)
      this.ambientLight.color.copy(aFrom.lerp(aTo, f))

      const iaFrom = fromId === 0 ? 1.0 : 0.1
      const iaTo = toId === 0 ? 1.0 : 0.1
      this.ambientLight.intensity = THREE.MathUtils.lerp(iaFrom, iaTo, f)
    }
  }
}
