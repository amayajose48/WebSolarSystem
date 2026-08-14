/* ============================================================
   ORBITA — space.js
   FASE 4: Profundidad del espacio profundo
   -------------------------------------------------------------
   Solo queda la capa de polvo espacial: nebulosas y galaxias se
   sacaron a pedido (no aportaban identidad real como destino, y
   visualmente quedaban demasiado grandes/artificiales). El polvo
   sigue siendo útil por sí solo: es la capa que da la sensación
   de profundidad (parallax) al girar la cámara, sin ser un
   "destino" que alguien esperaría poder tocar.
   ============================================================ */

import * as THREE from "three";

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

export function createDeepSpace() {
  const dust = createSpaceDust();

  function update(elapsed) {
    dust.rotation.y = elapsed * 0.006;
  }

  return { dust, update };
}
