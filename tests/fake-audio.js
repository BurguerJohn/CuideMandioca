'use strict';

// Web Audio de mentira: guarda notas, ruídos e alterações de ganho.
function fakeAudio() {
  const log = { oscillators: 0, noises: 0, contexts: 0, resumed: 0, master: [], sources: [], gains: [] };
  const param = () => ({ value: 0, targets: [], setValueAtTime() {}, exponentialRampToValueAtTime() {},
    setTargetAtTime(value) { this.targets.push(value); log.master.push(value); } });
  const node = extra => ({ connect() {}, ...extra });
  class AudioContext {
    constructor() { log.contexts++; this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    resume() { log.resumed++; this.state = 'running'; return Promise.resolve(); }
    createGain() { const gain = node({ gain: param() }); log.gains.push(gain); return gain; }
    createDynamicsCompressor() { return node(); }
    createBiquadFilter() { return node({ type: '', frequency: param(), Q: param() }); }
    createOscillator() { log.oscillators++; return node({ type: '', detune: param(), frequency: param(), start() {}, stop() {} }); }
    createBufferSource() {
      log.noises++;
      const source = node({ loop: false, start() {}, stop() {} });
      log.sources.push(source);
      return source;
    }
    createBuffer(channels, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
  }
  return { AudioContext, log };
}

module.exports = { fakeAudio };
