// Silent PCM, used only inside an explicit user gesture on the real player.
export const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

/** Inline hints alone do not grant autoplay; each actual element must be primed. */
export function prepMedia(el) {
  if (!el) return el;
  el.playsInline = true;
  el.setAttribute?.('playsinline', '');
  el.setAttribute?.('webkit-playsinline', '');
  return el;
}

export function primeMedia(el) {
  try {
    el.src = SILENT_WAV;
    const promise = el.play(); // Must run synchronously in the gesture callback.
    return Promise.resolve(promise).then(() => {
      // Do not pause real speech/music that replaced silence while play resolved.
      if (el.src === SILENT_WAV) el.pause();
      return true;
    }, () => false);
  } catch { return Promise.resolve(false); }
}
