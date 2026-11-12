/** Respect the OS accessibility preference without changing gameplay timing. */
export function reducedMotion() {
  try { return !!globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

export function artTime(time) {
  return reducedMotion() ? 0 : time;
}
