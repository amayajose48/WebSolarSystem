/* ============================================================
   ORBITA — script.js
   FASE 0: Base del proyecto
   -------------------------------------------------------------
   Contiene:
     1. Configuración de escena, cámara y renderer
     2. OrbitControls
     3. Iluminación base
     4. Sol (placeholder — se mejora en FASE 2 con shader/glow)
     5. Campo de 20,000 estrellas
     6. Pantalla de carga simulada
     7. HUD: reloj UTC + contador de FPS
     8. Loop de animación y manejo de resize

   Las fases siguientes (planetas, asteroides, cometas, etc.)
   se agregan como nuevos módulos/funciones sin tocar lo de aquí.
   ============================================================ */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Lensflare, LensflareElement } from "three/addons/objects/Lensflare.js";
import { createAllPlanets, updatePlanets, resetPlanets } from "./planets.js";
import { createSun } from "./sun.js";
import { createAsteroidBelt } from "./asteroids.js";
import { createDeepSpace } from "./space.js";
// createComets ya no se importa: los cometas quedaron desactivados (ver
// más abajo, sección 5d) — el archivo comets.js sigue existiendo por si
// se quieren reactivar más adelante.
import { buildClickableRegistry, setupClickDetection } from "./interaction.js";
import { BODY_CONTENT } from "./content.js";
import { createMeteorShower } from "./meteors.js";
import { toggleAmbientAudio } from "./audio.js";
import { createSpaceStations } from "./stations.js";
import { TEAM_INFO } from "./team.js";
import { MISSIONS, getProgress, registerVisit, resetProgress } from "./missions.js";

/* ------------------------------------------------------------
   1. ESCENA, CÁMARA, RENDERER
   ------------------------------------------------------------ */

const canvas = document.getElementById("scene-canvas");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50, // FOV
  window.innerWidth / window.innerHeight,
  0.1, // near
  20000 // far — el sistema solar necesita un far plane grande
);
camera.position.set(0, 120, 320);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  logarithmicDepthBuffer: true, // ayuda con precisión de profundidad a escalas grandes
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
// FASE 13: hasta ahora castShadow/receiveShadow estaban puestos en meshes y luz
// desde la FASE 1, pero nunca se había activado esta línea — sin ella, el
// renderer ignora todo lo demás y no dibuja ninguna sombra. PCFSoftShadowMap
// además suaviza el borde (sombras duras se ven "de videojuego viejo").
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* ------------------------------------------------------------
   POSTPROCESADO: BLOOM (FASE 13)
   -------------------------------------------------------------
   En vez de dibujar directo con renderer.render(), la escena pasa
   por un "composer" con distintos pasos (passes). UnrealBloomPass
   detecta las zonas más brillantes que un umbral (threshold) y las
   hace "sangrar" luz alrededor — así el Sol y su corona brillan de
   verdad en vez de ser un círculo con bordes definidos.
   OutputPass al final es necesario para que el tone mapping y el
   espacio de color (sRGB) se apliquen correctamente sobre el
   resultado del bloom (si no, los colores salen apagados/planos).
   ------------------------------------------------------------ */

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.85, // strength: intensidad del brillo
  0.5, // radius: qué tan lejos "sangra" la luz
  0.82 // threshold: solo lo muy brillante (Sol, corona, halos) hace bloom; los planetas normales no
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

/* ------------------------------------------------------------
   2. ORBIT CONTROLS
   ------------------------------------------------------------ */

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 20; // se ajusta dinámicamente por objeto al seleccionar (ver selectBody)
controls.maxDistance = 5000; // ampliado en FASE 4 para poder alejarse y ver nebulosas/galaxias
controls.zoomSpeed = 0.8;

/* ------------------------------------------------------------
   3. ILUMINACIÓN BASE
   ------------------------------------------------------------ */

// Luz ambiental tenue: evita que el lado oscuro de los planetas sea negro absoluto
const ambientLight = new THREE.AmbientLight(0x1a2233, 0.6);
scene.add(ambientLight);

// Luz puntual en el Sol: será la fuente principal de iluminación de todo el sistema
// Nota técnica: desde three.js r155, la intensidad de las luces se mide en candelas
// (modelo "físicamente correcto"), lo que vuelve insignificante una intensidad
// clásica como "3" a la escala de nuestra escena. Usamos decay=0 (sin atenuación
// por distancia — ya era la decisión de diseño para que Neptuno se vea bien) con
// una intensidad ajustada a esta escala no-realista.
// Guardamos la intensidad base para animarle una pulsación sutil (actividad solar).
const SUN_LIGHT_BASE_INTENSITY = 4.5;
const sunLight = new THREE.PointLight(0xfff4e0, SUN_LIGHT_BASE_INTENSITY, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 2000;
// Como recién activamos shadowMap.enabled en esta fase (antes esto nunca se
// había visto renderizado), agregamos bias preventivo: sin esto, es común que
// las esferas muestren un patrón de rayas ("acné de sombra") sobre su propia
// superficie curva.
sunLight.shadow.bias = -0.002;
sunLight.shadow.normalBias = 0.4;
scene.add(sunLight);

/* ------------------------------------------------------------
   3b. LENS FLARE (FASE 13)
   -------------------------------------------------------------
   Los destellos ópticos clásicos que aparecen cuando una fuente de
   luz muy brillante queda casi de frente a la "cámara" — igual que
   pasa con una lente de cámara real. Las texturas son las mismas
   que usa oficialmente el ejemplo de Three.js, pero servidas desde
   la carpeta local textures/ (no desde una URL externa) — así el
   proyecto no depende de que un CDN esté disponible el día de la
   presentación.
   ------------------------------------------------------------ */

const flareLoader = new THREE.TextureLoader();
const flareTextureMain = flareLoader.load("textures/lensflare0.png");
const flareTextureRing = flareLoader.load("textures/lensflare3.png");

const lensflare = new Lensflare();
lensflare.addElement(new LensflareElement(flareTextureMain, 700, 0, sunLight.color));
lensflare.addElement(new LensflareElement(flareTextureRing, 70, 0.6));
lensflare.addElement(new LensflareElement(flareTextureRing, 90, 0.7));
lensflare.addElement(new LensflareElement(flareTextureRing, 130, 0.9));
lensflare.addElement(new LensflareElement(flareTextureRing, 70, 1));
sunLight.add(lensflare);

/* ------------------------------------------------------------
   4. SOL (FASE 2 — shader de plasma, corona y halo)
   -------------------------------------------------------------
   Creación asíncrona porque espera la textura 4K opcional.
   `sun` queda null hasta que resuelve; el loop de animación
   revisa esto antes de intentar actualizarlo.
   ------------------------------------------------------------ */

let sun = null;

/* ------------------------------------------------------------
   5. CAMPO DE ESTRELLAS (20,000 puntos)
   -------------------------------------------------------------
   Distribuidas en una esfera grande alrededor de toda la escena.
   La FASE 4 añade profundidad real (nebulosas, parallax, capas).
   ------------------------------------------------------------ */

function createStarField(count = 20000, radius = 6000) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const colorPalette = [
    new THREE.Color(0xffffff), // blanco
    new THREE.Color(0xaecbff), // azulado
    new THREE.Color(0xfff2c8), // amarillento tenue
  ];

  for (let i = 0; i < count; i++) {
    // Distribución uniforme sobre una esfera (evita agrupamiento en los polos)
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.6 + Math.random() * 0.4); // variación de profundidad

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions.set([x, y, z], i * 3);

    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors.set([color.r, color.g, color.b], i * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.6,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  return new THREE.Points(geometry, material);
}

const starField = createStarField();
scene.add(starField);

/* ------------------------------------------------------------
   5b. CINTURÓN DE ASTEROIDES (FASE 3)
   -------------------------------------------------------------
   No depende de texturas externas, así que se crea de forma
   síncrona (no hace falta esperar ninguna promesa).
   ------------------------------------------------------------ */

const asteroidBelt = createAsteroidBelt(500);
scene.add(asteroidBelt.mesh);

/* ------------------------------------------------------------
   5c. ESPACIO PROFUNDO (FASE 4)
   -------------------------------------------------------------
   Nebulosas, galaxias y polvo espacial — todo procedural, síncrono.
   ------------------------------------------------------------ */

const deepSpace = createDeepSpace();
scene.add(deepSpace.dust);

/* ------------------------------------------------------------
   5d. COMETAS — desactivados a pedido (no se veían bien)
   -------------------------------------------------------------
   Se deja un objeto "vacío" con la misma forma que createComets()
   devuelve, para no tener que tocar el resto del código que ya
   los referencia (loop de animación, reset, registro de clics).
   Si en algún momento se quieren reactivar, alcanza con volver a
   llamar createComets(scene) acá.
   ------------------------------------------------------------ */

const comets = { comets: [], update() {}, reset() {} };

/* ------------------------------------------------------------
   5e. METEOROS / ESTRELLAS FUGACES (FASE 14)
   ------------------------------------------------------------ */

const meteorShower = createMeteorShower(scene);

/* ------------------------------------------------------------
   6. PANTALLA DE CARGA (simulada por ahora)
   -------------------------------------------------------------
   En FASE 1 esto se conecta al progreso real del THREE.LoadingManager
   mientras se cargan texturas de planetas. Por ahora simula progreso
   para dejar el flujo de UI completamente funcional.
   ------------------------------------------------------------ */

const loadingScreen = document.getElementById("loading-screen");
const loadingBarFill = document.getElementById("loading-bar-fill");
const loadingPercent = document.getElementById("loading-percent");
const loadingStatus = document.getElementById("loading-status");
const appUI = document.getElementById("app-ui");

const loadingMessages = [
  "INICIALIZANDO SISTEMA",
  "CALIBRANDO ÓRBITAS",
  "CARGANDO CUERPOS CELESTES",
  "SINCRONIZANDO TELEMETRÍA",
  "LISTO",
];

let fakeProgress = 0;
let fakeProgressInterval = null;

function startFakeProgress() {
  // Avanza hasta 90% "solo"; el 10% final lo cierra la carga real de planetas.
  // Así la barra siempre se siente viva, sin importar cuánto tarden las texturas.
  fakeProgressInterval = setInterval(() => {
    if (fakeProgress < 90) {
      fakeProgress += Math.random() * 10 + 3;
      fakeProgress = Math.min(fakeProgress, 90);
      renderProgress(fakeProgress);
    }
  }, 220);
}

function renderProgress(progress) {
  loadingBarFill.style.width = `${progress}%`;
  loadingPercent.textContent = `${Math.floor(progress)}%`;
  const messageIndex = Math.min(
    Math.floor((progress / 100) * (loadingMessages.length - 1)),
    loadingMessages.length - 1
  );
  loadingStatus.textContent = loadingMessages[messageIndex];
}

function finishLoading() {
  clearInterval(fakeProgressInterval);
  renderProgress(100);
  setTimeout(() => {
    loadingScreen.classList.add("fade-out");
    appUI.classList.remove("hidden");
    startEntranceAnimation(); // FASE 10: el sistema empieza a "materializarse" acá
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 900);
  }, 300);
}

startFakeProgress();

/* ------------------------------------------------------------
   7. HUD: reloj UTC + contador de FPS
   ------------------------------------------------------------ */

const clockValueEl = document.getElementById("hud-clock-value");
const fpsCounterEl = document.getElementById("fps-counter");
const bodyCountEl = document.getElementById("body-count");

/* ------------------------------------------------------------
   PLANETAS (FASE 1)
   -------------------------------------------------------------
   Se crean de forma asíncrona porque cada uno espera su textura.
   `planets` queda vacío hasta que la promesa resuelve; el loop de
   animación revisa `planets.length` antes de intentar actualizarlos.
   ------------------------------------------------------------ */

let planets = [];
let stations = { stations: [], update() {}, reset() {} };

async function initScene() {
  const [sunResult, planetsResult] = await Promise.all([
    createSun(20),
    createAllPlanets(scene),
  ]);

  sun = sunResult;
  scene.add(sun.group);
  planets = planetsResult;

  // FASE 15: la ISS y Tiangong cuelgan del pivote de orientación de la
  // Tierra (no de su malla), igual que el anillo de Saturno y las lunas.
  const earth = planets.find((planet) => planet.name === "Tierra");
  stations = createSpaceStations(earth?.orientationPivot);

  // Sol (1) + cada planeta + su luna si tiene + estaciones artificiales
  const moonCount = planets.reduce((sum, p) => sum + p.moons.length, 0);
  bodyCountEl.textContent = String(1 + planets.length + moonCount + stations.stations.length);

  // FASE 7: ahora que todo existe en la escena, armamos el registro de
  // objetos "tocables" y activamos la detección de clics.
  clickableRegistry = buildClickableRegistry({ sun, planets, asteroidBelt, comets, deepSpace, stations });
  setupClickDetection(camera, renderer, clickableRegistry, handleBodyPicked);

  // FASE 16: lista de nombres únicos de destinos visitables, para la
  // misión "Explorador completo" y para saber contra qué medir el progreso.
  allDestinationNames = [...new Set(clickableRegistry.map((entry) => entry.name))];

  // FASE 10: preparamos la animación de "materialización" — el Sol y los
  // planetas arrancan en escala ~0 y crecen escalonados apenas se revela
  // la interfaz, en vez de aparecer ya completos de golpe.
  setupEntranceAnimation();

  finishLoading();
}

initScene();

function updateClock() {
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  clockValueEl.textContent = `${hh}:${mm}:${ss}`;
}
setInterval(updateClock, 1000);
updateClock();

// Medición simple de FPS mediante promedio móvil
let frameCount = 0;
let lastFpsUpdate = performance.now();

function updateFPS(now) {
  frameCount++;
  if (now - lastFpsUpdate >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    fpsCounterEl.textContent = fps;
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

/* ------------------------------------------------------------
   8. LOOP DE ANIMACIÓN Y RESIZE
   ------------------------------------------------------------ */

const clock = new THREE.Clock();

/* ------------------------------------------------------------
   FASE 7: INTERACCIÓN — selección de destino, cámara cinematográfica
   y panel de información
   -------------------------------------------------------------
   clickableRegistry se llena en initScene() una vez que el Sol y
   los planetas existen de verdad en la escena.
   ------------------------------------------------------------ */

let clickableRegistry = [];
let allDestinationNames = [];
let selectedBodyName = null;

// Guardamos la posición/objetivo de la cámara "libre" para poder volver
// exactamente ahí cuando el usuario cierra el panel o hace clic en el vacío.
const HOME_CAMERA_POSITION = camera.position.clone();
const HOME_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

let cameraTransition = null; // { startPos, endPos, startTarget, endTarget, startTime, duration }

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Arranca una transición suave de cámara hacia endPos/endTarget.
 * Mientras dura, se desactiva OrbitControls (para que no compita con
 * la animación) y se reactiva automáticamente al llegar.
 */
function startCameraTransition(endPos, endTarget, duration = 1400) {
  cameraTransition = {
    startPos: camera.position.clone(),
    endPos: endPos.clone(),
    startTarget: controls.target.clone(),
    endTarget: endTarget.clone(),
    startTime: performance.now(),
    duration,
  };
  controls.enabled = false;
}

function updateCameraTransition() {
  if (!cameraTransition) return;

  const now = performance.now();
  const t = Math.min((now - cameraTransition.startTime) / cameraTransition.duration, 1);
  const eased = easeInOutCubic(t);

  camera.position.lerpVectors(cameraTransition.startPos, cameraTransition.endPos, eased);
  controls.target.lerpVectors(cameraTransition.startTarget, cameraTransition.endTarget, eased);

  if (t >= 1) {
    cameraTransition = null;
    controls.enabled = true;
  }
}

/**
 * Calcula dónde poner la cámara para enfocar un cuerpo, MANTENIENDO el
 * ángulo de vista actual (mismo truco que un dron que se acerca a un
 * punto sin cambiar de dirección) — así la transición se siente
 * cinematográfica en vez de un salto brusco.
 */
function computeFramingPosition(targetPosition, radius) {
  const currentDirection = camera.position.clone().sub(controls.target);
  const direction =
    currentDirection.lengthSq() > 0.0001
      ? currentDirection.normalize()
      : new THREE.Vector3(0, 0.35, 1).normalize();

  // El piso de 6 unidades estaba pensado para que la cámara nunca quedara
  // pegada a un planeta grande — pero para objetos chicos (estaciones,
  // cometas) hacía que el primer encuadre ya arrancara demasiado lejos
  // como para apreciar el detalle. Bajado a 3.
  const viewDistance = Math.max(radius * 4.5, 3) + 4;
  return targetPosition.clone().add(direction.multiplyScalar(viewDistance));
}

/* ------------------------------------------------------------
   FASE 9: ESTADO DE REPRODUCCIÓN
   -------------------------------------------------------------
   simTime es el "reloj propio" de la simulación: solo avanza
   cuando isPlaying es true, y a la velocidad de speedMultiplier.
   Todo lo que se mueve en la escena (Sol, planetas, lunas,
   asteroides, cometas, fondo) depende de este reloj, no del
   tiempo real — así Play/Pausa/Velocidad afectan a todo por igual.
   ------------------------------------------------------------ */

let isPlaying = true;
let speedMultiplier = 1;
let simTime = 0;
const SPEED_STEPS = [0.25, 0.5, 1, 2, 10];

let followEnabled = false;
const followPrevPosition = new THREE.Vector3();

function enableFollow() {
  if (!selectedBodyName) return;
  const entry = clickableRegistry.find((e) => e.name === selectedBodyName);
  if (!entry || entry.followable === false) return; // p.ej. cinturón de asteroides, nebulosas, galaxias
  entry.mesh.getWorldPosition(followPrevPosition);
  followEnabled = true;
  followButton.classList.add("active");
}

function disableFollow() {
  followEnabled = false;
  followButton?.classList.remove("active");
}

/**
 * Si "Seguir" está activo, desplaza cámara Y objetivo por el mismo delta
 * que se movió el cuerpo seleccionado desde el frame anterior. Esto deja
 * que el usuario siga girando/alejando la cámara con el mouse con total
 * libertad (OrbitControls sigue funcionando normalmente), mientras el
 * punto de referencia "viaja" junto al planeta.
 */
function updateFollowCamera() {
  if (!followEnabled || !selectedBodyName || cameraTransition) return;

  const entry = clickableRegistry.find((e) => e.name === selectedBodyName);
  if (!entry) return;

  const newPosition = new THREE.Vector3();
  entry.mesh.getWorldPosition(newPosition);

  const movement = newPosition.clone().sub(followPrevPosition);
  camera.position.add(movement);
  controls.target.copy(newPosition);
  followPrevPosition.copy(newPosition);
}

function selectBody(hit) {
  selectedBodyName = hit.name;
  disableFollow();

  const worldPosition = new THREE.Vector3();

  if (hit.isInstanced && hit.instanceId !== undefined) {
    // El InstancedMesh en sí vive en el origen — no representa la posición
    // de ningún asteroide en particular. Hay que leer la matriz de ESA
    // instancia exacta y combinarla con la matriz mundial del mesh.
    const instanceMatrix = new THREE.Matrix4();
    hit.mesh.getMatrixAt(hit.instanceId, instanceMatrix);
    worldPosition.setFromMatrixPosition(instanceMatrix);
    worldPosition.applyMatrix4(hit.mesh.matrixWorld);
  } else {
    hit.mesh.getWorldPosition(worldPosition);
  }

  const endPos = computeFramingPosition(worldPosition, hit.radius);

  // El zoom mínimo (controls.minDistance) estaba fijo en 20 unidades para
  // TODO — suficiente para no atravesar el Sol, pero de más para objetos
  // chicos como la ISS (radio ~0.6): OrbitControls empujaba la cámara de
  // vuelta a 20 unidades apenas se acercaba, sin dejar ver el detalle real.
  // Ahora se ajusta al tamaño de cada destino.
  if (hit.zoomable !== false) {
    controls.minDistance = Math.max(hit.radius * 1.3, 0.6);
  }

  // Nebulosas/galaxias: son un telón de fondo plano, no un objeto 3D real
  // que tenga sentido "visitar" de cerca — la cámara se queda donde está,
  // solo se muestra la información.
  if (hit.zoomable !== false) {
    startCameraTransition(endPos, worldPosition);
  }

  if (appMode === "educativo") {
    showPanel(hit.name);
  } else {
    hidePanel();
    showQuickTag(hit.name);
  }
  cameraStatusEl.textContent = `ENFOCADO: ${hit.name.toUpperCase()}`;

  // FASE 16: registrar la visita para el sistema de misiones/progreso.
  const newlyCompleted = registerVisit(hit.name, allDestinationNames);
  updatePointsBadge();
  newlyCompleted.forEach(showMissionToast);
  if (!missionsOverlay.classList.contains("hidden")) renderMissionsList(); // si está abierto, refrescar en vivo
}

function deselectBody() {
  disableFollow();
  if (!selectedBodyName) return; // ya estábamos en vista libre, no hacer nada
  selectedBodyName = null;

  controls.minDistance = 20; // volvemos al límite general de la vista libre
  startCameraTransition(HOME_CAMERA_POSITION, HOME_CAMERA_TARGET, 1200);
  hidePanel();
  cameraStatusEl.textContent = "LIBRE";
}

function handleBodyPicked(hit) {
  if (!hit) {
    deselectBody();
  } else {
    selectBody(hit);
  }
}

/* --- Panel de información (DOM) --- */

const infoPanel = document.getElementById("info-panel");
const infoPanelClose = document.getElementById("info-panel-close");
const panelType = document.getElementById("panel-type");
const panelName = document.getElementById("panel-name");
const panelTemperatura = document.getElementById("panel-temperatura");
const panelMasa = document.getElementById("panel-masa");
const panelDiametro = document.getElementById("panel-diametro");
const panelDistancia = document.getElementById("panel-distancia");
const panelDia = document.getElementById("panel-dia");
const panelAnio = document.getElementById("panel-anio");
const panelLunas = document.getElementById("panel-lunas");
const panelCuriosidades = document.getElementById("panel-curiosidades");
const hudHint = document.getElementById("hud-hint");
const cameraStatusEl = document.getElementById("camera-status");

const infoPanelBody = document.getElementById("info-panel-body");
const panelImage = document.getElementById("panel-image");

function showPanel(name) {
  const data = BODY_CONTENT[name];
  if (!data) return; // cuerpo sin contenido educativo cargado todavía

  const panelAlreadyOpen = !infoPanel.classList.contains("hidden");

  function populateContent() {
    panelType.textContent = data.tipo;
    panelName.textContent = name;
    panelTemperatura.textContent = data.temperatura;
    panelMasa.textContent = data.masa;
    panelDiametro.textContent = data.diametro;
    panelDistancia.textContent = data.distanciaAlSol;
    panelDia.textContent = data.dia;
    panelAnio.textContent = data.anio;
    panelLunas.textContent = data.lunas;

    panelCuriosidades.innerHTML = "";
    data.curiosidades.forEach((fact) => {
      const li = document.createElement("li");
      li.textContent = fact;
      panelCuriosidades.appendChild(li);
    });

    // Imagen representativa: solo los cuerpos con textura real (planetas,
    // Sol, Luna) la tienen. Si no hay campo `imagen`, o si el archivo
    // todavía no se descargó, la escondemos en vez de mostrar un ícono roto.
    if (data.imagen) {
      panelImage.onerror = () => panelImage.classList.add("hidden");
      panelImage.src = data.imagen;
      panelImage.alt = `Superficie de ${name}`;
      panelImage.classList.remove("hidden");
    } else {
      panelImage.removeAttribute("src");
      panelImage.classList.add("hidden");
    }
  }

  if (panelAlreadyOpen) {
    // Ya había un panel abierto (el usuario tocó otro destino sin cerrar):
    // hacemos un cross-fade en vez de reemplazar el texto de golpe.
    infoPanelBody.classList.add("content-fading");
    setTimeout(() => {
      populateContent();
      infoPanelBody.classList.remove("content-fading");
    }, 180);
  } else {
    populateContent();
  }

  infoPanel.classList.remove("hidden");
  hudHint.classList.add("hidden");
}

function hidePanel() {
  infoPanel.classList.add("hidden");
}

infoPanelClose.addEventListener("click", deselectBody);

/* ------------------------------------------------------------
   FASE 8: BUSCADOR / SELECTOR DE DESTINO
   -------------------------------------------------------------
   Reutiliza clickableRegistry (ya armado en initScene) — el mismo
   registro que usa el raycasting sirve como fuente de la lista.
   ------------------------------------------------------------ */

const searchOverlay = document.getElementById("search-overlay");
const searchInput = document.getElementById("search-input");
const searchResultsEl = document.getElementById("search-results");
const searchCloseBtn = document.getElementById("search-close");
const searchButton = document.querySelector('[data-action="search"]');

// Quita tildes para que buscar "jupiter" también encuentre "Júpiter"
function normalizeText(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function renderSearchResults(query) {
  const normalizedQuery = normalizeText(query.trim());
  const matches = clickableRegistry.filter((entry) =>
    normalizeText(entry.name).includes(normalizedQuery)
  );

  searchResultsEl.innerHTML = "";

  if (matches.length === 0) {
    const empty = document.createElement("li");
    empty.className = "search-empty";
    empty.textContent = "Sin resultados";
    searchResultsEl.appendChild(empty);
    return;
  }

  matches.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "search-result-item";

    const name = document.createElement("span");
    name.className = "search-result-name";
    name.textContent = entry.name;

    const type = document.createElement("span");
    type.className = "search-result-type";
    type.textContent = BODY_CONTENT[entry.name]?.tipo ?? "";

    item.appendChild(name);
    item.appendChild(type);

    item.addEventListener("click", () => {
      selectBody(entry);
      closeSearch();
    });

    searchResultsEl.appendChild(item);
  });
}

function openSearch() {
  searchOverlay.classList.remove("hidden");
  searchInput.value = "";
  renderSearchResults("");
  searchInput.focus();
}

function closeSearch() {
  searchOverlay.classList.add("hidden");
}

function toggleSearch() {
  if (searchOverlay.classList.contains("hidden")) {
    openSearch();
  } else {
    closeSearch();
  }
}

searchButton.addEventListener("click", toggleSearch);
searchCloseBtn.addEventListener("click", closeSearch);
searchInput.addEventListener("input", (event) => renderSearchResults(event.target.value));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !searchOverlay.classList.contains("hidden")) {
    closeSearch();
  }
});

/* ------------------------------------------------------------
   FASE 8: MODO OSCURO / CLARO
   -------------------------------------------------------------
   La preferencia se guarda en localStorage: es un proyecto real
   que se descarga y se abre como página propia (no un artifact de
   Claude), así que localStorage funciona perfecto acá.
   ------------------------------------------------------------ */

const THEME_STORAGE_KEY = "orbita-theme";
const themeButton = document.querySelector('[data-action="theme"]');

function applyTheme(theme) {
  document.documentElement.classList.toggle("light-theme", theme === "light");
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains("light-theme");
  applyTheme(isLight ? "dark" : "light");
}

// Al cargar: respeta la preferencia guardada, o el modo oscuro por defecto
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
if (savedTheme) applyTheme(savedTheme);

themeButton.addEventListener("click", toggleTheme);

/* ------------------------------------------------------------
   FASE 9: CONEXIÓN DE LA BARRA DE CONTROLES
   ------------------------------------------------------------ */

const playPauseButton = document.getElementById("btn-play-pause");
const playPauseIcon = document.getElementById("play-pause-icon");
const speedButton = document.getElementById("btn-speed");
const speedLabel = document.getElementById("speed-label");
const resetButton = document.getElementById("btn-reset");
const followButton = document.getElementById("btn-follow");
const freeViewButton = document.getElementById("btn-free-view");

function togglePlayPause() {
  isPlaying = !isPlaying;
  playPauseIcon.textContent = isPlaying ? "⏸" : "▶";
  playPauseButton.title = isPlaying ? "Pausar" : "Reproducir";
}

function cycleSpeed() {
  const currentIndex = SPEED_STEPS.indexOf(speedMultiplier);
  const nextIndex = (currentIndex + 1) % SPEED_STEPS.length;
  speedMultiplier = SPEED_STEPS[nextIndex];
  speedLabel.textContent = `${speedMultiplier}x`;
}

function resetSimulation() {
  simTime = 0;
  speedMultiplier = 1;
  speedLabel.textContent = "1x";
  isPlaying = true;
  playPauseIcon.textContent = "⏸";

  resetPlanets(planets);
  asteroidBelt.reset();
  comets.reset();
  stations.reset();

  deselectBody();
}

function toggleFollow() {
  if (!selectedBodyName) return; // no tiene sentido "seguir" si no hay nada seleccionado
  followEnabled ? disableFollow() : enableFollow();
}

playPauseButton.addEventListener("click", togglePlayPause);
speedButton.addEventListener("click", cycleSpeed);
resetButton.addEventListener("click", resetSimulation);
followButton.addEventListener("click", toggleFollow);
freeViewButton.addEventListener("click", deselectBody);

/* ------------------------------------------------------------
   FASE 14: SONIDO AMBIENTAL
   ------------------------------------------------------------ */

const soundButton = document.getElementById("btn-sound");
const soundIcon = document.getElementById("sound-icon");

soundButton.addEventListener("click", () => {
  const playing = toggleAmbientAudio();
  soundIcon.textContent = playing ? "♫" : "♪";
  soundButton.classList.toggle("active", playing);
  soundButton.title = playing ? "Silenciar" : "Sonido ambiental";
});

/* ------------------------------------------------------------
   FASE 14: MODO EDUCATIVO / EXPLORACIÓN
   -------------------------------------------------------------
   Educativo (por defecto): tocar un destino abre el panel completo
   con todos los datos — pensado para aprender.
   Exploración: tocar un destino solo muestra su nombre en una
   etiqueta rápida y sigue volando la cámara ahí, sin abrir el
   panel — pensado para recorrer el sistema rápido, sin tanta
   lectura de por medio.
   ------------------------------------------------------------ */

let appMode = "educativo"; // "educativo" | "exploracion"

const modeButton = document.getElementById("btn-mode");
const modeLabel = document.getElementById("mode-label");
const quickTag = document.getElementById("quick-tag");
let quickTagTimeout = null;

function showQuickTag(name) {
  quickTag.textContent = name;
  quickTag.classList.remove("hidden");
  clearTimeout(quickTagTimeout);
  quickTagTimeout = setTimeout(() => quickTag.classList.add("hidden"), 2400);
}

modeButton.addEventListener("click", () => {
  appMode = appMode === "educativo" ? "exploracion" : "educativo";
  modeLabel.textContent = appMode === "educativo" ? "Educativo" : "Exploración";
  modeButton.classList.toggle("active", appMode === "exploracion");
  // Al cambiar de modo con el panel abierto, lo cerramos para no dejar un
  // estado ambiguo (panel completo abierto pero ya en modo exploración)
  hidePanel();
});

/* ------------------------------------------------------------
   MODAL "SOBRE EL EQUIPO"
   -------------------------------------------------------------
   Los datos vienen de team.js — para cambiarlos alcanza con
   editar ese archivo, no hace falta tocar este ni el HTML.
   ------------------------------------------------------------ */

const teamButton = document.getElementById("btn-team");
const teamOverlay = document.getElementById("team-overlay");
const teamClose = document.getElementById("team-close");

document.getElementById("team-category").textContent = TEAM_INFO.categoria;
document.getElementById("team-nombre").textContent = TEAM_INFO.nombreEquipo;
document.getElementById("team-colegio").textContent = TEAM_INFO.centroEducativo;
document.getElementById("team-capitan").textContent = TEAM_INFO.capitan;
document.getElementById("team-docente").textContent = TEAM_INFO.docenteEntrenador;
document.getElementById("team-integrantes").textContent = TEAM_INFO.integrantes.join(", ");

function openTeamOverlay() {
  teamOverlay.classList.remove("hidden");
}
function closeTeamOverlay() {
  teamOverlay.classList.add("hidden");
}

teamButton.addEventListener("click", openTeamOverlay);
teamClose.addEventListener("click", closeTeamOverlay);
teamOverlay.addEventListener("click", (event) => {
  if (event.target === teamOverlay) closeTeamOverlay(); // clic afuera de la tarjeta = cerrar
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !teamOverlay.classList.contains("hidden")) {
    closeTeamOverlay();
  }
});

/* ------------------------------------------------------------
   MODAL "INTRODUCCIÓN / AYUDA"
   -------------------------------------------------------------
   Se muestra sola la primera vez que alguien abre la app (se
   guarda en localStorage para no repetirla en cada visita), y
   siempre queda disponible a mano con el botón "Ayuda".
   ------------------------------------------------------------ */

const INTRO_STORAGE_KEY = "orbita-intro-visto";
const introButton = document.getElementById("btn-help");
const introOverlay = document.getElementById("intro-overlay");
const introClose = document.getElementById("intro-close");
const introStartBtn = document.getElementById("intro-start-btn");

function openIntroOverlay() {
  introOverlay.classList.remove("hidden");
}
function closeIntroOverlay() {
  introOverlay.classList.add("hidden");
  localStorage.setItem(INTRO_STORAGE_KEY, "1");
}

introButton.addEventListener("click", openIntroOverlay);
introClose.addEventListener("click", closeIntroOverlay);
introStartBtn.addEventListener("click", closeIntroOverlay);
introOverlay.addEventListener("click", (event) => {
  if (event.target === introOverlay) closeIntroOverlay();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !introOverlay.classList.contains("hidden")) {
    closeIntroOverlay();
  }
});

// Primera visita: se muestra sola, un instante después de que termine de
// cargar (para no competir con la animación de materialización del sistema).
if (!localStorage.getItem(INTRO_STORAGE_KEY)) {
  setTimeout(openIntroOverlay, 1600);
}

/* ------------------------------------------------------------
   FASE 16: MISIONES Y PROGRESO
   -------------------------------------------------------------
   Sin cuenta ni backend: todo el estado vive en missions.js, que
   lo persiste en localStorage. Acá solo se conecta con la UI.
   ------------------------------------------------------------ */

const hudPointsValue = document.getElementById("hud-points-value");
const missionsButton = document.getElementById("btn-missions");
const missionsOverlay = document.getElementById("missions-overlay");
const missionsClose = document.getElementById("missions-close");
const missionsList = document.getElementById("missions-list");
const missionsSummary = document.getElementById("missions-summary");
const missionsResetBtn = document.getElementById("missions-reset-btn");
const missionToast = document.getElementById("mission-toast");
const missionToastIcon = document.getElementById("mission-toast-icon");
const missionToastTitle = document.getElementById("mission-toast-title");
const missionToastPoints = document.getElementById("mission-toast-points");
let missionToastTimeout = null;

function updatePointsBadge() {
  hudPointsValue.textContent = getProgress().puntos;
}

function renderMissionsList() {
  const progress = getProgress();
  missionsList.innerHTML = "";

  MISSIONS.forEach((mission) => {
    const isCompleted = progress.completadas.includes(mission.id);

    const item = document.createElement("li");
    item.className = `mission-item${isCompleted ? " completed" : ""}`;

    const icon = document.createElement("span");
    icon.className = "mission-icon";
    icon.textContent = mission.icon;

    const body = document.createElement("div");
    body.className = "mission-body";

    const title = document.createElement("div");
    title.className = "mission-title";
    title.textContent = mission.title;

    const description = document.createElement("div");
    description.className = "mission-description";
    description.textContent = mission.description;

    body.appendChild(title);
    body.appendChild(description);

    const points = document.createElement("span");
    points.className = "mission-points";
    points.textContent = `+${mission.points}`;

    item.appendChild(icon);
    item.appendChild(body);
    item.appendChild(points);
    missionsList.appendChild(item);
  });

  missionsSummary.textContent = `${progress.completadas.length} / ${MISSIONS.length} completadas · ${progress.puntos} puntos`;
}

function showMissionToast(mission) {
  missionToastIcon.textContent = mission.icon;
  missionToastTitle.textContent = `¡Misión completada! ${mission.title}`;
  missionToastPoints.textContent = `+${mission.points} pts`;
  missionToast.classList.remove("hidden");
  clearTimeout(missionToastTimeout);
  missionToastTimeout = setTimeout(() => missionToast.classList.add("hidden"), 3200);
}

function openMissionsOverlay() {
  renderMissionsList();
  missionsOverlay.classList.remove("hidden");
}
function closeMissionsOverlay() {
  missionsOverlay.classList.add("hidden");
}

missionsButton.addEventListener("click", openMissionsOverlay);
missionsClose.addEventListener("click", closeMissionsOverlay);
missionsOverlay.addEventListener("click", (event) => {
  if (event.target === missionsOverlay) closeMissionsOverlay();
});
missionsResetBtn.addEventListener("click", () => {
  const confirmed = window.confirm("¿Reiniciar todo el progreso de misiones? Esto no se puede deshacer.");
  if (!confirmed) return;
  resetProgress();
  updatePointsBadge();
  renderMissionsList();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !missionsOverlay.classList.contains("hidden")) {
    closeMissionsOverlay();
  }
});

updatePointsBadge(); // refleja el progreso guardado apenas carga la página

/* ------------------------------------------------------------
   FASE 10: ANIMACIÓN DE ENTRADA ("materialización")
   -------------------------------------------------------------
   En vez de que el Sol y los planetas aparezcan ya completos
   apenas se revela la interfaz, arrancan en escala ~0 y crecen
   escalonados — Mercurio primero, Neptuno al final — con un
   efecto elástico suave (easeOutBack). Es puramente visual: no
   toca la posición orbital, solo la escala de cada malla.
   ------------------------------------------------------------ */

let entranceEntries = [];
let entranceStartTime = null;
const ENTRANCE_DURATION = 900; // ms que tarda cada objeto en llegar a su escala final

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function setupEntranceAnimation() {
  entranceEntries = [];

  if (sun) {
    entranceEntries.push({ objects: [sun.group], delay: 0 });
  }

  planets.forEach((planet, index) => {
    const objects = [planet.mesh];
    if (planet.ringMesh) objects.push(planet.ringMesh);
    planet.moons.forEach((moon) => objects.push(moon.mesh));
    // Escalonado: cada planeta arranca ~90ms después que el anterior
    entranceEntries.push({ objects, delay: 150 + index * 90 });
  });

  // Arrancan en escala casi-cero (0 exacto puede generar geometría degenerada)
  entranceEntries.forEach((entry) => {
    entry.objects.forEach((obj) => obj.scale.setScalar(0.001));
  });
}

function startEntranceAnimation() {
  entranceStartTime = performance.now();
}

function updateEntranceAnimations() {
  if (!entranceStartTime || entranceEntries.length === 0) return;

  const now = performance.now();
  let allDone = true;

  entranceEntries.forEach((entry) => {
    const localElapsed = now - entranceStartTime - entry.delay;
    if (localElapsed < 0) {
      allDone = false;
      return;
    }
    const t = Math.min(localElapsed / ENTRANCE_DURATION, 1);
    if (t < 1) allDone = false;

    const scale = Math.max(easeOutBack(t), 0.001);
    entry.objects.forEach((obj) => obj.scale.setScalar(scale));
  });

  if (allDone) {
    entranceEntries = []; // terminado: dejamos de recalcular esto cada frame
  }
}

function animate() {
  requestAnimationFrame(animate);

  const rawDelta = clock.getDelta();
  // effectiveDelta es el "tiempo" que de verdad avanza la simulación: si está
  // en pausa, es 0 (todo se congela); si no, se multiplica por la velocidad
  // elegida (1x/2x/10x). simTime es un acumulador propio, independiente del
  // reloj real, así que Play/Pausa/Velocidad/Reset controlan TODO lo que se
  // mueve en la escena de forma coherente entre sí.
  const effectiveDelta = isPlaying ? rawDelta * speedMultiplier : 0;
  simTime += effectiveDelta;

  // Sol: actualiza los shaders de plasma/corona y su rotación propia
  if (sun) {
    sun.update(simTime);
  }

  // Pulsación sutil de la luz solar: simula variación de actividad solar
  sunLight.intensity = SUN_LIGHT_BASE_INTENSITY + Math.sin(simTime * 0.5) * 0.3;

  // Rotación lentísima del campo de estrellas: sensación sutil de profundidad
  starField.rotation.y = simTime * 0.002;

  asteroidBelt.update(effectiveDelta);
  deepSpace.update(simTime);
  comets.update(effectiveDelta);
  meteorShower.update(effectiveDelta);
  stations.update(effectiveDelta);

  if (planets.length > 0) {
    updatePlanets(planets, effectiveDelta);
  }

  updateCameraTransition();
  updateFollowCamera();
  updateEntranceAnimations();
  controls.update();
  composer.render();

  updateFPS(performance.now());
}

animate();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize);

// En móviles, al girar el dispositivo el viewport tarda un instante en
// terminar de actualizarse — un pequeño delay evita que la cámara quede
// con la relación de aspecto vieja durante ese instante.
window.addEventListener("orientationchange", () => {
  setTimeout(onWindowResize, 200);
});
