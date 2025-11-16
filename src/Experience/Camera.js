import * as THREE from 'three'
import Experience from './Experience.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default class Camera {
  constructor() {
    this.experience = new Experience()
    this.sizes = this.experience.sizes
    this.scene = this.experience.scene
    this.canvas = this.experience.canvas
    this.path = null
    this.lookAnchor = new THREE.Vector3(0, 3, 0)
    this.lookAnchorTarget = new THREE.Vector3().copy(this.lookAnchor)
    this.pointer = new THREE.Vector2(0, 0)
    this.t = 0

    this.transitionStartPos = new THREE.Vector3(0, 0, 5)
    this.transitionStartTarget = new THREE.Vector3(0, 0, 0)
    this.transitionEndPos = new THREE.Vector3()
    this.transitionEndTarget = new THREE.Vector3()

    this.setInstance()
    this.setOrbitControls()

    window.addEventListener('mousemove', (e) => {
      if (this.sizes?.width > 0 && this.sizes?.height > 0) {
        this.pointer.x = (e.clientX / this.sizes.width) * 2 - 1
        this.pointer.y = -(e.clientY / this.sizes.height) * 2 + 1
      }
    }, { passive: true })

    window.addEventListener('scroll', () => {
      if (this.experience.state === 'main') {
        this.t = this.computeT()
        this.experience.trigger('scroll-progress', [this.t])
      }
    }, { passive: true })
  }

  setInstance() {
    if (!this.sizes || !this.sizes.width || !this.sizes.height) return
    this.instance = new THREE.PerspectiveCamera(
      45,
      this.sizes.width / this.sizes.height,
      0.1,
      5000  // ¡¡FIJO!!
    )
    this.instance.position.copy(this.transitionStartPos)
    this.instance.lookAt(this.transitionStartTarget)
    this.scene.add(this.instance)
  }

  setOrbitControls() {
    if (!this.instance || !this.canvas) return
    this.controls = new OrbitControls(this.instance, this.canvas)
    this.controls.enableDamping = true
    this.controls.enabled = false
  }

  buildPathFromWorld(world) {
    if (!world || !world.getTreeBounds || !this.instance) {
      console.error('Camera: Cannot build path from world.')
      this.setDefaultPath()
      return
    }
    try {
      const { box, center, size } = world.getTreeBounds()
      const lookOffsetY = Math.max(size.y * 0.46, 1.5)
      this.lookAnchor.copy(center).add(new THREE.Vector3(0, lookOffsetY, 0))
      this.lookAnchorTarget.copy(this.lookAnchor)

      const sphere = box.getBoundingSphere(new THREE.Sphere())
      const radius = Math.max(sphere.radius, 1.0)
      const fovV = THREE.MathUtils.degToRad(this.instance.fov)
      const distV = radius / Math.max(Math.tan(fovV / 2), 1e-6)
      const fovH = 2 * Math.atan(Math.tan(fovV / 2) * this.instance.aspect)
      const distH = radius / Math.max(Math.tan(fovH / 2), 1e-6)
      const baseDist = Math.max(distV, distH) * 2.35

      const liftStart = Math.max(size.y * 0.35, 1.4)
      const liftMid1  = Math.max(size.y * 0.55, 1.8)
      const liftMid2  = Math.max(size.y * 0.75, 2.2)
      const liftEnd   = Math.max(size.y * 1.0, 2.6)

      const dirStart = new THREE.Vector3( 0.0, 0.2, 1.0).normalize()
      const dirMid1  = new THREE.Vector3(-0.7, 0.42, 0.6).normalize()
      const dirMid2  = new THREE.Vector3( 0.6, 0.55, 0.7).normalize()
      const dirEnd   = new THREE.Vector3( 0.0, 0.62, -0.5).normalize()

      const p1 = center.clone().addScaledVector(dirStart, baseDist * 1.1); p1.y = center.y + liftStart
      const p2 = center.clone().addScaledVector(dirMid1,  baseDist * 0.9); p2.y = center.y + liftMid1
      const p3 = center.clone().addScaledVector(dirMid2,  baseDist * 0.8); p3.y = center.y + liftMid2
      const p4 = center.clone().addScaledVector(dirEnd,   baseDist * 0.7); p4.y = center.y + liftEnd

      this.path = new THREE.CatmullRomCurve3([p1, p2, p3, p4], false, 'catmullrom', 0.12)

      this.instance.near = Math.max(0.1, baseDist * 0.012)
      this.instance.far = 2000
      this.instance.updateProjectionMatrix()

      this.transitionEndPos.copy(p1)
      this.transitionEndTarget.copy(this.lookAnchor)
    } catch (e) {
      console.error('Camera.buildPathFromWorld error:', e)
      this.setDefaultPath()
    }
  }

  setDefaultPath() {
    const dS = new THREE.Vector3(0, 3, 10)
    const dM = new THREE.Vector3(-5, 4, 8)
    const dE = new THREE.Vector3(0, 5, 6)
    this.lookAnchor.set(0, 3, 0)
    this.path = new THREE.CatmullRomCurve3([dS, dM, dE], false, 'catmullrom', 0.08)
    this.transitionEndPos.copy(dS)
    this.transitionEndTarget.copy(this.lookAnchor)
  }

  reframeFromWorld(world) {
    if (world?.getTreeBounds) this.buildPathFromWorld(world)
  }

  computeT() {
    const doc = document.documentElement
    const scrollable = Math.max(0, doc.scrollHeight - window.innerHeight)
    const raw = scrollable > 0 ? window.scrollY / scrollable : 0
    return THREE.MathUtils.clamp(raw, 0, 1)
  }

  updatePositionFromPath(immediate = false) {
    if (!this.path || !this.instance) return
    const currentT = THREE.MathUtils.clamp(this.t || 0, 0, 1)
    const targetPos = this.path.getPointAt(currentT)
    if (!targetPos) return
    if (immediate) {
      this.instance.position.copy(targetPos)
    } else {
      this.instance.position.lerp(targetPos, 0.085)
    }
    this.lookAnchorTarget.copy(this.lookAnchor).add(new THREE.Vector3(this.pointer.x * 0.6, this.pointer.y * 0.4, 0))
    this.instance.lookAt(this.lookAnchorTarget)
  }

  resize() {
    if (!this.instance || !this.sizes?.width || !this.sizes?.height) return
    this.instance.aspect = this.sizes.width / this.sizes.height
    this.instance.updateProjectionMatrix()
    this.reframeFromWorld(this.experience.world)
  }

  updateIntro() {
    if (!this.instance) return
    const lt = new THREE.Vector3(this.pointer.x * 0.3, this.pointer.y * 0.3, 0)
    const ct = new THREE.Vector3()
    const ldir = this.instance.getWorldDirection(new THREE.Vector3())
    ct.copy(this.instance.position).add(ldir.multiplyScalar(5))
    ct.lerp(lt, 0.08)
    this.instance.lookAt(ct)
    this.controls?.update()
  }

  updateTransition(t) {
    if (!this.instance) return
    const ct = THREE.MathUtils.clamp(t || 0, 0, 1)
    this.instance.position.lerpVectors(this.transitionStartPos, this.transitionEndPos, ct)
    const tt = new THREE.Vector3().lerpVectors(this.transitionStartTarget, this.transitionEndTarget, ct)
    this.instance.lookAt(tt)
    this.controls?.update()
  }

  updateMain(immediate = false) {
    if (this.experience.state === 'main') {
      this.t = this.computeT()
      this.experience.trigger('scroll-progress', [this.t])
    }
    this.updatePositionFromPath(immediate)
    this.controls?.update()
  }
}