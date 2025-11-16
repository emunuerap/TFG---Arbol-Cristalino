uniform float uTime;
uniform float uVortex;
uniform float uTextRevealProgress;
uniform vec3 uCameraPosition;
uniform vec2 uMouse;

attribute vec3 aRandom;
attribute vec3 aOffset;

varying float vAlpha; // Base alpha (converge/vortex)
varying float vRevealProgress;
varying vec3 vWorldPosition;
varying vec2 vNdc; // Screen position
varying float vHoverFalloff; // <-- Factor de hover (0 a 1)

void main() {
    vec3 transformed = position;

    // 1. Converge Animation
    float revealDelay = aRandom.x * 0.8;
    float currentRevealProgress = smoothstep(0.0, 1.0, uTextRevealProgress * 1.5 - revealDelay);
    transformed = mix(aOffset, transformed, currentRevealProgress);
    vRevealProgress = currentRevealProgress;

    vec4 viewPosition;
    vec4 modelPosition;
    vec4 finalProjPos;

    // 2. Comprobación de estado
    float dynamicMask = smoothstep(0.95, 1.0, currentRevealProgress) * (1.0 - smoothstep(0.0, 0.05, uVortex));

    // --- LÓGICA DE EXPANSIÓN AL PASAR EL RATÓN ---
    if (dynamicMask > 0.0) {
        // Calculamos la posición inicial en pantalla
        modelPosition = modelMatrix * vec4(transformed, 1.0);
        vWorldPosition = modelPosition.xyz;
        viewPosition = viewMatrix * modelPosition;
        vec4 projPos = projectionMatrix * viewPosition;
        vNdc = projPos.xy / projPos.w; // Calculamos y pasamos NDC

        // Calculamos el factor de expansión
        float mouseDistNDC = length(vNdc - uMouse);
        float expansionRadius = 0.3; // Radio de influencia (ajusta)
        float expansionStrength = 0.05; // Cuánto expande (ajusta)
        float expansionFactor = smoothstep(expansionRadius, 0.0, mouseDistNDC) * dynamicMask;
        vHoverFalloff = expansionFactor; // <-- Pasamos el factor al fragment

        // Aplicamos expansión (alejándose del centro local 0,0,0)
        vec3 direction = normalize(transformed);
        transformed += direction * expansionFactor * expansionStrength;

        // Recalculamos posiciones finales con la expansión
        modelPosition = modelMatrix * vec4(transformed, 1.0);
        vWorldPosition = modelPosition.xyz; // Actualizamos world pos
        viewPosition = viewMatrix * modelPosition;
        finalProjPos = projectionMatrix * viewPosition;
        gl_Position = finalProjPos;

    } else {
        // 3. Vortex "Scatter & Absorb"
        float vortexStrength = pow(uVortex, 2.0);
        vec3 scatterDirection = normalize(transformed - vec3(0.0));
        transformed += scatterDirection * vortexStrength * 0.8;
        transformed = mix(transformed, vec3(0.0), vortexStrength * 1.5);
        transformed += (aRandom.y - 0.5) * vortexStrength * 0.2;
        modelPosition = modelMatrix * vec4(transformed, 1.0);
        vWorldPosition = modelPosition.xyz;
        viewPosition = viewMatrix * modelPosition;
        finalProjPos = projectionMatrix * viewPosition;
        gl_Position = finalProjPos;
        vNdc = finalProjPos.xy / finalProjPos.w; // Calculamos NDC también aquí
        vHoverFalloff = 0.0; // No hay hover durante el vórtice
    }

    // Point Size (Mantener pequeño)
    float distanceToCamera = length(uCameraPosition - modelPosition.xyz);
    float baseSize = 0.4; // Ajusta 0.3-0.5
    float finalSize = baseSize * (1.0 + uVortex * 0.2);
    gl_PointSize = finalSize * (1.0 / -viewPosition.z);

    // Alpha (sin cambios)
    vAlpha = currentRevealProgress * (1.0 - uVortex);

    // Intensity ya no se usa/pasa
}