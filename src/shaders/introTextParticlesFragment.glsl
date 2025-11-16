uniform float uFade;
varying float vAlpha; // Base alpha (converge/vortex)
varying float vRevealProgress; // How much the particle has converged (0 to 1)
varying float vHoverFalloff; // Hover factor (0 to 1)

void main() {
    float circleAlpha = 1.0 - dot(gl_PointCoord - 0.5, gl_PointCoord - 0.5) * 4.0;
    circleAlpha = smoothstep(0.0, 0.5, circleAlpha);
    if (circleAlpha < 0.01) discard;

    // --- Stricter Cutoff for Convergence ---
    // Only show particles that are essentially fully converged
    float convergenceAlpha = smoothstep(0.98, 0.99, vRevealProgress); // Start fading in VERY late
    // Discard immediately if not converged
    if (convergenceAlpha < 0.01) discard;
    // ------------------------------------

    // --- Brightness Control (Keep subtle settings) ---
    vec3 baseColor = vec3(0.1, 0.12, 0.15); // Very dark blue/grey
    vec3 hoverColor = vec3(0.6, 0.7, 0.8); // Greyish-blue, less bright
    vec3 finalColor = mix(baseColor, hoverColor, vHoverFalloff);

    // --- Final Alpha (Keep subtle settings) ---
    float baseAlpha = 0.1; // Low base visibility
    float hoverAlphaBoost = vHoverFalloff * 0.3; // Small boost on hover
    float combinedAlpha = baseAlpha + hoverAlphaBoost;

    float finalAlpha = circleAlpha * vAlpha * convergenceAlpha * combinedAlpha * uFade;
    finalAlpha = clamp(finalAlpha, 0.0, 1.0);

    if (finalAlpha < 0.01) discard;

    gl_FragColor = vec4(finalColor, finalAlpha);
}