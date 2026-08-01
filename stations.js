/* ============================================================
   ORBITA — stations.js
   FASE 15: Estaciones espaciales artificiales
   -------------------------------------------------------------
   A diferencia de los planetas y lunas (esferas con textura), las
   estaciones espaciales son construcciones humanas: se modelan a
   mano con geometrías simples (cilindros + paneles) en vez de una
   esfera. Orbitan la Tierra a baja altura y a gran velocidad
   angular (la ISS da la vuelta al planeta cada ~92 minutos reales).

   Cuelgan del "pivote de orientación" de la Tierra (el mismo que
   ya usan el anillo de Saturno y las lunas — ver planets.js), NO
   de su malla, para no heredar el giro rápido del día/noche.
   ============================================================ */

import * as THREE from "three";
import { createRadialGlowTexture } from "./utils.js";

const STATION_CONFIGS = [
  {
    name: "Estación Espacial Internacional",
    distanceUnits: 4.2, // el radio de la Tierra es ~3.54 — esto la deja en órbita baja, bien cerca de la superficie
    orbitalMinutes: 92, // periodo orbital REAL (dato para el panel de información, no maneja la animación)
    simulatedOrbitSeconds: 9, // a velocidad 1x, cuánto tarda en dar una vuelta visible en la simulación
    bodyColor: 0xd8d8d8,
    panelColor: 0x16305c,
  },
  {
    name: "Estación Espacial China (Tiangong)",
    distanceUnits: 4.6,
    orbitalMinutes: 90,
    simulatedOrbitSeconds: 10.5, // ligeramente distinto al de la ISS para que no queden siempre alineadas
    bodyColor: 0xe8e4d8,
    panelColor: 0x123a52,
  },
];

/**
 * Modelo simplificado de la ISS: un truss central (la "columna vertebral"
 * real de la estación) con paneles solares en ambos extremos, más un
 * módulo habitable cruzado en el medio.
 */
function createISSModel(bodyColor, panelColor) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55, metalness: 0.4 });
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: panelColor,
    roughness: 0.25,
    metalness: 0.6,
    emissive: panelColor,
    emissiveIntensity: 0.12,
  });

  const truss = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.5, 8), bodyMaterial);
  truss.rotation.z = Math.PI / 2;
  group.add(truss);

  const module = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 8), bodyMaterial);
  module.rotation.x = Math.PI / 2;
  group.add(module);

  const panelGeometry = new THREE.BoxGeometry(0.5, 0.015, 0.2);
  [-0.7, 0.7].forEach((x) => {
    [-0.13, 0.13].forEach((z) => {
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.position.set(x, 0, z);
      group.add(panel);
    });
  });

  return group;
}

/**
 * Modelo simplificado de Tiangong: forma de "T" real — un módulo núcleo
 * (Tianhe) con dos módulos laboratorio (Wentian y Mengtian) a los costados.
 */
function createTiangongModel(bodyColor, panelColor) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5, metalness: 0.35 });
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: panelColor,
    roughness: 0.25,
    metalness: 0.6,
    emissive: panelColor,
    emissiveIntensity: 0.12,
  });

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.55, 10), bodyMaterial);
  core.rotation.z = Math.PI / 2;
  group.add(core);

  [-0.3, 0.3].forEach((z) => {
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.38, 10), bodyMaterial);
    lab.rotation.x = Math.PI / 2;
    lab.position.set(0.22, 0, z);
    group.add(lab);
  });

  const panelGeometry = new THREE.BoxGeometry(0.38, 0.015, 0.16);
  [-0.42, 0.42].forEach((x) => {
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(x, 0, 0);
    group.add(panel);
  });

  return group;
}

/**
 * Crea ambas estaciones y las cuelga del pivote de orientación de la Tierra.
 * `earthOrientationPivot` viene de planets.js (mismo mecanismo que el
 * anillo de Saturno: FASE 15 lo expone para poder usarlo acá también).
 */

export function createSpaceStations(earthOrientationPivot) {
  if (!earthOrientationPivot) {
    return { stations: [], update() {}, reset() {} };
  }

  // === 1. LIMPIEZA DE INSTANCIAS ANTERIORES ===
  // Buscamos y removemos del pivote de la Tierra solo los objetos llamados "pivote-estacion"
  const antiguasEstaciones = earthOrientationPivot.children.filter(
    (child) => child.name === "pivote-estacion"
  );
  antiguasEstaciones.forEach((oldStation) => {
    earthOrientationPivot.remove(oldStation);
  });
  // ============================================

  const stations = STATION_CONFIGS.map((config, index) => {
    const pivot = new THREE.Object3D();
    
    // === 2. ASIGNAR NOMBRE AL PIVOTE ===
    // Esto nos permite identificarlo en la limpieza de arriba cuando el código se recargue
    pivot.name = "pivote-estacion"; 
    // ===================================

    const model = index === 0 ? createISSModel(config.bodyColor, config.panelColor) : createTiangongModel(config.bodyColor, config.panelColor);
    model.position.x = config.distanceUnits;
    
    model.scale.setScalar(0.5);
    // A esta escala tan chica, las piezas finitas (truss, paneles) generan
    // auto-sombras mal calculadas con una luz pensada para objetos del
    // tamaño de un planeta — eso se veía como una silueta "duplicada".
    // Mismo tipo de ajuste que ya hicimos con el cinturón de asteroides.
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createRadialGlowTexture(64, [
          [0, "rgba(255, 255, 255, 0.55)"],
          [0.5, "rgba(200, 220, 255, 0.18)"],
          [1, "rgba(200, 220, 255, 0)"],
        ]),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.scale.set(0.6, 0.6, 1);
    glow.position.copy(model.position);

    pivot.add(model);
    pivot.add(glow);

    const initialAngle = Math.random() * Math.PI * 2;
    pivot.rotation.y = initialAngle;
    earthOrientationPivot.add(pivot);

    // Nota importante: NO usamos la misma compresión de tiempo que los
    // planetas (EARTH_DAY_SECONDS). Esa proporción está pensada para
    // períodos de DÍAS/AÑOS — aplicada a los 92 minutos reales de la ISS,
    // daba una velocidad angular absurda (más de una vuelta completa por
    // frame), que se veía como si hubiera varias estaciones a la vez
    // (un efecto estroboscópico). Acá usamos directamente cuántos segundos
    // reales debe tardar una vuelta visible en la simulación.
    const orbitalAngularSpeed = (2 * Math.PI) / config.simulatedOrbitSeconds;

    // radius se usa para calcular a qué distancia acercarse al hacer clic
    // (ver computeFramingPosition en script.js) — ajustado a la escala 0.5
    // actual (antes decía 3.5, de cuando el modelo era mucho más grande).
    return { name: config.name, pivot, model, glow, radius: 0.6, initialAngle, orbitalAngularSpeed };
  });

  // Asegúrate de mantener los bloques de update y reset al final de tu función original:
  function update(delta, speedMultiplier = 1) {
    stations.forEach((station) => {
      station.pivot.rotation.y += station.orbitalAngularSpeed * delta * speedMultiplier;
      station.model.rotation.y += delta * 0.3 * speedMultiplier; 
    });
  }

  function reset() {
    stations.forEach((station) => {
      station.pivot.rotation.y = station.initialAngle;
      station.model.rotation.y = 0;
    });
  }

  return { stations, update, reset };
}
