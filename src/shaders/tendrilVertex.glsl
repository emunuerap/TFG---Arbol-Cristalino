// Attributes per particle
attribute float aScale;
attribute vec3 aRandomness; // Use for animation offset and path variation

// Uniforms
uniform float uTime;
uniform float uPixelRatio;
uniform float uSize;
uniform vec2 uMouse; // Mouse position (-1 to 1)
uniform float uInteractionStrength; // How much mouse affects tendrils

varying vec3 vColor; // Pass color to fragment

// Noise function (simplified Perlin-like for variety)
// Source: https://thebookofshaders.com/11/
float rand(vec2 n) {
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}
float noise(vec2 p){
	vec2 ip = floor(p);
	vec2 u = fract(p);
	u = u*u*(3.0-2.0*u); // Smoothstep

	float res = mix(
		mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
		mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
	return res*res;
}
// ------------------------------------

void main() {
    vec3 pos = position; // Initial position (forms the tendril path)

    // --- 1. Base Tendril Animation (Slow Drift + Noise) ---
    float time = uTime * 0.0001;
    // Use noise based on initial position and time for organic path wobble
    float noiseFreq = 0.5;
    float noiseAmp = 0.3;
    pos.x += noise(vec2(pos.x * noiseFreq + time + aRandomness.x, pos.y * noiseFreq)) * noiseAmp;
    pos.y += noise(vec2(pos.y * noiseFreq + time + aRandomness.y, pos.z * noiseFreq)) * noiseAmp;
    pos.z += noise(vec2(pos.z * noiseFreq + time + aRandomness.z, pos.x * noiseFreq)) * noiseAmp;

    // Slow overall drift (can be customized)
    pos.y += time * 0.5 + aRandomness.y * 0.1; // Gentle upward/varied drift
    pos.x += sin(time * 0.8 + aRandomness.z * 6.28) * 0.1; // Gentle side-to-side

    // Loop particles vertically
    pos.y = mod(pos.y + 4.0, 8.0) - 4.0; // Keep Y between -4 and 4

    // --- 2. Mouse Interaction (Warp/Push) ---
    vec2 mouseNDC = uMouse;
    // Project particle position onto screen (approximation)
    vec4 projected = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec2 screenPos = projected.xy / projected.w;
    // Calculate distance and direction from mouse
    float mouseDist = length(screenPos - mouseNDC);
    vec3 pushDirection = normalize(pos - vec3(mouseNDC.x * 10.0, mouseNDC.y * 5.0, pos.z)); // Push away on XY plane
    // Apply force based on distance, stronger when closer
    float pushStrength = smoothstep(0.4, 0.0, mouseDist) * uInteractionStrength * 1.5; // Strong push
    pos += pushDirection * pushStrength;

    // --- Final Position & Size ---
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / -viewPosition.z);
    gl_PointSize = clamp(gl_PointSize, 2.0, 10.0); // Smaller points

    // --- Color Calculation (Example: Blue/Green shift based on Y pos) ---
    float colorMix = smoothstep(-3.0, 3.0, pos.y); // Mix based on height
    vColor = mix(vec3(0.1, 0.3, 0.8), vec3(0.1, 0.8, 0.3), colorMix); // Blue to Green
    // Make particles brighter near mouse
    vColor += smoothstep(0.2, 0.0, mouseDist) * 0.5; // Additive brightness near mouse
}