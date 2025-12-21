import * as THREE from 'three'
import Experience from '../Experience.js'
import gsap from 'gsap'
import { RAMAS_PROJECTS } from '../../Ramas/ramasProjects.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

// Shaders
import shardVertex from '../../shaders/shardVertex.glsl?raw'
import shardFragment from '../../shaders/shardFragment.glsl?raw'

export default class Branches {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.camera = this.experience.camera
    this.time = this.experience.time
    this.sizes = this.experience.sizes
    this.uiIndex = -1


    // Grupo
    this.group = new THREE.Group()
    this.group.visible = false
    this.scene.add(this.group)

    // UI Refs
    this.ui = {
      container: document.getElementById('branch-info-container'),
      title: document.getElementById('branch-title'),
      kicker: document.getElementById('branch-kicker'),
      line: document.getElementById('branch-line'),
      tags: document.getElementById('branch-tags'),
      actions: document.getElementById('branch-actions'),
      bar: document.querySelector('.travel-bar'),
      introTexts: document.querySelectorAll('.intro-text')
    }

    this.projects = RAMAS_PROJECTS || []
    this.nodes = []

    this.mouse = new THREE.Vector2(0, 0)

    // Estado
    this.progress = 0
    this.targetProgress = 0
    this.scrollVelocity = 0
    this.isActive = false
    this.activeIndex = -1
    this.isIntroAnimating = false
    this.hasReachedEnd = false

    // Loaders
    this.gltfLoader = new GLTFLoader()
    this.textureLoader = new THREE.TextureLoader()
    this.fontLoader = new FontLoader()

    // Temps (para no generar basura)
    this._tmpV3a = new THREE.Vector3()
    this._tmpV3b = new THREE.Vector3()
    this._tmpNDC = new THREE.Vector3()
    this._tmpForward = new THREE.Vector3()
    this._tmpDir = new THREE.Vector3()

    this.createPath()
    this.createProjectNodes()
    this.createInteractiveParticles()
    this.createFinalMarker()

    window.addEventListener('mousemove', (e) => {
      if (this.isActive) {
        this.mouse.x = (e.clientX / this.sizes.width) * 2 - 1
        this.mouse.y = -(e.clientY / this.sizes.height) * 2 + 1
      }
    })
  }

  createPath() {
    const points = [
      new THREE.Vector3(0, -5, 0),
      new THREE.Vector3(0, 10, -25),
      new THREE.Vector3(12, 35, -50),
      new THREE.Vector3(-8, 65, -90),
      new THREE.Vector3(10, 95, -130),
      new THREE.Vector3(0, 130, -170)
    ]

    this.curve = new THREE.CatmullRomCurve3(points)
    this.curve.tension = 0.4

    const geo = new THREE.TubeGeometry(this.curve, 500, 0.25, 12, false)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xa8e6a1,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
      blending: THREE.AdditiveBlending
    })
    this.pathMesh = new THREE.Mesh(geo, mat)
    this.pathMesh.position.y = -2.0
    this.group.add(this.pathMesh)
  }

  createInteractiveParticles() {
    const count = 1200
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const randoms = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const t = Math.random()
      const point = this.curve.getPointAt(t)
      const spread = 20
      pos[i * 3] = point.x + (Math.random() - 0.5) * spread
      pos[i * 3 + 1] = point.y + (Math.random() - 0.5) * spread
      pos[i * 3 + 2] = point.z + (Math.random() - 0.5) * spread

      randoms[i * 3] = Math.random()
      randoms[i * 3 + 1] = Math.random()
      randoms[i * 3 + 2] = Math.random()
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3))

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uColor: { value: new THREE.Color('#a8e6a1') }
      },
      vertexShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uPixelRatio;
        attribute vec3 aRandom;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float time = uTime * 0.3;
          p.x += sin(time * aRandom.x + p.y * 0.05) * 0.5;
          p.y += cos(time * aRandom.y + p.x * 0.05) * 0.5;

          vec4 viewPosition = viewMatrix * modelMatrix * vec4(p, 1.0);
          vec4 projectedPosition = projectionMatrix * viewPosition;

          vec2 ndc = projectedPosition.xy / projectedPosition.w;
          float dist = distance(ndc, uMouse);
          float strength = smoothstep(0.4, 0.0, dist);
vec2 v = ndc - uMouse;
float lenV = length(v);
vec2 dir = (lenV > 1e-5) ? (v / lenV) : vec2(0.0);
          projectedPosition.xy += dir * strength * 3.0;

          gl_Position = projectedPosition;
          gl_PointSize = (45.0 * aRandom.z + 10.0) * uPixelRatio * (1.0 / -viewPosition.z);
          vAlpha = 0.5 + strength * 0.5;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          float glow = 1.0 - smoothstep(0.0, 0.5, r);
          if(glow < 0.01) discard;
          gl_FragColor = vec4(uColor, glow * vAlpha);
        }
      `
    })

    this.particles = new THREE.Points(geo, mat)
    this.group.add(this.particles)
  }

  createProjectNodes() {
    this.projects.forEach((proj, i) => {
      const t = 0.12 + (i / Math.max(1, this.projects.length - 1)) * 0.75
      const point = this.curve.getPointAt(t)

      const nodeGroup = new THREE.Group()
      nodeGroup.position.copy(point)
      nodeGroup.position.y += 1.8

      const lookTarget = this.curve.getPointAt(Math.min(1, t + 0.05))
      lookTarget.y += 1.8
      nodeGroup.lookAt(lookTarget)

      const side = i % 2 === 0 ? 1 : -1
      nodeGroup.translateX(3.2 * side)
      nodeGroup.rotateY(side * -0.8)

      this.buildUniqueContent(proj, nodeGroup, i)

      nodeGroup.userData = { id: i, t, originalY: nodeGroup.position.y }
      this.nodes.push(nodeGroup)
      this.group.add(nodeGroup)
    })
  }

  buildUniqueContent(project, parentGroup, index) {
    const ringGeo = new THREE.TorusGeometry(1.8, 0.02, 16, 64)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xa8e6a1, transparent: true, opacity: 0.3 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = -1.5
    parentGroup.add(ring)

    let mesh = null

    if (project.id === 'ramen-9000') {
      this.gltfLoader.load('/models/ramen.glb', (gltf) => {
        const model = gltf.scene

        const box = new THREE.Box3().setFromObject(model)
        const size = new THREE.Vector3()
        box.getSize(size)

        const maxDim = Math.max(size.x, size.y, size.z)
        const targetSize = 2.5
        const scaleFactor = targetSize / maxDim
        model.scale.setScalar(scaleFactor)

        const center = new THREE.Vector3()
        box.getCenter(center)
        model.position.sub(center.multiplyScalar(scaleFactor))

        model.position.y -= 1.5
        model.rotation.y = Math.PI

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            if (child.material) {
              child.material.envMapIntensity = 1.0
              child.material.needsUpdate = true
            }
          }
        })

        parentGroup.add(model)
        parentGroup.userData.ramenModel = model
      })
    } else if (project.id === 'tapin-os') {
      this.gltfLoader.load('/models/tapin_logo.glb', (gltf) => {
        const model = gltf.scene
        model.rotation.x = Math.PI / 2
        model.scale.set(12.0, 12.0, 12.0)
        model.position.y = -1.5

        model.traverse((child) => {
          if (child.isMesh) {
            child.material.envMapIntensity = 2.0
            child.material.needsUpdate = true
          }
        })

        parentGroup.add(model)
        parentGroup.userData.tapinLogo = model
      })

      const light = new THREE.PointLight(0xffffff, 5, 10)
      light.position.set(3, 3, 3)
      parentGroup.add(light)
    } else if (project.id === 'iberikus') {
      mesh = new THREE.Group()
      const mat = new THREE.MeshStandardMaterial({ color: 0x5099ff, roughness: 0.2, metalness: 0.8 })
      for (let k = 0; k < 5; k++) {
        const h = 0.5 + Math.random() * 2.0
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, 0.3), mat)
        bar.position.set((k - 2) * 0.5, h / 2 - 1, 0)
        bar.userData.isBar = true
        mesh.add(bar)
      }
    } else if (project.id === 'eporlan') {
      this.gltfLoader.load(
        '/models/eporlan.glb',
        (gltf) => {
          const model = gltf.scene
    
          // --- AUTO-ESCALADO ---
          model.updateMatrixWorld(true)
          const box0 = new THREE.Box3().setFromObject(model)
          const size0 = new THREE.Vector3()
          box0.getSize(size0)
    
          const maxDim = Math.max(size0.x, size0.y, size0.z)
          const targetSize = 2.6
          const scaleFactor = targetSize / maxDim
          model.scale.setScalar(scaleFactor)
    
          // --- RECENTER (centro a 0,0,0) ---
          model.updateMatrixWorld(true)
          const box1 = new THREE.Box3().setFromObject(model)
          const center = new THREE.Vector3()
          box1.getCenter(center)
          model.position.sub(center)
    
          // --- APOYAR EN EL SUELO (base a y=0) ---
          model.updateMatrixWorld(true)
          const box2 = new THREE.Box3().setFromObject(model)
          model.position.y += -box2.min.y
    
        
    
          // --- ORIENTACIÓN (evitar "perfil") ---
          // girar 90º
          model.rotation.y += Math.PI / 2
 
    
          // --- MATERIALES: NO los reemplazamos (para conservar azul) ---
          model.traverse((child) => {
            if (!child.isMesh) return
            child.castShadow = false
            child.receiveShadow = true
    
            if (child.material) {
              // Si el HDRI es cálido, envMapIntensity alto lo “dora”.
              child.material.envMapIntensity = 0.6
              child.material.needsUpdate = true
            }
          })
    
          parentGroup.add(model)
          parentGroup.userData.eporlanLogo = model
        },
        undefined,
        (err) => console.warn('Failed loading /models/eporlan.glb', err)
      )
    }
    
    else if (project.id === 'arbol') {
      const crystalMaterial = new THREE.MeshPhysicalMaterial({
        name: 'RealGlass',
        color: 0xffffff,
        emissive: 0x000000,
        metalness: 0.0,
        roughness: 0.0,
        transmission: 1.0,
        thickness: 1.2,
        ior: 1.5,
        attenuationColor: new THREE.Color(0xffffff),
        attenuationDistance: 0.5,
        reflectivity: 0.5,
        envMapIntensity: 1.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0,
        side: THREE.DoubleSide
      })

      this.gltfLoader.load('/models/arbol_cristal.glb', (gltf) => {
        const model = gltf.scene
        model.scale.set(0.6, 0.6, 0.6)
        model.position.y = -1.5

        model.traverse((child) => {
          if (child.isMesh) {
            child.material = crystalMaterial
            child.castShadow = false
            child.receiveShadow = true
          }
        })

        parentGroup.add(model)
        parentGroup.userData.crystalTree = model
      })
    }

    if (mesh) {
      parentGroup.add(mesh)
      parentGroup.userData.mainMesh = mesh
    }
  }

  createFinalMarker() {
    const endPoint = this.curve.getPointAt(0.99)
    this.finalGroup = new THREE.Group()
    this.finalGroup.position.copy(endPoint)
    this.finalGroup.lookAt(this.curve.getPointAt(0.9))
    this.group.add(this.finalGroup)

    const geo = new THREE.OctahedronGeometry(1.5, 2)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3 })
    this.finalCore = new THREE.Mesh(geo, mat)
    this.finalGroup.add(this.finalCore)

    const light = new THREE.PointLight(0xe0c3fc, 2, 20)
    this.finalGroup.add(light)
  }

  //  Selector : distancia real + delante de cámara + dentro de pantalla + hysteresis
  getClosestVisibleProjectIndex() {
    const cam = this.camera.instance
    const camPos = cam.position
    cam.getWorldDirection(this._tmpForward)

    // Ajustado para “un pelín antes”
    const ACTIVATE_DIST = 22.0
    const DEACTIVATE_DIST = 28.0

    const SCREEN_WINDOW = 0.95 // 0.85 = más estricto, 0.98 = más permisivo
    const FORWARD_DOT = 0.12   // >0 delante; 0.12 evita “nodos a los lados/atrás”

    const qualifies = (idx, maxDist) => {
      const node = this.nodes[idx]
      if (!node) return false

      const wp = node.getWorldPosition(this._tmpV3a)
      const d = camPos.distanceTo(wp)
      if (d > maxDist) return false

      // delante de la cámara (dot)
      this._tmpDir.copy(wp).sub(camPos).normalize()
      const dot = this._tmpForward.dot(this._tmpDir)
      if (dot < FORWARD_DOT) return false

      // dentro de pantalla (NDC)
      this._tmpNDC.copy(wp).project(cam)
      const inFront = this._tmpNDC.z > -1 && this._tmpNDC.z < 1
      const inWindow =
        Math.abs(this._tmpNDC.x) < SCREEN_WINDOW &&
        Math.abs(this._tmpNDC.y) < SCREEN_WINDOW

      return inFront && inWindow
    }

    // Hysteresis: si ya tengo uno activo, lo mantengo hasta salir del rango “DEACTIVATE”
    if (this.activeIndex !== -1 && qualifies(this.activeIndex, DEACTIVATE_DIST)) {
      return this.activeIndex
    }

    // Si no tengo activo, busco el mejor en rango “ACTIVATE”
    let bestIdx = -1
    let bestScore = Infinity

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]
      const wp = node.getWorldPosition(this._tmpV3a)
      const d = camPos.distanceTo(wp)
      if (d > ACTIVATE_DIST) continue

      this._tmpDir.copy(wp).sub(camPos).normalize()
      const dot = this._tmpForward.dot(this._tmpDir)
      if (dot < FORWARD_DOT) continue

      this._tmpNDC.copy(wp).project(cam)
      const inFront = this._tmpNDC.z > -1 && this._tmpNDC.z < 1
      if (!inFront) continue

      const inWindow =
        Math.abs(this._tmpNDC.x) < SCREEN_WINDOW &&
        Math.abs(this._tmpNDC.y) < SCREEN_WINDOW
      if (!inWindow) continue

      // Score: preferimos (1) cerca, (2) centrado en pantalla
      const centerPenalty = (Math.abs(this._tmpNDC.x) + Math.abs(this._tmpNDC.y)) * 6.0
      const score = d + centerPenalty

      if (score < bestScore) {
        bestScore = score
        bestIdx = i
      }
    }

    return bestIdx
  }

  // --- INTRO ---
  enter() {
    this.isActive = true
    this.group.visible = true
    this.hasReachedEnd = false
    this.activeIndex = -1
    this.isIntroAnimating = true

    //  Arranca limpio en 0 (sin negativos)
    this.progress = 0.0
    this.targetProgress = 0.0
    this.scrollVelocity = 0
    this.updateCameraPosition()

    // clases body para HUD + bloqueo scroll ( CSS lo usa)
    document.body.classList.add('is-section-immersive', 'is-section-immersive-branches')

    this.nodes.forEach((node) => node.scale.set(0, 0, 0))
    this.ui.introTexts.forEach((el) => {
      el.style.opacity = 0
      el.style.transform = 'translateY(-50%) scale(1.1)'
      el.style.filter = 'blur(10px)'
    })

    this.group.position.y = -60
    gsap.to(this.group.position, {
      y: 0,
      duration: 3.5,
      ease: 'power2.out'
    })

    window.addEventListener('wheel', this.onWheel, { passive: false })

    const tl = gsap.timeline({
      onComplete: () => {
        this.isIntroAnimating = false
      }
    })

    if (this.ui.introTexts[0]) {
      tl.to(this.ui.introTexts[0], {
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        duration: 1.2,
        ease: 'power2.out'
      }, 0.5)
      .to(this.ui.introTexts[0], {
        opacity: 0,
        filter: 'blur(10px)',
        scale: 0.9,
        duration: 0.8,
        ease: 'power2.in'
      }, 2.0)
    }

    if (this.ui.introTexts[1]) {
      tl.to(this.ui.introTexts[1], {
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        duration: 1.2,
        ease: 'power2.out'
      }, 2.2)
      .to(this.ui.introTexts[1], {
        opacity: 0,
        filter: 'blur(10px)',
        scale: 0.9,
        duration: 0.8,
        ease: 'power2.in'
      }, 4.0)
    }

    tl.to(this, {
      targetProgress: 0.06,
      duration: 3.5,
      ease: 'power2.inOut'
    }, 3.5)

    this.nodes.forEach((node, i) => {
      tl.to(node.scale, {
        x: 1, y: 1, z: 1,
        duration: 1.5,
        ease: 'elastic.out(1, 0.75)'
      }, 5.0 + (i * 0.3))
    })

    const hint = document.querySelector('.nav-hint')
    if (hint) {
      gsap.set(hint, { opacity: 0, y: 30 })
      tl.to(hint, { opacity: 1, y: 0, duration: 1 }, 7.0)
    }
  }

  exit() {
    this.isActive = false
    window.removeEventListener('wheel', this.onWheel)

    //  quitar clases body
    document.body.classList.remove('is-section-immersive', 'is-section-immersive-branches')

    gsap.to(this.group.position, {
      y: -80,
      duration: 1.2,
      ease: 'power2.in',
      onComplete: () => {
        this.group.visible = false
        this.group.position.y = 0
      }
    })

    this.ui.introTexts.forEach((el) => (el.style.opacity = 0))
    this.hideUI()
  }

  //  wheel: preventDefault SIEMPRE dentro de ramas
  onWheel = (e) => {
    if (!this.isActive) return
    e.preventDefault()
    if (this.isIntroAnimating) return

    const delta = e.deltaY * 0.00035
    this.targetProgress = THREE.MathUtils.clamp(this.targetProgress + delta, 0, 0.99)
  }

  updateUI(index) {
    if (index === this.uiIndex) return
    this.uiIndex = index
    this.activeIndex = index // mantenemos activeIndex para hysteresis/selector
  

    if (!this.ui.container) return

    if (index === -1) {
      this.ui.container.classList.add('hidden')
      return
    }

    const p = this.projects[index]
    this.ui.container.classList.add('hidden')

    setTimeout(() => {
      if (this.ui.title) this.ui.title.innerText = p.title
      if (this.ui.kicker) this.ui.kicker.innerText = p.kicker
      if (this.ui.line) this.ui.line.innerText = p.line
      if (this.ui.tags) this.ui.tags.innerText = p.tags.join(' · ')

      if (this.ui.actions) {
        this.ui.actions.innerHTML = ''
        if (p.links) {
          Object.entries(p.links).forEach(([key, url]) => {
            const a = document.createElement('a')
            a.href = url
            a.target = '_blank'
            a.className = 'branch-btn'
            a.innerText = key
            a.addEventListener('mousedown', (ev) => ev.stopPropagation())
            this.ui.actions.appendChild(a)
          })
        }
      }

      this.ui.container.classList.remove('hidden')
    }, 120)
  }

  hideUI() {
    if (this.ui.container) this.ui.container.classList.add('hidden')
  }

  updateCameraPosition() {
    const p = THREE.MathUtils.clamp(this.progress, 0.0001, 0.9999)
    const camPos = this.curve.getPointAt(p)
    const lookTargetT = Math.min(0.9999, p + 0.02)
    const lookPos = this.curve.getPointAt(lookTargetT)

    this.camera.instance.position.copy(camPos)
    this.camera.instance.lookAt(lookPos)

    const tangent = this.curve.getTangentAt(p)
    const bank = -tangent.x * 0.5
    const lerpFactor = this.isIntroAnimating ? 0.05 : 0.1
    this.camera.instance.rotation.z = THREE.MathUtils.lerp(this.camera.instance.rotation.z, bank, lerpFactor)
  }

  update() {
    if (!this.isActive || !this.group.visible) return

    const time = this.time.elapsed * 0.001
    const delta = Math.max(0.001, (this.time.delta || 16) * 0.001)

    if (this.particles) {
      this.particles.material.uniforms.uTime.value = time
      this.particles.material.uniforms.uMouse.value.lerp(this.mouse, 0.1)
    }

    this.progress += (this.targetProgress - this.progress) * 0.06
    this.progress = THREE.MathUtils.clamp(this.progress, 0.0001, 0.9999)
    this.scrollVelocity = (this.targetProgress - this.progress) / delta

    if (this.ui.bar) this.ui.bar.style.width = `${this.progress * 100}%`

    this.updateCameraPosition()

    // --- animaciones nodos ---
    this.nodes.forEach((node, i) => {
      node.position.y = node.userData.originalY + Math.sin(time * 1.5 + i) * 0.2

      if (this.projects[i].id === 'iberikus') {
        node.children.forEach((child) => {
          if (child.userData.isBar) {
            child.scale.y = 1 + Math.sin(time * 3 + child.position.x * 5) * 0.5
          }
        })
      }

      if (this.projects[i].id === 'ramen-9000' && node.userData.ramenModel) {
        node.userData.ramenModel.rotation.y += 0.005
        node.userData.ramenModel.position.y = -1.5 + Math.sin(time * 1.5) * 0.1
      }

      if (this.projects[i].id === 'tapin-os' && node.userData.tapinLogo) {
        node.userData.tapinLogo.rotation.z += 0.005
        node.userData.tapinLogo.position.y = -1.5 + Math.sin(time * 2) * 0.1
      }

      if (this.projects[i].id === 'arbol' && node.userData.crystalTree) {
        node.userData.crystalTree.rotation.y += 0.002
        node.userData.crystalTree.position.y = -1.5 + Math.sin(time * 0.8) * 0.1
      }

      if (this.projects[i].id === 'eporlan') {
        if (node.userData.eporlanLogo) {
          node.userData.eporlanLogo.rotation.y += 0.003
          node.userData.eporlanLogo.position.y = -1.45 + Math.sin(time * 1.2) * 0.08
        }
      }
      

      // scale “respira” cerca (opcional)
      if (!this.isIntroAnimating) {
        const t = node.userData.t
        const distT = Math.abs(t - this.progress)
        let scale = 1.0
        if (distT < 0.20) scale = 1.0 + (0.20 - distT) * 1.2
        node.scale.setScalar(THREE.MathUtils.lerp(node.scale.x, scale, 0.1))
      }
    })

    // --- UI selection ---
    if (!this.isIntroAnimating) {
      if (this.progress > 0.98) {
        this.updateUI(-1)
      } else {
        const closeIndex = this.getClosestVisibleProjectIndex()
        this.updateUI(closeIndex)
      }
    }

    if (this.finalCore) {
      this.finalCore.rotation.y += 0.01
      this.finalCore.rotation.z += 0.01
    }
  }

  resize() {
    if (this.particles) {
      this.particles.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
    }
  }
}
