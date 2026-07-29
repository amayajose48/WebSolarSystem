/* ============================================================
   ORBITA — asteroids.js
   FASE 3: Cinturón de asteroides
   -------------------------------------------------------------
   Usa InstancedMesh: una sola geometría/material se dibuja N
   veces con una matriz de transformación distinta por instancia.
   Esto es lo que permite tener cientos de asteroides sin que el
   framerate se caiga — la alternativa (un THREE.Mesh por roca)
   sería cientos de draw calls separados.
   ============================================================ */

import * as THREE from "three";

// Rango real del cinturón, ya en las unidades comprimidas de planets.js
// (equivale aprox. a 2.1–3.3 UA, el rango real del cinturón de asteroides)
const BELT_INNER_RADIUS = 185;
const BELT_OUTER_RADIUS = 255;
const BELT_THICKNESS = 8; // dispersión vertical, para que no sea un anillo perfectamente plano

/**
 * Genera la geometría base de una "roca": un icosaedro con sus vértices
 * desplazados aleatoriamente. Se hace UNA sola vez y se reutiliza en
 * todas las instancias (la variedad visual viene del escalado por
 * instancia, no de geometría distinta por roca — así es barato).
 */
function createRockGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const displacement = 0.75 + Math.random() * 0.5; // entre 75% y 125% del radio original
    position.setXYZ(
      i,
      position.getX(i) * displacement,
      position.getY(i) * displacement,
      position.getZ(i) * displacement
    );
  }

  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Crea el cinturón completo de asteroides.
 * Devuelve { mesh, update(delta) } — `mesh` se agrega a la escena,
 * `update` se llama cada frame para animar traslación y rotación.
 */
export function createAsteroidBelt(count = 500) {
  const geometry = createRockGeometry();
  const material = new THREE.MeshStandardMaterial({
    roughness: 1,
    metalness: 0.1,
    vertexColors: false,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  // A esta escala y distancia, que cientos de rocas chiquitas proyecten
  // sombra en tiempo real sobre los planetas no suma nada visualmente —
  // solo generaba manchas oscuras con bordes duros y poco realistas.
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  // Datos por-instancia que necesitamos recalcular cada frame
  // (no se pueden derivar de la matriz ya guardada, así que los
  // guardamos aparte en arreglos paralelos).
  const asteroidData = [];

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const rockPalette = [0x8a7f70, 0x6e6259, 0x9c8f7d, 0x5c5347];

  for (let i = 0; i < count; i++) {
    const radius = THREE.MathUtils.lerp(BELT_INNER_RADIUS, BELT_OUTER_RADIUS, Math.random());
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * BELT_THICKNESS;
    // Antes llegaban hasta 2.2*1.3 ≈ 2.9 unidades — casi tan grandes como
    // Mercurio (radio ~1.36). Un asteroide real es una roca, no un planeta:
    // el rango correcto es muchísimo más chico.
    const scale = THREE.MathUtils.lerp(0.08, 0.35, Math.random());
    // Escalado no-uniforme por eje: mismo icosaedro base, silueta distinta cada vez
    const scaleX = scale * THREE.MathUtils.lerp(0.7, 1.3, Math.random());
    const scaleY = scale * THREE.MathUtils.lerp(0.7, 1.3, Math.random());
    const scaleZ = scale * THREE.MathUtils.lerp(0.7, 1.3, Math.random());

    // Kepler simplificado: a mayor radio orbital, menor velocidad angular
    // Factor ajustado para mantener el mismo ritmo que el resto del sistema
    // (ver EARTH_YEAR_SECONDS en planets.js — antes 20s por año, ahora 48s)
    const orbitalSpeed = (0.0625 / Math.pow(radius / BELT_INNER_RADIUS, 1.5)) * (Math.random() * 0.4 + 0.8);
    const spinSpeed = (Math.random() - 0.5) * 2;

    asteroidData.push({
      radius,
      angle,
      initialAngle: angle, // guardado aparte para poder volver acá con reset()
      height,
      scaleX,
      scaleY,
      scaleZ,
      orbitalSpeed,
      spinSpeed,
      rotX: Math.random() * Math.PI,
      rotY: Math.random() * Math.PI,
      initialRotY: 0, // se completa justo abajo, una vez que rotY ya existe
      rotZ: Math.random() * Math.PI,
    });
    asteroidData[i].initialRotY = asteroidData[i].rotY;

    dummy.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    dummy.scale.set(scaleX, scaleY, scaleZ);
    dummy.rotation.set(asteroidData[i].rotX, asteroidData[i].rotY, asteroidData[i].rotZ);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    color.setHex(rockPalette[Math.floor(Math.random() * rockPalette.length)]);
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  function update(delta) {
    for (let i = 0; i < count; i++) {
      const data = asteroidData[i];
      data.angle += data.orbitalSpeed * delta;
      data.rotY += data.spinSpeed * delta;

      dummy.position.set(
        Math.cos(data.angle) * data.radius,
        data.height,
        Math.sin(data.angle) * data.radius
      );
      dummy.scale.set(data.scaleX, data.scaleY, data.scaleZ);
      dummy.rotation.set(data.rotX, data.rotY, data.rotZ);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function reset() {
    asteroidData.forEach((data) => {
      data.angle = data.initialAngle;
      data.rotY = data.initialRotY;
    });
    update(0); // vuelca los valores reseteados a las matrices de inmediato
  }

  return { mesh, update, reset };
}
