uniform float uVortex;
uniform float uFade;

varying float vProgress;

void main() {
    // Dibuja un círculo suave
    float circle = 1.0 - dot(gl_PointCoord - 0.5, gl_PointCoord - 0.5) * 4.0;
    if (circle < 0.0) discard;
    
    float alpha = circle;
    
    // Se desvanece en las puntas (vProgress va de 0 a 1)
    alpha *= pow(1.0 - vProgress, 0.3);
    
    // Color base (cyan)
    vec3 color = vec3(0.4, 1.0, 0.7);
    
    // Se vuelve blanco y brillante al ser absorbido
    vec3 finalColor = mix(color, vec3(1.0, 1.0, 1.0), uVortex);
    
    // Multiplicamos por el color para el Bloom
    gl_FragColor = vec4(finalColor * 1.5, alpha * uFade);
}