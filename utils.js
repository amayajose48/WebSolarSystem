/* ============================================================
   ORBITA — utils.js
   FASE 11: Utilidades compartidas
   -------------------------------------------------------------
   Antes de esta fase, `loadTextureOrNull` estaba copiada y pegada
   igual en planets.js y sun.js, y el patrón de "textura de brillo
   radial" se repetía en sun.js y comets.js. Se consolidan acá para
   que cada cosa exista en un solo lugar — si hay que cambiar cómo
   se cargan las texturas, se cambia una vez, no en 4 archivos.
   ============================================================ */

import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

/**
 * Carga una textura con fallback: si el archivo no existe todavía
 * (el usuario no lo ha descargado), resuelve `null` en vez de
 * romper la escena — quien llama decide qué color usar de respaldo.
 */
export function loadTextureOrNull(path) {
  return new Promise((resolve) => {
    textureLoader.load(
      path,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      },
      undefined,
      () => resolve(null) // onError → sin textura, quien llama usa su color de respaldo
    );
  });
}

/**
 * Genera una textura de brillo radial (centro sólido → bordes transparentes)
 * dibujada en un canvas 2D. La usan el halo del Sol y los halos de los
 * cometas — cada uno con sus propios colores, pero la misma técnica.
 *
 * `stops` es un arreglo de [offset, colorCSS], igual que addColorStop.
 * Ejemplo: [[0, "rgba(255,255,255,0.9)"], [1, "rgba(255,255,255,0)"]]
 */
export function createRadialGlowTexture(size = 256, stops = []) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}
