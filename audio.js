/* ============================================================
   ORBITA — audio.js
   FASE 14: Sonido ambiental espacial
   -------------------------------------------------------------
   Todo el sonido se GENERA con código (Web Audio API), no son
   archivos de música descargados — así evitamos por completo
   cualquier problema de derechos de autor, y el "paquete" del
   proyecto no pesa ni un byte más.

   Técnica: varios osciladores graves ligeramente desafinados entre
   sí (eso es lo que da la sensación de "pad" ambiental, no un tono
   plano de un solo osciló) + una capa de ruido filtrado que suena
   como viento/estática espacial, todo con un filtro cuya frecuencia
   de corte se mueve solo, muy despacio, para que el sonido "respire"
   en vez de ser estático.

   El audio SIEMPRE arranca por un gesto explícito del usuario
   (tocar el botón de sonido) — los navegadores bloquean el audio
   automático sin interacción, así que ni conviene intentarlo antes.
   ============================================================ */

let audioContext = null;
let masterGain = null;
let oscillatorNodes = [];
let noiseSource = null;
let isPlaying = false;

const FADE_SECONDS = 1.5;

function createContext() {
  if (audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  masterGain = audioContext.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioContext.destination);

  // --- Pad grave: 3 osciladores desafinados entre sí ---
  const baseFrequencies = [55, 55 * 1.5, 55 * 2.01]; // quinta + octava ligeramente desafinada
  oscillatorNodes = baseFrequencies.map((freq, index) => {
    const osc = audioContext.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.detune.value = (index - 1) * 6; // desafinación sutil entre voces

    const oscGain = audioContext.createGain();
    oscGain.gain.value = 0.33;

    // Filtro paso-bajo con un LFO propio: la frecuencia de corte "respira"
    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;

    const lfo = audioContext.createOscillator();
    lfo.frequency.value = 0.05 + index * 0.02; // muy lento, distinto por voz
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = 150;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start();

    return osc;
  });

  // --- Ruido filtrado: textura de "viento espacial" de fondo ---
  const bufferSize = audioContext.sampleRate * 2;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  noiseSource = audioContext.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 500;
  noiseFilter.Q.value = 0.6;

  const noiseGain = audioContext.createGain();
  noiseGain.gain.value = 0.05; // muy de fondo, un detalle sutil, no protagonista

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noiseSource.start();
}

export function toggleAmbientAudio() {
  createContext(); // solo crea todo la primera vez que el usuario toca el botón

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const now = audioContext.currentTime;

  if (isPlaying) {
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
    isPlaying = false;
  } else {
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0.5, now + FADE_SECONDS);
    isPlaying = true;
  }

  return isPlaying;
}

export function isAmbientAudioPlaying() {
  return isPlaying;
}
