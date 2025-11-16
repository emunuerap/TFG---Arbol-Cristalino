import * as THREE from 'three'
import Experience from '../Experience.js'
import Environment from './Environment.js'
import Intro from '../Intro.js'
import particleVertex from '../../shaders/particleVertex.glsl?raw'
import particleFragment from '../../shaders/particleFragment.glsl?raw'

export default class World {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.time = this.experience.time
    this.sizes = this.experience.sizes

    try {
      this.intro = new Intro()
    } catch (error) {
      console.error('World: Failed to create Intro instance!', error)
      this.intro = null
    }

    this.tooltip = document.getElementById('tooltip')
    this.mousePx = { x: 0, y: 0 }

    this.treeVisibleGroup = new THREE.Group()
    this.treeVisibleGroup.name = 'TreeVisibleContent'

    this.mainSceneGroup = new THREE.Group()
    this.mainSceneGroup.name = 'MainSceneContent'
    this.mainSceneGroup.visible = false
    this.scene.add(this.mainSceneGroup)

    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.7,
      roughness: 0.3,
      transparent: true,
      opacity: 0
    })

    this.nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.2,
      emissive: '#cceeff',
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0
    })

    this.groundMaterial = null
    this.particlesMaterial = null

    this.createTrunk()
    this.createBranches()
    this.createNodes()
    this.mainSceneGroup.add(this.treeVisibleGroup)

    this.environment = new Environment()
    this.createGround()
    this.createParticles()

    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.interactables = [this.node1, this.node2, this.node3]

    window.addEventListener(
      'mousemove',
      (e) => {
        this.mousePx.x = e.clientX
        this.mousePx.y = e.clientY

        if (
          this.experience.state === 'main' &&
          this.sizes?.width > 0 &&
          this.sizes?.height > 0
        ) {
          this.pointer.x = (e.clientX / this.sizes.width) * 2 - 1
          this.pointer.y = -(e.clientY / this.sizes.height) * 2 + 1
        }
      },
      { passive: true }
    )

    this.sizes.on('resize', () => {
      this.intro?.resize()
      if (this.particlesMaterial) {
        const pixelRatio = this.sizes?.pixelRatio || window.devicePixelRatio || 1
        this.particlesMaterial.uniforms.uPixelRatio.value = Math.min(pixelRatio, 2)
      }
      if (this.tooltip?.dataset.visible === 'true') this.positionTooltip()
    })

    // Estado de secciones
    this.currentSection = 0
    this.previousSection = 0
    this.sectionBlend = 1.0
    this.sectionT = 0

    this.particleColors = [
      new THREE.Color('#88ccff'),
      new THREE.Color('#a8e6a1'),
      new THREE.Color('#e0c3fc')
    ]

    this.getTreeBounds = () => {
      const box = new THREE.Box3()
      if (this.treeVisibleGroup.children.length > 0) {
        this.treeVisibleGroup.updateWorldMatrix(false, true)
        box.setFromObject(this.treeVisibleGroup, true)
      } else {
        box.set(
          new THREE.Vector3(-1, 0, -1),
          new THREE.Vector3(1, 5, 1)
        )
      }
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      size.x = Math.max(size.x, 0.1)
      size.y = Math.max(size.y, 0.1)
      size.z = Math.max(size.z, 0.1)
      const radius = Math.max(size.x, size.y, size.z) * 0.5
      return { box, center, size, radius }
    }
  }

  createTrunk() {
    const g = new THREE.CylinderGeometry(0.1, 0.15, 5, 12)
    const trunk = new THREE.Mesh(g, this.material)
    trunk.position.y = 2.5
    trunk.castShadow = true
    trunk.receiveShadow = true
    this.treeVisibleGroup.add(trunk)
  }

  createBranches() {
    const g = new THREE.CylinderGeometry(0.05, 0.08, 2, 10)
    const b1 = new THREE.Mesh(g, this.material)
    b1.position.set(0.8, 3, 0)
    b1.rotation.z = -Math.PI / 4
    b1.castShadow = true
    this.treeVisibleGroup.add(b1)

    const b2 = new THREE.Mesh(g, this.material)
    b2.position.set(-0.7, 4, 0.5)
    b2.rotation.z = Math.PI / 5
    b2.rotation.y = Math.PI / 6
    b2.castShadow = true
    this.treeVisibleGroup.add(b2)
  }

  createNodes() {
    const g = new THREE.SphereGeometry(0.2, 24, 24)

    this.node1 = new THREE.Mesh(g, this.nodeMaterial.clone())
    this.node1.position.set(1.5, 3.7, 0)
    this.node1.castShadow = true
    this.node1.userData = { title: 'Proyecto · Raíces' }
    this.treeVisibleGroup.add(this.node1)

    this.node2 = new THREE.Mesh(g, this.nodeMaterial.clone())
    this.node2.position.set(-1.2, 4.8, 0.7)
    this.node2.castShadow = true
    this.node2.userData = { title: 'Proyecto · Ramas' }
    this.treeVisibleGroup.add(this.node2)

    this.node3 = new THREE.Mesh(g, this.nodeMaterial.clone())
    this.node3.position.set(0, 5.2, 0)
    this.node3.castShadow = true
    this.node3.userData = { title: 'Proyecto · Copa' }
    this.treeVisibleGroup.add(this.node3)
  }

  createGround() {
    const groundGeo = new THREE.PlaneGeometry(5000, 5000)

    this.groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x003366,
      roughness: 0.1,
      metalness: 0.0,
      envMapIntensity: 1.0,
      transparent: true,
      opacity: 0.85
    })

    const loader = new THREE.TextureLoader()
    loader.load(
      '/textures/water-normal.jpg',
      (texture) => {
        console.log("Textura 'water-normal.jpg' cargada.")
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(1000, 1000)
        this.groundMaterial.normalMap = texture
        this.groundMaterial.normalScale = new THREE.Vector2(0.3, 0.3)
        this.groundMaterial.needsUpdate = true
      },
      undefined,
      (error) => {
        console.error("Error al cargar la textura 'water-normal.jpg'", error)
      }
    )

    this.ground = new THREE.Mesh(groundGeo, this.groundMaterial)
    this.ground.rotation.x = -Math.PI * 0.5
    this.ground.position.y = 0
    this.ground.receiveShadow = true
    this.mainSceneGroup.add(this.ground)
  }

  createParticles() {
    const count = 1200
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const sca = new Float32Array(count)
    const rnd = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const radius = 3.5 + Math.random() * 1.8
      const angle = Math.random() * Math.PI * 2
      const y = 4 + Math.random() * 3.2

      pos[i3 + 0] = Math.cos(angle) * radius * (0.8 + Math.random() * 0.4)
      pos[i3 + 1] = y + (Math.random() - 0.5) * 0.7
      pos[i3 + 2] = Math.sin(angle) * radius * (0.8 + Math.random() * 0.4)

      col[i3 + 0] = 1
      col[i3 + 1] = 1
      col[i3 + 2] = 1

      sca[i] = 0.6 + Math.random() * 1.4
      rnd[i3 + 0] = (Math.random() - 0.5) * 2.0
      rnd[i3 + 1] = Math.random()
      rnd[i3 + 2] = (Math.random() - 0.5) * 2.0
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    geo.setAttribute('aScale', new THREE.BufferAttribute(sca, 1))
    geo.setAttribute('aRandomness', new THREE.BufferAttribute(rnd, 3))

    const texture = new THREE.TextureLoader().load('/textures/particle.png')
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter

    this.particlesMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: {
          value: Math.min(this.sizes?.pixelRatio || 1, 2)
        },
        uSize: { value: 44.0 },
        uTexture: { value: texture },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uOpacity: { value: 0.0 },
        uColor: { value: new THREE.Color(1, 1, 1) }
      }
    })

    this.particles = new THREE.Points(geo, this.particlesMaterial)
    this.particles.frustumCulled = true
    this.mainSceneGroup.add(this.particles)
  }

  show() {
    this.mainSceneGroup.visible = true
    if (this.ground) this.ground.visible = true
  }

  updateTransition(t) {
    if (this.material) this.material.opacity = t
    if (this.nodeMaterial) this.nodeMaterial.opacity = t
    if (this.particlesMaterial)
      this.particlesMaterial.uniforms.uOpacity.value = t
    if (this.groundMaterial)
      this.groundMaterial.opacity = THREE.MathUtils.lerp(0.0, 0.85, t)
  }

  onTransitionEnd() {
    if (this.material) this.material.transparent = false
    if (this.nodeMaterial) this.nodeMaterial.transparent = false
    if (this.groundMaterial) this.groundMaterial.opacity = 0.85
  }

  setSection(sectionId, t) {
    if (sectionId < 0 || sectionId > 2) return

    // Si ya estamos en esa sección, sólo actualizamos t
    if (this.currentSection === sectionId) {
      this.sectionT = t
      return
    }

    this.previousSection = this.currentSection
    this.currentSection = sectionId
    this.sectionBlend = 0.0
    this.sectionT = t

    const subtitles = [
      'Raíces en el Mar',
      'Ramas al Cielo',
      'Copa Cósmica'
    ]
    const colors = ['#6ecfff', '#a8e6a1', '#e0c3fc']

    const subtitleEl = document.querySelector('.subtitle')
    if (subtitleEl) subtitleEl.textContent = subtitles[sectionId]

    const titleEl = document.querySelector('.title')
    if (titleEl) titleEl.style.color = colors[sectionId]
  }

  updateScrollbarMarks(activeSection) {
    let marks = document.querySelectorAll('.scroll-mark')
    const bar = document.querySelector('.custom-scrollbar')
    if (!bar) return

    if (!marks.length) {
      for (let i = 0; i < 3; i++) {
        const mark = document.createElement('div')
        mark.className = 'scroll-mark'
        mark.style.cssText = `
          position: absolute; left: 0; width: 100%; height: 2px;
          background: rgba(255,255,255,0.2); pointer-events: none;
          transform: translateY(${(i + 1) * (bar.clientHeight / 3)}px);
          transition: all 0.4s ease;
        `
        bar.appendChild(mark)
      }
      marks = document.querySelectorAll('.scroll-mark')
    }

    marks.forEach((m, i) => {
      m.style.background =
        i === activeSection ? '#ffffff' : 'rgba(255,255,255,0.2)'
      m.style.height = i === activeSection ? '3px' : '2px'
    })
  }

  showTooltip(text) {
    if (!this.tooltip) return
    this.tooltip.textContent = text
    this.tooltip.dataset.visible = 'true'
    this.positionTooltip()
  }

  hideTooltip() {
    if (!this.tooltip) return
    this.tooltip.dataset.visible = 'false'
  }

  positionTooltip() {
    if (!this.tooltip || this.tooltip.dataset.visible !== 'true') return
    this.tooltip.style.transform = `translate(${this.mousePx.x + 12}px, ${
      this.mousePx.y + 12
    }px)`
  }

  update() {
    // Mezcla de sección (atmósfera, color partículas, bloom)
    if (this.sectionBlend < 1.0) {
      const deltaMs = this.time.delta || 16
      this.sectionBlend = Math.min(1.0, this.sectionBlend + deltaMs / 1200)
    }

    const from = this.previousSection
    const to = this.currentSection
    const a = this.sectionBlend

    // Partículas: color según blend
    if (this.particlesMaterial && this.particleColors.length >= 3) {
      const cFrom = this.particleColors[from] || new THREE.Color('#88ccff')
      const cTo = this.particleColors[to] || new THREE.Color('#e0c3fc')
      const blendColor = cFrom.clone().lerp(cTo, a)
      this.particlesMaterial.uniforms.uColor.value.copy(blendColor)
    }

    // Bloom
    if (this.experience?.renderer?.bloomPass) {
      const bloomValues = [0.8, 1.1, 1.8]
      const bFrom = bloomValues[from] || 1.0
      const bTo = bloomValues[to] || 1.0
      this.experience.renderer.bloomPass.strength = THREE.MathUtils.lerp(
        bFrom,
        bTo,
        a
      )
    }

    // Luz / niebla
    if (this.environment?.updateLightBlend) {
      this.environment.updateLightBlend(from, to, a)
    } else if (this.environment?.updateLight) {
      this.environment.updateLight(this.currentSection)
    }

    // Rotación del árbol
    this.treeVisibleGroup.rotation.y += 0.0005

    // Animación textura de agua
    if (this.groundMaterial && this.groundMaterial.normalMap) {
      this.groundMaterial.normalMap.offset.x +=
        this.time.delta * 0.00003
      this.groundMaterial.normalMap.offset.y +=
        this.time.delta * 0.00004
    }

    // Partículas (tiempo + mouse)
    if (this.particlesMaterial && this.time) {
      this.particlesMaterial.uniforms.uTime.value = this.time.elapsed
      if (this.experience.state === 'main') {
        this.particlesMaterial.uniforms.uMouse.value.lerp(
          this.pointer,
          0.05
        )
      }
    }

    // Interacción con nodos
    if (this.experience.state === 'main' && this.interactables.length > 0) {
      const cam = this.experience.camera?.instance
      if (!cam) return

      this.raycaster.setFromCamera(this.pointer, cam)
      const hits = this.raycaster.intersectObjects(this.interactables, false)

      this.interactables.forEach((m) => {
        if (m.material)
          m.material.emissiveIntensity = THREE.MathUtils.lerp(
            m.material.emissiveIntensity,
            1.5,
            0.1
          )
        if (m.scale) m.scale.lerp(new THREE.Vector3(1, 1, 1), 0.15)
      })

      if (hits.length > 0) {
        const obj = hits[0].object
        if (obj.material) obj.material.emissiveIntensity = 3.0
        if (obj.scale)
          obj.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.3)
        this.showTooltip(obj.userData.title || 'Proyecto')
      } else {
        this.hideTooltip()
      }
    } else {
      this.hideTooltip()
    }
  }

  resize() {
    this.intro?.resize()
  }
}
