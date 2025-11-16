attribute float aScale;
attribute vec3 aRandomness;

uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform vec2 uMouse; // <-- ¡Nuevo!

varying vec3 vColor;
varying float vAlpha;

void main() {
    vec3 p = position;
    float timeFactor = uTime * 0.0005;

    // Tu animación de deriva
    p.x += cos(timeFactor + aRandomness.x * 3.1415) * aRandomness.y * 0.5;
    p.y += sin(timeFactor + aRandomness.y * 3.1415) * aRandomness.z * 0.5;
    p.z += cos(timeFactor + aRandomness.z * 3.1415) * aRandomness.x * 0.5;

    vec4 modelPosition = modelMatrix * vec4(p, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    // --- Repulsión del Mouse (¡Nuevo!) ---
    // Coordenadas de -1 a 1 (NDC)
    vec2 projectedXY = projectedPosition.xy / projectedPosition.w;
    
    // Distancia entre el mouse y la partícula en la pantalla
    float mouseDist = length(projectedXY - uMouse);

    // Fuerza de repulsión (más fuerte cuanto más cerca)
    float repelForce = smoothstep(0.3, 0.0, mouseDist) * 1.5;

    // Aplicamos la fuerza
    projectedPosition.xy += normalize(projectedXY - uMouse) * repelForce * (projectedPosition.w * 0.1);
    // ------------------------------------

    gl_Position = projectedPosition; // <-- Esta posición ya está modificada
    
    gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / -viewPosition.z);
    gl_PointSize = clamp(gl_PointSize, 2.0, 18.0);
    
    float heightFade = smoothstep(0.1, 1.0, p.y) * (1.0 - smoothstep(7.0, 7.9, p.y));
    float distanceFade = smoothstep(0.0, 15.0, length(viewPosition.xyz));
    vAlpha = heightFade * distanceFade;

    vColor = color;
}