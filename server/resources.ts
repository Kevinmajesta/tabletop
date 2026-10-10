import { levelFor, type BuildInput, type Sheet } from './characters.js';
export type Resource = { id: string; name: string; max: number; shortRest?: boolean; shortRecovery?: number };
export function resources(build: BuildInput, sheet: Sheet): Resource[] {
  const level = levelFor(build), list: Resource[] = [{ id: 'hit-dice', name: `Hit Dice`, max: level }];
  const add = (id: string, name: string, max: number, shortRest = false, shortRecovery?: number) => list.push({ id, name, max, shortRest, shortRecovery });
  if (build.classId === 'barbarian') add('rage','Rage',level >= 3 ? 3 : 2,false,1);
  if (build.classId === 'fighter') { add('second-wind','Second Wind',level >= 4 ? 3 : 2,false,1); if (level >= 2) add('action-surge','Action Surge',1,true); }
  if (build.classId === 'bard') add('bardic-inspiration','Bardic Inspiration',Math.max(1,sheet.modifiers.cha),level >= 5);
  if (build.classId === 'cleric' && level >= 2) add('channel-divinity','Channel Divinity',2,false,1);
  if (build.classId === 'druid' && level >= 2) add('wild-shape','Wild Shape',2,false,1);
  if (build.classId === 'sorcerer' && level >= 2) add('sorcery-points','Sorcery Points',level);
  if (build.classId === 'monk' && level >= 2) add('focus-points','Focus Points',level,true);
  if (build.classId === 'paladin') { add('lay-on-hands','Lay on Hands',level * 5); if(level >= 3) add('channel-divinity','Channel Divinity',2,false,1); }
  if (build.subclassId === 'celestial-patron' && level >= 3) add('healing-light','Healing Light d6',level+1);
  if (build.subclassId === 'archfey-patron' && level >= 3) add('steps-of-fey','Steps of the Fey',Math.max(1,sheet.modifiers.cha));
  if (build.subclassId === 'battle-master' && level >= 3) add('superiority-dice','Superiority Dice d8',4,true);
  if (['psi-warrior','soulknife'].includes(build.subclassId || '') && level >= 3) add('psionic-dice',`Psionic Energy Dice d${level >= 5 ? 8 : 6}`,level >= 5 ? 6 : 4,false,1);
  if(build.subclassId==='diviner' && level>=3)add('portent','Portent dice',2);
  if(build.subclassId==='abjurer' && level>=3)add('arcane-ward','Arcane Ward HP',Math.max(0,level*2+sheet.modifiers.int));
  if(build.subclassId==='circle-of-the-stars' && level>=3)add('star-map','Star Map: Guiding Bolt',Math.max(1,sheet.modifiers.wis));
  if(build.subclassId==='gloom-stalker' && level>=3)add('dread-ambusher','Dread Ambusher',Math.max(1,sheet.modifiers.wis));
  if(build.subclassId==='light-domain' && level>=3)add('warding-flare','Warding Flare',Math.max(1,sheet.modifiers.wis));
  if(build.subclassId==='war-domain' && level>=3)add('war-priest','War Priest',Math.max(1,sheet.modifiers.wis),true);
  if(build.subclassId==='clockwork-sorcery' && level>=3)add('restore-balance','Restore Balance',Math.max(1,sheet.modifiers.cha));
  if(build.subclassId==='path-of-the-zealot' && level>=3)add('warrior-gods','Warrior of the Gods d12',4);
  for(const key of ['origin.spell','human.magic.spell'])if(build.choices[key]?.length)add(key,`Magic Initiate: ${build.choices[key][0]}`,1);
  return list;
  
}
