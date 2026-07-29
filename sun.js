/* ============================================================
   ORBITA — sun.js
   FASE 2: Sol profesional
   -------------------------------------------------------------
   Reemplaza la esfera plana de la FASE 0 por:
     1. Superficie con shader propio: ruido 3D animado que simula
        granulación y turbulencia solar (plasma en movimiento)
     2. Corona: capa exterior con shader de Fresnel (brillo en el
        borde, transparente al centro — así se ve una atmósfera
        estelar real, no un círculo plano)
     3. Halo de sprite aditivo para el brillo de largo alcance
        (visible incluso cuando la cámara está lejos)

   Todo animado vía la función update(elapsedTime).
   ============================================================ */

import * as THREE from "three";
import { loadTextureOrNull, createRadialGlowTexture } from "./utils.js";

/* ------------------------------------------------------------
   RUIDO 3D (simplex noise, versión compacta de Ashima Arts)
   -------------------------------------------------------------
   Se usa dentro del fragment shader para generar el patrón de
   plasma. Es la misma función que usan la mayoría de los shaders
   procedurales en Three.js/Shadertoy — no reinventamos la rueda,
   pero SÍ explicamos qué hace: genera un valor de "ruido" suave
   y continuo en 3D, ideal para simular fluidos y turbulencia.
   ------------------------------------------------------------ */
const NOISE_GLSL = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

/* ------------------------------------------------------------
   SHADER DE SUPERFICIE (plasma animado)
   ------------------------------------------------------------ */

const surfaceVertexShader = `
  varying vec2 vUv;
  varying vec3 vPos;

  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const surfaceFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uHasTexture;
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vPos;

  ${NOISE_GLSL}

  void main() {
    // Tres octavas de ruido a distintas frecuencias: simula turbulencia
    // de distintos tamaños (manchas grandes + granulación fina), igual
    // que se ve en fotos reales del Sol.
    vec3 p = vPos * 0.15 + vec3(0.0, 0.0, uTime * 0.03);
    float n = snoise(p) * 0.5;
    n += snoise(p * 2.3 + 10.0) * 0.25;
    n += snoise(p * 5.0 + 20.0) * 0.125;
    n = n * 0.5 + 0.5; // remapea de [-1,1] a [0,1]

    vec3 baseColor = vec3(0.95, 0.35, 0.05);
    vec3 hotColor  = vec3(1.0, 0.85, 0.45);
    vec3 proceduralColor = mix(baseColor, hotColor, clamp(n * 1.3, 0.0, 1.0));

    vec3 texColor = texture2D(uTexture, vUv).rgb;
    // Sin textura: uHasTexture=0 y usamos solo el color procedural.
    // Con textura: la modulamos con el ruido para que la turbulencia
    // se note por encima de la foto real de la NASA.
    vec3 finalColor = mix(proceduralColor, texColor * (0.6 + n * 0.8), uHasTexture);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

/* ------------------------------------------------------------
   SHADER DE CORONA (fresnel — brillo en el borde)
   ------------------------------------------------------------ */

const coronaVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const coronaFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    // Fresnel: cuanto más "de canto" mirás la esfera, más brilla.
    // Esto es lo que hace que el centro se vea transparente y el
    // borde se vea como una corona luminosa.
    float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.5);
    float flicker = 0.85 + 0.15 * sin(uTime * 1.6);
    gl_FragColor = vec4(uColor * flicker, fresnel * 0.9);
  }
`;

/* ------------------------------------------------------------
   HALO (sprite aditivo, para brillo de largo alcance)
   ------------------------------------------------------------ */

// createGlowTexture ahora es createRadialGlowTexture en utils.js (compartida con comets.js)

/* ------------------------------------------------------------
   CREACIÓN DEL SOL
   ------------------------------------------------------------ */

/**
 * Crea el Sol completo (superficie + corona + halo).
 * Devuelve { group, update } — `group` se agrega a la escena,
 * `update(elapsedTime)` se llama cada frame para animarlo.
 */
export async function createSun(radius = 20) {
  const group = new THREE.Object3D();
  group.name = "sun";

  const texture = await loadTextureOrNull("textures/2k_sun.jpg");

  // 1. Superficie con shader de plasma
  const surfaceGeometry = new THREE.SphereGeometry(radius, 96, 96);
  const surfaceMaterial = new THREE.ShaderMaterial({
    vertexShader: surfaceVertexShader,
    fragmentShader: surfaceFragmentShader,
    uniforms: {
      uTexture: { value: texture ?? new THREE.Texture() },
      uHasTexture: { value: texture ? 1.0 : 0.0 },
      uTime: { value: 0 },
    },
  });
  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  group.add(surface);

  // 2. Corona (esfera ligeramente más grande, fresnel, blending aditivo)
  const coronaGeometry = new THREE.SphereGeometry(radius * 1.18, 64, 64);
  const coronaMaterial = new THREE.ShaderMaterial({
    vertexShader: coronaVertexShader,
    fragmentShader: coronaFragmentShader,
    uniforms: {
      uColor: { value: new THREE.Color(0xffaa55) },
      uTime: { value: 0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
  group.add(corona);

  // 3. Halo de largo alcance (sprite, siempre mirando a cámara)
  const glowMaterial = new THREE.SpriteMaterial({
    map: createRadialGlowTexture(256, [
      [0, "rgba(255, 244, 214, 0.85)"],
      [0.35, "rgba(255, 190, 90, 0.35)"],
      [1, "rgba(255, 160, 60, 0)"],
    ]),
    color: 0xffcc66,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.set(radius * 8, radius * 8, 1);
  group.add(glow);

  function update(elapsedTime) {
    surfaceMaterial.uniforms.uTime.value = elapsedTime;
    corona.material.uniforms.uTime.value = elapsedTime;
    // Rotación propia lenta de la superficie, coherente con la rotación
    // real del Sol (~27 días — aquí comprimida a la escala de la simulación)
    surface.rotation.y = elapsedTime * 0.02;
  }

  return { group, surface, corona, glow, radius, update };
}
