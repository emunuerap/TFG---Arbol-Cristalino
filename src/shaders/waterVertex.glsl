uniform float uTime;
uniform vec2 uNormalScale; // Usaremos esto en lugar de mover la textura

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

// Simulación de olas Gerstner simple
// https://catlikecoding.com/unity/tutorials/flow/waves/
vec3 gerstnerWave(vec2 p, float k, float a, vec2 d) {
  float f = k * (dot(d, p) - (uTime * 0.0005)); // Controla la velocidad
  float c = cos(f);
  float s = sin(f);
  return vec3(
    d.x * (a * s),
    a * c,
    d.y * (a * s)
  );
}

void main() {
  vUv = uv;
  vNormal = normalize(normal);
  
  vec3 pos = position;
  
  // Sumamos varias olas pequeñas para un efecto natural
  pos += gerstnerWave(position.xz, 0.5, 0.05, vec2(0.8, 0.2));
  pos += gerstnerWave(position.xz, 0.8, 0.03, vec2(0.2, 0.8));
  pos += gerstnerWave(position.xz, 1.2, 0.02, vec2(1.0, 0.0));
  
  vec4 modelPos = modelMatrix * vec4(pos, 1.0);
  vPosition = modelPos.xyz;
  vNormal = normalize(normalMatrix * normal); // El normal es aproximado, pero suficiente
  vViewPosition = - (viewMatrix * modelPos).xyz;

  gl_Position = projectionMatrix * viewMatrix * modelPos;
}