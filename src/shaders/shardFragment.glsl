// src/shaders/shardFragment.glsl

uniform sampler2D uTexture;
uniform float uTime;
uniform float uHoverState; // 0.0 (normal) a 1.0 (hover/cerca)
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    // Coordenadas de textura base
    vec2 newUv = vUv;

    // --- EFECTO 1: Refracción / Líquido ---
    // Distorsionamos la UV basándonos en la normal y si estamos "cerca" (uHoverState)
    // Cuando uHoverState es 1 (estamos mirando el proyecto), la distorsión desaparece para ver bien la imagen.
    float distortion = (1.0 - uHoverState) * 0.1;
    newUv += vNormal.xy * distortion;

    // --- EFECTO 2: Aberración Cromática (RGB Split) ---
    // Separamos los canales de color. Si no hay hover, se separan más (glitch).
    float shift = 0.01 + (1.0 - uHoverState) * 0.02;
    
    float r = texture2D(uTexture, newUv + vec2(shift, 0.0)).r;
    float g = texture2D(uTexture, newUv).g;
    float b = texture2D(uTexture, newUv - vec2(shift, 0.0)).b;
    
    vec3 textureColor = vec3(r, g, b);

    // --- EFECTO 3: Tinte Cristalino ---
    // Mezclamos la foto con un color "tech" (cian/verde) en los bordes
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = dot(viewDir, vNormal); // 1.0 en el centro, 0.0 en bordes
    fresnel = clamp(fresnel, 0.0, 1.0);

    vec3 techColor = vec3(0.4, 0.9, 0.7); // Color "Ramas"
    
    // Si estamos lejos (uHoverState 0), se ve más cristal. Si cerca, se ve más foto.
    float mixFactor = pow(1.0 - fresnel, 3.0) * (1.0 - uHoverState);
    vec3 finalColor = mix(textureColor, techColor, mixFactor);

    // Añadir opacidad global (para entrar/salir de la sección)
    gl_FragColor = vec4(finalColor, uOpacity);
}