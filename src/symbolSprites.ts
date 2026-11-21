import { symbolIds, tiles } from "./panel";
const cache = new Map<string, HTMLImageElement>();
function image(id: string) {
  let sprite = cache.get(id);
  if (!sprite) {
    sprite = new Image();
    sprite.src = "./art/symbols/" + id.toLowerCase() + ".svg";
    cache.set(id, sprite);
  }
  return sprite;
}
export const sprites = symbolIds.map(image);
export const lampSprites = tiles.map(image);
export const assetsReady = Promise.all(
  [...cache.values()].map((img) => img.decode()),
);
