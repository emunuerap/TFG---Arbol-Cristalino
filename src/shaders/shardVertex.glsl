// src/shaders/shardVertex.glsl

uniform float uTime;
uniform float uSpeed; // Velocidad del scroll para deformar

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;

    // Efecto 1: Respiración suave (siempre activo)
    pos.z += sin(pos.y * 3.0 + uTime) * 0.02;

    // Efecto 2: Warp / Deformación por velocidad
    // Cuanto más rápido scrolleamos (uSpeed), más se estira el objeto hacia atrás
    pos.z -= uSpeed * sin(pos.x * 2.0) * 0.5;

    vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -modelViewPosition.xyz;

    gl_Position = projectionMatrix * modelViewPosition;
}