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
    // Bichos da festa: cada um com o seu jeito de responder ao clique.
    galinha: { gap: 150, play: v => [0, 0.09, 0.18].forEach((at, i) => v.tom(at, 0.07, 1300 - i * 120, { to: 900 - i * 100, type: 'square', gain: 0.045, filter: 3500 })) },
    pintinho: { gap: 120, play: v => { v.tom(0, 0.05, 2600, { to: 3300, type: 'sine', gain: 0.05 }); v.tom(0.07, 0.05, 2900, { to: 3600, type: 'sine', gain: 0.05 }); } },
    bode: { gap: 300, play: v => v.tom(0, 0.55, 330, { to: 290, type: 'sawtooth', gain: 0.05, filter: 1800, attack: 0.04 }) },
    gato: { gap: 300, play: v => { v.tom(0, 0.14, 520, { to: 940, type: 'sine', gain: 0.07 }); v.tom(0.14, 0.3, 940, { to: 560, type: 'sine', gain: 0.07 }); } },
    boi: { gap: 400, play: v => v.tom(0, 0.7, 120, { to: 95, type: 'sawtooth', gain: 0.07, filter: 700, attack: 0.05 }) },
    crianca: { gap: 150, play: v => { v.tom(0, 0.08, 900, { to: 1300, type: 'triangle', gain: 0.06 }); v.tom(0.1, 0.1, 1100, { to: 1500, type: 'triangle', gain: 0.06 }); } },
    // Quadrilha marcada: dois acordes de sanfona, um de cada vez, e um gritinho de triângulo.
    quadrilha: {
      gap: 3000,
      play: v => {
        sanfona(v, 0, 0.32, [12, 16, 19]);
        sanfona(v, 0.34, 0.55, [14, 17, 21]);
        v.tom(0.34, 0.4, 3200, { type: 'triangle', gain: 0.03 });
      }
    },
    // Casamento na roça: dois badalos de sino (o segundo mais grave), com o brilho dos harmônicos que sobra no ar.
    sinos: {
      gap: 4000,
      play: v => {
        for (const [at, n] of [[0, 31], [0.55, 26]]) {
          v.tom(at, 1.3, nota(n), { type: 'sine', gain: 0.09 });
          v.tom(at, 0.9, nota(n) * 2.76, { type: 'sine', gain: 0.03 });
          v.tom(at, 0.5, nota(n) * 5.4, { type: 'sine', gain: 0.012 });
        }
      }
    },
    // Quebra-pote: a paulada é uma batida oca de barro; quando quebra, estilhaços e uma chuva de notinhas de bala.
    pote: { gap: 80, play: v => { v.tom(0, 0.09, 230, { to: 120, type: 'triangle', gain: 0.13 }); v.ruido(0, 0.04, { freq: 900, gain: 0.1 }); } },
    quebra: {
      gap: 500,
      play: v => {
        v.ruido(0, 0.28, { type: 'highpass', freq: 1800, to: 700, gain: 0.16 });
        v.tom(0, 0.14, 190, { to: 80, type: 'triangle', gain: 0.14 });
        [24, 28, 31, 36, 40].forEach((n, i) => v.tom(0.16 + i * 0.06, 0.22, nota(n), { type: 'sine', gain: 0.06 }));
      }
    },
    // Corrida de saco: o apito do juiz na largada (dois trinados), o pulo (um "tum" de estopa no chão com um boing que o
    // app sobe e desce de tom) e o tombo (baque surdo e um assobio caindo).
    juiz: { gap: 800, play: v => [0, 0.16].forEach((at, i) => v.tom(at, i ? 0.32 : 0.1, 2750, { to: 2650, type: 'square', gain: 0.03, filter: 5200 })) },
    pulo: { gap: 60, play: v => { v.tom(0, 0.1, 260, { to: 520, type: 'sine', gain: 0.08 }); v.ruido(0, 0.05, { type: 'lowpass', freq: 420, gain: 0.12 }); } },
    tombo: {
      gap: 300,
      play: v => {
        v.ruido(0, 0.14, { type: 'lowpass', freq: 380, gain: 0.2 });
        v.tom(0.02, 0.4, 900, { to: 240, type: 'triangle', gain: 0.05 });
      }
    },
    // Leilão: o lance é um "plim" de sininho de mesa (o da plateia sai mais grave); a batida do martelo é um toque seco de
    // madeira; o arremate é o martelo e uma fanfarrinha de sanfona.
    lance: { gap: 120, play: v => { v.tom(0, 0.18, nota(31), { type: 'sine', gain: 0.07 }); v.tom(0, 0.12, nota(31) * 2.4, { type: 'sine', gain: 0.02 }); } },
    martelo: { gap: 300, play: v => { v.tom(0, 0.07, 420, { to: 260, type: 'triangle', gain: 0.16 }); v.ruido(0, 0.03, { freq: 1600, gain: 0.12 }); } },
    arremate: {
      gap: 1500,
      play: v => {
        v.tom(0, 0.07, 420, { to: 260, type: 'triangle', gain: 0.16 });
        v.ruido(0, 0.03, { freq: 1600, gain: 0.12 });
        sanfona(v, 0.12, 0.2, [12, 16, 19]);
        sanfona(v, 0.34, 0.45, [17, 21, 24]);
      }
    },
    // O grito do Rafael: "YEAH, YEAH!" (a segunda mais alta), uma voz rouca de sawtooth que sobe e cai com um chiado na frente.
    yeah: {
      gap: 600,
      play: v => [0, 0.34].forEach((at, i) => {
        const base = i ? 250 : 215;
        v.ruido(at, 0.07, { type: 'bandpass', freq: 2400, gain: 0.03 });
        v.tom(at, 0.1, base, { to: base * 1.55, type: 'sawtooth', gain: 0.06, filter: 1600 });
        v.tom(at + 0.1, 0.2, base * 1.55, { to: base * 1.15, type: 'sawtooth', gain: 0.055, filter: 1100 });
      })
    },
    // Zurro do jegue: "i-óóó", um guincho agudo e um ronco grave, duas vezes.
    zurro: {
      gap: 600,
      play: v => [0, 0.5].forEach(at => {
        v.tom(at, 0.18, 700, { to: 900, type: 'sawtooth', gain: 0.03, filter: 2200 });
        v.tom(at + 0.18, 0.28, 240, { to: 180, type: 'sawtooth', gain: 0.04, filter: 1200 });
      })
    },
    // Buzina da Kombi da pamonha: duas notas juntas, meio desafinadas, duas vezes (bi-bi!).
    buzina: {
      gap: 400,
      play: v => [0, 0.2].forEach(at => { for (const f of [392, 466]) v.tom(at, 0.14, f, { type: 'square', gain: 0.035, filter: 1600 }); })
    },
    // Alto-falante da quermesse: o "plim-plom" de dois tons antes do aviso, com um chiadinho de caixa de som.
    altofalante: {
      gap: 3000,
      play: v => {
        v.tom(0, 0.35, nota(28), { type: 'sine', gain: 0.07 });
        v.tom(0.3, 0.55, nota(24), { type: 'sine', gain: 0.07 });
        v.ruido(0, 0.8, { type: 'highpass', freq: 3000, gain: 0.012 });
      }
    },
    // O grito da marcação da quadrilha ("Anarriê!"): um gritinho que sobe e desce, baixinho.
    grito: { gap: 3500, play: v => { v.tom(0, 0.09, 700, { to: 1100, type: 'triangle', gain: 0.05 }); v.tom(0.08, 0.1, 1100, { to: 800, type: 'triangle', gain: 0.045 }); } },
    // A bolinha do bingo saindo do globo: dois tiquinhos de madeira.
    bola: { gap: 400, play: v => { v.tom(0, 0.04, 1800, { to: 1400, type: 'triangle', gain: 0.05 }); v.tom(0.07, 0.05, 1500, { to: 1100, type: 'triangle', gain: 0.045 }); } },
    // Pombo-correio chegando: dois arrulhos graves e macios (pru-pru).
    pombo: { gap: 1500, play: v => [0, 0.26].forEach(at => { v.tom(at, 0.2, 330, { to: 260, type: 'sine', gain: 0.08, attack: 0.03 }); v.tom(at + 0.05, 0.12, 290, { to: 240, type: 'triangle', gain: 0.04 }); }) },
    // Apito do trem da alegria: dois tons juntos que sobem e caem.
    apito: { gap: 800, play: v => { for (const f of [880, 1109]) v.tom(0, 0.45, f, { to: f * 0.94, type: 'sine', gain: 0.05, attack: 0.03 }); } },
    // Sapinho coaxando: dois roncos graves e curtos.
    sapo: { gap: 300, play: v => [0, 0.14].forEach(at => v.tom(at, 0.1, 210, { to: 150, type: 'square', gain: 0.045, filter: 900 })) },
    // Latido do caramelo: dois "au" curtinhos.
    latido: { gap: 250, play: v => [0, 0.16].forEach((at, i) => { v.tom(at, 0.08, 620 - i * 60, { to: 380, type: 'square', gain: 0.05, filter: 1800 }); v.ruido(at, 0.05, { freq: 900, gain: 0.05 }); }) },
    // Um badalo só do sino da igrejinha (quando alguém clica nela).
    sino: { gap: 500, play: v => { v.tom(0, 1.1, nota(31), { type: 'sine', gain: 0.09 }); v.tom(0, 0.7, nota(31) * 2.76, { type: 'sine', gain: 0.03 }); v.tom(0, 0.4, nota(31) * 5.4, { type: 'sine', gain: 0.012 }); } },
    // Um punhado de arroz: chiadinho de grãos e um brilho.
    arroz: { gap: 80, play: v => { v.ruido(0, 0.1, { type: 'highpass', freq: 3800, gain: 0.07 }); v.tom(0.02, 0.06, 2600, { to: 3400, type: 'sine', gain: 0.035 }); } },
    // Começou a chover: um chiado de gotas que entra devagar.
    chuva: { gap: 4000, play: v => { v.ruido(0, 1.4, { type: 'highpass', freq: 3500, gain: 0.05 }); v.ruido(0.1, 1.2, { type: 'lowpass', freq: 900, gain: 0.04 }); } },
    // Trovão: um estouro de ruído grave e um som que cai.
    trovao: {
      gap: 3000,
      play: v => {
        v.ruido(0, 0.25, { type: 'lowpass', freq: 1800, to: 300, gain: 0.16 });
        v.ruido(0.15, 1.6, { type: 'lowpass', freq: 260, gain: 0.14 });
        v.tom(0.05, 0.9, 90, { to: 40, type: 'sine', gain: 0.14 });
      }
    },
    // Saiu o arco-íris: sete notas subindo, uma para cada cor.
    arcoiris: {
      gap: 3000,
      play: v => [0, 2, 4, 5, 7, 9, 11, 12].forEach((step, i) => v.tom(i * 0.09, 0.3, nota(24 + step), { type: 'sine', gain: 0.07 }))
    },
    // A Mandioca cresceu: uma escadinha de notas que sobe e um brilho no topo.
    crescer: {
      play: v => {
        [0, 4, 7, 12, 16].forEach((step, i) => v.tom(i * 0.07, 0.16, nota(19 + step), { type: 'triangle', gain: 0.1 }));
        v.tom(0.4, 0.5, nota(43), { type: 'sine', gain: 0.07 });
        v.ruido(0.38, 0.3, { type: 'highpass', freq: 5000, gain: 0.06 });
      }
    },
    // Carinho no Sopinha: um pulinho que sobe (boing) e um brilho no fim.
    carinho: { gap: 250, play: v => { v.tom(0, 0.14, 320, { to: 900, type: 'sine', gain: 0.1 }); v.tom(0.13, 0.14, nota(31), { type: 'sine', gain: 0.06 }); } },
    // "Olha a cobra!": apito de escorregar, baixinho e raro.
    cobra: { gap: 4000, play: v => v.tom(0, 0.2, 700, { to: 1500, type: 'sine', gain: 0.05 }) },
    // Papagaio: um "crrá" rouco, duas vezes.
    papagaio: { gap: 300, play: v => { v.tom(0, 0.1, 1100, { to: 700, type: 'sawtooth', gain: 0.045, filter: 2400 }); v.tom(0.13, 0.12, 1000, { to: 650, type: 'sawtooth', gain: 0.045, filter: 2400 }); } },
    // Show de drones: um arpejo subindo, suave e brilhante (dó, mi, sol, dó).
    drones: { gap: 2000, play: v => [0, 4, 7, 12].forEach((step, i) => v.tom(i * 0.12, 0.4, nota(12 + step), { type: 'sine', gain: 0.035 })) },
    // Estalinho: um estalo seco e curtinho, com um chiado de faísca atrás.
    estalo: { gap: 90, play: v => { v.ruido(0, 0.025, { type: 'highpass', freq: 1800, gain: 0.22 }); v.ruido(0.02, 0.09, { type: 'highpass', freq: 5000, gain: 0.05 }); } },
    // Palco do Forró (acerto na pista): triângulo (um ping brilhante), zabumba (batida grave) e sanfona (acorde curto).
    'palco-triangulo': { play: v => { v.tom(0, 0.45, 3100, { type: 'sine', gain: 0.05 }); v.tom(0, 0.35, 4650, { type: 'sine', gain: 0.025 }); } },
    'palco-zabumba': { play: v => { v.tom(0, 0.16, 140, { to: 62, type: 'sine', gain: 0.2 }); v.ruido(0, 0.05, { type: 'lowpass', freq: 700, gain: 0.1 }); } },
    'palco-sanfona': { play: v => sanfona(v, 0, 0.26, [19, 23, 26], 0.03) },
    // Mata Encantada: o golpe (um baque seco), o crítico (baque e brilho), a pancada que a Mandioca leva (grave), o passo especial (arpejo
    // curto), o chefe aparecendo (ronco que desce), a vitória (três notas subindo) e a derrota (duas descendo).
    'mata-golpe': { gap: 70, play: v => { v.tom(0, 0.07, 240, { to: 120, type: 'triangle', gain: 0.12 }); v.ruido(0, 0.03, { freq: 1500, gain: 0.07 }); } },
    'mata-critico': { gap: 90, play: v => { v.tom(0, 0.09, 300, { to: 110, type: 'triangle', gain: 0.15 }); v.ruido(0, 0.04, { freq: 2200, gain: 0.1 }); v.tom(0.03, 0.12, 1500, { to: 2400, type: 'sine', gain: 0.04 }); } },
    'mata-dano': { gap: 90, play: v => { v.tom(0, 0.12, 150, { to: 70, type: 'sawtooth', gain: 0.06, filter: 700 }); v.ruido(0, 0.04, { type: 'lowpass', freq: 600, gain: 0.1 }); } },
    'mata-especial': { gap: 400, play: v => [0, 4, 7, 12].forEach((step, i) => v.tom(i * 0.05, 0.2, nota(26 + step), { type: 'triangle', gain: 0.07 })) },
    'mata-chefe': { gap: 1500, play: v => { v.tom(0, 0.7, 110, { to: 50, type: 'sawtooth', gain: 0.07, filter: 500 }); v.ruido(0, 0.5, { type: 'lowpass', freq: 300, gain: 0.1 }); } },
    'mata-vitoria': { gap: 1000, play: v => [0, 4, 7].forEach((step, i) => v.tom(i * 0.1, 0.22, nota(24 + step), { type: 'triangle', gain: 0.08 })) },
    'mata-derrota': { gap: 1500, play: v => [7, 3, 0].forEach((step, i) => v.tom(i * 0.16, 0.3, nota(19 + step), { type: 'sine', gain: 0.08 })) },
    foto: { play: v => { v.ruido(0, 0.02, { type: 'highpass', freq: 3000, gain: 0.2 }); v.ruido(0.06, 0.03, { type: 'highpass', freq: 2000, gain: 0.16 }); } }
  };

  // Música (Ajustes > Som > Música, desligada de fábrica): um forró em sol maior, em laço de dezesseis compassos. Zabumba, triângulo,
  // baixo e acordes de sanfona, mais uma melodia que muda na segunda metade. Cada passo é uma colcheia; o `create` agenda os
  // passos um pouco à frente do relógio do áudio, então a música não engasga quando a janela fica de fundo.
  const BPM = 104;
  const COLCHEIA = 60 / BPM / 2;
  const ACORDES = { G: [-5, -1, 2], C: [0, 4, 7], D: [2, 6, 9], A: [-3, 1, 4], F: [-7, -3, 0] }; // semitons acima do dó central
  const BAIXOS = { G: -17, C: -12, D: -10, A: -15, F: -19 };
  // Parte A (oito compassos) e parte B (mais oito, subindo para o dó), e volta: o laço tem dezesseis compassos.
  const COMPASSOS = ['G', 'G', 'C', 'G', 'D', 'D', 'C', 'D', 'C', 'C', 'G', 'G', 'D', 'D', 'G', 'G'];
  const MELODIA = [
    [14, null, 11, 14, 16, null, 14, null], [11, null, 9, 11, 14, null, null, null],
    [12, null, 16, 12, 14, null, 12, null], [11, 9, 7, 9, 11, null, null, null],
    [14, null, 18, 14, 16, null, 14, null], [12, null, 14, 12, 9, null, null, null],
    [12, 14, 16, 14, 12, null, 9, null], [11, null, 14, null, 18, 16, 14, null],
    [16, null, 14, 12, 16, null, 19, null], [16, 14, 12, 14, 16, null, null, null],
    [14, null, 11, 14, 19, null, 18, null], [19, 18, 16, 14, 11, null, null, null],
    [18, null, 14, 18, 21, null, 18, null], [16, 18, 16, 14, 12, null, 9, null],
    [11, null, 14, 19, 18, 16, 14, null], [19, null, null, null, 7, null, null, null]
  ];
  const PASSOS = COMPASSOS.length * 8;
  const VOLUME_MUSICA = 0.55; // mais baixa que os efeitos, para eles aparecerem por cima

  function passoDaMusica(v, passo) {
    const bar = Math.floor(passo / 8) % COMPASSOS.length;
    const i = passo % 8;
    const acorde = COMPASSOS[bar];
    const m = VOLUME_MUSICA;
    // Zabumba: bumbo nos tempos fortes (e um mais leve na terceira colcheia) e o "tá" de aro nas colcheias 2 e 6.
    if (i === 0 || i === 4) v.tom(0, 0.16, 120, { to: 55, type: 'sine', gain: 0.14 * m });
    if (i === 3) v.tom(0, 0.12, 110, { to: 60, type: 'sine', gain: 0.08 * m });
    if (i === 2 || i === 6) v.ruido(0, 0.06, { type: 'bandpass', freq: 1900, q: 1.5, gain: 0.05 * m });
    // Triângulo: um tique em toda colcheia, aberto (mais longo) nos tempos fortes.
    const aberto = i === 0 || i === 4;
    v.tom(0, aberto ? 0.34 : 0.08, 3200, { type: 'sine', gain: (aberto ? 0.02 : i % 2 ? 0.014 : 0.009) * m });
    // Baixo da sanfona nos tempos fortes e os acordes "chuncho" nas colcheias 2, 3, 6 e 7.
    if (aberto) v.tom(0, 0.32, nota(BAIXOS[acorde]), { type: 'sawtooth', gain: 0.03 * m, filter: 500, attack: 0.02 });
    if (i === 2 || i === 6) sanfona(v, 0, 0.2, ACORDES[acorde], 0.016 * m);
    if (i === 3 || i === 7) sanfona(v, 0, 0.09, ACORDES[acorde], 0.012 * m);
    const nota_ = MELODIA[bar][i];
    if (nota_ !== null) sanfona(v, 0, COLCHEIA * 1.6, [nota_], 0.03 * m);
  }

  // A segunda música: um xote em ré maior, mais lento e balançado. Zabumba no "tum... tum-tum", baixo alternando a
  // fundamental e a quinta, e uma melodia de notas longas (cada nota segura até a próxima).
  const XOTE_BPM = 84;
  const XOTE_COLCHEIA = 60 / XOTE_BPM / 2;
  const XOTE_COMPASSOS = ['D', 'D', 'A', 'A', 'A', 'A', 'D', 'D', 'G', 'G', 'D', 'D', 'A', 'A', 'D', 'D'];
  const XOTE_MELODIA = [
    [18, null, 16, null, 14, null, 16, 18], [21, null, null, null, 18, null, null, null],
    [16, null, 13, null, 9, null, 13, 16], [19, null, 18, 16, 13, null, null, null],
    [16, null, 13, 16, 19, null, 18, 16], [13, null, 9, null, 13, null, 16, null],
    [14, null, 18, null, 21, null, 18, null], [14, null, null, null, null, null, null, null],
    [19, null, 18, null, 19, null, 23, null], [21, null, 19, 18, 19, null, null, null],
    [18, null, 21, null, 18, null, 14, null], [16, null, 18, 16, 14, null, null, null],
    [13, null, 16, null, 19, null, 18, 16], [13, null, 9, 11, 13, null, null, null],
    [14, null, 18, 21, 18, null, 16, null], [14, null, null, null, 2, null, null, null]
  ];

  function passoDoXote(v, passo) {
    const bar = Math.floor(passo / 8) % XOTE_COMPASSOS.length;
    const i = passo % 8;
    const acorde = XOTE_COMPASSOS[bar];
    const m = VOLUME_MUSICA;
    if (i === 0 || i === 5) v.tom(0, 0.2, 110, { to: 50, type: 'sine', gain: 0.14 * m });
    if (i === 3) v.tom(0, 0.14, 100, { to: 55, type: 'sine', gain: 0.07 * m });
    if (i === 2 || i === 6) v.ruido(0, 0.07, { type: 'bandpass', freq: 1700, q: 1.4, gain: 0.045 * m });
    const aberto = i === 0 || i === 4;
    v.tom(0, aberto ? 0.4 : 0.08, 3000, { type: 'sine', gain: (aberto ? 0.018 : 0.008) * m });
    if (i === 0) v.tom(0, 0.5, nota(BAIXOS[acorde]), { type: 'sawtooth', gain: 0.03 * m, filter: 480, attack: 0.02 });
    if (i === 4) v.tom(0, 0.45, nota(BAIXOS[acorde] + 7), { type: 'sawtooth', gain: 0.026 * m, filter: 480, attack: 0.02 });
    if (i === 2 || i === 6) sanfona(v, 0, 0.26, ACORDES[acorde], 0.013 * m);
    const row = XOTE_MELODIA[bar];
    if (row[i] !== null) {
      let hold = 1;
      while (i + hold < 8 && row[i + hold] === null) hold++;
      sanfona(v, 0, XOTE_COLCHEIA * hold * 0.95, [row[i]], 0.03 * m);
    }
  }

  // A terceira música: um baião em lá mixolídio (com o sol natural, a sétima menor que dá a cara do baião), em 2/4. Aqui
  // cada passo é uma semicolcheia e o compasso tem oito: a zabumba faz o "tum... tum-tum" (1, 4 e 5), o bacalhau bate
  // no contratempo, o triângulo abre no contratempo também, e a melodia anda no 3+3+2.
  const BAIAO_BPM = 92;
  const BAIAO_SEMI = 60 / BAIAO_BPM / 4;
  const BAIAO_COMPASSOS = ['A', 'A', 'G', 'G', 'D', 'D', 'A', 'A', 'A', 'A', 'G', 'G', 'D', 'D', 'A', 'A',
    'D', 'D', 'A', 'A', 'G', 'G', 'A', 'A', 'D', 'D', 'A', 'A', 'G', 'D', 'A', 'A'];
  const _ = null;
  const BAIAO_MELODIA = [
    [16, _, _, 16, _, _, 14, _], [13, _, _, 9, _, _, _, _], [19, _, _, 19, _, _, 18, _], [16, _, _, 14, _, _, _, _],
    [18, _, _, 18, _, _, 16, _], [14, _, 13, _, 11, _, _, _], [13, _, _, 16, _, _, 13, _], [9, _, _, _, _, _, _, _],
    [16, _, _, 16, _, _, 19, _], [21, _, _, 19, _, _, 16, _], [19, _, 18, _, 16, _, 14, _], [11, _, _, 14, _, _, _, _],
    [18, _, _, 21, _, _, 18, _], [16, _, 14, _, 13, _, 11, _], [9, _, _, 13, _, _, 16, _], [21, _, _, _, 9, _, _, _],
    [21, _, _, 21, _, _, 19, _], [18, _, _, 14, _, _, _, _], [16, _, _, 16, _, _, 13, _], [9, _, 11, _, 13, _, _, _],
    [14, _, _, 14, _, _, 16, _], [19, _, 18, _, 16, _, 14, _], [13, _, _, 16, _, _, 21, _], [19, _, _, _, _, _, _, _],
    [21, _, _, 21, _, _, 23, _], [21, _, 18, _, 14, _, _, _], [16, _, _, 13, _, _, 16, _], [21, _, _, _, 19, _, _, _],
    [19, _, _, 16, _, _, 14, _], [18, _, _, 14, _, _, 11, _], [13, _, _, 9, _, _, 13, 16], [9, _, _, _, _, _, _, _]
  ];

  function passoDoBaiao(v, passo) {
    const bar = Math.floor(passo / 8) % BAIAO_COMPASSOS.length;
    const i = passo % 8;
    const acorde = BAIAO_COMPASSOS[bar];
    // Mais cheio de notas que os outros: um pouco mais baixo, para ficar no mesmo volume.
    const m = VOLUME_MUSICA * 0.88;
    // Zabumba: bumbo no 1, no 4 (mais leve) e no 5; o bacalhau (vareta no aro) no contratempo.
    if (i === 0) v.tom(0, 0.18, 115, { to: 52, type: 'sine', gain: 0.14 * m });
    if (i === 3) v.tom(0, 0.1, 108, { to: 58, type: 'sine', gain: 0.08 * m });
    if (i === 4) v.tom(0, 0.16, 112, { to: 54, type: 'sine', gain: 0.12 * m });
    if (i === 2 || i === 6) v.ruido(0, 0.05, { type: 'bandpass', freq: 2100, q: 1.6, gain: 0.045 * m });
    // Triângulo: tique em toda semicolcheia, aberto no contratempo.
    const aberto = i === 2 || i === 6;
    v.tom(0, aberto ? 0.3 : 0.05, 3300, { type: 'sine', gain: (aberto ? 0.018 : 0.007) * m });
    // Baixo acompanhando a zabumba: fundamental no 1 e no 4, quinta no 5.
    if (i === 0) v.tom(0, 0.3, nota(BAIXOS[acorde]), { type: 'sawtooth', gain: 0.03 * m, filter: 500, attack: 0.02 });
    if (i === 3) v.tom(0, 0.1, nota(BAIXOS[acorde]), { type: 'sawtooth', gain: 0.022 * m, filter: 500, attack: 0.01 });
    if (i === 4) v.tom(0, 0.28, nota(BAIXOS[acorde] + 7), { type: 'sawtooth', gain: 0.026 * m, filter: 500, attack: 0.02 });
    if (i === 2 || i === 6) sanfona(v, 0, 0.14, ACORDES[acorde], 0.014 * m);
    const row = BAIAO_MELODIA[bar];
    if (row[i] !== null) {
      let hold = 1;
      while (i + hold < 8 && row[i + hold] === null) hold++;
      sanfona(v, 0, BAIAO_SEMI * hold * 0.9, [row[i]], 0.03 * m);
    }
  }

  // A quarta música: um arrasta-pé em dó maior, o mais ligeiro de todos, em 2/4 (cada passo é uma semicolcheia). Forma
  // AABB: a parte A no dó e no sol, a B começando no fá. Zabumba em cada tempo com o repique antes do segundo, baixo
  // "pum-pá" (fundamental e quinta), sanfona curtinha no contratempo e a melodia correndo em colcheias.
  const ARRASTA_BPM = 124;
  const ARRASTA_SEMI = 60 / ARRASTA_BPM / 4;
  const ARRASTA_A = ['C', 'C', 'G', 'G', 'G', 'G', 'C', 'C'];
  const ARRASTA_B = ['F', 'F', 'C', 'C', 'G', 'G', 'C', 'C'];
  const ARRASTA_COMPASSOS = [...ARRASTA_A, ...ARRASTA_A, ...ARRASTA_B, ...ARRASTA_B];
  const ARRASTA_PARTE_A = [
    [12, _, 16, _, 19, _, 16, _], [24, _, 19, _, 16, _, 12, _], [11, _, 14, _, 19, _, 14, _], [23, _, 19, _, 17, _, 14, _],
    [14, 16, 17, _, 19, _, 17, _], [14, _, 11, _, 7, _, 11, _], [12, _, 16, _, 19, _, 24, _]
  ];
  const ARRASTA_PARTE_B = [
    [17, _, 21, _, 24, _, 21, _], [17, 19, 21, _, 19, _, 17, _], [16, _, 19, _, 24, _, 19, _], [16, 17, 19, _, 16, _, 12, _],
    [14, _, 17, _, 19, _, 23, _], [26, _, 23, _, 19, _, 17, _], [16, _, 14, _, 12, _, 11, _]
  ];
  // Cada parte toca duas vezes: a primeira termina puxando para a repetição, a segunda fecha.
  const ARRASTA_MELODIA = [
    ...ARRASTA_PARTE_A, [21, _, 19, _, 16, _, 14, _], ...ARRASTA_PARTE_A, [24, _, _, _, 12, _, _, _],
    ...ARRASTA_PARTE_B, [12, _, 14, _, 16, _, 17, _], ...ARRASTA_PARTE_B, [12, _, _, _, _, _, _, _]
  ];

  function passoDoArrastaPe(v, passo) {
    const bar = Math.floor(passo / 8) % ARRASTA_COMPASSOS.length;
    const i = passo % 8;
    const acorde = ARRASTA_COMPASSOS[bar];
    // O mais cheio de notas de todos: mais baixo, para ficar no volume do forró.
    const m = VOLUME_MUSICA * 0.86;
    // Zabumba: bumbo no 1 e no 5 (os dois tempos), um repique leve no 4; o "tá" de aro no contratempo.
    if (i === 0) v.tom(0, 0.14, 120, { to: 55, type: 'sine', gain: 0.14 * m });
    if (i === 3) v.tom(0, 0.08, 110, { to: 60, type: 'sine', gain: 0.06 * m });
    if (i === 4) v.tom(0, 0.14, 118, { to: 56, type: 'sine', gain: 0.12 * m });
    if (i === 2 || i === 6) v.ruido(0, 0.05, { type: 'bandpass', freq: 2000, q: 1.5, gain: 0.05 * m });
    // Triângulo corrido, aberto no contratempo.
    const aberto = i === 2 || i === 6;
    v.tom(0, aberto ? 0.25 : 0.04, 3400, { type: 'sine', gain: (aberto ? 0.017 : 0.007) * m });
    // Baixo "pum-pá": a fundamental no primeiro tempo e a quinta no segundo.
    if (i === 0) v.tom(0, 0.22, nota(BAIXOS[acorde]), { type: 'sawtooth', gain: 0.03 * m, filter: 520, attack: 0.015 });
    if (i === 4) v.tom(0, 0.22, nota(BAIXOS[acorde] + 7), { type: 'sawtooth', gain: 0.027 * m, filter: 520, attack: 0.015 });
    if (i === 2 || i === 6) sanfona(v, 0, 0.1, ACORDES[acorde], 0.014 * m);
    const row = ARRASTA_MELODIA[bar];
    if (row[i] !== null) {
      let hold = 1;
      while (i + hold < 8 && row[i + hold] === null) hold++;
      sanfona(v, 0, ARRASTA_SEMI * hold * 0.9, [row[i]], 0.03 * m);
    }
  }

  // As músicas do laço, uma depois da outra: o forró, o xote, o baião e o arrasta-pé, e volta.
  const MUSICAS = [
    { id: 'forro', colcheia: COLCHEIA, passos: PASSOS, passo: passoDaMusica },
    { id: 'xote', colcheia: XOTE_COLCHEIA, passos: XOTE_COMPASSOS.length * 8, passo: passoDoXote },
    { id: 'baiao', colcheia: BAIAO_SEMI, passos: BAIAO_COMPASSOS.length * 8, passo: passoDoBaiao },
    { id: 'arrasta-pe', colcheia: ARRASTA_SEMI, passos: ARRASTA_COMPASSOS.length * 8, passo: passoDoArrastaPe }
  ];

  const clampVolume = value => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5);

  function create(options = {}) {
    const AudioContext = options.AudioContext || root.AudioContext || root.webkitAudioContext;
    let enabled = options.enabled !== false;
    let volume = clampVolume(options.volume);
    let ctx = null;
    let master = null;
    let noise = null;
    let bus = null;
    const last = {};
    // Os relógios que agendam a música (injetáveis nos testes).
    const timers = { set: options.setInterval || (root.setInterval && root.setInterval.bind(root)),
      clear: options.clearInterval || (root.clearInterval && root.clearInterval.bind(root)) };
    const music = { on: false, timer: null, step: 0, song: 0, next: 0 };
    // O ouvido percebe volume em escala de potência: 50% na barra soa como metade.
    const level = () => enabled ? volume * volume * 0.9 : 0;

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
        // A música passa por uma via própria, que dá para silenciar na hora sem mexer nos efeitos.
        bus = ctx.createGain();
        bus.connect(master);
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      } catch (_) {
        try { ctx?.close?.()?.catch(() => {}); } catch (_) { /* liberar o contexto também pode falhar */ }
        ctx = null;
        master = null;
        noise = null;
        bus = null;
      }
      return ctx;
    }

    function envelope(start, end, gain, attack, out) {
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.exponentialRampToValueAtTime(gain, start + Math.min(attack, (end - start) / 2));
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      env.connect(out || master);
      return env;
    }

    // As duas peças de todo som: um tom (com deslize de frequência) e um ruído filtrado.
    function voice(t0, pitch, out = null) {
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
          const env = envelope(start, end, gain, attack, out);
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
          source.loop = true;
          const filter = ctx.createBiquadFilter();
          filter.type = type;
          filter.Q.value = q;
          filter.frequency.setValueAtTime(freq, start);
          if (to !== freq) filter.frequency.exponentialRampToValueAtTime(to, end);
          source.connect(filter);
          filter.connect(envelope(start, end, gain, attack, out));
          source.start(start, Math.random() * 0.5);
          source.stop(end + 0.02);
        }
      };
    }

    // Agenda os próximos passos da música (uns 1,4 s à frente do relógio do áudio). Se a janela ficou parada e o relógio
    // passou dos passos agendados, recomeça dali em vez de tocar tudo de uma vez.
    function musicTick() {
      if (!music.on || !enabled || volume <= 0 || !ctx || ctx.state !== 'running') return;
      const horizon = ctx.currentTime + 1.4;
      if (music.next < ctx.currentTime) music.next = ctx.currentTime + 0.05;
      while (music.next < horizon) {
        const song = MUSICAS[music.song];
        try { song.passo(voice(music.next, 0, bus), music.step); } catch (_) { /* um passo com defeito não derruba a música */ }
        music.next += song.colcheia;
        music.step++;
        // Acabou o laço desta música: entra a próxima.
        if (music.step >= song.passos) { music.step = 0; music.song = (music.song + 1) % MUSICAS.length; }
      }
    }

    // Liga ou desliga a música (ela também fica quieta com o som desligado ou o volume em zero). Devolve se está tocando.
    function setMusic(on) {
      music.on = !!on;
      const playing = music.on && enabled && volume > 0 && !!setup() && !!timers.set;
      if (playing) {
        if (!music.timer) {
          if (!bus) {
            bus = ctx.createGain();
            bus.connect(master);
          }
          music.next = 0;
          music.timer = timers.set(musicTick, 250);
          bus.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
        }
        musicTick();
      } else if (music.timer) {
        timers.clear(music.timer);
        music.timer = null;
        music.step = 0;
        music.song = 0;
        if (bus) bus.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        // As notas já agendadas ficam na via antiga; religar começa outra sequência sem reativá-las.
        bus = null;
      }
      return playing;
    }

    function set(changes = {}) {
      if (typeof changes.enabled === 'boolean') enabled = changes.enabled;
      if (changes.volume !== undefined) volume = clampVolume(changes.volume);
      if (master) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.02);
      if (music.on || music.timer) setMusic(music.on);
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

    return { play, set, setMusic, unlock, get enabled() { return enabled; }, get volume() { return volume; },
      get music() { return !!music.timer; }, get song() { return MUSICAS[music.song].id; } };
  }

  return { create, SONS: Object.keys(SONS), MUSICA: { passos: PASSOS, colcheia: COLCHEIA, musicas: MUSICAS.map(song => song.id) },
    // Para os testes e o render de conferência: toca um passo de uma música numa voz qualquer.
    passo: (id, v, n) => MUSICAS.find(song => song.id === id).passo(v, n) };
});
