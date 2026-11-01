import { xphbFeats } from './resources-xphb.js';

export type GeneralFeat = {index:string;name:string;description:string;abilities:string[];requires?:'spellcasting'|'martial';minimum?:string[]};
export const generalFeats: GeneralFeat[] = xphbFeats
 .filter(f => f.category === 'G' && !['ability-score-improvement','grappler'].includes(f.index))
 .map(f => ({...f,
  abilities: [...new Set<string>((f.sourceData.ability || []).flatMap((a: any) => a.choose?.from || Object.keys(a).filter(key => ['str','dex','con','int','wis','cha'].includes(key))))],
  requires: f.prerequisite.some((p: any) => p.spellcasting2020) ? 'spellcasting' : undefined,
  minimum: [...new Set<string>(f.prerequisite.flatMap((p: any) => (p.ability || []).flatMap((a: any) => Object.keys(a))))],
 }));
