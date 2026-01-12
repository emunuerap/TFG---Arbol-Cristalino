import * as THREE from 'three'
import Experience from './Experience.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import strandVertex from '../shaders/introStrandVertex.glsl?raw'
import strandFragment from '../shaders/introStrandFragment.glsl?raw'
import textParticlesVertex from '../shaders/introTextParticlesVertex.glsl?raw'
import textParticlesFragment from '../shaders/introTextParticlesFragment.glsl?raw'

export default class Intro {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.time = this.experience.time
    this.sizes = this.experience.sizes
    this.pointer = new THREE.Vector2(0, 0) // Needed for hover

    this.isMouseDown = false
    this.vortexCharge = 0.0
    this.transitionStarted = false
    this.fading = false
    this.assetsLoaded = false
    this.textRevealProgress = 0.0

    this.strands = null;
    this.strandsMaterial = null;
    this.textParticles = null;
    this.textParticlesMaterial = null;

    this.setMouseListeners()
    this.loadAssets()
  }

  setMouseListeners() {
    window.addEventListener('mousemove', (e) => {
        this.pointer.x = (e.clientX / this.sizes.width) * 2 - 1
        this.pointer.y = -(e.clientY / this.sizes.height) * 2 + 1
    }, { passive: true });
    window.addEventListener('mousedown', () => {
        if (this.transitionStarted || !this.assetsLoaded) return;
        this.isMouseDown = true;
    });
    window.addEventListener('mouseup', () => {
        if (this.transitionStarted || !this.assetsLoaded) return;
        this.isMouseDown = false;
    });
  }

  loadAssets() {
    const gltfLoader = new GLTFLoader()
    const modelPath = '/models/press_to_enter_mesh.glb' // Use the extruded/subdivided mesh

    gltfLoader.load(modelPath, (gltf) => {
        let textMesh = null;
        gltf.scene.traverse((child) => { if (child.isMesh && textMesh === null) { textMesh = child; } });
        if (!textMesh || !textMesh.geometry || !textMesh.geometry.attributes.position) { console.error("No suitable mesh geometry found."); return; }
        const pointsGeometry = textMesh.geometry;
        console.log("Attributes found:", Object.keys(pointsGeometry.attributes));

        pointsGeometry.computeBoundingBox();
        const box = pointsGeometry.boundingBox; const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3());
        pointsGeometry.translate(-center.x, -center.y, -center.z);
        const targetWidth = 2.8; const scaleFactor = targetWidth / size.x;
        pointsGeometry.scale(scaleFactor, scaleFactor, scaleFactor);
        pointsGeometry.rotateX(Math.PI / 2);

        this.createTextParticles(pointsGeometry);
        this.createDigitalStrands();
        this.assetsLoaded = true;
    },
    undefined,
    (err) => { console.error('Error loading GLB model:', err); })
  }

  createDigitalStrands() {
    const strandCount = 50; const pointsPerStrand = 150; const geometry = new THREE.BufferGeometry(); const positions = new Float32Array(strandCount * pointsPerStrand * 3); const aProgress = new Float32Array(strandCount * pointsPerStrand); const aRandom = new Float32Array(strandCount * pointsPerStrand * 3);
    for (let i = 0; i < strandCount; i++) { const i_base = i * pointsPerStrand; const randomVec1 = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8); const randomVec2 = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8); const randomData = new THREE.Vector3(Math.random() * 2.0, Math.random() * 5.0, Math.random() * 0.5 + 0.5); const curve = new THREE.QuadraticBezierCurve3(randomVec1.multiplyScalar(Math.random()), new THREE.Vector3(0, 0, 0), randomVec2.multiplyScalar(Math.random())); const points = curve.getPoints(pointsPerStrand - 1);
        for (let j = 0; j < pointsPerStrand; j++) { const i_global = (i_base + j) * 3; const p = points[j] || points[points.length-1]; positions[i_global + 0] = p.x; positions[i_global + 1] = p.y; positions[i_global + 2] = p.z; aProgress[i_base + j] = j / (pointsPerStrand - 1); aRandom[i_global + 0] = randomData.x; aRandom[i_global + 1] = randomData.y; aRandom[i_global + 2] = randomData.z; } }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('aProgress', new THREE.BufferAttribute(aProgress, 1)); geometry.setAttribute('aRandom', new THREE.BufferAttribute(aRandom, 3));
    this.strandsMaterial = new THREE.ShaderMaterial({ vertexShader: strandVertex, fragmentShader: strandFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0, 0) }, uFade: { value: 1.0 }, uVortex: { value: 0.0 } } });
    this.strands = new THREE.Points(geometry, this.strandsMaterial);
    this.strands.position.z = -0.5; // Position behind text
    this.scene.add(this.strands);
   }

  createTextParticles(meshGeometry) {
    const particleCount = meshGeometry.attributes.position.count;
    console.log(`[Intro.js] Creating text particles from mesh: ${particleCount}`);

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(meshGeometry.attributes.position.array.slice(), 3));

    if (!particlesGeo.attributes.aRandom) { const aRandom = new Float32Array(particleCount * 3); for (let i = 0; i < particleCount; i++) { aRandom[i * 3 + 0] = Math.random(); aRandom[i * 3 + 1] = Math.random(); aRandom[i * 3 + 2] = Math.random(); } particlesGeo.setAttribute('aRandom', new THREE.BufferAttribute(aRandom, 3)); }
    if (!particlesGeo.attributes.aOffset) { const aOffset = new Float32Array(particleCount * 3); const offsetStrength = 5.0; for (let i = 0; i < particleCount; i++) { aOffset[i * 3 + 0] = (Math.random() - 0.5) * offsetStrength; aOffset[i * 3 + 1] = (Math.random() - 0.5) * offsetStrength; aOffset[i * 3 + 2] = (Math.random() - 0.5) * offsetStrength; } particlesGeo.setAttribute('aOffset', new THREE.BufferAttribute(aOffset, 3)); }

    this.textParticlesMaterial = new THREE.ShaderMaterial({
        vertexShader: textParticlesVertex, // Use Quantum Entanglement vertex shader (CORRECTED version)
        fragmentShader: textParticlesFragment, // Use Quantum Entanglement fragment shader (CORRECTED version)
        transparent: true,
        depthWrite: false, // Essential for Additive Blending glow
        blending: THREE.AdditiveBlending, // Use Additive for bright energy arcs
        uniforms: {
            uTime: { value: 0 },
            uFade: { value: 1.0 },
            uVortex: { value: 0.0 },
            uTextRevealProgress: { value: 0.0 },
            uCameraPosition: { value: this.experience.camera.instance.position },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uResolution: { value: new THREE.Vector2(this.sizes.width * this.sizes.pixelRatio, this.sizes.height * this.sizes.pixelRatio) }
        }
     });
    this.textParticles = new THREE.Points(particlesGeo, this.textParticlesMaterial);
    this.scene.add(this.textParticles);
   }

  fadeOut() { this.fading = true; }

  resize() {
    // Update resolution for text shader
    if (this.textParticlesMaterial) {
        this.textParticlesMaterial.uniforms.uResolution.value.set(
            this.sizes.width * this.sizes.pixelRatio,
            this.sizes.height * this.sizes.pixelRatio
        );
    }
     // Update pixelRatio for strand shader if it uses it (check strandVertex.glsl)
     if (this.strandsMaterial && this.strandsMaterial.uniforms.uPixelRatio) {
         this.strandsMaterial.uniforms.uPixelRatio.value = this.sizes.pixelRatio;
     }
  }

  update() {
    if (!this.assetsLoaded && !this.fading) return;
    const time = this.time.elapsed;

    // Update Strands
    if (this.strandsMaterial) {
        this.strandsMaterial.uniforms.uTime.value = time;
        this.strandsMaterial.uniforms.uMouse.value.lerp(this.pointer, 0.05); // Pass mouse pos
        this.strandsMaterial.uniforms.uVortex.value = this.vortexCharge;
    }

    // Update Text Particles
    if (this.textParticlesMaterial) {
        this.textParticlesMaterial.uniforms.uTime.value = time;
        this.textParticlesMaterial.uniforms.uCameraPosition.value.copy(this.experience.camera.instance.position);
        this.textParticlesMaterial.uniforms.uMouse.value.lerp(this.pointer, 0.05); // Pass mouse pos
        this.textParticlesMaterial.uniforms.uVortex.value = this.vortexCharge;

        // --- SLOWER TEXT REVEAL ---
        if (!this.transitionStarted) {
            // Reduced lerp factor from 0.015 to make convergence slower/smoother
            this.textRevealProgress = THREE.MathUtils.lerp(this.textRevealProgress, 1.0, 0.008);
            this.textParticlesMaterial.uniforms.uTextRevealProgress.value = this.textRevealProgress;
        } else {
            this.textParticlesMaterial.uniforms.uTextRevealProgress.value = 1.0;
        }
        // -------------------------
    }

    // Update Vortex Charge
    if (this.isMouseDown) { this.vortexCharge = THREE.MathUtils.lerp(this.vortexCharge, 1.0, 0.05); }
    else { this.vortexCharge = THREE.MathUtils.lerp(this.vortexCharge, 0.0, 0.05); }

    // Trigger Transition
    if (this.vortexCharge > 0.95 && !this.transitionStarted) {
        this.transitionStarted = true;
        this.experience.trigger('start-transition');
        this.fadeOut();
    }

    // Handle Fading Out and Cleanup
    if (this.fading) {
        let strandsFaded = !this.strandsMaterial; let textFaded = !this.textParticlesMaterial;
        if (this.strandsMaterial) { this.strandsMaterial.uniforms.uFade.value = THREE.MathUtils.lerp(this.strandsMaterial.uniforms.uFade.value, 0.0, 0.05); if (this.strands && this.strandsMaterial.uniforms.uFade.value < 0.01) { this.scene.remove(this.strands); this.strands.geometry.dispose(); this.strands = null; strandsFaded = true; } } else { strandsFaded = true; }
        if (this.textParticlesMaterial) { this.textParticlesMaterial.uniforms.uFade.value = THREE.MathUtils.lerp(this.textParticlesMaterial.uniforms.uFade.value, 0.0, 0.08); if (this.textParticles && this.textParticlesMaterial.uniforms.uFade.value < 0.01) { this.scene.remove(this.textParticles); this.textParticles.geometry.dispose(); this.textParticles = null; textFaded = true; } } else { textFaded = true; }
        if (strandsFaded && textFaded) { if(this.strandsMaterial) { this.strandsMaterial.dispose(); this.strandsMaterial = null; } if(this.textParticlesMaterial) { this.textParticlesMaterial.dispose(); this.textParticlesMaterial = null; } this.fading = false; console.log("Intro fade out complete."); }
     }
  }
}
