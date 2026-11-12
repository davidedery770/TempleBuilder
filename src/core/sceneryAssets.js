export const SCENERY_URLS = Object.fromEntries(Object.entries({
  camp: 'camp-preview.webp', river: 'river-preview.webp', hills: 'hills-preview.webp',
  jerusalem: 'jerusalem-preview.webp', mountains: 'camp-mountains.webp',
  shiloh: 'shiloh-groves.webp',
}).map(([key, file]) => [key, new URL('../../assets/images/scenery/' + file, import.meta.url).href]));
let cache;
export function sceneryAssets() {
  if (typeof globalThis.Image !== 'function') return {};
  if (cache) return cache;
  cache = {};
  for (const [key, url] of Object.entries(SCENERY_URLS)) {
    const image = new globalThis.Image();
    image.decoding = 'async';
    image.onload = () => { cache[key] = image; };
    image.src = url;
  }
  return cache;
}

export function previewForLevel(level, assets) {
  if (level.id === 5 && assets.shiloh) return assets.shiloh;
  if (level.chapter === 1) return assets.camp;
  if (level.chapter === 2) return level.id === 3 ? assets.river : assets.hills;
  if (level.chapter <= 4) return assets.hills;
  return assets.jerusalem;
}
