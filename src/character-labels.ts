import { abilities } from '../server/characters';

export function choiceLabel(option: { id: string; name: string }) {
  if (option.name !== option.id) return option.name;
  if (abilities.some(ability => ability === option.id)) return option.id.toUpperCase();
  return option.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
