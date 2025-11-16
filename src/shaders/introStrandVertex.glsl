uniform float uTime;
uniform vec2 uMouse;
uniform float uVortex; // 0.0 (idle) to 1.0 (charged)

attribute float aProgress;
attribute vec3 aRandom; // x: speed, y: time offset, z: scale

varying float vProgress;

void main() {
    vProgress = aProgress;
    vec3 p = position;
    
    // 1. Animación Idle (ondulación)
    float time = (uTime * 0.0005 * aRandom.x) + aRandom.y;
    p.x += sin(time + aProgress * 10.0) * 0.3 * (1.0 - aProgress);
    p.y += cos(time + aProgress * 10.0) * 0.3 * (1.0 - aProgress);
    
    // 2. Interacción Mouse
    vec4 viewPos = viewMatrix * modelMatrix * vec4(p, 1.0);
    vec4 projPos = projectionMatrix * viewPos;
    vec2 ndc = projPos.xy / projPos.w;
    float mouseDist = length(ndc - uMouse);
    float repelForce = smoothstep(0.3, 0.0, mouseDist) * (1.0 - uVortex) * 1.5;
    projPos.xy += normalize(ndc - uMouse) * repelForce * (projPos.w * 0.1);
    
    // 3. Efecto Vórtice (atraer al centro)
    // Interpola la posición proyectada hacia el centro (0,0)
    projPos.xy = mix(projPos.xy, vec2(0.0), uVortex * aProgress);
    
    gl_Position = projPos;
    
    // 4. Tamaño del Punto
    // Más grandes en el centro, más pequeños en las puntas
    float size = (1.0 - pow(aProgress, 2.0)) * 5.0 * aRandom.z;
    // Se expanden al ser absorbidos
    size *= (1.0 + uVortex * 5.0);
    
    gl_PointSize = size * (1.0 / -viewPos.z);
}