import * as THREE from 'three'

export function initDataSystems(canvas) {
  if (!canvas) return null

  // --- 1. DOM & UI REFS ---
  const dsRoot = canvas.closest('[data-ds]')
  const chips = dsRoot ? Array.from(dsRoot.querySelectorAll('.ds-chip')) : []
  const microLabel = dsRoot ? dsRoot.querySelector('#ds-micro-label') : null
  const microDesc = dsRoot ? dsRoot.querySelector('#ds-micro-desc') : null
  
  // Referencias a las zonas para interactividad visual (hover)
  const zones = dsRoot ? Array.from(dsRoot.querySelectorAll('.ds-zone')) : []

  // --- 2. COPY & CONFIG ---
  const COPY = {
    raw: {
      label: 'SYSTEM STATE: RAW',
      desc: 'Flujo de datos no estructurado. Alta entropía, ruido de señal y latencia variable.',
      tech: ['Apache Kafka', 'Raw Logs', 'IoT Streams', 'NoSQL']
    },
    filter: {
      label: 'SYSTEM STATE: FILTER',
      desc: 'Normalización en curso. ETL pipelines, validación de esquemas y detección de anomalías.',
      tech: ['Apache Spark', 'dbt', 'Python Pandas', 'Airflow']
    },
    flow: {
      label: 'SYSTEM STATE: FLOW',
      desc: 'Pipeline optimizado. Inferencia en tiempo real, latencia mínima y entrega de valor.',
      tech: ['Redis', 'FastAPI', 'React Real-time', 'TensorFlow Serving']
    },
    input: { label: 'MODULE: INGEST', desc: 'Buffers de entrada y limitadores de velocidad.' },
    processing: { label: 'MODULE: CORE', desc: 'Motores de transformación y agregación.' },
    output: { label: 'MODULE: SERVE', desc: 'APIs de consumo y visualización.' }
  }

  // --- VARIABLES DE CONTROL GLOBAL PARA LA TERMINAL ---
  // Necesitamos acceder a estas funciones desde setState y enter/exit
  let termPrint = null 
  let termReset = null

  function setMicro(key) {
    const item = COPY[key]
    if (!item) return
    if (microLabel) {
      microLabel.style.opacity = 0.5
      microLabel.textContent = item.label
      setTimeout(() => microLabel.style.opacity = 1, 50)
    }
    if (microDesc) microDesc.textContent = item.desc
  }

  // --- 4. STATE LOGIC ---
  const STATE_TO_PROGRESS = { raw: 0.0, filter: 0.5, flow: 1.0 }
  let state = 'raw'
  let targetProgress = 0
  let progress = 0
  
  const mouse = new THREE.Vector2(0, 0)
  let intensityTarget = 0
  let intensity = 0
  let focusX = 0
  let focusAmt = 0
  
  // Mapeo de zona a posición X en el shader
  const zoneToFocus = { input: -1.0, processing: 0.0, output: 1.0 }

  function setMouseNorm(x, y) {
    mouse.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1))
  }

  function setIntensity(v) {
    intensityTarget = THREE.MathUtils.clamp(v, 0, 1)
  }

  function setFocus(keyOrNull) {
    if (!keyOrNull) {
      focusAmt = 0
      return
    }
    focusX = zoneToFocus[keyOrNull] ?? 0
    focusAmt = 1
    if (COPY[keyOrNull]) setMicro(keyOrNull)
  }

  function setState(next) {
    // Evitar loop infinito si ya estamos en ese estado (opcional, pero buena práctica)
    // if (state === next) return 

    state = next
    targetProgress = STATE_TO_PROGRESS[state] ?? 0
    
    // Actualizar botones visuales
    chips.forEach(c => c.classList.toggle('is-active', c.dataset.dsState === state))
    
    // Actualizar textos header
    setMicro(state)

    // --- CONEXIÓN CON TERMINAL ---
    // Si la terminal está lista, imprimimos el cambio de estado y las tecnologías
    if (termPrint && COPY[state]) {
      const info = COPY[state]
      
      // Mensaje de sistema
      termPrint(`>> MODE SWITCH: ${next.toUpperCase()}`, 'warn')
      
      // Renderizar tags de tecnología como HTML dentro de la terminal
      if (info.tech && info.tech.length > 0) {
        // Creamos un string HTML con los spans
        const tagsHTML = info.tech.map(t => `<span class="ds-term-tag-inline">${t}</span>`).join('')
        termPrint(`Active Stack: ${tagsHTML}`, 'info')
      }
    }
  }

  // --- 5. THREE JS SETUP ---
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0) 

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x000000, 0.02)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
  const baseCam = new THREE.Vector3(0, 0.5, 7.5)
  camera.position.copy(baseCam)

  const ambient = new THREE.AmbientLight(0xffffff, 0.1)
  const keyLight = new THREE.DirectionalLight(0xaaccff, 2.0)
  keyLight.position.set(5, 5, 5)
  const rimLight = new THREE.DirectionalLight(0xff4400, 1.5)
  rimLight.position.set(-5, 0, -5)
  scene.add(ambient, keyLight, rimLight)

  const root = new THREE.Group()
  scene.add(root)

  // --- 6. SCENE OBJECTS ---
  const frameGeo = new THREE.BoxGeometry(5.2, 2.8, 2.0)
  const edges = new THREE.EdgesGeometry(frameGeo)
  const frameMat = new THREE.LineBasicMaterial({ color: 0x445566, transparent: true, opacity: 0.3 })
  const frameLines = new THREE.LineSegments(edges, frameMat)
  root.add(frameLines)

  const glassGeo = new THREE.BoxGeometry(5.0, 2.6, 1.8)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.95,
    thickness: 0.1,
    transparent: true,
    opacity: 0.03,
    depthWrite: false, 
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending
  })
  const glassBox = new THREE.Mesh(glassGeo, glassMat)
  root.add(glassBox)

  const gridHelper = new THREE.GridHelper(20, 40, 0x223344, 0x111111)
  gridHelper.position.y = -1.5
  gridHelper.material.transparent = true
  gridHelper.material.opacity = 0.15
  root.add(gridHelper)

  const nodePos = [
    new THREE.Vector3(-2.0, 0, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(2.0, 0, 0)
  ]
  const nodes = []
  const nodeGeo = new THREE.IcosahedronGeometry(0.28, 2)
  const nodeMat = new THREE.MeshBasicMaterial({ 
    color: 0x44aaff, 
    wireframe: true, 
    transparent: true, 
    opacity: 0.4, 
    blending: THREE.AdditiveBlending 
  })
  const coreMat = new THREE.MeshBasicMaterial({ 
    color: 0xffffff, 
    transparent: true, 
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  })
  const coreGeo = new THREE.IcosahedronGeometry(0.12, 1)

  nodePos.forEach(pos => {
    const mesh = new THREE.Mesh(nodeGeo, nodeMat.clone())
    mesh.position.copy(pos)
    root.add(mesh)
    nodes.push(mesh)
    const core = new THREE.Mesh(coreGeo, coreMat.clone())
    mesh.add(core)
  })

  // Partículas
  const COUNT = 2000
  const posArr = new Float32Array(COUNT * 3)
  const dataArr = new Float32Array(COUNT * 3)

  for(let i=0; i<COUNT; i++){
    posArr[i*3] = (Math.random()-0.5)*5
    posArr[i*3+1] = (Math.random()-0.5)*2
    posArr[i*3+2] = (Math.random()-0.5)*2
    dataArr[i*3] = Math.random()
    dataArr[i*3+1] = Math.floor(Math.random()*3)
    dataArr[i*3+2] = 0.5 + Math.random()*0.8
  }

  const pGeo = new THREE.BufferGeometry()
  pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
  pGeo.setAttribute('aData', new THREE.BufferAttribute(dataArr, 3))

  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uProg: { value: 0 },
      uIntensity: { value: 0 },
      uFocusX: { value: 0 },
      uFocusAmt: { value: 0 },
      uNodeInput: { value: nodePos[0] },
      uNodeProcess: { value: nodePos[1] },
      uNodeOutput: { value: nodePos[2] }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uProg;
      uniform float uIntensity;
      uniform float uFocusX;
      uniform float uFocusAmt;
      uniform vec3 uNodeInput;
      uniform vec3 uNodeProcess;
      uniform vec3 uNodeOutput;
      attribute vec3 aData;
      varying float vAlpha;
      varying vec3 vColor;

      vec3 getTheme(float t) {
        vec3 cRaw = vec3(1.0, 0.25, 0.05); 
        vec3 cFilter = vec3(0.5, 0.2, 1.0); 
        vec3 cFlow = vec3(0.0, 1.0, 0.6); 
        if(t < 0.5) return mix(cRaw, cFilter, t*2.0);
        return mix(cFilter, cFlow, (t-0.5)*2.0);
      }
      float hash(float n) { return fract(sin(n)*43758.5453); }
      
      vec3 bezier(vec3 a, vec3 b, vec3 c, vec3 d, float t) {
        float u = 1.0 - t;
        return u*u*u*a + 3.0*u*u*t*b + 3.0*u*t*t*c + t*t*t*d;
      }

      void main() {
        float seed = aData.x;
        float lane = aData.y;
        float speed = aData.z;
        float t = uTime * (speed * 0.6 + uIntensity * 0.2);

        // RAW
        vec3 pRaw = position;
        pRaw.x += sin(t*1.5 + seed*10.0) * (0.1 + uIntensity*0.1); 
        pRaw.y += cos(t*1.2 + seed*8.0) * (0.1 + uIntensity*0.1);
        pRaw.z += sin(t*1.0 + seed*15.0) * (0.1 + uIntensity*0.1);

        // FLOW
        vec3 start = (lane<0.5) ? uNodeInput : (lane<1.5 ? uNodeProcess : uNodeInput);
        vec3 end = (lane<0.5) ? uNodeProcess : (lane<1.5 ? uNodeOutput : uNodeOutput);
        vec3 c1 = mix(start, end, 0.33); c1.y += (hash(seed)-0.5)*2.0;
        vec3 c2 = mix(start, end, 0.66); c2.y += (hash(seed*2.0)-0.5)*2.0;
        float cycle = fract(t * 0.4 + seed); 
        vec3 pFlow = bezier(start, c1, c2, end, cycle);
        float jit = (1.0 - uProg) * 0.2;
        pFlow += vec3((hash(seed)-0.5)*jit, (hash(seed*2.0)-0.5)*jit, (hash(seed*3.0)-0.5)*jit);

        vec3 finalPos = mix(pRaw, pFlow, smoothstep(0.0, 0.7, uProg));
        
        float dFocus = abs(finalPos.x/2.0 - uFocusX);
        float isFocus = 1.0 - smoothstep(0.0, 0.8, dFocus);
        isFocus *= uFocusAmt;

        vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
        
        float sizeBase = 60.0;
        float energy = 1.0 + uIntensity * 0.5; 
        
        gl_PointSize = sizeBase * energy * (1.0 + isFocus * 0.6) / -mvPosition.z;

        vColor = getTheme(uProg);
        vColor = mix(vColor, vec3(1.0), 0.1 + uIntensity * 0.3); 
        
        vAlpha = 0.7 + uIntensity * 0.1 + isFocus * 0.2;
        
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if(d > 0.5) discard;
        float g = 1.0 - d*2.0;
        g = pow(g, 1.5);
        gl_FragColor = vec4(vColor, vAlpha * g);
      }
    `
  })
  root.add(new THREE.Points(pGeo, pMat))

  // --- 7. POST-PROCESSING ---
  const rtScene = new THREE.WebGLRenderTarget(1, 1)
  const rtA = new THREE.WebGLRenderTarget(1, 1)
  const rtB = new THREE.WebGLRenderTarget(1, 1)
  
  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2), new THREE.MeshBasicMaterial())
  const postScene = new THREE.Scene()
  postScene.add(quad)

  const blurMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new THREE.Vector2(1,1) },
      uDir: { value: new THREE.Vector2(0,0) }
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 uRes;
      uniform vec2 uDir;
      varying vec2 vUv;
      void main() {
        vec4 color = vec4(0.0);
        vec2 off = uDir / uRes; 
        color += texture2D(tDiffuse, vUv - 4.0*off) * 0.016;
        color += texture2D(tDiffuse, vUv - 3.0*off) * 0.059;
        color += texture2D(tDiffuse, vUv - 2.0*off) * 0.121;
        color += texture2D(tDiffuse, vUv - 1.0*off) * 0.194;
        color += texture2D(tDiffuse, vUv)           * 0.227;
        color += texture2D(tDiffuse, vUv + 1.0*off) * 0.194;
        color += texture2D(tDiffuse, vUv + 2.0*off) * 0.121;
        color += texture2D(tDiffuse, vUv + 3.0*off) * 0.059;
        color += texture2D(tDiffuse, vUv + 4.0*off) * 0.016;
        gl_FragColor = color;
      }
    `
  })

  const compMat = new THREE.ShaderMaterial({
    uniforms: {
      tBase: { value: null },
      tBloom: { value: null },
      uBloomStrength: { value: 1.5 }
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `
      uniform sampler2D tBase;
      uniform sampler2D tBloom;
      uniform float uBloomStrength;
      varying vec2 vUv;
      void main() {
        vec4 base = texture2D(tBase, vUv);
        vec3 bloom = texture2D(tBloom, vUv).rgb;
        gl_FragColor = vec4(base.rgb + bloom * uBloomStrength, base.a);
      }
    `,
    transparent: true
  })

  // --- 8. RESIZE LOGIC ---
  function resize() {
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, rect.width)
    const h = Math.max(1, rect.height)
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    
    camera.aspect = w / h
    camera.updateProjectionMatrix()

    const rw = w * dpr
    const rh = h * dpr
    rtScene.setSize(rw, rh)
    rtA.setSize(rw, rh)
    rtB.setSize(rw, rh)
    
    if (blurMat.uniforms.uRes) {
        blurMat.uniforms.uRes.value.set(rw, rh)
    }
  }

  // --- 9. OBSERVER & LOOP ---
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)

  const clock = new THREE.Clock()
  let running = false
  let raf = 0

  function tick() {
    if(!running) return
    raf = requestAnimationFrame(tick)

    const t = clock.getElapsedTime()

    // Lógica
    progress = THREE.MathUtils.lerp(progress, targetProgress, 0.05)
    
    let targetI = intensityTarget + 0.15;
    intensity = THREE.MathUtils.lerp(intensity, targetI, 0.1)
    intensityTarget *= 0.95 

    // Cámara
    const tx = baseCam.x + mouse.x * 1.5
    const ty = baseCam.y + mouse.y * 0.5
    camera.position.x += (tx - camera.position.x) * 0.05
    camera.position.y += (ty - camera.position.y) * 0.05
    camera.lookAt(0, 0, 0)

    // Animación Objetos
    nodes.forEach((n, i) => {
      n.rotation.y = t * 0.5 + i;
      n.rotation.z = t * 0.2;
      const pulse = 1.0 + Math.sin(t*3.0 + i)*0.05 + intensity*0.1;
      n.scale.setScalar(pulse);
      n.children[0].material.opacity = 0.3 + intensity*0.4;
    })
    
    gridHelper.position.z = (t * 0.5) % 2; 

    // Uniforms
    pMat.uniforms.uTime.value = t
    pMat.uniforms.uProg.value = progress
    pMat.uniforms.uIntensity.value = intensity
    pMat.uniforms.uFocusX.value = focusX
    pMat.uniforms.uFocusAmt.value = THREE.MathUtils.lerp(pMat.uniforms.uFocusAmt.value, focusAmt, 0.1)

    // Render Pipeline
    renderer.setRenderTarget(rtScene)
    renderer.clear()
    renderer.render(scene, camera)

    // Blur X
    quad.material = blurMat
    blurMat.uniforms.tDiffuse.value = rtScene.texture
    blurMat.uniforms.uDir.value.set(1.5, 0) 
    renderer.setRenderTarget(rtA)
    renderer.clear()
    renderer.render(postScene, orthoCam)

    // Blur Y
    blurMat.uniforms.tDiffuse.value = rtA.texture
    blurMat.uniforms.uDir.value.set(0, 1.5)
    renderer.setRenderTarget(rtB)
    renderer.clear()
    renderer.render(postScene, orthoCam)

    // Composite
    renderer.setRenderTarget(null)
    renderer.clear()
    quad.material = compMat
    compMat.uniforms.tBase.value = rtScene.texture
    compMat.uniforms.tBloom.value = rtB.texture
    compMat.uniforms.uBloomStrength.value = 1.2 + intensity * 1.0; 
    renderer.render(postScene, orthoCam)
  }

  // --- 10. INIT UI & LABELS ---
  resize()
  setState('raw')
  
  // Asignar etiquetas para CSS
  zones.forEach(z => {
    const key = z.dataset.dsZone;
    if(key === 'input') z.setAttribute('data-label', 'Input Source');
    if(key === 'processing') z.setAttribute('data-label', 'Processing');
    if(key === 'output') z.setAttribute('data-label', 'Output');
  });

  // --- 11. TERMINAL INTERACTIVA MEJORADA ---
  // ... (Inicio del archivo igual) ...

  // --- 11. INTERACTIVE TERMINAL LOGIC (IMPROVED) ---
  function initTerminal() {
    const termInput = document.getElementById('ds-term-input')
    const termOutput = document.getElementById('ds-term-output')
    const terminalDiv = document.getElementById('ds-interactive-terminal')
    
    if (!termInput || !termOutput) return

    terminalDiv.addEventListener('click', () => termInput.focus())

    const printLine = (text, type = 'info') => {
      const line = document.createElement('div')
      line.className = 'ds-term-line'
      
      let colorClass = ''
      if (type === 'success') colorClass = 'ds-response-success'
      if (type === 'error') colorClass = 'ds-response-error'
      if (type === 'warn') colorClass = 'ds-response-warn'
      if (type === 'link') colorClass = 'ds-response-link'
      
      if (Array.isArray(text)) {
        text.forEach(t => {
          const item = document.createElement('div')
          item.innerHTML = t // Usamos innerHTML para permitir tags dentro del array
          item.style.paddingLeft = '14px' // Más indentación para listas
          item.style.marginBottom = '2px'
          if(colorClass) item.classList.add(colorClass)
          else item.style.opacity = '0.85'
          termOutput.appendChild(item)
        })
      } else {
        const span = document.createElement('span')
        span.innerHTML = text
        if (colorClass) span.classList.add(colorClass)
        else span.style.opacity = '0.9'
        line.appendChild(span)
        termOutput.appendChild(line)
      }
      terminalDiv.scrollTop = terminalDiv.scrollHeight
    }

    termPrint = printLine

    // RESET MEJORADO: Más técnico y rápido
    termReset = () => {
      termOutput.innerHTML = ''
      printLine('<span style="color:#50ffb0">root@node-01:~$</span> ./init_sequence.sh', 'info')
      setTimeout(() => printLine('Loading kernel modules... [OK]', 'info'), 100)
      setTimeout(() => printLine('Mounting file systems... [OK]', 'info'), 250)
      setTimeout(() => {
        printLine('System ready. Type <span style="color:#fff; font-weight:bold">help</span> to view commands.', 'success')
      }, 450)
    }

    const processCommand = (cmd) => {
      const clean = cmd.trim().toLowerCase()
      
      // Imprimir comando del usuario
      const userLine = document.createElement('div')
      userLine.className = 'ds-term-line'
      userLine.innerHTML = `<span class="ds-term-prompt">➜</span> <span style="color:#fff">${cmd}</span>`
      termOutput.appendChild(userLine)

      switch (clean) {
        case 'help':
          printLine([
            'AVAILABLE COMMANDS:',
            '<span style="color:#50ffb0">whoami</span>   - Identify current user session',
            '<span style="color:#50ffb0">stack</span>    - List active technology stack',
            '<span style="color:#50ffb0">contact</span>  - Decrypt contact information',
            '<span style="color:#50ffb0">location</span> - Geolocate server origin',
            '<span style="color:#50ffb0">run</span>      - Execute optimization sequence',
            '<span style="color:#50ffb0">clear</span>    - Flush terminal buffer'
          ], 'info')
          break
        
        case 'stack':
          printLine('Scanning runtime environment...', 'warn')
          setTimeout(() => {
             // Usamos la clase CSS nueva para tags bonitos
             const tags = [
               '<span class="ds-term-tag-inline">Python 3.11</span>',
               '<span class="ds-term-tag-inline">Pandas</span>',
               '<span class="ds-term-tag-inline">Three.js</span>',
               '<span class="ds-term-tag-inline">WebGL 2.0</span>',
               '<span class="ds-term-tag-inline">Docker</span>',
               '<span class="ds-term-tag-inline">AWS Lambda</span>'
             ].join('')
             printLine(tags, 'info')
          }, 400)
          break

        case 'contact':
          printLine('Decrypting secure channel...', 'warn')
          setTimeout(() => {
            printLine('Identity: Eduardo Porlan', 'success')
            printLine('<a href="mailto:tuemail@ejemplo.com" target="_blank">✉️ Send Email Protocol</a>', 'link')
            printLine('<a href="https://linkedin.com/in/tu-perfil" target="_blank">🔗 LinkedIn Uplink</a>', 'link')
          }, 500)
          break
          
        case 'whoami':
          printLine('User: Guest Observer', 'info')
          printLine('Permissions: Read-Only', 'warn')
          break

        case 'location':
          printLine('Triangulating...', 'warn')
          setTimeout(() => printLine('📍 Coordinates: Helsinki, Finland [60.1699° N, 24.9384° E]', 'success'), 600)
          break

        case 'sudo':
          printLine('ACCESS DENIED: Root privileges required.', 'error')
          // Efecto visual divertido: sacudida roja (opcional, simplificado aquí con texto)
          break

        case 'clear': // Limpieza rápida de la terminal y reinicio
          termReset() 
          break
        
        case 'run':
          printLine('>>> INITIALIZING CORE OPTIMIZATION...', 'warn')
          setIntensity(1.0) // Efecto visual fuerte
          setFocus('processing') 
          
          setTimeout(() => printLine('Allocating buffers...', 'info'), 800)
          setTimeout(() => printLine('Compiling shaders...', 'info'), 1600)
          
          setTimeout(() => {
             printLine('Optimization Complete. Efficiency +14%.', 'success')
             setIntensity(0)
             setFocus(null)
          }, 2800)
          break

        default:
          if (clean !== '') {
            printLine(`bash: ${clean}: command not found`, 'error')
          }
      }
    }

    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        processCommand(termInput.value)
        termInput.value = ''
        // Mantener scroll abajo siempre
        setTimeout(() => terminalDiv.scrollTop = terminalDiv.scrollHeight, 10)
      }
    })
  }

  // ... (Resto del código)

  initTerminal()

  return {
    enter: () => {
      running = true
      // RESET AL ENTRAR: Limpia la terminal y pone mensaje fresco
      if(termReset) termReset()
      clock.start()
      resize()
      tick()
    },
    exit: () => {
      running = false
      cancelAnimationFrame(raf)
    },
    resize,
    setProgress: (p) => targetProgress = p,
    setState,
    setMouseNorm,
    setIntensity,
    setFocus,
    dispose: () => {
      running = false
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      renderer.dispose()
      rtScene.dispose()
      rtA.dispose()
      rtB.dispose()
    }
  }
}