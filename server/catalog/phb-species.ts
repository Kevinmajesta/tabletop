import type {Entry} from '../characters.js';
export const phbSpeciesSizes: Record<string, string[]> = {human:['Medium','Small'],aasimar:['Medium','Small']};
// PHB 2024, public licensed compendium: https://roll20.net/compendium/dnd5e/Races:Aasimar?expansion=32231
export const aasimarTraits: Entry[] = [
 {index:'aasimar-celestial-resistance',name:'Celestial Resistance',desc:['Resistansi necrotic dan radiant. Darkvision 60 ft. Senses, resistansi, dan efek transformasi dilacak manual.']},
 {index:'aasimar-healing-hands',name:'Healing Hands',desc:['Magic action: sentuh satu makhluk, pulihkan HP sebesar PB d4; 1/long rest, dilacak manual.']},
 {index:'aasimar-light-bearer',name:'Light Bearer',desc:['Light memakai CHA.'],spells:[{index:'light',name:'Light'}]},
 {index:'aasimar-celestial-revelation',name:'Celestial Revelation',desc:['Mulai level 3: bonus action transformasi 1 menit, 1/long rest; berakhir lebih awal tanpa action. Pilih bentuk setiap aktivasi (bukan pilihan permanen). Sekali pada tiap giliranmu sendiri ketika memberi damage dengan attack atau spell, tambah PB damage pada satu target: necrotic untuk Necrotic Shroud, radiant untuk bentuk lain. Heavenly Wings: fly speed sama dengan speed. Inner Radiance: cahaya terang 10 ft + redup 10 ft; setiap akhir giliranmu semua makhluk dalam 10 ft menerima PB radiant. Necrotic Shroud: makhluk selain sekutu dalam 10 ft CHA save DC 8+PB+CHA atau frightened sampai akhir giliranmu berikutnya. Semua efek dilacak manual.']},
];
export const aasimarRace: Entry = {index:'aasimar',name:'Aasimar',speed:30,type:'Humanoid',size:'Medium / Small',subraces:[],traits:aasimarTraits.map(t=>({index:t.index,name:t.name}))} as Entry;
