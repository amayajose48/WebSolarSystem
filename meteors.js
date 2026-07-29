/* ============================================================
   ORBITA — meteors.js
   FASE 14: Meteoritos / estrellas fugaces
   -------------------------------------------------------------
   Son el mismo fenómeno visual (una roca cruzando el cielo a toda
   velocidad y dejando una estela), así que un solo sistema cubre
   ambos ítems de la lista original. Aparecen a intervalos
   aleatorios, cruzan una porción del cielo lejano en línea recta
   y se desvanecen — nunca dos veces exactamente igual.
   ============================================================ */

import * as THREE from "three";

const METEOR_COUNT = 6; // cuántos "objetos" existen en paralelo (reciclados)
const METEOR_FIELD_RADIUS = 3200; // a qué distancia del Sol cruzan, lejos de los planetas
const TRAIL_POINTS = 12;

function createMeteorMesh() {
  const positions = new Float32Array(TRAIL_POINTS * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Line(geometry, material);
}

/**
 * Cada meteoro es un ciclo: espera un tiempo aleatorio, cruza el cielo en
 * línea recta durante ~0.6-1.2s, y vuelve a esperar. `state` guarda en qué
 * parte del ciclo está cada uno.
 */
function createMeteorState() {
  return {
    phase: "waiting", // "waiting" | "flying"
    timer: Math.random() * 4, // arrancan escalonados, no todos a la vez
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
    duration: 0.7,
  };
}

function randomPointOnFieldSphere() {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = METEOR_FIELD_RADIUS * (0.9 + Math.random() * 0.2);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

function launchMeteor(state) {
  // Cruza en línea recta entre dos puntos cercanos de la misma región del
  // cielo — así parece un trazo rápido, no un salto de un lado al otro.
  const start = randomPointOnFieldSphere();
  const direction = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize();
  const travelDistance = THREE.MathUtils.lerp(300, 700, Math.random());
  const end = start.clone().add(direction.multiplyScalar(travelDistance));

  state.phase = "flying";
  state.start.copy(start);
  state.end.copy(end);
  state.duration = THREE.MathUtils.lerp(0.5, 1.1, Math.random());
  state.timer = 0;
}

export function createMeteorShower(scene) {
  const meteors = [];

  for (let i = 0; i < METEOR_COUNT; i++) {
    const mesh = createMeteorMesh();
    scene.add(mesh);
    meteors.push({ mesh, state: createMeteorState() });
  }

  function update(delta) {
    meteors.forEach(({ mesh, state }) => {
      state.timer += delta;

      if (state.phase === "waiting") {
        mesh.material.opacity = 0;
        if (state.timer > 3 + Math.random() * 5) {
          launchMeteor(state);
        }
        return;
      }

      // phase === "flying"
      const t = Math.min(state.timer / state.duration, 1);
      const headPosition = state.start.clone().lerp(state.end, t);

      // La estela son varios puntos entre la posición actual y un poco
      // "atrás" en el tiempo — simula el rastro que deja al cruzar.
      const positions = mesh.geometry.attributes.position.array;
      for (let i = 0; i < TRAIL_POINTS; i++) {
        const trailT = Math.max(t - (i / TRAIL_POINTS) * 0.15, 0);
        const point = state.start.clone().lerp(state.end, trailT);
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      }
      mesh.geometry.attributes.position.needsUpdate = true;

      // Aparece y se desvanece suavemente en vez de aparecer/desaparecer de golpe
      const fadeIn = Math.min(t / 0.15, 1);
      const fadeOut = Math.min((1 - t) / 0.25, 1);
      mesh.material.opacity = Math.min(fadeIn, fadeOut) * 0.9;

      if (t >= 1) {
        state.phase = "waiting";
        state.timer = 0;
      }
    });
  }

  return { update };
}
