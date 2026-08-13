/* ============================================================
   ORBITA — space.js
   FASE 4: Profundidad del espacio profundo
   -------------------------------------------------------------
   Todo el contenido de este módulo es procedural (generado con
   canvas 2D), no son imágenes descargadas. Esto evita depender
   de archivos externos y de licencias de terceros, y además pesa
   casi nada.

   Tres capas, cada una a su propia distancia y velocidad de
   rotación — la diferencia de velocidad ENTRE capas es lo que
   el ojo humano interpreta como profundidad (parallax):
     1. Nebulosas   → muy lejos, casi inmóviles
     2. Galaxias    → muy lejos, casi inmóviles
     3. Polvo espacial → más cerca, se mueve visiblemente más rápido
   ============================================================ */

import * as THREE from "three";

/* ------------------------------------------------------------
   TEXTURAS PROCEDURALES
   ------------------------------------------------------------ */

/**
 * Nube de nebulosa: varios blobs radiales superpuestos con un tinte
 * de color, para simular las formas irregulares de gas y polvo real.
 */
function createNebulaTexture(colorA, colorB, colorCore) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, size, size);
  // Un desenfoque general sobre todo lo que se dibuje a partir de acá:
  // es lo que le da el aspecto "de gas" difuso en vez de manchas con
  // bordes definidos, que era el problema de la versión anterior.
  ctx.filter = "blur(14px)";

  // Capa base: varios blobs grandes y muy tenues, para una nube de fondo
  // amplia y suave antes de agregar detalle encima.
  for (let i = 0; i < 6; i++) {
    const cx = size / 2 + (Math.random() - 0.5) * size * 0.5;
    const cy = size / 2 + (Math.random() - 0.5) * size * 0.5;
    const r = size * (0.28 + Math.random() * 0.22);
    const color = i % 2 === 0 ? colorA : colorB;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, `rgba(${color}, 0.22)`);
    gradient.addColorStop(0.4, `rgba(${color}, 0.12)`);
    gradient.addColorStop(0.75, `rgba(${color}, 0.04)`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Capa de detalle: blobs más chicos y variados, para textura interna
  // (zonas más densas, "filamentos" de gas) por encima de la base.
  for (let i = 0; i < 10; i++) {
    const cx = size / 2 + (Math.random() - 0.5) * size * 0.65;
    const cy = size / 2 + (Math.random() - 0.5) * size * 0.65;
    const r = size * (0.06 + Math.random() * 0.14);
    const color = Math.random() > 0.5 ? colorA : colorB;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, `rgba(${color}, 0.28)`);
    gradient.addColorStop(0.6, `rgba(${color}, 0.1)`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Núcleo brillante: 1-2 puntos más claros, simulando zonas de formación
  // estelar activa (el punto más luminoso de una nebulosa real).
  const coreCount = 1 + Math.round(Math.random());
  for (let i = 0; i < coreCount; i++) {
    const cx = size / 2 + (Math.random() - 0.5) * size * 0.3;
    const cy = size / 2 + (Math.random() - 0.5) * size * 0.3;
    const r = size * (0.05 + Math.random() * 0.05);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, `rgba(${colorCore}, 0.5)`);
    gradient.addColorStop(1, `rgba(${colorCore}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.filter = "none";
  return new THREE.CanvasTexture(canvas);
}

/**
 * Galaxia lejana simplificada: núcleo brillante + un par de "brazos"
 * pintados como elipses rotadas y difuminadas. No busca ser una
 * simulación astronómica precisa, sino una silueta reconocible a
 * la distancia a la que se va a ver.
 */
function createGalaxyTexture(colorHex) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  ctx.translate(cx, cy);

  // Brazos: elipses alargadas y rotadas, con blending suave
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((Math.PI / 3) * i);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.45);
    gradient.addColorStop(0, `rgba(${colorHex}, 0.3)`);
    gradient.addColorStop(1, `rgba(${colorHex}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.45, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Núcleo brillante
  const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.15);
  coreGradient.addColorStop(0, "rgba(255, 250, 240, 0.9)");
  coreGradient.addColorStop(1, "rgba(255, 250, 240, 0)");
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

/* ------------------------------------------------------------
   CAPA 1: NEBULOSAS
   ------------------------------------------------------------ */

const NEBULA_PALETTES = [
  ["120, 60, 200", "40, 20, 90", "220, 190, 255"], // violeta profundo, núcleo lavanda
  ["40, 130, 220", "10, 40, 90", "200, 230, 255"], // azul, núcleo celeste
  ["220, 70, 160", "90, 20, 70", "255, 210, 235"], // magenta/rosa, núcleo rosado pálido
  ["50, 200, 190", "10, 70, 80", "210, 255, 245"], // turquesa, núcleo blanco-verdoso
];

function createNebulae(count = 6, radius = 8000) {
  const group = new THREE.Group();

  for (let i = 0; i < count; i++) {
    const palette = NEBULA_PALETTES[i % NEBULA_PALETTES.length];
    const texture = createNebulaTexture(palette[0], palette[1], palette[2]);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.8,
    });

    const sprite = new THREE.Sprite(material);
    const scale = THREE.MathUtils.lerp(1400, 2600, Math.random());
    sprite.scale.set(scale, scale, 1);

    // Distribuidas sobre una esfera grande, igual que las estrellas
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.85 + Math.random() * 0.3);
    sprite.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );

    group.add(sprite);
  }

  return group;
}

/* ------------------------------------------------------------
   CAPA 2: GALAXIAS LEJANAS
   ------------------------------------------------------------ */

const GALAXY_COLORS = ["255, 220, 180", "200, 220, 255", "255, 200, 220"];

function createGalaxies(count = 14, radius = 9500) {
  const group = new THREE.Group();

  for (let i = 0; i < count; i++) {
    const colorHex = GALAXY_COLORS[i % GALAXY_COLORS.length];
    const texture = createGalaxyTexture(colorHex);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9,
    });

    const sprite = new THREE.Sprite(material);
    const scale = THREE.MathUtils.lerp(150, 400, Math.random());
    sprite.scale.set(scale, scale, 1);
    sprite.material.rotation = Math.random() * Math.PI * 2;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.9 + Math.random() * 0.25);
    sprite.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );

    group.add(sprite);
  }

  return group;
}

/* ------------------------------------------------------------
   CAPA 3: POLVO ESPACIAL (más cerca → clave del parallax)
   ------------------------------------------------------------ */

function createSpaceDust(count = 3000) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Radio intermedio: más cerca que las estrellas de fondo (6000),
    // más lejos que Neptuno (~1200) — así queda flotando visiblemente
    // "entre" el sistema solar y el fondo lejano.
    const radius = THREE.MathUtils.lerp(1400, 2800, Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x8fa8c9,
    size: 1.1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

/* ------------------------------------------------------------
   ENSAMBLADO: crea las tres capas y devuelve un solo objeto
   con referencias para animar el parallax en el loop principal.
   ------------------------------------------------------------ */

export function createDeepSpace() {
  const nebulae = createNebulae();
  const galaxies = createGalaxies();
  const dust = createSpaceDust();

  function update(elapsed) {
    // Velocidades deliberadamente distintas: esta diferencia ES el parallax.
    nebulae.rotation.y = elapsed * 0.0006;
    galaxies.rotation.y = elapsed * 0.0009;
    dust.rotation.y = elapsed * 0.006; // la capa más cercana se mueve notablemente más rápido
  }

  return { nebulae, galaxies, dust, update };
}
