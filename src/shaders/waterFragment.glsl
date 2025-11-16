uniform float uTime;
uniform vec3 uDeepColor;
uniform vec3 uSurfaceColor;
uniform float uColorOffset;
uniform float uColorMultiplier;
uniform samplerCube uEnvironmentMap; // <-- Usaremos el Environment Map
uniform vec3 uSunDirection;
uniform vec3 uSunColor;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

// Función Fresnel
float fresnel(vec3 viewDir, vec3 normal) {
  return pow(1.0 - max(0.0, dot(viewDir, normal)), 3.0);
}

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);

  // --- 1. Reflejos del Cielo (HDRI) ---
  vec3 reflectDir = reflect(-viewDir, normal);
  vec3 skyReflection = textureCube(uEnvironmentMap, reflectDir).rgb;

  // --- 2. Brillo Especular (Sol/Luna) ---
  float specularStrength = 0.5;
  vec3 halfwayDir = normalize(uSunDirection + viewDir);
  float specular = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
  vec3 specularColor = uSunColor * specular * specularStrength;
  
  // --- 3. Color del Agua (Profundidad) ---
  // Mezclamos colores profundos y superficiales usando Fresnel
  float fresnelFactor = fresnel(viewDir, normal);
  vec3 waterColor = mix(uDeepColor, uSurfaceColor, fresnelFactor);
  
  // --- 4. Combinación Final ---
  // Mezclamos el color del agua con los reflejos del cielo
  vec3 finalColor = mix(waterColor, skyReflection, fresnelFactor * 0.8);
  // Añadimos el brillo especular encima
  finalColor += specularColor;

  gl_FragColor = vec4(finalColor, 0.85); // Opacidad de 0.85
}