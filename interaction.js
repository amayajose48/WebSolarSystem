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
 * Junta en un solo arreglo todos los objetos que se pueden "tocar":
 * el Sol, cada planeta y cada una de sus lunas. Cada entrada guarda
 * también su radio (para calcular qué tan cerca acercar la cámara)
 * y su nombre (para buscar el contenido educativo en content.js).
 */
export function buildClickableRegistry(sun, planets) {
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
 * fue sobre espacio vacío (señal para "deseleccionar").
 */
export function setupClickDetection(camera, renderer, registry, onPick) {
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const meshes = registry.map((entry) => entry.mesh);

  let downX = 0;
  let downY = 0;
  const DRAG_THRESHOLD = 6; // píxeles

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
    onPick(hitEntry ?? null);
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
