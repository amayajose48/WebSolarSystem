/* ============================================================
   ORBITA — planets.js
   FASE 1: Planetas del Sistema Solar
   -------------------------------------------------------------
   Este módulo separa TODO lo relacionado a los planetas del
   script.js principal:
     - Datos reales (radio, distancia, periodos)
     - Escalas de conversión (tamaño / distancia / tiempo)
     - Creación de mesh + pivote de órbita + textura con fallback
     - Función de actualización por frame

   Por qué un módulo aparte: script.js ya maneja escena, cámara,
   luces y estrellas. Meter aquí también 9 planetas lo volvería
   inmanejable. Cada archivo tiene una sola responsabilidad.
   ============================================================ */

import * as THREE from "three";
import { loadTextureOrNull } from "./utils.js";

/* ------------------------------------------------------------
   ESCALAS
   -------------------------------------------------------------
   SIZE_SCALE: cuántas unidades de escena equivalen a 1 km de radio real.
   DIST_SCALE: unidades de escena por UA (Unidad Astronómica), con
               una compresión de potencia 0.7 para que los planetas
               exteriores no queden a distancias inmanejables.
   ------------------------------------------------------------ */

const SIZE_SCALE = 1 / 1800;
const DIST_SCALE_PER_AU = 110;
const DIST_COMPRESSION = 0.7; // exponente: 1 = distancia real proporcional, <1 = comprimida

function scaledDistance(au) {
  return DIST_SCALE_PER_AU * Math.pow(au, DIST_COMPRESSION);
}

/* ------------------------------------------------------------
   DATOS REALES
   -------------------------------------------------------------
   radiusKm         → radio ecuatorial real
   distanceAU        → distancia media al Sol en Unidades Astronómicas
   rotationHours     → duración real del día (negativo = rotación retrógrada, como Venus)
   orbitalDays       → duración real del año
   axialTilt         → inclinación del eje en grados (detalle visual real)
   color             → color de respaldo si la textura no carga
   texture           → nombre de archivo esperado en /textures
   ------------------------------------------------------------ */

export const PLANET_DATA = [
  {
    name: "Mercurio",
    radiusKm: 2440,
    distanceAU: 0.39,
    orbitalInclination: 7.0,
    rotationHours: 1407.6,
    orbitalDays: 88,
    axialTilt: 0.03,
    color: 0x9c9c94,
    roughness: 0.97,
    metalness: 0.02,
    texture: "2k_mercury.jpg",
  },
  {
    name: "Venus",
    radiusKm: 6052,
    distanceAU: 0.72,
    orbitalInclination: 3.39,
    rotationHours: -5832.5, // retrógrado: gira al revés que el resto
    orbitalDays: 224.7,
    axialTilt: 177.4,
    color: 0xd8b98a,
    roughness: 0.92,
    metalness: 0.0,
    texture: "2k_venus_surface.jpg",
  },
  {
    name: "Tierra",
    radiusKm: 6371,
    distanceAU: 1.0,
    orbitalInclination: 0.0, // la Tierra define el plano de referencia (la eclíptica)
    rotationHours: 24,
    orbitalDays: 365.25,
    axialTilt: 23.44,
    color: 0x3a6ea5,
    roughness: 0.65,
    metalness: 0.05,
    texture: "2k_earth_daymap.jpg",
    moons: [
      {
        name: "Luna",
        radiusKm: 1737,
        color: 0xaaaaaa,
        roughness: 1,
        metalness: 0,
        texture: "2k_moon.jpg",
        orbitalDays: 27.3,
        rotationHours: 655.7,
        distanceUnits: 10, // órbita visual, no a escala real (si no, sería invisible de cerca)
      },
    ],
  },
  {
    name: "Marte",
    radiusKm: 3390,
    distanceAU: 1.52,
    orbitalInclination: 1.85,
    rotationHours: 24.6,
    orbitalDays: 687,
    axialTilt: 25.19,
    color: 0xb15533,
    roughness: 0.95,
    metalness: 0.02,
    texture: "2k_mars.jpg",
  },
  {
    name: "Júpiter",
    radiusKm: 69911,
    distanceAU: 5.2,
    orbitalInclination: 1.3,
    rotationHours: 9.9,
    orbitalDays: 4331,
    axialTilt: 3.13,
    color: 0xc9a67a,
    roughness: 0.85,
    metalness: 0.0,
    texture: "2k_jupiter.jpg",
    // Las 4 lunas galileanas — descubiertas por Galileo Galilei en 1610,
    // las primeras lunas descubiertas orbitando un planeta que no era la Tierra.
    moons: [
      {
        name: "Ío",
        radiusKm: 1821,
        color: 0xd9c86a,
        roughness: 0.88,
        metalness: 0.0,
        texture: null, // sin textura propia por ahora: usa el color de respaldo
        orbitalDays: 1.77,
        rotationHours: 1.77 * 24, // tidalmente bloqueada: rotación = período orbital
        distanceUnits: 52,
      },
      {
        name: "Europa",
        radiusKm: 1560,
        color: 0xcbb896,
        roughness: 0.35,
        metalness: 0.05,
        texture: null,
        orbitalDays: 3.55,
        rotationHours: 3.55 * 24,
        distanceUnits: 68,
      },
      {
        name: "Ganímedes",
        radiusKm: 2634,
        color: 0x8f8579,
        roughness: 0.55,
        metalness: 0.03,
        texture: null,
        orbitalDays: 7.15,
        rotationHours: 7.15 * 24,
        distanceUnits: 88,
      },
      {
        name: "Calisto",
        radiusKm: 2410,
        color: 0x5c554d,
        roughness: 0.8,
        metalness: 0.02,
        texture: null,
        orbitalDays: 16.69,
        rotationHours: 16.69 * 24,
        distanceUnits: 112,
      },
    ],
  },
  {
    name: "Saturno",
    radiusKm: 58232,
    distanceAU: 9.58,
    orbitalInclination: 2.49,
    rotationHours: 10.7,
    orbitalDays: 10747,
    axialTilt: 26.73,
    color: 0xdccb9a,
    roughness: 0.85,
    metalness: 0.0,
    texture: "2k_saturn.jpg",
    ring: {
      innerRadiusKm: 74500,
      outerRadiusKm: 140000,
      texture: "2k_saturn_ring_alpha.png",
    },
    moons: [
      {
        name: "Titán",
        radiusKm: 2575,
        color: 0xd9a441, // tono anaranjado real, por su atmósfera densa de nitrógeno
        roughness: 0.9,
        metalness: 0.0,
        texture: null,
        orbitalDays: 15.95,
        rotationHours: 15.95 * 24,
        distanceUnits: 58,
      },
    ],
  },
  {
    name: "Urano",
    radiusKm: 25362,
    distanceAU: 19.2,
    orbitalInclination: 0.77,
    rotationHours: -17.2, // también retrógrado
    orbitalDays: 30589,
    axialTilt: 97.77, // gira "de lado" — dato real curioso
    color: 0x9fd4e0,
    roughness: 0.7,
    metalness: 0.0,
    texture: "2k_uranus.jpg",
  },
  {
    name: "Neptuno",
    radiusKm: 24622,
    distanceAU: 30.05,
    orbitalInclination: 1.77,
    rotationHours: 16.1,
    orbitalDays: 59800,
    axialTilt: 28.32,
    color: 0x4363d8,
    roughness: 0.7,
    metalness: 0.0,
    texture: "2k_neptune.jpg",
  },
];

/* ------------------------------------------------------------
   VELOCIDAD DE SIMULACIÓN
   -------------------------------------------------------------
   Un año terrestre real tarda 365 días; nadie va a esperar eso
   frente a la pantalla. EARTH_YEAR_SECONDS define cuánto dura
   una órbita completa de la Tierra en segundos de tiempo REAL
   al ratio de velocidad "1x" (FASE 9 conecta esto al control
   de Play/Pausa/Velocidad).
   ------------------------------------------------------------ */

export const EARTH_YEAR_SECONDS = 48;
export const EARTH_DAY_SECONDS = EARTH_YEAR_SECONDS / 365.25;

// loadTextureOrNull ahora vive en utils.js — la usan también sun.js y comets.js

/**
 * Crea un planeta completo: pivote de órbita + mesh + (opcional) anillo + (opcional) luna.
 * Devuelve un objeto con referencias para animarlo cada frame.
 */
export async function createPlanet(data) {
  const orbitPivot = new THREE.Object3D(); // gira completo → produce la traslación
  orbitPivot.name = `${data.name}-orbit-pivot`;

  // Inclinación real del plano orbital respecto a la eclíptica. La exageramos
  // x4 a propósito: el valor real (0-7°) es casi imperceptible a esta escala,
  // y sin este empujón el sistema entero colapsa en una línea perfectamente
  // plana si la cámara mira exactamente de canto. Sigue siendo muy sutil,
  // solo lo suficiente para que cada órbita tenga su propio plano.
  const INCLINATION_EXAGGERATION = 4;
  const inclinationRad = THREE.MathUtils.degToRad(data.orbitalInclination * INCLINATION_EXAGGERATION);
  orbitPivot.rotation.x = inclinationRad;

  const radius = data.radiusKm * SIZE_SCALE;
  const distance = scaledDistance(data.distanceAU);

  const texture = await loadTextureOrNull(`textures/${data.texture}`);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: texture ? 0xffffff : data.color, // si hay textura, no tintamos; si no, usamos el color real aproximado
    // Cada tipo de superficie responde distinto a la luz: roca/polvo es mate
    // (roughness alto), hielo tiene algo de brillo especular (roughness bajo).
    // Los valores de respaldo (0.9 / 0.05) cubren cualquier cuerpo al que
    // todavía no le hayamos afinado su material a mano.
    roughness: data.roughness ?? 0.9,
    metalness: data.metalness ?? 0.05,
  });

  const geometry = new THREE.SphereGeometry(radius, 48, 48);
  // "Pivote de orientación": tiene la posición orbital y la inclinación axial,
  // pero NO gira con el día/noche del planeta. El anillo y las lunas cuelgan
  // de acá — así se quedan fijos en su plano en vez de "arrastrarse" con el
  // giro rápido de la esfera (ese era el bug: antes colgaban de `mesh`, que
  // gira sobre su eje Y cada frame para simular el día/noche, y heredaban
  // ese giro por error).
  const orientationPivot = new THREE.Object3D();
  orientationPivot.position.x = distance;
  orientationPivot.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);
  orbitPivot.add(orientationPivot);

  const mesh = new THREE.Mesh(geometry, material);
  // El mesh ya NO carga distancia ni inclinación — eso lo maneja orientationPivot.
  // Acá solo vive el giro rápido del día/noche (mesh.rotation.y en updatePlanets).
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = data.name;

  orientationPivot.add(mesh);

  // Línea de órbita: un anillo delgado para ubicar visualmente cada trayectoria
  const orbitLine = createOrbitLine(distance);
  orbitLine.rotation.x = inclinationRad; // misma inclinación que el pivote, para que coincidan

  // Anillos (solo Saturno, por ahora — Urano tiene anillos reales pero mucho más tenues, FASE13 quality pass)
  let ringMesh = null;
  if (data.ring) {
    ringMesh = await createRing(data.ring);
    orientationPivot.add(ringMesh); // hijo del pivote fijo, NO de la esfera giratoria
  }

  // Lunas (cualquier cantidad por planeta — Tierra tiene 1, Júpiter 4, Saturno 1 en esta fase)
  let moons = [];
  if (data.moons && data.moons.length > 0) {
    moons = await Promise.all(data.moons.map(createMoon));
    moons.forEach((moon) => orientationPivot.add(moon.pivot)); // ídem: no cuelgan de la esfera giratoria
  }

  // Velocidades angulares:
  // - Traslación: Kepler dice que a mayor distancia, menor velocidad orbital.
  //   Derivamos la velocidad de la distancia YA comprimida, así el efecto
  //   visual de "los planetas lejanos se mueven más lento" se mantiene
  //   coherente con lo que el ojo ve, sin depender de los días reales.
  // - Rotación: sí usamos las horas reales, para que Júpiter gire notablemente
  //   más rápido que la Tierra y Venus/Urano giren al revés.
  const orbitalAngularSpeed = (2 * Math.PI) / (EARTH_YEAR_SECONDS * Math.pow(data.distanceAU, 1.5));
  const rotationAngularSpeed = (2 * Math.PI) / (EARTH_DAY_SECONDS * (data.rotationHours / 24));

  return {
    name: data.name,
    orbitPivot,
    orbitLine,
    mesh,
    orientationPivot, // FASE 15: acá cuelgan satélites artificiales (ISS, Tiangong) para la Tierra
    radius,
    ringMesh,
    moons,
    orbitalAngularSpeed,
    rotationAngularSpeed,
  };
}

function createOrbitLine(distance) {
  const segments = 128;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * distance, 0, Math.sin(theta) * distance));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x4fd1ff,
    transparent: true,
    opacity: 0.15,
  });
  return new THREE.Line(geometry, material);
}

async function createRing(ringData) {
  const inner = ringData.innerRadiusKm * SIZE_SCALE;
  const outer = ringData.outerRadiusKm * SIZE_SCALE;

  const texture = await loadTextureOrNull(`textures/${ringData.texture}`);

  const geometry = new THREE.RingGeometry(inner, outer, 128);
  // RingGeometry por defecto genera UVs radiales que no sirven para una textura
  // lineal de anillo; las remapeamos para que la textura se vea correctamente.
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const distFromCenter = v3.length();
    const u = (distFromCenter - inner) / (outer - inner);
    uv.setXY(i, u, 1);
  }

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: texture ? 0xffffff : 0xcbbfa0,
    transparent: true,
    opacity: texture ? 1 : 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = Math.PI / 2; // el anillo nace vertical; lo acostamos sobre el ecuador
  return ring;
}

async function createMoon(moonData) {
  const pivot = new THREE.Object3D();
  const texture = moonData.texture ? await loadTextureOrNull(`textures/${moonData.texture}`) : null;

  const radius = moonData.radiusKm * SIZE_SCALE;
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: texture ? 0xffffff : moonData.color,
    roughness: moonData.roughness ?? 1,
    metalness: moonData.metalness ?? 0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = moonData.distanceUnits;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = moonData.name;

  pivot.add(mesh);

  const orbitalAngularSpeed = (2 * Math.PI) / (EARTH_DAY_SECONDS * moonData.orbitalDays);
  const rotationAngularSpeed = (2 * Math.PI) / (EARTH_DAY_SECONDS * (moonData.rotationHours / 24));

  return { name: moonData.name, pivot, mesh, radius, orbitalAngularSpeed, rotationAngularSpeed };
}

/**
 * Crea todos los planetas definidos en PLANET_DATA y los agrega a la escena.
 * Devuelve el arreglo de objetos "planeta" para que script.js los anime.
 */
export async function createAllPlanets(scene) {
  const planets = await Promise.all(PLANET_DATA.map(createPlanet));
  planets.forEach((planet) => {
    scene.add(planet.orbitPivot);
    scene.add(planet.orbitLine);
  });
  return planets;
}

/**
 * Actualiza rotación y traslación de cada planeta según el tiempo transcurrido.
 * `speedMultiplier` queda listo para conectarse al control de velocidad (FASE 9).
 */
export function updatePlanets(planets, delta, speedMultiplier = 1) {
  planets.forEach((planet) => {
    planet.orbitPivot.rotation.y += planet.orbitalAngularSpeed * delta * speedMultiplier;
    planet.mesh.rotation.y += planet.rotationAngularSpeed * delta * speedMultiplier;

    planet.moons.forEach((moon) => {
      moon.pivot.rotation.y += moon.orbitalAngularSpeed * delta * speedMultiplier;
      moon.mesh.rotation.y += moon.rotationAngularSpeed * delta * speedMultiplier;
    });
  });
}

/**
 * Vuelve cada planeta y sus lunas a su posición orbital inicial.
 * Usado por el control "Reset" de la FASE 9.
 */
export function resetPlanets(planets) {
  planets.forEach((planet) => {
    planet.orbitPivot.rotation.y = 0;
    planet.mesh.rotation.y = 0;
    planet.moons.forEach((moon) => {
      moon.pivot.rotation.y = 0;
      moon.mesh.rotation.y = 0;
    });
  });
}
