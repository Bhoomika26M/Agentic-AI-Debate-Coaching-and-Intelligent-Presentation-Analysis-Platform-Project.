/**
 * 16 kHz mono WAV, encoded in the page.
 *
 * The server transcribes WAV so a turn never depends on which container this
 * browser's MediaRecorder happens to produce, and the audio can be checked for
 * duration before it is sent.
 */

export const TARGET_SAMPLE_RATE = 16000;

export function mergeChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

/** Linear resampling: good enough for speech, and free of dependencies. */
export function resample(pcm: Float32Array, from: number, to: number): Float32Array {
  if (from === to || pcm.length === 0) return pcm;
  const ratio = from / to;
  const length = Math.max(1, Math.round(pcm.length / ratio));
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const index = Math.floor(position);
    const next = Math.min(index + 1, pcm.length - 1);
    const weight = position - index;
    out[i] = pcm[index] * (1 - weight) + pcm[next] * weight;
  }
  return out;
}

/** Trim leading and trailing near-silence so a clip does not carry dead air. */
export function trimSilence(pcm: Float32Array, threshold = 0.012): Float32Array {
  let start = 0;
  let end = pcm.length;
  while (start < end && Math.abs(pcm[start]) < threshold) start += 1;
  while (end > start && Math.abs(pcm[end - 1]) < threshold) end -= 1;
  if (end <= start) return pcm.slice(0, 0);
  const padStart = Math.max(0, start - 120);
  const padEnd = Math.min(pcm.length, end + 120);
  return pcm.slice(padStart, padEnd);
}

export function encodeWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  let offset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

export function wavFromChunks(chunks: Float32Array[], sourceRate: number): Blob {
  const merged = trimSilence(mergeChunks(chunks));
  const pcm = resample(merged, sourceRate, TARGET_SAMPLE_RATE);
  return new Blob([encodeWav(pcm, TARGET_SAMPLE_RATE)], { type: "audio/wav" });
}
