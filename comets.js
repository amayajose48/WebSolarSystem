/* ============================================================
   ORBITA — comets.js
   FASE 5: Cometas con cola animada
   -------------------------------------------------------------
   Cada cometa se mueve en una órbita elíptica excéntrica real,
   respetando la 2da ley de Kepler (barre áreas iguales en tiempos
   iguales → más rápido cerca del Sol, más lento lejos).

   La cola es un rastro de posiciones pasadas dibujado como puntos
   que se van oscureciendo hacia atrás — un truco simple y barato
   que funciona muy bien contra un fondo negro (oscurecer = "ver
   menos" el punto, sin necesitar canales de transparencia por
   vértice).
   ============================================================ */

import * as THREE from "three";
import { createRadialGlowTexture } from "./utils.js";

const TRAIL_LENGTH = 70; // cantidad de puntos que forman la cola

/**
 * Configuración orbital de cada cometa:
 *  a        → semieje mayor (tamaño de la órbita)
 *  e        → excentricidad (0 = círculo, cerca de 1 = muy alargada)
 *  incline  → inclinación del plano orbital, en radianes
 *  phase    → ángulo inicial, para que no arranquen todos alineados
 *  L        → "momento angular" simulado: controla qué tan rápido
 *             recorre la órbita en total (ajustado a mano para que
 *             se vea bien en la escala de tiempo de la simulación)
 *  color    → tinte del núcleo y la cola
 */
const COMET_CONFIGS = [
  { a: 900, e: 0.92, incline: 0.35, phase: 0.0, L: 4200, color: 0xbfe9ff },
  { a: 1400, e: 0.88, incline: -0.5, phase: 2.1, L: 6000, color: 0xdfffe0 },
  { a: 650, e: 0.95, incline: 0.15, phase: 4.2, L: 2800, color: 0xffe8c9 },
];

function createGlowSprite(color) {
  const texture = createRadialGlowTexture(128, [
    [0, "rgba(255, 255, 255, 0.95)"],
    [0.4, "rgba(255, 255, 255, 0.4)"],
    [1, "rgba(255, 255, 255, 0)"],
  ]);

  const material = new THREE.SpriteMaterial({
    map: texture,
    color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Sprite(material);
}

/**
 * Crea un cometa individual: núcleo + halo + cola de partículas.
 */
function createComet(config) {
  const group = new THREE.Group();

  // Núcleo: pequeña esfera helada, autoiluminada (no depende de la luz del Sol
  // para que se vea siempre, incluso muy lejos donde la luz apenas llega)
  const nucleusGeometry = new THREE.SphereGeometry(2.2, 16, 16);
  const nucleusMaterial = new THREE.MeshBasicMaterial({ color: config.color });
  const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
  group.add(nucleus);

  // Halo pequeño alrededor del núcleo
  const glow = createGlowSprite(config.color);
  glow.scale.set(16, 16, 1);
  group.add(glow);

  // Cola: buffer circular de posiciones pasadas
  const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
  const trailColors = new Float32Array(TRAIL_LENGTH * 3);
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));

  const trailMaterial = new THREE.PointsMaterial({
    size: 3,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const trail = new THREE.Points(trailGeometry, trailMaterial);

  // Historial de posiciones reales (en unidades de mundo), se llena de a poco
  const history = [];
  let trueAnomaly = config.phase;
  const color = new THREE.Color(config.color);

  function keplerPosition(theta) {
    // Ecuación de la órbita elíptica: r depende del ángulo (anomalía verdadera)
    const r = (config.a * (1 - config.e * config.e)) / (1 + config.e * Math.cos(theta));
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    // Inclinamos el plano orbital para que no todos los cometas compartan el mismo plano
    const y = z * Math.sin(config.incline);
    const zTilted = z * Math.cos(config.incline);
    return new THREE.Vector3(x, y, zTilted);
  }

  function update(delta) {
    const position = keplerPosition(trueAnomaly);
    const distanceToSun = position.length();

    // 2da ley de Kepler simplificada: velocidad angular ∝ 1/r²
    // (conservación del momento angular — más cerca del Sol, gira más rápido)
    const angularSpeed = config.L / (distanceToSun * distanceToSun);
    trueAnomaly += angularSpeed * delta * 0.00025;

    group.position.copy(position);

    // Actualiza el historial de posiciones para la cola
    history.unshift(position.clone());
    if (history.length > TRAIL_LENGTH) history.pop();

    // La cola crece cerca del Sol (calor solar) y se encoge lejos
    const proximityFactor = THREE.MathUtils.clamp(1 - distanceToSun / config.a, 0.15, 1);
    trailMaterial.size = THREE.MathUtils.lerp(1.2, 4.5, proximityFactor);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const point = history[i] || position;
      trailPositions[i * 3] = point.x - position.x;
      trailPositions[i * 3 + 1] = point.y - position.y;
      trailPositions[i * 3 + 2] = point.z - position.z;

      // Se oscurece hacia el final de la cola: contra el fondo negro del
      // espacio, un color más oscuro se "lee" visualmente como más tenue.
      const fade = 1 - i / TRAIL_LENGTH;
      trailColors[i * 3] = color.r * fade;
      trailColors[i * 3 + 1] = color.g * fade;
      trailColors[i * 3 + 2] = color.b * fade;
    }

    trailGeometry.attributes.position.needsUpdate = true;
    trailGeometry.attributes.color.needsUpdate = true;
  }

  function reset() {
    trueAnomaly = config.phase;
    history.length = 0; // vacía la cola para que no se vea un salto brusco al resetear
  }

  group.add(trail);
  return { group, update, reset };
}

/**
 * Crea todos los cometas definidos en COMET_CONFIGS.
 */
export function createComets(scene) {
  const comets = COMET_CONFIGS.map(createComet);
  comets.forEach((comet) => scene.add(comet.group));

  function updateAll(delta) {
    comets.forEach((comet) => comet.update(delta));
  }

  function resetAll() {
    comets.forEach((comet) => comet.reset());
  }

  return { comets, update: updateAll, reset: resetAll };
}
