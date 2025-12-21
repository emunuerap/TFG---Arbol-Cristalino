// XR / constellation.js
// ------------------------------------------------------------
// Constelación 3D interactiva para el panel de Interacción
// – Rotación suave
// – Nodos con halo “breathing”
// – Pulsos al activar
// – Arcos eléctricos al hacer click entre nodos conectados
// – Sincronización con XR Zones vía window.xrConstellation.highlightNode(id)
// – FIX: ResizeObserver (evita deformación por cambios de layout)
// ------------------------------------------------------------

import * as THREE from 'three'

export function initConstellation(canvas) {
  if (!canvas) return

  // Evita dobles inits si el componente se monta 2 veces
  if (canvas.__xrConstellationCleanup) {
    canvas.__xrConstellationCleanup()
    canvas.__xrConstellationCleanup = null
  }

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x050910, 0.06)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })

  const DPR_MAX = 2
  const getDPR = () => Math.min(window.devicePixelRatio || 1, DPR_MAX)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80)
  const baseCameraPos = new THREE.Vector3(0, 0.4, 10)
  camera.position.copy(baseCameraPos)

  const clock = new THREE.Clock()
  const rootGroup = new THREE.Group()
  scene.add(rootGroup)

  // Luz suave
  const ambient = new THREE.AmbientLight(0xffffff, 0.9)
  const dir = new THREE.DirectionalLight(0xffffee, 1.2)
  dir.position.set(5, 6, 4)
  scene.add(ambient, dir)

  // Glow dome detrás de la constelación
  const glowGeo = new THREE.SphereGeometry(6, 32, 32)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xa6ff4c,
    transparent: true,
    opacity: 0.28,
    side: THREE.BackSide,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  rootGroup.add(glow)

  // ----------------------------------------------------------
  // DATA NODOS
  // ----------------------------------------------------------

  const NODE_DATA = [
    { id: 'core',        label: 'Core XR Stack',        pos: new THREE.Vector3(0, 0, 0), kind: 'core' },
    { id: 'light',       label: 'Light as Interface',   pos: new THREE.Vector3(-2.2, 1.6, 0.3),  kind: 'zone' },
    { id: 'space',       label: 'Space as Interface',   pos: new THREE.Vector3(2.4, 1.4, -0.4),  kind: 'zone' },
    { id: 'motion',      label: 'Motion as UI',         pos: new THREE.Vector3(-2.3, -1.5, -0.2), kind: 'zone' },
    { id: 'thresholds',  label: 'Thresholds',           pos: new THREE.Vector3(2.5, -1.4, 0.5),  kind: 'zone' },
    { id: 'three',       label: 'Three.js / WebGL',     pos: new THREE.Vector3(0, 2.4, 0.3),     kind: 'tech' },
    { id: 'shaders',     label: 'Shaders & Materials',  pos: new THREE.Vector3(1.4, 0.4, 1.3),   kind: 'tech' },
    { id: 'ux',          label: 'UX · Narrative',       pos: new THREE.Vector3(-1.4, 0.3, -1.2), kind: 'design' },
  ]

  const LINKS = [
    ['core', 'light'], ['core', 'space'], ['core', 'motion'], ['core', 'thresholds'],
    ['core', 'three'], ['core', 'shaders'], ['core', 'ux'],
    ['light', 'space'], ['space', 'thresholds'], ['thresholds', 'motion'], ['motion', 'light'],
    ['three', 'shaders'], ['shaders', 'ux'], ['ux', 'three'],
    ['three', 'light'], ['three', 'space'], ['ux', 'motion'], ['ux', 'thresholds'],
  ]

  // ----------------------------------------------------------
  // MATERIALES / GEOMETRÍAS
  // ----------------------------------------------------------

  const BASE_COLORS = {
    core: 0xf5ffcc,
    zone: 0xccff33,
    tech: 0x99ffcc,
    design: 0xfff0cc,
  }

  const nodeGeo = new THREE.IcosahedronGeometry(0.22, 2)
  const haloGeo = new THREE.SphereGeometry(0.28, 24, 24)

  const nodes = []
  const nodeMeshes = []
  const haloMeshes = []

  // Pulsos en el nodo activo
  const pulses = []
  const pulseGeo = new THREE.RingGeometry(0.42, 0.54, 48)
  const pulseBaseMat = new THREE.MeshBasicMaterial({
    color: 0xdfff7a,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  // Arcos eléctricos temporales
  const arcs = []

  const descriptions = {
    core: `
Constelación que mezcla Three.js, shaders, narrativa y diseño de interacción
espacial. No es solo código, es cómo se siente moverse dentro de una escena.
    `.trim(),
    three: `
Uso Three.js y WebGL para construir espacios navegables: cámara, luz,
materiales y geometría trabajan juntos como interfaz, no como decorado.
    `.trim(),
    shaders: `
Pequeños shaders para disolver, hacer fade entre estados o dar vida al agua,
al fuego o al cristal. Los materiales hablan del estado de la experiencia.
    `.trim(),
    ux: `
Pienso la escena como un recorrido: qué ve primero la persona, qué descubre
después y qué relación hay entre texto, cámara, luz y sonido.
    `.trim(),
    light: `
La luz marca qué importa, qué está activo y en qué estado estamos. Gradientes,
sombras y halos suaves sustituyen a muchos botones innecesarios.
    `.trim(),
    space: `
Los cambios de posición de cámara explican el flujo: overview, foco y detalle.
Mover el punto de vista es parte consciente de la UI.
    `.trim(),
    motion: `
Las transiciones traducen cambios de estado: easing, timings y delays
cuentan una historia clara entre antes y después.
    `.trim(),
    thresholds: `
Diseño portales entre capas: scroll, fades, cambios de color o de densidad
de niebla que marcan el paso entre modos y escenas.
    `.trim(),
  }

  const titleEl = document.getElementById('xr-constellation-title')
  const descEl = document.getElementById('xr-constellation-description')

  function updateCopy(id) {
    if (!titleEl || !descEl) return
    const data =
      NODE_DATA.find((n) => n.id === id) || NODE_DATA.find((n) => n.id === 'core')
    titleEl.textContent = data.label
    descEl.textContent = descriptions[id] || descriptions.core
  }

  // ----------------------------------------------------------
  // NODOS + HALOS
  // ----------------------------------------------------------

  NODE_DATA.forEach((data) => {
    const mat = new THREE.MeshStandardMaterial({
      color: BASE_COLORS[data.kind] || 0xccff33,
      metalness: data.kind === 'core' ? 0.5 : 0.35,
      roughness: 0.25,
      emissive: 0x101010,
      emissiveIntensity: data.id === 'core' ? 0.9 : 0.5,
    })

    const mesh = new THREE.Mesh(nodeGeo, mat)
    mesh.position.copy(data.pos)
    mesh.userData.id = data.id
    mesh.userData.label = data.label
    rootGroup.add(mesh)
    nodes.push({ data, mesh })
    nodeMeshes.push(mesh)

    const haloMat = new THREE.MeshBasicMaterial({
      color: BASE_COLORS[data.kind] || 0xccff33,
      transparent: true,
      opacity: data.id === 'core' ? 0.35 : 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const halo = new THREE.Mesh(haloGeo, haloMat)
    halo.position.copy(data.pos)
    rootGroup.add(halo)
    haloMeshes.push(halo)
  })

  // ----------------------------------------------------------
  // LÍNEAS ENTRE NODOS
  // ----------------------------------------------------------

  const positions = []
  LINKS.forEach(([aId, bId]) => {
    const a = nodes.find((n) => n.data.id === aId)
    const b = nodes.find((n) => n.data.id === bId)
    if (!a || !b) return
    positions.push(
      a.mesh.position.x, a.mesh.position.y, a.mesh.position.z,
      b.mesh.position.x, b.mesh.position.y, b.mesh.position.z
    )
  })

  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xd0ff88,
    transparent: true,
    opacity: 0.55,
  })
  const lines = new THREE.LineSegments(lineGeo, lineMat)
  rootGroup.add(lines)

  // ----------------------------------------------------------
  // ESTRELLAS DE FONDO
  // ----------------------------------------------------------

  const starGeo = new THREE.BufferGeometry()
  const starCount = 180
  const starPos = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    const r = 7 + Math.random() * 3
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    starPos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
    starPos[i * 3 + 1] = r * Math.cos(phi) * 0.4
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  const starMat = new THREE.PointsMaterial({
    size: 0.06,
    transparent: true,
    opacity: 0.9,
  })
  const stars = new THREE.Points(starGeo, starMat)
  rootGroup.add(stars)

  // ----------------------------------------------------------
  // INTERACCIÓN
  // ----------------------------------------------------------

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2(0, 0)

  let hoveredId = null
  let activeId = 'core'
  let isInside = false

  let targetRotationY = 0
  let autoRotateSpeed = 0.09

  function setHovered(id) {
    hoveredId = id
  }

  function spawnPulse(position) {
    const mat = pulseBaseMat.clone()
    mat.opacity = 0.8
    const mesh = new THREE.Mesh(pulseGeo, mat)
    mesh.position.copy(position)
    rootGroup.add(mesh)
    pulses.push({ mesh, material: mat, t: 0 })
  }

  function spawnArcBetween(aMesh, bMesh) {
    const segments = 18
    const positions = new Float32Array(segments * 3)

    const start = aMesh.position
    const end = bMesh.position
    const dir = new THREE.Vector3().subVectors(end, start)

    const up = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const normal = new THREE.Vector3().crossVectors(dir, up).normalize()
    const amplitude = 0.14 + Math.random() * 0.06

    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1)
      const basePoint = new THREE.Vector3().lerpVectors(start, end, t)
      const wave = Math.sin(t * Math.PI) * amplitude
      const offset = normal.clone().multiplyScalar(wave * (0.7 + Math.random() * 0.3))
      const p = basePoint.add(offset)
      positions[i * 3 + 0] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.LineBasicMaterial({
      color: 0xeaff7a,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const line = new THREE.Line(geo, mat)
    rootGroup.add(line)
    arcs.push({ mesh: line, material: mat, life: 0 })
  }

  function spawnArcsFromNode(nodeId) {
    LINKS.forEach(([aId, bId]) => {
      if (aId === nodeId || bId === nodeId) {
        const a = nodes.find((n) => n.data.id === aId)
        const b = nodes.find((n) => n.data.id === bId)
        if (a && b) spawnArcBetween(a.mesh, b.mesh)
      }
    })
  }

  function setActive(id) {
    const exists = NODE_DATA.find((n) => n.id === id)
    if (!exists) return
    activeId = id
    updateCopy(id)

    const node = nodes.find((n) => n.data.id === id)
    if (node) {
      const p = node.mesh.position
      targetRotationY = Math.atan2(p.x, p.z)
      spawnPulse(node.mesh.position)
      spawnArcsFromNode(id)
    }

    if (['light', 'space', 'motion', 'thresholds'].includes(id)) {
      const btn = document.querySelector(`.xr-zone[data-zone="${id}"]`)
      if (btn) btn.click()
    }
  }

  window.xrConstellation = { highlightNode: setActive }
  updateCopy(activeId)

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect()
    const w = rect.width || 1
    const h = rect.height || 1
    mouse.x = ((event.clientX - rect.left) / w) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / h) * 2 + 1
  }

  function onClick() {
    if (!hoveredId) return
    setActive(hoveredId)
  }

  function onEnter() {
    isInside = true
  }
  function onLeave() {
    isInside = false
    setHovered(null)
    canvas.style.cursor = 'default'
  }

  canvas.addEventListener('pointermove', onPointerMove, { passive: true })
  canvas.addEventListener('click', onClick)
  canvas.addEventListener('pointerenter', onEnter, { passive: true })
  canvas.addEventListener('pointerleave', onLeave, { passive: true })

  // ----------------------------------------------------------
  //  RESIZE FIX (ResizeObserver)
  // ----------------------------------------------------------

  let lastW = 0
  let lastH = 0

  function resize(force = false) {
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width))
    const h = Math.max(1, Math.round(rect.height))
    if (!force && w === lastW && h === lastH) return
    lastW = w
    lastH = h

    renderer.setPixelRatio(getDPR())
    renderer.setSize(w, h, false)

    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  const ro = new ResizeObserver(() => resize())
  ro.observe(canvas)

  window.addEventListener('resize', () => resize(true), { passive: true })
  // 1) primera medida  2) una más por si el layout cambia justo después
  resize(true)
  requestAnimationFrame(() => resize(true))

  // ----------------------------------------------------------
  // LOOP
  // ----------------------------------------------------------

  let raf = 0

  function animate() {
    raf = requestAnimationFrame(animate)
    const elapsed = clock.getElapsedTime()

    // rotación auto + enfoque suave
    const currentY = rootGroup.rotation.y
    const targetY = targetRotationY + elapsed * autoRotateSpeed
    rootGroup.rotation.y = THREE.MathUtils.lerp(currentY, targetY, 0.08)

    // parallax de cámara con el ratón (solo si estamos dentro)
    const mx = isInside ? mouse.x : 0
    const my = isInside ? mouse.y : 0

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, baseCameraPos.x + mx * 0.6, 0.08)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, baseCameraPos.y + my * 0.4, 0.08)
    camera.lookAt(0, 0, 0)

    // raycast (solo si estás dentro)
    if (isInside) {
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(nodeMeshes)
      const hoveredMesh = intersects[0]?.object || null
      setHovered(hoveredMesh ? hoveredMesh.userData.id : null)
      canvas.style.cursor = hoveredId ? 'pointer' : 'grab'
    } else {
      setHovered(null)
    }

    // estado visual nodos + halos
    nodes.forEach((n, index) => {
      const mesh = n.mesh
      const halo = haloMeshes[index]
      const isActive = n.data.id === activeId
      const isHovered = n.data.id === hoveredId

      const baseScale = isActive ? 1.2 : 1.0
      const hoverBoost = isHovered ? 1.15 : 1.0
      const breathe = 1 + 0.06 * Math.sin(elapsed * 1.4 + index * 1.7 + (isActive ? 1 : 0))
      const s = baseScale * hoverBoost * breathe

      mesh.scale.setScalar(s)
      mesh.rotation.y += 0.004

      const haloBase = isActive ? 1.25 : isHovered ? 1.12 : 1.02
      const haloBreath = 0.98 + 0.03 * Math.sin(elapsed * 1.3 + index * 0.7)
      halo.scale.setScalar(haloBase * s * haloBreath)

      const targetEmissive = isActive ? 1.1 : isHovered ? 0.9 : 0.5
      mesh.material.emissiveIntensity = THREE.MathUtils.lerp(
        mesh.material.emissiveIntensity,
        targetEmissive,
        0.12
      )

      const targetOpacity = isActive ? 0.22 : isHovered ? 0.16 : 0.10
      halo.material.opacity = THREE.MathUtils.lerp(halo.material.opacity, targetOpacity, 0.12)
    })

    // Pulsos expansivos
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i]
      p.t += 0.02

      const s = 1 + p.t * 1.9
      p.mesh.scale.setScalar(s)
      p.mesh.lookAt(camera.position)

      const fade = Math.max(0, 0.55 - p.t * 0.9)

      if (p.t > 0.9 || fade <= 0) {
        rootGroup.remove(p.mesh)
        p.mesh.geometry.dispose()
        p.mesh.material.dispose()
        pulses.splice(i, 1)
      } else {
        p.material.opacity = fade
      }
    }

    // Arcos eléctricos (fade rápido)
    for (let i = arcs.length - 1; i >= 0; i--) {
      const arc = arcs[i]
      arc.life += 0.04
      const fade = Math.max(0, 1 - arc.life)
      arc.material.opacity = fade * 0.9

      if (arc.life >= 1) {
        rootGroup.remove(arc.mesh)
        arc.mesh.geometry.dispose()
        arc.material.dispose()
        arcs.splice(i, 1)
      }
    }

    renderer.render(scene, camera)
  }

  animate()

  // ----------------------------------------------------------
  // CLEANUP (por si desmontamos la sección)
  // ----------------------------------------------------------
  canvas.__xrConstellationCleanup = () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    window.removeEventListener('resize', () => resize(true))
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('click', onClick)
    canvas.removeEventListener('pointerenter', onEnter)
    canvas.removeEventListener('pointerleave', onLeave)

    // dispose mínimo seguro
    renderer.dispose()
  }
}
