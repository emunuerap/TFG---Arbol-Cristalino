import * as THREE from 'three';
import Experience from "../Experience.js"; // Adjust path if needed
import { EventEmitter } from "./EventEmitter.js";

export default class CustomCursor extends EventEmitter {
    constructor() {
        super();
        this.experience = new Experience();
        this.sizes = this.experience.sizes;
        this.scene = this.experience.scene;
        this.camera = this.experience.camera;
        this.canvas = this.experience.canvas;
        this.cursorElement = document.getElementById('custom-cursor');

        // Check if cursor element exists
        if (!this.cursorElement) {
            console.error("Custom cursor element '#custom-cursor' not found in HTML.");
            return;
        }

        this.pointer = { x: 0, y: 0 }; // Current smoothed position
        this.targetPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 }; // Target based on mouse event
        this.normalizedPointer = new THREE.Vector2(); // For raycasting (-1 to 1)
        this.lerpFactor = 0.15; // Cursor follow speed (adjust as needed)
        this.isVisible = false; // Track visibility

        this.raycaster = new THREE.Raycaster();

        this.setEventListeners();
        this.show(); // Show cursor initially
    }

    setEventListeners() {
        this.mouseMoveHandler = (e) => {
            this.targetPointer.x = e.clientX;
            this.targetPointer.y = e.clientY;

            // Update normalized pointer for raycasting
            this.normalizedPointer.x = (e.clientX / this.sizes.width) * 2 - 1;
            this.normalizedPointer.y = -(e.clientY / this.sizes.height) * 2 + 1;

            // If Experience's pointer is used by shaders, update it here too
            // Example: if (this.experience.world?.intro?.pointer) {
            //    this.experience.world.intro.pointer.copy(this.normalizedPointer);
            // }

             // Also update the pointer used by Camera for lookAt in Intro
             if (this.experience.camera?.pointer) {
                this.experience.camera.pointer.copy(this.normalizedPointer);
             }


            this.show(); // Ensure cursor is visible when mouse moves
        };

        this.mouseEnterHandler = () => {
            this.show();
        };

        this.mouseLeaveHandler = () => {
            this.hide();
            // Reset normalized pointer when mouse leaves?
             this.normalizedPointer.set(0, 0); // Or let it lerp towards center?
             if (this.experience.camera?.pointer) {
                this.experience.camera.pointer.set(0, 0);
             }
        };

        window.addEventListener('mousemove', this.mouseMoveHandler);
        // Use document body or a specific container if canvas doesn't cover full screen
        document.body.addEventListener('mouseenter', this.mouseEnterHandler);
        document.body.addEventListener('mouseleave', this.mouseLeaveHandler);
    }

    show() {
        if (!this.isVisible && this.cursorElement) {
            this.cursorElement.style.opacity = '1';
            this.isVisible = true;
        }
    }

    hide() {
        if (this.isVisible && this.cursorElement) {
            this.cursorElement.style.opacity = '0';
            this.isVisible = false;
        }
    }

    update() {
        if (!this.cursorElement || !this.experience.world || !this.experience.camera?.instance) return; // Guard clauses

        // Smoothly move the custom cursor element towards the target
        this.pointer.x += (this.targetPointer.x - this.pointer.x) * this.lerpFactor;
        this.pointer.y += (this.targetPointer.y - this.pointer.y) * this.lerpFactor;

        // Apply position update only if cursor is meant to be visible
        if (this.isVisible) {
            this.cursorElement.style.transform = `translate(${this.pointer.x}px, ${this.pointer.y}px) translate(-50%, -50%)`;
        }

        // --- Raycasting for Hover Interaction ---
        // Check only during the intro state
        if (this.experience.state === 'intro' && this.experience.world.intro?.textParticles) {
            this.raycaster.setFromCamera(this.normalizedPointer, this.experience.camera.instance);
            const intersects = this.raycaster.intersectObject(this.experience.world.intro.textParticles, false); // false = don't check children

            if (intersects.length > 0) {
                this.cursorElement.classList.add('hovered');
            } else {
                this.cursorElement.classList.remove('hovered');
            }
        } else {
             // Ensure hover state is removed when not in intro or textParticles don't exist
             this.cursorElement.classList.remove('hovered');
        }
    }

     resize() {
        // Recalculate center if needed, though targetPointer updates on mousemove
    }

    destroy() {
        window.removeEventListener('mousemove', this.mouseMoveHandler);
        document.body.removeEventListener('mouseenter', this.mouseEnterHandler);
        document.body.removeEventListener('mouseleave', this.mouseLeaveHandler);
        if (this.cursorElement && this.cursorElement.parentNode) {
            this.cursorElement.parentNode.removeChild(this.cursorElement);
        }
        console.log("CustomCursor destroyed");
    }
}
