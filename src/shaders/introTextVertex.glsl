uniform float uTime;
uniform float uVortex;
uniform float uTextRevealProgress;

// Atributos por vértice
attribute vec3 aTriangleCenter;
attribute vec3 aTriangleRandom;

// Varyings para el fragment
varying float vVortex;
varying float vRelativeY; // Para la animación "Rise"

// Función para rotar un vector alrededor de un eje
vec3 rotate(vec3 v, vec3 axis, float angle) {
    return v * cos(angle) + cross(axis, v) * sin(angle) + axis * dot(axis, v) * (1.0 - cos(angle));
}

void main() {
    vVortex = uVortex;
    
    // 1. Posición local del vértice (relativa al centro de su triángulo)
    vec3 localPos = position - aTriangleCenter;
    
    // 2. Animación "Shatter" (cuando uVortex > 0)
    float spinAngle = uVortex * (aTriangleRandom.x + 1.0) * 5.0;
    vec3 rotatedLocalPos = rotate(localPos, aTriangleRandom, spinAngle);
    
    // 3. Posición del centro
    float vortexEase = pow(uVortex, 2.0);
    vec3 centerPos = mix(aTriangleCenter, vec3(0.0), vortexEase);
    
    // 4. Posición final del vértice
    vec3 finalPos = centerPos + rotatedLocalPos;
    
    // 5. Escala de los triángulos
    finalPos *= (1.0 - vortexEase * 0.8);
    
    // --- ¡CAMBIO! ---
    // Ajustamos el mapeo de Y a las nuevas dimensiones (aprox -0.18 a +0.18)
    vRelativeY = (aTriangleCenter.y + 0.18) / 0.36;

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(finalPos, 1.0);
}