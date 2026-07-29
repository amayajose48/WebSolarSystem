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
import { EARTH_DAY_SECONDS } from "./planets.js";
import { createRadialGlowTexture } from "./utils.js";

const STATION_CONFIGS = [
  {
    name: "Estación Espacial Internacional",
    distanceUnits: 6.4, // más cerca que la Luna (10): son satélites de órbita baja, no un cuerpo celeste
    orbitalMinutes: 92, // periodo orbital real
    bodyColor: 0xd8d8d8,
    panelColor: 0x16305c,
  },
  {
    name: "Estación Espacial China (Tiangong)",
    distanceUnits: 7.6,
    orbitalMinutes: 90,
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

  const stations = STATION_CONFIGS.map((config, index) => {
    const pivot = new THREE.Object3D();
    const model = index === 0 ? createISSModel(config.bodyColor, config.panelColor) : createTiangongModel(config.bodyColor, config.panelColor);
    model.position.x = config.distanceUnits;
    // Escala grande a propósito: no es a escala real (la ISS real sería un
    // punto invisible), es para que la silueta (truss, paneles) se reconozca
    // bien al acercar la cámara — el objetivo es que SE VEA la figura, no
    // solo un brillo.
    model.scale.setScalar(3.2);
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Halo pequeño y tenue: solo ayuda a ubicarla de lejos y sirve de blanco
    // de clic — a propósito chico, para no tapar la silueta del modelo real.
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
    glow.scale.set(1.6, 1.6, 1);
    glow.position.copy(model.position);

    pivot.add(model);
    pivot.add(glow);

    const initialAngle = Math.random() * Math.PI * 2;
    pivot.rotation.y = initialAngle;
    earthOrientationPivot.add(pivot);

    const orbitalPeriodDays = config.orbitalMinutes / (24 * 60);
    const orbitalAngularSpeed = (2 * Math.PI) / (EARTH_DAY_SECONDS * orbitalPeriodDays);

    return { name: config.name, pivot, model, glow, radius: 3.5, initialAngle, orbitalAngularSpeed };
  });

  function update(delta, speedMultiplier = 1) {
    stations.forEach((station) => {
      station.pivot.rotation.y += station.orbitalAngularSpeed * delta * speedMultiplier;
      station.model.rotation.y += delta * 0.3 * speedMultiplier; // giro lento sobre sí misma, detalle visual
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
