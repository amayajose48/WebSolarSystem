/* ============================================================
   ORBITA — interaction.js
   FASE 7: Interacción — detección de clics en 3D
   -------------------------------------------------------------
   Responsabilidad única: saber QUÉ objeto 3D tocó el usuario.
   No toca la cámara ni el DOM del panel — eso lo maneja
   script.js, que es quien conoce el resto del estado de la app.
   ============================================================ */

import * as THREE from "three";

/**
 * Junta en un solo arreglo todos los objetos que se pueden "tocar": el Sol,
 * cada planeta, cada luna, el cinturón de asteroides, los cometas, y las
 * nebulosas/galaxias decorativas del fondo. Cada entrada guarda su radio
 * (para calcular qué tan cerca acercar la cámara) y su nombre (para buscar
 * el contenido educativo en content.js).
 *
 * El polvo espacial (space dust) queda afuera a propósito: es una capa
 * puramente ambiental, no un "destino" identificable — no aporta tocarla.
 */
export function buildClickableRegistry({ sun, planets, asteroidBelt, comets, deepSpace, stations }) {
  const registry = [];

  if (sun) {
    registry.push({ mesh: sun.surface, name: "Sol", radius: sun.radius });
  }

  planets.forEach((planet) => {
    registry.push({ mesh: planet.mesh, name: planet.name, radius: planet.radius });
    planet.moons.forEach((moon) => {
      registry.push({ mesh: moon.mesh, name: moon.name, radius: moon.radius });
    });
  });

  if (asteroidBelt) {
    // Es un único InstancedMesh con cientos de instancias: cualquier
    // asteroide que se toque cuenta como "el cinturón" — el marcado
    // `isInstanced` le avisa a setupClickDetection que necesita resolver
    // la posición exacta de ESA instancia particular, no del mesh entero
    // (que vive en el origen y no representa la posición de ningún asteroide).
    registry.push({
      mesh: asteroidBelt.mesh,
      name: "Cinturón de asteroides",
      radius: 8,
      isInstanced: true,
      followable: false, // no hay "un" asteroide individual que seguir
    });
  }

  if (comets) {
    comets.comets.forEach((comet) => {
      registry.push({ mesh: comet.glow, name: comet.name, radius: comet.radius });
    });
  }

  if (stations) {
    stations.stations.forEach((station) => {
      registry.push({ mesh: station.glow, name: station.name, radius: station.radius });
    });
  }

  if (deepSpace) {
    deepSpace.nebulae.children.forEach((sprite) => {
      registry.push({
        mesh: sprite,
        name: "Nebulosa",
        radius: sprite.scale.x / 2,
        followable: false,
        zoomable: false, // es un sprite plano de fondo — acercarse mucho solo se ve como un borrón
      });
    });
    deepSpace.galaxies.children.forEach((sprite) => {
      registry.push({
        mesh: sprite,
        name: "Galaxia",
        radius: sprite.scale.x / 2,
        followable: false,
        zoomable: false,
      });
    });
  }

  return registry;
}

/**
 * Conecta el detector de clics al canvas. Distingue un "clic real" de
 * un "arrastre para rotar la cámara" midiendo cuánto se movió el mouse
 * entre pointerdown y pointerup — si se movió más de unos pocos píxeles,
 * no cuenta como clic (si no, OrbitControls y la selección de planetas
 * competirían entre sí y sería frustrante de usar).
 *
 * onPick(hit | null) se llama con el objeto tocado, o null si el clic
 * fue sobre espacio vacío (señal para "deseleccionar"). Si el objeto
 * tocado es una instancia del cinturón de asteroides, `hit` además trae
 * `instanceId` para que script.js pueda ubicar esa roca exacta en el espacio.
 */
export function setupClickDetection(camera, renderer, registry, onPick) {
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const meshes = registry.map((entry) => entry.mesh);

  let downX = 0;
  let downY = 0;
  const DRAG_THRESHOLD = 10; // píxeles — un poco más laxo que con mouse, porque el dedo en pantallas táctiles naturalmente tiembla más al tocar

  function onPointerDown(event) {
    downX = event.clientX;
    downY = event.clientY;
  }

  function onPointerUp(event) {
    const dx = event.clientX - downX;
    const dy = event.clientY - downY;
    const movedDistance = Math.sqrt(dx * dx + dy * dy);
    if (movedDistance > DRAG_THRESHOLD) return; // fue un arrastre de cámara, no un clic

    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNDC, camera);
    const intersections = raycaster.intersectObjects(meshes, false);

    if (intersections.length === 0) {
      onPick(null);
      return;
    }

    const hitMesh = intersections[0].object;
    const hitEntry = registry.find((entry) => entry.mesh === hitMesh);
    if (!hitEntry) {
      onPick(null);
      return;
    }

    if (hitEntry.isInstanced) {
      onPick({ ...hitEntry, instanceId: intersections[0].instanceId });
    } else {
      onPick(hitEntry);
    }
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);

  // Cambia el cursor a "mano" cuando pasa sobre algo clickeable — pequeño
  // detalle de affordance que ayuda mucho a que la interacción se sienta clara.
  function onPointerMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const intersections = raycaster.intersectObjects(meshes, false);
    renderer.domElement.style.cursor = intersections.length > 0 ? "pointer" : "grab";
  }
  renderer.domElement.addEventListener("pointermove", onPointerMove);
}
