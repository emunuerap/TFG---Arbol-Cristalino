import * as THREE from 'three'
import Experience from '../Experience.js'
import Environment from './Environment.js'
import Intro from '../Intro.js'
import particleVertex from '../../shaders/particleVertex.glsl?raw'
import particleFragment from '../../shaders/particleFragment.glsl?raw'
import Branches from './Branches.js'
import Crown from './Crown.js'

// GSAP safe (si lo cargamos por CDN y está en window)
const gsap = (typeof window !== 'undefined' && window.gsap) ? window.gsap : null

export default class World {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.time = this.experience.time
    this.sizes = this.experience.sizes
    this._restoreLockUntil = 0

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
    this.branches = new Branches()
    this.crown = new Crown()

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

    this.fogDefaults = this.scene.fog
      ? { density: this.scene.fog.density, color: this.scene.fog.color.clone() }
      : null
   this.groundDefaultOpacity = this.groundMaterial?.opacity ?? 0.85
    

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

        // Manejo de click sobre nodos
        this.handleNodeClick = this.handleNodeClick.bind(this)
        window.addEventListener('click', this.handleNodeClick, { passive: false })
    

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

    // Estado inmersivo
    this.isImmersive = false
    this.immersiveSection = null

    // Estado de mood para Raíces (sección 0)
    const baseRootsMood = this.getRootsMood('gastro') || {
      color: new THREE.Color('#6ecfff'),
      rotation: 0.0004,
      waterOpacity: 0.85
    }

    this.rootsMood = {
      currentKey: 'gastro',
      current: {
        color: baseRootsMood.color.clone(),
        rotation: baseRootsMood.rotation,
        waterOpacity: baseRootsMood.waterOpacity
      },
      target: {
        color: baseRootsMood.color.clone(),
        rotation: baseRootsMood.rotation,
        waterOpacity: baseRootsMood.waterOpacity
      },
      lerp: 1
    }

    // Timeline 3D (Raíces)
    this.rootsTimelineData = [
      {
        period: '2010-2015',
        mood: 'gastro',
        color: new THREE.Color('#8ad6ff'),
        target: new THREE.Vector3(-1.4, 0.35, -1.8),
        floatOffset: Math.random() * Math.PI * 2
      },
      {
        period: '2014-2019',
        mood: 'gastro',
        color: new THREE.Color('#a2f0c2'),
        target: new THREE.Vector3(-0.2, 0.75, -1.2),
        floatOffset: Math.random() * Math.PI * 2
      },
      {
        period: '2019-2023',
        mood: 'digital',
        color: new THREE.Color('#e0c3fc'),
        target: new THREE.Vector3(0.9, 0.6, -0.8),
        floatOffset: Math.random() * Math.PI * 2
      },
      {
        period: '2023-hoy',
        mood: 'data',
        color: new THREE.Color('#7ecbff'),
        target: new THREE.Vector3(1.4, 0.4, -0.2),
        floatOffset: Math.random() * Math.PI * 2
      }
    ]
    this.rootsTimelineLines = []
    this.rootsTimelineNodes = []

    // Mapa 3D (Raíces)
    this.rootsMapData = [
      {
        name: 'Lorca / Murcia, España',
        lat: 37.64,
        lng: -1.01,
        color: 0x88ccff,
        mood: 'gastro',
        years: '2010–2014'
      },
      {
        name: 'Londres, Reino Unido',
        lat: 51.5,
        lng: -0.12,
        color: 0xa8e6a1,
        mood: 'gastro',
        years: '2014–2017'
      },
      {
        name: 'Murcia · Cabaña Buenavista (2*)',
        lat: 37.64,
        lng: -1.01,
        color: 0x88ccff,
        mood: 'gastro',
        years: '2017'
      },
      {
        name: 'Bloomsburg, EE. UU.',
        lat: 41.0,
        lng: -76.45,
        color: 0x8bd6ff,
        mood: 'gastro',
        years: '2017–2018'
      },
      {
        name: 'Pitztal, Austria',
        lat: 47.07,
        lng: 10.82,
        color: 0xa2f0c2,
        mood: 'gastro',
        years: '2018–2019'
      },
      {
        name: 'Barcelona, España',
        lat: 41.39,
        lng: 2.17,
        color: 0xe0c3fc,
        mood: 'digital',
        years: '2019–2021'
      },
      {
        name: 'Helsinki, Finlandia',
        lat: 60.17,
        lng: 24.94,
        color: 0x7ecbff,
        mood: 'data',
        years: '2021–hoy'
      },
      {
        name: 'Callicoon Hills, Nueva York',
        lat: 40.73,
        lng: -74.0,
        color: 0x9adfff,
        mood: 'digital',
        years: '2022'
      }
    ]
    this.rootsMapSphere = null
    this.rootsMapNodes = []
    this.rootsMapLines = []

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

  getRootsMood(key) {
    // Definimos parámetros para cada “sub-raíz”
    switch (key) {
      case 'digital':
        return {
          color: new THREE.Color('#88cfff'), // más frío / tecnológico
          rotation: 0.0012,                  // rota más rápido
          waterOpacity: 0.92
        }
      case 'data':
        return {
          color: new THREE.Color('#e0f5ff'), // muy claro, “nube de datos”
          rotation: 0.0008,
          waterOpacity: 0.78
        }
      case 'gastro':
      default:
        return {
          color: new THREE.Color('#6ecfff'), // azul raíz default
          rotation: 0.0004,
          waterOpacity: 0.85
        }
    }
  }

  setRootsMood(key) {
    const mood = this.getRootsMood(key)
    if (!mood || !this.rootsMood) return

    this.rootsMood.currentKey = key
    this.rootsMood.target.color.copy(mood.color)
    this.rootsMood.target.rotation = mood.rotation
    this.rootsMood.target.waterOpacity = mood.waterOpacity
    this.rootsMood.lerp = 0
    console.log('[World] Cambiando mood de raíces a:', key)
  }

  

  setRootsPill(pillId) {
    const valid = ['gastro', 'digital', 'data']
    const targetKey = valid.includes(pillId) ? pillId : 'gastro'
    this.setRootsMood(targetKey)
  }

  onRamasCue(payload) {
    if (!payload) return
    const { type, cue } = payload
  
    // Ejemplo: cue puede traer un color objetivo para partículas / agua
    if (cue?.particlesColor && this.particlesMaterial) {
      this.particlesMaterial.uniforms.uColor.value.set(cue.particlesColor)
    }
  
    if (cue?.waterOpacity != null && this.groundMaterial) {
      this.groundMaterial.opacity = cue.waterOpacity
    }
  
    console.log('[World] onRamasCue:', type, cue)
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

  // Tick compartido: mantiene animaciones “vivas” en intro + transición
  tickShared() {
    // Partículas vivas desde el primer frame (aunque opacity sea 0)
    if (this.particlesMaterial && this.time) {
      this.particlesMaterial.uniforms.uTime.value = this.time.elapsed
    }

    // Agua viva desde el primer frame
    if (this.groundMaterial && this.groundMaterial.normalMap && this.time) {
     this.groundMaterial.normalMap.offset.x += this.time.delta * 0.00003
     this.groundMaterial.normalMap.offset.y += this.time.delta * 0.00004
    }
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

    const subtitles = [
      'Raíces en el Mar',
      'Ramas al Cielo',
      'Copa Cósmica'
    ]
    const colors = ['#6ecfff', '#a8e6a1', '#e0c3fc']

    const subtitleEl = document.querySelector('.subtitle')
    const titleEl = document.querySelector('.title')
    if (!subtitleEl || !titleEl) return

    // Lógica interna de blend 3D
    this.previousSection = this.currentSection
    this.currentSection = sectionId
    this.sectionBlend = 0.0
    this.sectionT = t

    // Cambio directo de texto y color (las transiciones de CSS se encargan del "suavizado")
    subtitleEl.textContent = subtitles[sectionId]
    titleEl.style.color = colors[sectionId]
  }



  // -------------------------------------------------------------------------
  // MÉTODOS DE ENTRADA Y SALIDA (VERSIÓN DEFINITIVA / FINAL)
  // -------------------------------------------------------------------------

  enterImmersiveSection(sectionId) {
    this.isImmersive = true
    this.immersiveSection = sectionId
    
    // Forzamos el color/atmósfera de la sección al 100%
    this.setSection(sectionId, 1.0) 

    // --- CASO 0: RAÍCES (Sin cambios drásticos) ---
    if (sectionId === 0) {
       console.log('[World] Entrando en Raíces')
    } 
    
    // --- CASO 1: RAMAS (EL VIAJE) ---
    else if (sectionId === 1) { 
      console.log('[World] Entrando en Ramas: Modo Vuelo')
      
      // 1. Ocultar el árbol estático (tronco y ramas viejas)
      this.treeVisibleGroup.visible = false 
      
      // 2. Asegurar que el MAR se ve (Suelo)
      // Lo hacemos visible y subimos un poco la opacidad para que destaque
      if (this.ground) {
          this.ground.visible = true
          if (gsap && this.groundMaterial) {
                        gsap.to(this.groundMaterial, { opacity: 0.9, duration: 2.0 })
                      }
      }

      // 3. LIMPIAR LA NIEBLA (Clave para ver el fondo y el mar)
      if (this.scene.fog) {
          // Bajamos la densidad casi a 0 para ver el horizonte infinito
          if (gsap) gsap.to(this.scene.fog, { density: 0.002, duration: 2.5 })
          // Oscurecemos la niebla para que el fondo negro del CSS se integre
        if (gsap) gsap.to(this.scene.fog.color, { r: 0.01, g: 0.02, b: 0.04, duration: 2.5 })
       }
      

      // 4. Iniciar la lógica de vuelo
      if (this.branches) this.branches.enter() 
    }
    
    // --- CASO 2: COPA ---
    else if (sectionId === 2) {
      console.log('[World] Entrando en Copa: Finale')
      this.treeVisibleGroup.visible = true // El árbol se ve
      this.setCrownHudActive(true) // aquí

      
      // Niebla cálida/mágica para el final
      if (this.scene.fog) {
        if (gsap) gsap.to(this.scene.fog.color, { r: 0.05, g: 0.02, b: 0.08, duration: 3 }) // Violeta oscuro
                  if (gsap) gsap.to(this.scene.fog, { density: 0.015, duration: 3 })
      }
      
      // Activar efecto halo
      if (this.crown) this.crown.enter()
      
      // Ocultar suelo para sensación de altura infinita
      if (gsap && this.groundMaterial) gsap.to(this.groundMaterial, { opacity: 0, duration: 2 })    }
  }

  exitImmersiveSection() {
    console.log('[World] Saliendo de inmersivo')

    const leaving = this.immersiveSection

    // ✅ lock breve para que update() no pelee con GSAP al restaurar
    this._restoreLockUntil = (performance?.now?.() ?? Date.now()) + 650

    // ✅ mata tweens acumulados antes de lanzar nuevos
    if (gsap) {
      if (this.scene?.fog) {
        gsap.killTweensOf(this.scene.fog)
        gsap.killTweensOf(this.scene.fog.color)
      }
      if (this.groundMaterial) gsap.killTweensOf(this.groundMaterial)
    }

    // --- SALIDA RAMAS (1) ---
    if (leaving === 1) {
      // 1) Para lógica de ramas
      this.branches?.exit?.()

      // 2) ✅ HARD-HIDE inmediato del rail/tubo (evita el “cayéndose” fugaz)
      const bg =
        this.branches?.group ||
        this.branches?.container ||
        this.branches?.root ||
        this.branches?.meshGroup ||
        this.branches?.sceneGroup
      if (bg) bg.visible = false

      // 3) vuelve el árbol
      this.treeVisibleGroup.visible = true

      // 4) restaura niebla/suelo a defaults REALES (rápido y sin exageración)
      if (this.scene.fog && this.fogDefaults) {
        if (gsap) {
          gsap.to(this.scene.fog, {
            density: this.fogDefaults.density,
            duration: 0.35,
            overwrite: 'auto'
          })
          gsap.to(this.scene.fog.color, {
            r: this.fogDefaults.color.r,
            g: this.fogDefaults.color.g,
            b: this.fogDefaults.color.b,
            duration: 0.35,
            overwrite: 'auto'
          })
        } else {
          this.scene.fog.density = this.fogDefaults.density
          this.scene.fog.color.copy(this.fogDefaults.color)
        }
      }
      if (this.groundMaterial) {
        if (gsap) {
          gsap.to(this.groundMaterial, {
            opacity: this.groundDefaultOpacity,
            duration: 0.25,
            overwrite: 'auto'
          })
        } else {
          this.groundMaterial.opacity = this.groundDefaultOpacity
        }
      }
   }

   if (leaving === 2) {
      this.setCrownHudActive(false) // ✅ aquí
      
      if(this.crown) this.crown.exit()
      // Restaurar suelo
      if (gsap && this.groundMaterial) gsap.to(this.groundMaterial, { opacity: 0.85, duration: 1 })
        }

    this.isImmersive = false
    this.immersiveSection = null
  }

  setCrownHudActive(active) {
    const hud = document.querySelector('.crown-immersive-hud')
    if (!hud) return
  
    // Si vamos a ocultar la HUD, evita aria-hidden con foco dentro
    if (!active) {
      if (hud.contains(document.activeElement)) {
        document.activeElement.blur()
        // opcional: manda el foco a algo "seguro" fuera del HUD
        document.querySelector('.sections-container .section-enter-button')?.focus?.()
      }
    }
  
    hud.setAttribute('aria-hidden', active ? 'false' : 'true')
  
    // Mejor que aria-hidden para evitar focus/clicks: inert
    // (si tu navegador lo soporta, perfecto)
    if (!active) hud.setAttribute('inert', '')
    else hud.removeAttribute('inert')
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

  handleNodeClick(event) {
    // Sólo nos interesa si estamos en el estado principal
    if (!this.experience || this.experience.state !== 'main') return

    const cam = this.experience.camera?.instance
    if (!cam) return

    // Usamos el pointer actual (ya actualizado en mousemove)
    this.raycaster.setFromCamera(this.pointer, cam)

    // Interacción con timeline 3D en modo inmersivo (sección raíces)
    if (this.isImmersive && this.immersiveSection === 0 && this.rootsTimelineNodes.length) {
      const tlHits = this.raycaster.intersectObjects(
        this.rootsTimelineNodes,
        false
      )
      if (tlHits.length) {
        const target = tlHits[0].object?.userData || {}
        if (target.period) {
          if (this.experience?.trigger) {
            this.experience.trigger('roots-period-click', [
              target.period,
              target.mood
            ])
          }
          return
        }
      }
    }

    // Interacción con nodos del mapa 3D en modo raíces
    if (this.isImmersive && this.immersiveSection === 0 && this.rootsMapNodes.length) {
      const mapHits = this.raycaster.intersectObjects(
        this.rootsMapNodes,
        false
      )
      if (mapHits.length) {
        const data = mapHits[0].object?.userData || {}
        if (data.name && this.experience?.trigger) {
          this.experience.trigger('roots-map-node-click', [data])
        }
        return
      }
    }

    // Si ya estamos en modo inmersivo y no hemos clicado timeline, no reentrar al árbol
    if (this.isImmersive) return

    const hits = this.raycaster.intersectObjects(this.interactables, false)

    if (hits.length === 0) return

    const obj = hits[0].object
    let sectionIndex = -1

    if (obj === this.node1) sectionIndex = 0   // Raíces
    else if (obj === this.node2) sectionIndex = 1 // Ramas
    else if (obj === this.node3) sectionIndex = 2 // Copa

    if (sectionIndex >= 0) {
      console.log('[World] Nodo clicado → sección', sectionIndex)

      // Emitimos evento hacia Experience (que a su vez escucha script.js)
      if (this.experience?.trigger) {
        this.experience.trigger('node-section-request', sectionIndex)
      } else if (this.experience?.emit) {
        // Por si EventEmitter usa "emit" en lugar de "trigger"
        this.experience.emit('node-section-request', sectionIndex)
      }
    }
  }


  update() {
    // ---------------------------------------------------------
    // 1. MODO RAMAS (Galería de Proyectos)
    // ---------------------------------------------------------
    // MODO RAMAS
  if (this.isImmersive && this.immersiveSection === 1) {
    if (this.branches) this.branches.update()
    
    // Fondo de partículas verdes suaves
    if (this.particlesMaterial) {
        this.particlesMaterial.uniforms.uTime.value = this.time.elapsed
        this.particlesMaterial.uniforms.uColor.value.lerp(new THREE.Color(0xa8e6a1), 0.05)
        this.particlesMaterial.uniforms.uOpacity.value = 0.3
    }
    return // IMPORTANTE: Cortar aquí
}
    

    // ---------------------------------------------------------
    // 2. MODO NORMAL (Árbol Principal / Raíces)
    // ---------------------------------------------------------
    
    // Lerp del mood de raíces (suaviza transiciones)
    if (this.rootsMood && this.rootsMood.lerp < 1) {
      const deltaMs = this.time?.delta || 16
      const step = Math.min(1, deltaMs / 600)
      this.rootsMood.lerp = Math.min(1, this.rootsMood.lerp + step)
      const { current, target } = this.rootsMood
      if (current && target) {
        if (current.color && target.color) current.color.lerp(target.color, step)
        current.rotation = THREE.MathUtils.lerp(current.rotation, target.rotation, step)
        current.waterOpacity = THREE.MathUtils.lerp(current.waterOpacity, target.waterOpacity, step)
      }
    }

    // Mezcla de sección (atmósfera, color partículas, bloom)
    if (this.sectionBlend < 1.0) {
      const deltaMs = this.time.delta || 16
      this.sectionBlend = Math.min(1.0, this.sectionBlend + deltaMs / 1200)
    }

    const from = this.previousSection
    const to = this.currentSection
    const a = this.sectionBlend

    // Color de partículas por blend de sección
    let particlesColor = null
    if (this.particlesMaterial && this.particleColors.length >= 3) {
      const cFrom = this.particleColors[from] || new THREE.Color('#88ccff')
      const cTo = this.particleColors[to] || new THREE.Color('#e0c3fc')
      particlesColor = cFrom.clone().lerp(cTo, a)
    }

    // Ajustes específicos para mood de raíces en modo inmersivo
    let rotSpeed = 0.0005
    let targetOpacity = THREE.MathUtils.lerp(0.0, 0.85, this.sectionBlend)

    if (this.isImmersive && this.immersiveSection === 0 && this.rootsMood) {
      rotSpeed = this.rootsMood.current.rotation || rotSpeed
      if (this.rootsMood.current?.color) {
        particlesColor = this.rootsMood.current.color.clone()
      }
      targetOpacity = this.rootsMood.current?.waterOpacity ?? targetOpacity
    }

    this.treeVisibleGroup.rotation.y += rotSpeed

    if (this.particlesMaterial && particlesColor) {
      this.particlesMaterial.uniforms.uColor.value.copy(particlesColor)
    }

    // Bloom Strength
    if (this.experience?.renderer?.bloomPass) {
      const bloomValues = [0.8, 1.1, 1.8]
      const bFrom = bloomValues[from] || 1.0
      const bTo = bloomValues[to] || 1.0
      this.experience.renderer.bloomPass.strength = THREE.MathUtils.lerp(bFrom, bTo, a)
    }

    // Luz / niebla
    if (this.environment?.updateLightBlend) {
      this.environment.updateLightBlend(from, to, a)
    } else if (this.environment?.updateLight) {
      this.environment.updateLight(this.currentSection)
    }

    // Animación textura de agua
    if (this.groundMaterial && this.groundMaterial.normalMap) {
      this.groundMaterial.normalMap.offset.x += this.time.delta * 0.00003
      this.groundMaterial.normalMap.offset.y += this.time.delta * 0.00004
    }

//  durante el lock, NO hacer lerp de opacity (evita pelea con GSAP)
    const now = (performance?.now?.() ?? Date.now())
    const restoreLocked = this._restoreLockUntil && now < this._restoreLockUntil

    if (this.groundMaterial && !restoreLocked) {
    this.groundMaterial.opacity = THREE.MathUtils.lerp(
        this.groundMaterial.opacity,
        targetOpacity,
        0.04
      )
    }

    // Partículas (tiempo + mouse)
    if (this.particlesMaterial && this.time) {
      this.particlesMaterial.uniforms.uTime.value = this.time.elapsed
      if (this.experience.state === 'main') {
        this.particlesMaterial.uniforms.uMouse.value.lerp(this.pointer, 0.05)
      }
    }

    // Timeline 3D (Solo activo si estamos en Raíces Inmersivo)
    if (this.isImmersive && this.immersiveSection === 0 && this.rootsTimelineLines.length) {
      const delta = (this.time?.delta || 16) * 0.001
      const t = (this.time?.elapsed || 0) * 0.001

      this.rootsTimelineLines.forEach((line) => {
        const p = Math.min(1, (line.userData.progress || 0) + delta * 0.6)
        line.userData.progress = p
        line.scale.set(p, 1, p)
      })

      this.rootsTimelineNodes.forEach((node) => {
        const baseY = node.userData.baseY || node.position.y
        const offset = node.userData.floatOffset || 0
        node.position.y = baseY + Math.sin(t * 1.4 + offset) * 0.06
      })
    }

    // Mapa 3D (Solo activo si estamos en Raíces Inmersivo)
    if (this.isImmersive && this.immersiveSection === 0 && this.rootsMapNodes.length) {
      const cam = this.experience.camera?.instance
      if (cam) {
        const t = (this.time?.elapsed || 0) * 0.001
        this.raycaster.setFromCamera(this.pointer, cam)
        const hits = this.raycaster.intersectObjects(this.rootsMapNodes, false)
        const hovered = hits[0]?.object || null

        this.rootsMapNodes.forEach((node) => {
          const baseY = node.userData.baseY || node.position.y
          const offset = node.userData.floatOffset || 0
          node.position.y = baseY + Math.sin(t * 1.2 + offset) * 0.05

          const targetScale = node === hovered ? 1.25 : 1.0
          node.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12)
          node.material.opacity = THREE.MathUtils.lerp(
            node.material.opacity,
            node === hovered ? 1 : 0.78,
            0.12
          )
        })
      }
    }

  // Modo Copa
if (this.isImmersive && this.immersiveSection === 2) {
  if (this.crown) this.crown.update()
  // ← ELIMINADA la línea que accedía a this.camera.instance (causaba el crash)
}

    // Interacción con nodos del árbol (Solo en Overview)
    if (this.experience.state === 'main' && !this.isImmersive && this.interactables.length > 0) {
      const cam = this.experience.camera?.instance
      if (!cam) {
        this.hideTooltip()
        return
      }

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
// En World.js (al final de la clase, antes de la llave de cierre })
resize() {
  // Redimensionar la intro si existe
  this.intro?.resize()
  // Redimensionar la galería de ramas si existe (IMPORTANTE)
  this.branches?.resize?.() 
}

}


