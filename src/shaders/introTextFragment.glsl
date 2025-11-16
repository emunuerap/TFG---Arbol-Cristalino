uniform float uVortex;
uniform float uFade;
uniform float uTextRevealProgress;

varying float vVortex;
varying float vRelativeY;

void main() {
    // 1. Color Minimalista
    vec3 color = vec3(1.0); // Blanco puro

    // 2. Animación de aparición "Rise"
    // (vRelativeY va de 0 a 1, uTextRevealProgress va de 0 a 1)
    float riseAlpha = smoothstep(0.0, 1.0, uTextRevealProgress * 1.5 - vRelativeY * 0.5);

    // 3. Animación de "Shatter" (Fade out)
    // Los triángulos se desvanecen a medida que son succionados
    float shatterAlpha = 1.0 - pow(vVortex, 0.5);

    // 4. Alpha final
    float alpha = riseAlpha * shatterAlpha * uFade;
    
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, alpha);
}