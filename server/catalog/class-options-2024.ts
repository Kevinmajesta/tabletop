import { xphbOptionalFeatures, resourceSlug } from './resources-xphb.js';

const options = (type: string) => xphbOptionalFeatures.filter(f => f.featureType.includes(type));
export const metamagic = options('MM').map(f => [f.index, f.name, f.description] as const);
export const invocationResources = options('EI');
export const invocations = invocationResources.map(f => [f.index, f.name, Math.min(...f.prerequisite.map((p: any) => p.level?.level || 1), ...(f.prerequisite.length ? [] : [1])), f.description] as const);
export const maneuvers = options('MV:B').map(f => f.name);

export function invocationAvailable(id: string, level: number, selected: string[]): boolean {
 const feature = invocationResources.find(f => f.index === id);
 return !!feature && (!feature.prerequisite.length || feature.prerequisite.some((p: any) =>
  (!p.level || level >= p.level.level) &&
  (!p.optionalfeature || p.optionalfeature.every((name: string) => {
   const required = resourceSlug(name.split('|')[0]);
   return selected.includes(required) && invocationAvailable(required, level, selected);
  }))));
}
