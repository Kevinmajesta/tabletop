import type { Scene } from './tabletop.js';

export function applyInitiative(scene: Scene, characterId: string, ownerId: string, total: number, dm: boolean) {
  const tokens = scene.tokens.filter(token => token.characterId === characterId && (dm || token.ownerId === ownerId));
  for (const token of tokens) token.initiative = total;
  if (!tokens.length || !scene.combat.active) return tokens.length;
  const currentId = scene.combat.ids[scene.combat.turn];
  scene.combat.ids = [...new Set([...scene.combat.ids, ...tokens.map(token => token.id)])].sort((a,b) => (scene.tokens.find(token => token.id === b)?.initiative ?? 0) - (scene.tokens.find(token => token.id === a)?.initiative ?? 0));
  scene.combat.turn = Math.max(0, scene.combat.ids.indexOf(currentId));
  return tokens.length;
}
