uniform sampler2D uTexture; // Particle texture
uniform float uOpacity;     // Control overall opacity for fade later

varying vec3 vColor;      // Color from vertex shader

void main() {
    vec4 texColor = texture2D(uTexture, gl_PointCoord);
    if(texColor.a < 0.05) discard; // Use texture alpha for shape

    // Final color: Vertex color modulated by texture and overall opacity
    gl_FragColor = vec4(vColor, texColor.a * uOpacity);
}