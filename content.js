/* ============================================================
   ORBITA — content.js
   FASE 7: Contenido educativo por destino
   -------------------------------------------------------------
   Datos reales, separados de la lógica 3D a propósito: así se
   pueden revisar, corregir o ampliar sin tocar ni un archivo de
   Three.js. Las claves coinciden exactamente con los nombres
   usados en planets.js y sun.js (mesh.name).
   ============================================================ */

export const BODY_CONTENT = {
  Sol: {
    tipo: "Estrella",
    imagen: "textures/wiki_sun.jpg",
    temperatura: "~5.500 °C en la superficie (15.000.000 °C en el núcleo)",
    masa: "1,989 × 10³⁰ kg (333.000 veces la masa de la Tierra)",
    diametro: "1.392.700 km",
    distanciaAlSol: "—",
    dia: "~27 días (rotación, varía según la latitud)",
    anio: "—",
    lunas: "8 planetas y miles de cuerpos menores orbitan a su alrededor",
    curiosidades: [
      "Contiene el 99,8% de toda la masa del Sistema Solar.",
      "Su luz tarda unos 8 minutos en llegar hasta la Tierra.",
      "Cada segundo convierte 600 millones de toneladas de hidrógeno en helio.",
    ],
  },

  Mercurio: {
    tipo: "Planeta rocoso",
    imagen: "textures/wiki_mercury.jpg",
    temperatura: "Entre -180 °C y 430 °C (la mayor variación del Sistema Solar)",
    masa: "3,3 × 10²³ kg (0,055 masas terrestres)",
    diametro: "4.880 km",
    distanciaAlSol: "57,9 millones de km (0,39 UA)",
    dia: "176 días terrestres",
    anio: "88 días terrestres",
    lunas: "0",
    curiosidades: [
      "Un día completo en Mercurio dura más que su año.",
      "Es el planeta más pequeño del Sistema Solar.",
      "Pese a estar tan cerca del Sol, no es el planeta más caliente (ese es Venus).",
    ],
  },

  Venus: {
    tipo: "Planeta rocoso",
    imagen: "textures/wiki_venus.jpg",
    temperatura: "~465 °C (el planeta más caliente del Sistema Solar)",
    masa: "4,87 × 10²⁴ kg (0,815 masas terrestres)",
    diametro: "12.104 km",
    distanciaAlSol: "108,2 millones de km (0,72 UA)",
    dia: "243 días terrestres (rotación retrógrada)",
    anio: "224,7 días terrestres",
    lunas: "0",
    curiosidades: [
      "Gira al revés que casi todos los planetas: en Venus el Sol sale por el oeste.",
      "Su día dura más que su año.",
      "Su atmósfera de dióxido de carbono genera un efecto invernadero extremo.",
    ],
  },

  Tierra: {
    tipo: "Planeta rocoso",
    imagen: "textures/wiki_earth.jpg",
    temperatura: "~15 °C de media",
    masa: "5,97 × 10²⁴ kg",
    diametro: "12.742 km",
    distanciaAlSol: "149,6 millones de km (1 UA)",
    dia: "24 horas",
    anio: "365,25 días",
    lunas: "1 (la Luna)",
    curiosidades: [
      "Es el único planeta conocido con vida confirmada.",
      "El 71% de su superficie está cubierta por agua.",
      "Su campo magnético nos protege de la radiación solar dañina.",
    ],
  },

  Luna: {
    tipo: "Satélite natural de la Tierra",
    imagen: "textures/wiki_moon.jpg",
    temperatura: "Entre -173 °C y 127 °C",
    masa: "7,35 × 10²² kg",
    diametro: "3.474 km",
    distanciaAlSol: "—",
    dia: "27,3 días (bloqueo de marea)",
    anio: "27,3 días (órbita alrededor de la Tierra)",
    lunas: "—",
    curiosidades: [
      "Siempre muestra la misma cara a la Tierra: está en 'bloqueo de marea'.",
      "Se aleja de la Tierra unos 3,8 cm por año.",
      "Sin ella, los días en la Tierra probablemente durarían mucho menos.",
    ],
  },

  Marte: {
    tipo: "Planeta rocoso",
    imagen: "textures/wiki_mars.jpg",
    temperatura: "~-63 °C de media",
    masa: "6,42 × 10²³ kg (0,107 masas terrestres)",
    diametro: "6.779 km",
    distanciaAlSol: "227,9 millones de km (1,52 UA)",
    dia: "24 h 37 min",
    anio: "687 días terrestres",
    lunas: "2 (Fobos y Deimos)",
    curiosidades: [
      "Tiene el volcán más grande conocido del Sistema Solar: el Monte Olimpo, de ~21 km de altura.",
      "Su color rojizo viene del óxido de hierro (herrumbre) en su superficie.",
      "Es el planeta con más misiones de exploración robótica activas hoy en día.",
    ],
  },

  Júpiter: {
    tipo: "Gigante gaseoso",
    imagen: "textures/wiki_jupiter.jpg",
    temperatura: "~-110 °C en las nubes superiores",
    masa: "1,898 × 10²⁷ kg (318 masas terrestres)",
    diametro: "139.820 km",
    distanciaAlSol: "778,5 millones de km (5,2 UA)",
    dia: "9 h 56 min (el más rápido de todos los planetas)",
    anio: "11,86 años terrestres",
    lunas: "95 conocidas (mostramos las 4 galileanas)",
    curiosidades: [
      "La Gran Mancha Roja es una tormenta más grande que la Tierra, activa desde hace siglos.",
      "Es tan masivo que su centro de gravedad con el Sol queda ligeramente fuera del propio Sol.",
      "Actúa como un 'escudo gravitacional', desviando muchos asteroides y cometas.",
    ],
  },

  Ío: {
    tipo: "Luna de Júpiter (galileana)",
    imagen: "textures/wiki_io.jpg",
    temperatura: "~-143 °C de media, pero con volcanes que superan los 1.300 °C",
    masa: "8,9 × 10²² kg",
    diametro: "3.643 km",
    distanciaAlSol: "—",
    dia: "1,77 días (bloqueo de marea)",
    anio: "1,77 días (órbita alrededor de Júpiter)",
    lunas: "—",
    curiosidades: [
      "Es el cuerpo con más actividad volcánica de todo el Sistema Solar.",
      "La fuerza de marea de Júpiter es la que genera ese calor interno volcánico.",
      "Fue una de las 4 lunas descubiertas por Galileo Galilei en 1610.",
    ],
  },

  Europa: {
    tipo: "Luna de Júpiter (galileana)",
    imagen: "textures/wiki_europa.jpg",
    temperatura: "~-160 °C en la superficie",
    masa: "4,8 × 10²² kg",
    diametro: "3.122 km",
    distanciaAlSol: "—",
    dia: "3,55 días (bloqueo de marea)",
    anio: "3,55 días (órbita alrededor de Júpiter)",
    lunas: "—",
    curiosidades: [
      "Bajo su corteza helada esconde un océano de agua líquida — uno de los lugares con más posibilidades de albergar vida fuera de la Tierra.",
      "Su superficie es una de las más lisas conocidas en el Sistema Solar.",
      "Es un destino prioritario de futuras misiones espaciales (como Europa Clipper).",
    ],
  },

  Ganímedes: {
    tipo: "Luna de Júpiter (galileana)",
    imagen: "textures/wiki_ganymede.jpg",
    temperatura: "~-160 °C de media",
    masa: "1,48 × 10²³ kg",
    diametro: "5.268 km",
    distanciaAlSol: "—",
    dia: "7,15 días (bloqueo de marea)",
    anio: "7,15 días (órbita alrededor de Júpiter)",
    lunas: "—",
    curiosidades: [
      "Es la luna más grande del Sistema Solar — más grande incluso que Mercurio.",
      "Es el único satélite natural conocido con su propio campo magnético.",
      "Probablemente también tiene un océano subterráneo bajo su hielo.",
    ],
  },

  Calisto: {
    tipo: "Luna de Júpiter (galileana)",
    imagen: "textures/wiki_callisto.jpg",
    temperatura: "~-140 °C de media",
    masa: "1,08 × 10²³ kg",
    diametro: "4.821 km",
    distanciaAlSol: "—",
    dia: "16,69 días (bloqueo de marea)",
    anio: "16,69 días (órbita alrededor de Júpiter)",
    lunas: "—",
    curiosidades: [
      "Tiene una de las superficies con más cráteres de todo el Sistema Solar: es geológicamente muy antigua.",
      "Casi no ha cambiado en miles de millones de años.",
      "Es la luna galileana más alejada de Júpiter.",
    ],
  },

  Saturno: {
    tipo: "Gigante gaseoso",
    imagen: "textures/wiki_saturn.jpg",
    temperatura: "~-140 °C en las nubes superiores",
    masa: "5,68 × 10²⁶ kg (95 masas terrestres)",
    diametro: "116.460 km",
    distanciaAlSol: "1.434 millones de km (9,58 UA)",
    dia: "10 h 42 min",
    anio: "29,5 años terrestres",
    lunas: "146 conocidas (mostramos Titán)",
    curiosidades: [
      "Es tan poco denso que, en teoría, flotaría en un océano de agua lo bastante grande.",
      "Sus anillos están hechos casi enteramente de hielo y roca.",
      "Los anillos son sorprendentemente delgados: apenas unas decenas de metros de espesor en algunas zonas.",
    ],
  },

  Titán: {
    tipo: "Luna de Saturno",
    imagen: "textures/wiki_titan.jpg",
    temperatura: "~-179 °C en la superficie",
    masa: "1,35 × 10²³ kg",
    diametro: "5.150 km",
    distanciaAlSol: "—",
    dia: "15,95 días (bloqueo de marea)",
    anio: "15,95 días (órbita alrededor de Saturno)",
    lunas: "—",
    curiosidades: [
      "Es la única luna del Sistema Solar con una atmósfera densa.",
      "Tiene lagos y mares de metano y etano líquidos en su superficie.",
      "Es la segunda luna más grande del Sistema Solar, después de Ganímedes.",
    ],
  },

  Urano: {
    tipo: "Gigante de hielo",
    imagen: "textures/wiki_uranus.jpg",
    temperatura: "~-195 °C (el planeta más frío del Sistema Solar)",
    masa: "8,68 × 10²⁵ kg (14,5 masas terrestres)",
    diametro: "50.724 km",
    distanciaAlSol: "2.871 millones de km (19,2 UA)",
    dia: "17 h 14 min (rotación retrógrada)",
    anio: "84 años terrestres",
    lunas: "27 conocidas",
    curiosidades: [
      "Gira 'acostado': su eje está inclinado 98°, probablemente por un impacto gigante en el pasado.",
      "Es el planeta más frío, pese a no ser el más alejado del Sol.",
      "Sus lunas llevan nombres de personajes de Shakespeare, no de la mitología.",
    ],
  },

  Neptuno: {
    tipo: "Gigante de hielo",
    imagen: "textures/wiki_neptune.jpg",
    temperatura: "~-200 °C en las nubes superiores",
    masa: "1,02 × 10²⁶ kg (17 masas terrestres)",
    diametro: "49.244 km",
    distanciaAlSol: "4.495 millones de km (30,05 UA)",
    dia: "16 h 6 min",
    anio: "164,8 años terrestres",
    lunas: "16 conocidas (la mayor: Tritón)",
    curiosidades: [
      "Tiene los vientos más fuertes del Sistema Solar: hasta 2.100 km/h.",
      "Fue descubierto matemáticamente antes de ser observado: su posición se predijo por su efecto gravitacional sobre Urano.",
      "Tarda 165 años terrestres en dar una vuelta al Sol — ni un año ha pasado desde su descubrimiento en 1846 hasta completar una órbita, en 2011.",
    ],
  },

  "Estación Espacial Internacional": {
    tipo: "Estación espacial (obra humana en órbita)",
    temperatura: "Interior climatizado a ~22 °C (el exterior varía entre -157 °C y 121 °C)",
    masa: "~420.000 kg",
    diametro: "~109 m de longitud (aprox. una cancha de fútbol)",
    distanciaAlSol: "Órbita terrestre baja: ~400 km sobre la Tierra",
    dia: "Da la vuelta completa a la Tierra cada ~92 minutos",
    anio: "—",
    lunas: "Tripulación habitual: 3 a 7 astronautas",
    curiosidades: [
      "Es un proyecto conjunto de Estados Unidos, Rusia, Europa, Japón y Canadá.",
      "Está habitada de forma continua desde el año 2000: nunca estuvo vacía desde entonces.",
      "Viaja a unos 28.000 km/h — da la vuelta a la Tierra más de 15 veces por día.",
    ],
  },

  "Estación Espacial China (Tiangong)": {
    tipo: "Estación espacial china (obra humana en órbita)",
    temperatura: "Interior climatizado, similar a la ISS",
    masa: "~100.000 kg (los 3 módulos combinados)",
    diametro: "Forma de 'T': un módulo núcleo + 2 laboratorios",
    distanciaAlSol: "Órbita terrestre baja: ~340-450 km sobre la Tierra",
    dia: "Da la vuelta completa a la Tierra cada ~90 minutos",
    anio: "—",
    lunas: "Tripulación habitual: 3 taikonautas",
    curiosidades: [
      "Es operada únicamente por China, sin participación de otros países.",
      "Su módulo núcleo, Tianhe, se lanzó en 2021; se completó con los módulos Wentian y Mengtian en 2022.",
      "Es mucho más nueva que la ISS, que ya lleva más de dos décadas en órbita.",
    ],
  },
};
