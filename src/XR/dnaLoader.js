// src/XR/dnaLoader.js
import * as THREE from 'three'

/**
 * Loader Digital DNA
 * Genera una hélice que muta en texto 3D.
 */
export function initDnaLoader(options) {
  const { canvas, onComplete, text = 'EDUARDO PORLAN' } = options || {}
  
  if (!canvas) {
    console.warn('[DigitalDNA] No canvas provided')
    return
  }

  // 1. Escena & Cámara
  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x020612, 0.02)

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.set(0, 0, 15)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  })
  renderer.setClearColor(0x000000, 0)

  // 2. Resize reactivo usando el padre (.xr-loader)
  const resize = () => {
    const parent = canvas.parentElement
    if (parent) {
      const width = parent.clientWidth
      const height = parent.clientHeight

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

      camera.aspect = width / height
      camera.updateProjectionMatrix()

      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(width, height, false)
    }
  }

  resize()
  window.addEventListener('resize', resize)

  // 3. Partículas
  const PARTICLE_COUNT = 3000

  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const targetsHelix = new Array(PARTICLE_COUNT)
  const targetsText = new Array(PARTICLE_COUNT)
  const initialPositions = new Array(PARTICLE_COUNT)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3
    const x = (Math.random() - 0.5) * 20
    const y = (Math.random() - 0.5) * 12
    const z = (Math.random() - 0.5) * 10

    positions[i3] = x
    positions[i3 + 1] = y
    positions[i3 + 2] = z

    initialPositions[i] = new THREE.Vector3(x, y, z)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    size: 0.18,
    sizeAttenuation: true,
    color: new THREE.Color('#9fdfff'),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending
  })

  const points = new THREE.Points(geometry, material)
  const dnaGroup = new THREE.Group()
  dnaGroup.add(points)
  scene.add(dnaGroup)

//  Empezamos sin roll/tilt raro
dnaGroup.rotation.set(0, 0, 0)

  // 4. Objetivos: hélice ADN
  const buildHelixTargets = () => {
    const turns = 5
    const height = 12
    const radius = 2.5

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = i / PARTICLE_COUNT
      const angle = t * turns * Math.PI * 2
      const y = (t - 0.5) * height

      const side = i % 2 === 0 ? 1 : -1
      const r = radius + (Math.random() - 0.5) * 0.2

      const x = Math.cos(angle) * r * side
      const z = Math.sin(angle) * r * side * 0.8

      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      )

      targetsHelix[i] = new THREE.Vector3(x, y, z).add(jitter)
    }
  }

  // 5. Objetivos: TEXTO 3D con profundidad real
  const buildTextTargets = (label) => {
    const W = 2048
    const H = 512

    const off = document.createElement('canvas')
    const ctx = off.getContext('2d')
    off.width = W
    off.height = H

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 200px "Inter", "SF Pro Text", sans-serif'
    ctx.fillText(label, W / 2, H / 2)

    const img = ctx.getImageData(0, 0, W, H).data
    const pts = []

    const step = 4

    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const idx = (y * W + x) * 4
        const alpha = img[idx + 3]
        if (alpha > 128) {
          pts.push({ x, y })
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (!pts.length) return

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const textWidthPx = maxX - minX
    const textHeightPx = maxY - minY

    const TARGET_WORLD_WIDTH = 14.0
    const scale = TARGET_WORLD_WIDTH / textWidthPx

    //  Profundidad máxima en Z para el texto (ajustamos para más / menos 3D)
    const MAX_TEXT_DEPTH = 1.6

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const indexSample = Math.floor((i / PARTICLE_COUNT) * pts.length)
      const src = pts[indexSample] || pts[i % pts.length]

      const cx = (src.x - centerX) * scale
      const cy = (centerY - src.y) * scale

      // Normalizamos la posición X al rango [-1, 1]
      const nx = (src.x - centerX) / (textWidthPx * 0.5)
      // Curva ligera: centro más cerca, extremos un poco más lejos
      const depthCurve = nx * nx // siempre positivo
      const depthSign = nx >= 0 ? 1 : -1
      const depth = depthSign * depthCurve * MAX_TEXT_DEPTH

      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08
      )

      //  Ahora el texto está en un plano curvo en Z, no plano
      targetsText[i] = new THREE.Vector3(cx, cy, depth).add(jitter)
    }
  }

  buildHelixTargets()
  buildTextTargets(text)

  // 6. Animación
  const FADE_IN = 1.0
  const HELIX_DURATION = 3.5
  const MORPH_DURATION = 3.5
  const HOLD_TEXT = 3.0
  const TOTAL = FADE_IN + HELIX_DURATION + MORPH_DURATION + HOLD_TEXT

  let startTime = performance.now()
  let rafId = null
  let completed = false

  const tmp = new THREE.Vector3()

  const animate = (now) => {
    rafId = requestAnimationFrame(animate)
    const elapsed = (now - startTime) / 1000
    const t = Math.min(elapsed, TOTAL)

    // Opacidad global
    if (elapsed < FADE_IN) {
      material.opacity = elapsed / FADE_IN
    } else {
      material.opacity = 1
    }

    // --- ROTACIÓN DEL GRUPO (más limpia, sin “roll”) ---
if (t < FADE_IN + HELIX_DURATION + MORPH_DURATION) {
    // un poco de giro suave en Y para el efecto ADN
    dnaGroup.rotation.y = elapsed * 0.35
  
    // un pelín de perspectiva en X, pero muy ligera
    dnaGroup.rotation.x = 0.15 + Math.sin(elapsed * 0.5) * 0.03
  } else {
    // al final, el texto se queda casi frontal y recto
    dnaGroup.rotation.y = THREE.MathUtils.lerp(dnaGroup.rotation.y, 0, 0.08)
    dnaGroup.rotation.x = THREE.MathUtils.lerp(dnaGroup.rotation.x, 0.12, 0.08)
  }
  
  // forzamos que NO haya roll en Z nunca
  dnaGroup.rotation.z = 0
  


    const positionsAttr = geometry.getAttribute('position')

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      tmp.set(
        positionsAttr.getX(i),
        positionsAttr.getY(i),
        positionsAttr.getZ(i)
      )

      let target

      if (t < FADE_IN) {
        target = initialPositions[i].clone().multiplyScalar(0.8)
      } else if (t < FADE_IN + HELIX_DURATION) {
        const progress = (t - FADE_IN) / HELIX_DURATION
        const ease = progress * progress * (3 - 2 * progress)
        target = initialPositions[i].clone().lerp(targetsHelix[i], ease)
      } else if (t < FADE_IN + HELIX_DURATION + MORPH_DURATION) {
        const progress = (t - (FADE_IN + HELIX_DURATION)) / MORPH_DURATION
        const ease = 1 - Math.pow(1 - progress, 3)
        target = targetsHelix[i].clone().lerp(targetsText[i], ease)
      } else {
        const base = targetsText[i]
        const breath = Math.sin(elapsed * 2 + i * 0.01) * 0.05
        target = new THREE.Vector3(base.x, base.y + breath, base.z)
      }

      tmp.lerp(target, 0.15)
      positionsAttr.setXYZ(i, tmp.x, tmp.y, tmp.z)
    }

    positionsAttr.needsUpdate = true
    renderer.render(scene, camera)

    if (!completed && elapsed >= TOTAL) {
      completed = true
      if (typeof onComplete === 'function') onComplete()

      setTimeout(() => {
        cancelAnimationFrame(rafId)
        window.removeEventListener('resize', resize)
      }, 1000)
    }
  }

  animate(startTime)
}
