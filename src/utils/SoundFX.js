// ─── SoundFX ────────────────────────────────────────────────────────────────
// Simple procedural audio generator using Web Audio API for hackathon game.

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const playTone = (frequency, type, duration, vol = 0.2) => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

export const SoundFX = {
  ambientInterval: null,

  // Low ambient drone / distant war rumbles
  ambient: (baseVol = 0.4) => {
    if (SoundFX.ambientInterval) clearInterval(SoundFX.ambientInterval);
    SoundFX.ambientInterval = setInterval(() => {
      // Deep bass rumble
      playTone(Math.random() * 40 + 40, 'sawtooth', 3.0 + Math.random() * 2, baseVol * 0.15);
      // Occasional distant "boom"
      if (Math.random() > 0.6) {
        setTimeout(() => playTone(30 + Math.random() * 20, 'square', 1.5, baseVol * 0.2), Math.random() * 2000);
      }
    }, 4500);
  },
  
  stopAmbient: () => {
    if (SoundFX.ambientInterval) {
      clearInterval(SoundFX.ambientInterval);
      SoundFX.ambientInterval = null;
    }
  },
  
  storySongInterval: null,
  playStorySong: () => {
    if (SoundFX.storySongInterval) clearInterval(SoundFX.storySongInterval);
    // Emotional chord progression: Am, F, C, G
    const chords = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [261.63, 329.63, 392], // C
      [196, 246.94, 293.66]  // G
    ];
    let step = 0;
    
    const playChord = () => {
      const chord = chords[step % chords.length];
      chord.forEach(freq => playTone(freq, 'sine', 3.0, 0.15));
      // Deep bass note
      playTone(chord[0] / 2, 'triangle', 3.0, 0.25);
      step++;
    };
    
    playChord();
    SoundFX.storySongInterval = setInterval(playChord, 3000);
  },

  stopStorySong: () => {
    if (SoundFX.storySongInterval) {
      clearInterval(SoundFX.storySongInterval);
      SoundFX.storySongInterval = null;
    }
  },
  
  // Sharp beep for alert
  alert: () => {
    playTone(400, 'square', 0.1, 0.3);
    setTimeout(() => playTone(600, 'square', 0.1, 0.3), 100);
  },
  
  // Pleasant chime for collect
  collect: () => {
    playTone(600, 'sine', 0.2, 0.3);
    setTimeout(() => playTone(800, 'sine', 0.3, 0.3), 100);
    setTimeout(() => playTone(1200, 'sine', 0.4, 0.3), 200);
  },
  
  // Harsh buzz for game over
  death: () => {
    playTone(150, 'sawtooth', 0.2, 0.4);
    setTimeout(() => playTone(120, 'square', 0.2, 0.45), 150);
    setTimeout(() => playTone(80, 'sawtooth', 0.6, 0.5), 300);
  },

  // Triumphant melody
  victory: () => {
    const notes = [440, 554, 659, 880]; // A major arpeggio
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 'sine', 0.4, 0.3), i * 200);
    });
    setTimeout(() => playTone(880, 'sine', 1.0, 0.4), notes.length * 200);
  },

  // Soft sound when story opens
  storyOpen: () => {
    playTone(350, 'sine', 0.5, 0.2);
    setTimeout(() => playTone(500, 'sine', 1.0, 0.2), 200);
  }
};
