(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ArraiaSom = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // Efeitos sonoros da festa, sintetizados na hora com a Web Audio (nenhum arquivo de som): sanfona, triângulo,
  // moedinha, argola, fogueira... Tudo curto e baixo, porque o jogo fica aberto enquanto a pessoa trabalha.
  const nota = semitom => 440 * 2 ** ((semitom - 9) / 12); // 0 = dó central

  // Sanfona: duas serras levemente desafinadas, abafadas, com ataque de fole.
  function sanfona(v, at, dur, notas, gain = 0.035) {
    for (const n of notas) {
      for (const detune of [-8, 8]) v.tom(at, dur, nota(n), { type: 'sawtooth', gain, attack: 0.025, filter: 2200, detune });
    }
  }

  // Cada som: `gap` é o intervalo mínimo entre duas vezes seguidas (ms), para nada virar metralhadora.
  const SONS = {
    clique: { gap: 30, play: v => v.tom(0, 0.035, 1500, { to: 1100, type: 'square', gain: 0.05, filter: 3000 }) },
    abrir: { play: v => { v.tom(0, 0.06, nota(19), { gain: 0.11 }); v.tom(0.05, 0.1, nota(24), { gain: 0.11 }); } },
    fechar: { play: v => { v.tom(0, 0.06, nota(24), { gain: 0.09 }); v.tom(0.05, 0.1, nota(19), { gain: 0.09 }); } },
    moeda: {
      play: v => {
        v.tom(0, 0.07, nota(23), { type: 'square', gain: 0.06, filter: 4000 });
        v.tom(0.07, 0.3, nota(28), { type: 'square', gain: 0.06, filter: 4000 });
      }
    },
    // Melhoria comprada: sobe um tom a cada nível seguido (pitch).
    nivel: {
      gap: 60,
      play: v => {
        v.tom(0, 0.05, nota(12), { type: 'square', gain: 0.05, filter: 3500 });
        v.tom(0.045, 0.12, nota(19), { type: 'square', gain: 0.05, filter: 3500 });
      }
    },
    erro: {
      gap: 150,
      play: v => {
        v.tom(0, 0.09, 196, { to: 150, type: 'square', gain: 0.06, filter: 1200 });
        v.tom(0.11, 0.12, 165, { to: 120, type: 'square', gain: 0.06, filter: 1200 });
      }
    },
    equipar: { play: v => v.tom(0, 0.07, 480, { to: 1000, type: 'sine', gain: 0.13 }) },
    convidado: {
      gap: 400,
      play: v => { v.tom(0, 0.06, 420, { to: 900, type: 'sine', gain: 0.14 }); v.tom(0.05, 0.35, nota(28), { gain: 0.08 }); }
    },
    porte: {
      gap: 800,
      play: v => {
        [12, 16, 19, 24].forEach((n, i) => sanfona(v, i * 0.1, 0.16, [n]));
        sanfona(v, 0.42, 0.7, [12, 16, 19, 24], 0.025);
        v.tom(0.42, 0.5, 2600, { type: 'sine', gain: 0.03 });
      }
    },
    conquista: {
      gap: 600,
      play: v => {
        [19, 24, 28, 31].forEach((n, i) => v.tom(i * 0.08, 0.7, nota(n), { type: 'sine', gain: 0.09 }));
        v.tom(0.32, 0.4, 3100, { type: 'sine', gain: 0.025 });
      }
    },
    aviso: { gap: 500, play: v => { v.tom(0, 0.18, nota(21), { gain: 0.09 }); v.tom(0.12, 0.32, nota(28), { gain: 0.09 }); } },
    pesca: {
      play: v => {
        v.ruido(0, 0.3, { freq: 1800, to: 400, q: 0.8, gain: 0.2 });
        v.tom(0.08, 0.06, 500, { to: 1100, type: 'sine', gain: 0.08 });
        v.tom(0.16, 0.06, 650, { to: 1300, type: 'sine', gain: 0.07 });
      }
    },
    revelar: {
      play: v => {
        [12, 16, 19, 24, 28].forEach((n, i) => v.tom(i * 0.06, 0.25, nota(n), { gain: 0.09 }));
        v.tom(0.32, 0.6, nota(31), { type: 'sine', gain: 0.07 });
      }
    },
    carta: { play: v => { v.ruido(0, 0.14, { type: 'highpass', freq: 2500, gain: 0.1 }); v.tom(0.1, 0.45, nota(36), { type: 'sine', gain: 0.07 }); } },
    arremesso: { gap: 80, play: v => v.ruido(0, 0.22, { freq: 700, to: 2400, q: 1.2, gain: 0.14 }) },
    acerto: {
      gap: 80,
      play: v => { v.tom(0, 0.35, nota(24), { gain: 0.12 }); v.tom(0, 0.45, nota(31), { type: 'sine', gain: 0.07 }); }
    },
    errou: {
      gap: 80,
      play: v => { v.tom(0, 0.12, 240, { to: 150, gain: 0.15 }); v.ruido(0, 0.04, { type: 'lowpass', freq: 900, gain: 0.12 }); }
    },
    premio: {
      play: v => {
        [12, 16, 19, 24].forEach((n, i) => v.tom(i * 0.07, 0.2, nota(n), { type: 'square', gain: 0.045, filter: 3000 }));
        for (const n of [12, 16, 19, 24]) v.tom(0.3, 0.45, nota(n), { gain: 0.05 });
      }
    },
    fogo: {
      gap: 1000,
      play: v => {
        v.ruido(0, 0.45, { type: 'lowpass', freq: 500, gain: 0.1 });
        for (let i = 0; i < 7; i++) {
          v.ruido(i * 0.05 + Math.random() * 0.02, 0.03, { type: 'highpass', freq: 2500 + Math.random() * 2000, gain: 0.06 + Math.random() * 0.06 });
        }
      }
    },
    lenha: {
      play: v => {
        for (const at of [0, 0.12]) {
          v.tom(at, 0.06, 190, { to: 150, gain: 0.16 });
          v.ruido(at, 0.03, { freq: 1200, gain: 0.08 });
        }
      }
    },
    pedido: { gap: 800, play: v => { v.tom(0, 0.12, nota(28), { type: 'sine', gain: 0.1 }); v.tom(0.1, 0.25, nota(31), { type: 'sine', gain: 0.1 }); } },
    penetra: {
      gap: 800,
      play: v => { v.tom(0, 0.12, 260, { to: 520, type: 'sine', gain: 0.13 }); v.tom(0.12, 0.18, 520, { to: 220, type: 'sine', gain: 0.11 }); }
    },
    expulsar: {
      play: v => {
        v.ruido(0, 0.16, { freq: 2000, to: 600, gain: 0.12 });
        v.tom(0.05, 0.1, 500, { to: 250, type: 'square', gain: 0.04, filter: 2000 });
      }
    },
    // "Olha a cobra!": apito de escorregar, baixinho e raro.
    cobra: { gap: 4000, play: v => v.tom(0, 0.2, 700, { to: 1500, type: 'sine', gain: 0.05 }) },
    foto: { play: v => { v.ruido(0, 0.02, { type: 'highpass', freq: 3000, gain: 0.2 }); v.ruido(0.06, 0.03, { type: 'highpass', freq: 2000, gain: 0.16 }); } }
  };

  const clampVolume = value => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5);

  function create(options = {}) {
    const AudioContext = options.AudioContext || root.AudioContext || root.webkitAudioContext;
    let enabled = options.enabled !== false;
    let volume = clampVolume(options.volume);
    let ctx = null;
    let master = null;
    let noise = null;
    const last = {};
    // O ouvido percebe volume em escala de potência: 50% na barra soa como metade.
    const level = () => volume * volume * 0.9;

    function setup() {
      if (ctx || !AudioContext) return ctx;
      try {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = level();
        // Vários sons juntos não estouram: o compressor segura o pico.
        const limiter = ctx.createDynamicsCompressor();
        master.connect(limiter);
        limiter.connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      } catch (_) {
        ctx = null;
      }
      return ctx;
    }

    function envelope(start, end, gain, attack) {
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.exponentialRampToValueAtTime(gain, start + Math.min(attack, (end - start) / 2));
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      env.connect(master);
      return env;
    }

    // As duas peças de todo som: um tom (com deslize de frequência) e um ruído filtrado.
    function voice(t0, pitch) {
      const k = 2 ** (pitch / 12);
      return {
        tom(at, dur, freq, { to = freq, type = 'triangle', gain = 0.1, attack = 0.005, filter = 0, detune = 0 } = {}) {
          const start = t0 + at;
          const end = start + dur;
          const osc = ctx.createOscillator();
          osc.type = type;
          osc.detune.value = detune;
          osc.frequency.setValueAtTime(freq * k, start);
          if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to * k, end);
          const env = envelope(start, end, gain, attack);
          if (filter) {
            const lowpass = ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.value = filter;
            osc.connect(lowpass);
            lowpass.connect(env);
          } else osc.connect(env);
          osc.start(start);
          osc.stop(end + 0.02);
        },
        ruido(at, dur, { type = 'bandpass', freq = 1500, to = freq, q = 1, gain = 0.1, attack = 0.003 } = {}) {
          const start = t0 + at;
          const end = start + dur;
          const source = ctx.createBufferSource();
          source.buffer = noise;
          const filter = ctx.createBiquadFilter();
          filter.type = type;
          filter.Q.value = q;
          filter.frequency.setValueAtTime(freq, start);
          if (to !== freq) filter.frequency.exponentialRampToValueAtTime(to, end);
          source.connect(filter);
          filter.connect(envelope(start, end, gain, attack));
          source.start(start, Math.random() * 0.5);
          source.stop(end + 0.02);
        }
      };
    }

    function set(changes = {}) {
      if (typeof changes.enabled === 'boolean') enabled = changes.enabled;
      if (changes.volume !== undefined) volume = clampVolume(changes.volume);
      if (master) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.02);
    }

    // No navegador o áudio só começa depois de um gesto do jogador: o primeiro clique destrava.
    function unlock() {
      if (enabled && setup() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    }

    // Toca um som pelo nome. pitch: semitons acima (ou abaixo) do normal. Devolve se tocou.
    function play(name, { pitch = 0 } = {}) {
      const sound = SONS[name];
      if (!sound || !enabled || volume <= 0 || !setup()) return false;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return false; }
      const now = root.performance?.now?.() ?? Date.now();
      if (now - (last[name] ?? -Infinity) < (sound.gap ?? 40)) return false;
      last[name] = now;
      try { sound.play(voice(ctx.currentTime + 0.01, pitch)); } catch (_) { return false; }
      return true;
    }

    return { play, set, unlock, get enabled() { return enabled; }, get volume() { return volume; } };
  }

  return { create, SONS: Object.keys(SONS) };
});
