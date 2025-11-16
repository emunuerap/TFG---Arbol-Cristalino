// src/Experience/IntroTendrils.js
import * as THREE from 'three'
import gsap from 'gsap'
import Experience from './Experience.js'

// Import Shaders
import tendrilVertexShader from '../shaders/tendrilVertex.glsl?raw'
import tendrilFragmentShader from '../shaders/tendrilFragment.glsl?raw'

export default class IntroTendrils {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.camera = this.experience.camera.instance
        this.renderer = this.experience.renderer.instance
        this.mouse = this.experience.mouse
        this.time = this.experience.time
        this.sizes = this.experience.sizes
        this.introContainer = document.getElementById('intro-container')

        this.points = null
        this.geometry = null
        this.material = null

        this.isInteracting = false
        this.hasRevealed = false

        this.setupCamera()
        this.createTendrilParticles()
        this.addEventListeners()

        console.log("IntroTendrils Initialized.");
    }

    setupCamera() { /* (No changes) */ }

    createTendrilParticles() {
        // ... (particle creation code using shaders - no changes from previous tendril version)
        const particlesCount = 15000; const positions = new Float32Array(particlesCount * 3); const randomness = new Float32Array(particlesCount * 3); const scales = new Float32Array(particlesCount);
        for (let i = 0; i < particlesCount; i++) { /* ... particle attribute setup ... */ }
        this.geometry = new THREE.BufferGeometry(); /* ... set attributes ... */
        const particleTexture = this.experience.textureLoader ? this.experience.textureLoader.load('/textures/particle.png') : new THREE.TextureLoader().load('/textures/particle.png');
        this.material = new THREE.ShaderMaterial({
            depthWrite: false, blending: THREE.AdditiveBlending, transparent: true, vertexColors: false,
            uniforms: { uTime: { value: 0 }, uSize: { value: 25.0 }, uPixelRatio: { value: this.sizes.pixelRatio }, uTexture: { value: particleTexture }, uMouse: { value: new THREE.Vector2(0,0) }, uInteractionStrength: { value: 0.0 }, uOpacity: { value: 0.0 } /* Start invisible */ },
            vertexShader: tendrilVertexShader, fragmentShader: tendrilFragmentShader
        });
        this.points = new THREE.Points(this.geometry, this.material); this.scene.add(this.points);
        gsap.to(this.material.uniforms.uOpacity, { value: 0.7, duration: 3.0, delay: 0.5, ease: 'power1.out' });
        gsap.to(this.material.uniforms.uInteractionStrength, { value: 1.0, duration: 2.0, delay: 1.0 });
    }

    addEventListeners() { /* (No changes - uses mousedown/up/move) */ }
    handleMouseMove(event) { /* (No changes) */ }
    handleClick() { // Mousedown - Start interaction
        if (this.isInteracting || this.hasRevealed) return;
        this.isInteracting = true;
        window.removeEventListener('mousemove', this.boundMouseMoveHandler);
        console.log("Intro hold started (convergence).");

        // Placeholder for visual convergence - trigger reveal after short hold
        // A real implementation would animate a shader uniform here.
        gsap.delayedCall(1.0, () => {
             if (this.isInteracting && !this.hasRevealed) {
                 console.log("Hold confirmed, starting reveal.");
                 this.triggerReveal(); // Call the reveal sequence
             }
        });
    }
    handleMouseUp() { // Release early
         if (this.isInteracting && !this.hasRevealed) {
             console.log("Hold released early.");
             // Reverse convergence animation if implemented
             window.addEventListener('mousemove', this.boundMouseMoveHandler); // Re-enable mouse move
             this.isInteracting = false;
         }
     }

    triggerReveal() {
        if (this.hasRevealed) return;
        this.hasRevealed = true;
        console.log("Triggering reveal sequence...");

        // Remove listeners
        window.removeEventListener('mousedown', this.boundClickHandler);
        window.removeEventListener('mouseup', this.boundMouseUpHandler);
        // Mouse move listener already removed in handleClick

        // 1. Rapidly Fade Out Tendrils
        gsap.to(this.material.uniforms.uOpacity, {
            value: 0.0, duration: 0.8, ease: 'power2.out',
            onComplete: () => { this.disposeTendrils(); }
        });

        // 2. Fade Out HTML Container
        if (this.introContainer) { /* ... (fade out logic - no change) ... */ }

        // 3. Reveal Main Scene (calls initMainScene, starts camera etc.)
        this.revealMainScene();
    }

    disposeTendrils() { /* (No changes) */ }

    revealMainScene() {
        if (this.hasRevealed) return; // Should be redundant now, but safe
        this.hasRevealed = true; // Set flag definitively
        console.log('Revealing main scene in IntroTendrils...');

        // --- SELECT DOM ELEMENTS HERE --- (Copied from previous fix)
        const mainCanvas = document.querySelector('.experience-canvas');
        const uiContainer = document.querySelector('.ui-container');
        const customScrollbar = document.querySelector('.custom-scrollbar');
        if (!mainCanvas || !uiContainer || !customScrollbar) { console.error("Missing main scene elements!"); return; }
        // ------------------------------------

        // 1. Init World (creates tree, main particles etc.)
        this.experience.initMainScene(); // **CRITICAL**

        // 2. Start Fades/Transitions
        mainCanvas.classList.add('visible'); // Make canvas render target visible

        // Animate Tree and Main Particles into view using World's method
        if(this.experience.world && this.experience.world.animateIn) {
            this.experience.world.animateIn(); // **CRITICAL**
        } else {
             console.error("World or animateIn method not ready!");
        }

        // Camera Transition
        gsap.to(this.camera.position, {
            x: 0, y: 1.5, z: 12, // Stable main scene start position
            duration: 2.5,
            ease: 'cubic.inOut',
            delay: 0.3, // Delay slightly
             onStart: () => console.log("Main camera transition starting."),
            onComplete: () => {
                 console.log("Camera transition complete.");
                 document.body.style.height = '300vh';
                 document.body.style.overflowY = 'scroll';
                 console.log("Body height and scroll enabled.");
                 // Call scroll setup AFTER camera arrives
                 if (this.experience.camera.setupScrollAnimation) {
                     this.experience.camera.setupScrollAnimation();
                 } else { console.error("setupScrollAnimation missing!"); }
                 this.revealUI(uiContainer, customScrollbar); // Pass elements
            }
        });
        // Target Transition
        if (this.experience.camera.controls) {
             gsap.to(this.experience.camera.controls.target, {
                 x: 0, y: 2.0, z: 0, // Stable main scene target
                 duration: 2.5, delay: 0.3, ease: 'cubic.inOut'
             });
        }
    }

    // revealUI logic needs uiContainer and customScrollbar references
    revealUI(uiContainer, customScrollbar) { /* (No changes needed - uses args) */ }

    update(elapsedTime) {
         if (this.material && !this.hasRevealed) {
            this.material.uniforms.uTime.value = elapsedTime;
         }
    }

     resize() { /* (No changes needed) */ }
}