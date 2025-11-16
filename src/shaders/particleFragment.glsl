// shaders/particleFragment.glsl
varying vec3 vColor;
varying float vAlpha;
uniform sampler2D uTexture;
uniform float uOpacity;
uniform vec3 uColor;  // ← AÑADIDO

void main() {
    vec2 uv = gl_PointCoord;
    vec2 c = uv * 2.0 - 1.0;
    float r2 = dot(c, c);
    float circle = smoothstep(1.0, 0.85, r2);
   
    vec4 tex = texture2D(uTexture, uv);
   
    float alpha = circle * vAlpha * tex.a * uOpacity;
   
    if (alpha < 0.05) discard;
   
    gl_FragColor = vec4(vColor * uColor * 1.5, alpha * 1.2);  //  BRILLO + INTENSIDAD
}