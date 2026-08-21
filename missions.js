/* ============================================================
   ORBITA — missions.js
   FASE 16: Modo aventura — misiones y progreso
   -------------------------------------------------------------
   Sin cuenta de usuario ni backend: el progreso se guarda en el
   propio navegador (localStorage). Esto cubre lo esencial —
   guardar avance, misiones completadas, puntos, y continuar
   donde se dejó — sin necesitar servidor ni base de datos, algo
   fuera del alcance de un proyecto 100% frontend como este.
   ============================================================ */

const STORAGE_KEY = "orbita-progreso";

/**
 * Cada misión apunta a uno o más destinos (por su nombre exacto, el mismo
 * que usa content.js/interaction.js). `targets: "ALL"` es un caso especial:
 * se resuelve dinámicamente contra la lista completa de destinos visitables
 * que exista en la escena en ese momento.
 */
export const MISSIONS = [
  {
    id: "corazon-del-sistema",
    icon: "☀️",
    title: "El corazón del sistema",
    description: "Visitá el Sol y descubrí sus datos.",
    targets: ["Sol"],
    points: 10,
  },
  {
    id: "vecinos-del-sol",
    icon: "☿️",
    title: "Los vecinos del Sol",
    description: "Visitá Mercurio y Venus, los dos planetas más cercanos al Sol.",
    targets: ["Mercurio", "Venus"],
    points: 15,
  },
  {
    id: "planeta-natal",
    icon: "🌍",
    title: "Conocé tu planeta natal",
    description: "Visitá la Tierra.",
    targets: ["Tierra"],
    points: 10,
  },
  {
    id: "vecino-lunar",
    icon: "🌙",
    title: "El vecino más cercano",
    description: "Visitá la Luna.",
    targets: ["Luna"],
    points: 10,
  },
  {
    id: "vida-en-marte",
    icon: "🔴",
    title: "¿Hay vida en Marte?",
    description: "Visitá Marte y buscá pistas sobre sus condiciones.",
    targets: ["Marte"],
    points: 10,
  },
  {
    id: "lunas-galileanas",
    icon: "🪐",
    title: "Las lunas galileanas",
    description: "Visitá las 4 lunas de Júpiter descubiertas por Galileo: Ío, Europa, Ganímedes y Calisto.",
    targets: ["Ío", "Europa", "Ganímedes", "Calisto"],
    points: 25,
  },
  {
    id: "anillos-de-saturno",
    icon: "💫",
    title: "Explorar los anillos",
    description: "Visitá Saturno.",
    targets: ["Saturno"],
    points: 10,
  },
  {
    id: "gigantes-de-hielo",
    icon: "🔵",
    title: "Los gigantes de hielo",
    description: "Visitá Urano y Neptuno.",
    targets: ["Urano", "Neptuno"],
    points: 15,
  },
  {
    id: "ingenieria-humana",
    icon: "🛰️",
    title: "Ingeniería humana en órbita",
    description: "Visitá la ISS y la estación china Tiangong.",
    targets: ["Estación Espacial Internacional", "Estación Espacial China (Tiangong)"],
    points: 15,
  },
  {
    id: "explorador-completo",
    icon: "🏆",
    title: "Explorador completo",
    description: "Visitá absolutamente todos los destinos del Sistema Solar.",
    targets: "ALL",
    points: 50,
  },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn("No se pudo leer el progreso guardado, se empieza de cero.", error);
  }
  return { visitados: [], completadas: [], puntos: 0 };
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getProgress() {
  return state;
}

export function resetProgress() {
  state = { visitados: [], completadas: [], puntos: 0 };
  saveState();
}

function isMissionComplete(mission, visitedSet, allDestinationNames) {
  if (mission.targets === "ALL") {
    return allDestinationNames.length > 0 && allDestinationNames.every((name) => visitedSet.has(name));
  }
  return mission.targets.every((target) => visitedSet.has(target));
}

/**
 * Registra que el usuario visitó un destino, y revisa si eso completó
 * alguna misión nueva. Devuelve el arreglo de misiones recién completadas
 * (para que la interfaz pueda mostrar un aviso) — vacío si no se completó
 * ninguna en esta visita.
 */
export function registerVisit(name, allDestinationNames) {
  const isNewVisit = !state.visitados.includes(name);
  if (isNewVisit) state.visitados.push(name);

  const visitedSet = new Set(state.visitados);
  const newlyCompleted = [];

  MISSIONS.forEach((mission) => {
    if (state.completadas.includes(mission.id)) return; // ya estaba completa
    if (isMissionComplete(mission, visitedSet, allDestinationNames)) {
      state.completadas.push(mission.id);
      state.puntos += mission.points;
      newlyCompleted.push(mission);
    }
  });

  if (isNewVisit || newlyCompleted.length > 0) saveState();
  return newlyCompleted;
}
