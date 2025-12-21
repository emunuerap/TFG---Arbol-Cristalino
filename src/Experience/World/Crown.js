import * as THREE from 'three'
import Experience from '../Experience.js'
import gsap from 'gsap'

// SHADERS INLINE (Para no crear archivos extra)
const vertexShader = `
uniform float uTime;
uniform float uPixelRatio;
uniform float uMode; // 0: Flow, 1: Chaos, 2: Grid
attribute vec3 aRandom;
attribute float aSize;
varying float vAlpha;

void main() {
    vec3 p = position;
    
    // --- MODO 0: NARRATIVA (Espiral Suave) ---
    if (uMode < 0.5) {
        float angle = uTime * 0.2 + p.y * 0.5;
        p.x += cos(angle) * 0.5;
        p.z += sin(angle) * 0.5;
        p.y += sin(uTime * 0.5 + aRandom.x * 5.0) * 0.2;
    } 
    // --- MODO 1: INTERACCIÓN (Vibración Eléctrica) ---
    else if (uMode < 1.5) {
        p += aRandom * sin(uTime * 10.0) * 0.05; 
    } 
    // --- MODO 2: SISTEMA (Grid Digital) ---
    else {
        p.x = floor(p.x * 2.0) / 2.0; // Cuantizar posición
        p.z = floor(p.z * 2.0) / 2.0;
        p.y += sin(uTime * 0.5) * 0.1;
    }

    vec4 mvPosition = viewMatrix * modelMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Tamaño dinámico según profundidad
    gl_PointSize = (15.0 * aSize + 5.0) * uPixelRatio * (1.0 / -mvPosition.z);
    
    // Fade en bordes
    float dist = length(p.xz);
    vAlpha = smoothstep(7.0, 0.0, dist) * 0.6;
}
`

const fragmentShader = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    float glow = 1.0 - smoothstep(0.0, 0.5, r);
    if(glow < 0.01) discard;
    gl_FragColor = vec4(uColor, glow * vAlpha);
}
`

function hexToRgbTriplet(hex) {
    const h = hex.replace('#', '').trim()
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
    const n = parseInt(full, 16)
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    return `${r} ${g} ${b}`
  }
  
  function setCrownAccentCSS(hex) {
    document.body.style.setProperty('--crown-accent', hex)
    document.body.style.setProperty('--crown-accent-rgb', hexToRgbTriplet(hex))
  }
  

export default class Crown {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.time = this.experience.time
    
    this.group = new THREE.Group()
    this.group.visible = false
    this.scene.add(this.group)

    this.params = {
        color: new THREE.Color('#d0aaff'), // Lavanda base
        mode: 0 
    }

    this.createHalo()
  }

  createHalo() {
    const count = 2000 // Cantidad de partículas
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const randoms = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for(let i=0; i<count; i++) {
        const r = 4 + Math.random() * 5 // Radio del anillo
        const theta = Math.random() * Math.PI * 2
        const y = (Math.random() - 0.5) * 15 + 10 // Altura (Y=10 centro)

        pos[i*3] = r * Math.cos(theta)
        pos[i*3+1] = y
        pos[i*3+2] = r * Math.sin(theta)

        randoms[i*3] = Math.random() - 0.5
        randoms[i*3+1] = Math.random() - 0.5
        randoms[i*3+2] = Math.random() - 0.5
        
        sizes[i] = Math.random()
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

    this.material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: this.params.color },
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            uMode: { value: 0.0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    })

    this.halo = new THREE.Points(geo, this.material)
    this.group.add(this.halo)
  }

 // --- API PÚBLICA (Llamada desde script.js) ---
 setMood(pillarName) {
    // Compat: soporta nombres nuevos y antiguos
    const key = (pillarName || '').toLowerCase()
    const map = {
      // NUEVOS
      architecture: { color: '#d0aaff', mode: 0.0 }, // Lavanda - Flow
      data:         { color: '#aaffdd', mode: 2.0 }, // Menta  - Grid
      product:      { color: '#ffaaee', mode: 1.0 }, // Rosa   - Chaos
  
      // ANTIGUOS (compat)
      narrative:    { color: '#d0aaff', mode: 0.0 },
      system:       { color: '#aaffdd', mode: 2.0 },
      interaction:  { color: '#ffaaee', mode: 1.0 },
    }
  
    const target = map[key] || map.architecture
  
    //  Accent CSS para el HUD (esto era targetColor 
    setCrownAccentCSS(target.color)
  
    // Animación de Color (shader)
    const c = new THREE.Color(target.color)
    gsap.to(this.material.uniforms.uColor.value, {
      r: c.r, g: c.g, b: c.b,
      duration: 1.0,
    })
  
    // Animación de Modo (shader)
    gsap.to(this.material.uniforms.uMode, {
      value: target.mode,
      duration: 1.2,
      ease: 'power2.inOut',
    })
  }
  
  

  enter() {
    this.group.visible = true
    this.halo.scale.set(0,0,0)
    gsap.to(this.halo.scale, { x:1, y:1, z:1, duration: 3.0, ease: "elastic.out(1, 0.75)" })
  }

  exit() {
    gsap.to(this.halo.scale, { 
        x:0, y:0, z:0, duration: 1.5, ease: "power2.in", 
        onComplete: () => { this.group.visible = false } 
    })
  }

  update() {
    if(!this.group.visible) return
    const time = this.experience.time.elapsed * 0.001
    this.group.rotation.y = time * 0.05
    this.material.uniforms.uTime.value = time
  }
}