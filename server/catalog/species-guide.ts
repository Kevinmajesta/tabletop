import type { BuildInput, Catalog } from '../characters.js';
import { motmFor } from './motm.js';
import { phbSpeciesSizes } from './phb-species.js';

// Original introductions; mechanical details always come from the active catalog.
export const speciesOverviews: Record<string, string> = {
  aasimar: 'Aasimar menyimpan percikan Upper Planes dalam jiwa. Warisan celestial memberi cahaya dan penyembuhan, serta bentuk wahyu yang dipilih setiap kali berubah.',
  dragonborn: 'Berwujud humanoid naga, Dragonborn membawa warisan drakonik yang terlihat dalam napas elemen dan penampilannya.',
  dwarf: 'Dwarf dikenal melalui hubungan erat dengan batu, kerajinan, dan komunitas; tubuh tangguh menemani perjalanan panjang mereka.',
  elf: 'Elf memiliki hubungan dengan sihir dan dunia alam. Garis keturunannya memberi warna berbeda pada kehidupan yang panjang.',
  gnome: 'Gnome memadukan rasa ingin tahu dengan bakat magis; penjelajah kecil yang menemukan keajaiban dalam hal sehari-hari.',
  goliath: 'Goliath mewarisi jejak para raksasa. Tubuh besar dan warisan leluhurnya memberi ciri khas pada setiap petualang.',
  halfling: 'Halfling bertubuh kecil dengan keberanian besar; mudah membaur dalam kehidupan yang tenang maupun petualangan berbahaya.',
  human: 'Human hadir dengan latar dan ambisi yang beragam. Kemampuan beradaptasi membuat jalan petualangannya sangat terbuka.',
  orc: 'Orc membawa daya tahan dan dorongan untuk terus bergerak, dengan kisah pribadi yang dibentuk oleh komunitas dan pilihannya.',
  tiefling: 'Tiefling memiliki jejak dunia fiend dalam rupa dan sihirnya, tetapi menentukan sendiri arti warisan itu dalam hidupnya.',
  'motm:aarakocra': 'Aarakocra adalah humanoid burung yang dekat dengan angin dan langit; perjalanan mereka tidak selalu dibatasi tanah.',
  'motm:aasimar': 'Aasimar membawa percikan kekuatan celestial. Cahaya itu dapat menjadi panggilan, misteri, atau beban dalam perjalanan mereka.',
  'motm:bugbear': 'Bugbear bertubuh besar dan berbulu, tetapi tidak selalu gaduh; sosok yang dapat mengejutkan lewat gerak senyapnya.',
  'motm:centaur': 'Centaur memadukan tubuh humanoid dan kuda, dengan ikatan pada alam serta kebebasan menjelajahi ruang terbuka.',
  'motm:changeling': 'Changeling dapat mengganti wajah dan wujudnya. Bagi mereka, penampilan hanyalah satu bagian dari identitas.',
  'motm:deep-gnome': 'Deep Gnome berasal dari kedalaman bumi; kehidupan di bawah tanah membentuk hubungan mereka dengan batu dan penyamaran.',
  'motm:duergar': 'Duergar adalah kerabat dwarf dari kedalaman dunia, dengan warisan psionik yang memengaruhi tubuh dan kehadirannya.',
  'motm:eladrin': 'Eladrin terhubung dengan Feywild. Nuansa musim mewarnai penampilan dan ekspresi sihir fey mereka.',
  'motm:fairy': 'Fairy adalah penghuni fey bersayap dengan rupa yang beragam; keajaiban alam menyertai langkah kecil mereka.',
  'motm:firbolg': 'Firbolg memiliki kedekatan dengan hutan dan makhluk hidupnya; sosok besar yang dapat memilih untuk tidak terlihat.',
  'motm:genasi-air': 'Air Genasi membawa pengaruh unsur udara, seolah angin menjadi bagian dari napas dan gerak mereka.',
  'motm:genasi-earth': 'Earth Genasi memiliki jejak unsur bumi; batu dan tanah menjadi bagian dari rupa serta warisan magis mereka.',
  'motm:genasi-fire': 'Fire Genasi memperlihatkan pengaruh unsur api, dari penampilan yang membara hingga sihir yang menyertainya.',
  'motm:genasi-water': 'Water Genasi membawa warisan unsur air; sungai, hujan, dan samudra terasa dekat dengan kehidupan mereka.',
  'motm:githyanki': 'Githyanki memiliki warisan psionik dan hubungan dengan Astral Plane; pengembara yang melintasi batas dunia.',
  'motm:githzerai': 'Githzerai mengembangkan disiplin batin di tengah kekacauan Limbo, menyalurkan warisan psionik melalui pikiran.',
  'motm:goblin': 'Goblin bertubuh kecil dengan akar fey, mampu menemukan celah dan jalan keluar di tempat yang tidak diduga.',
  'motm:goliath': 'Goliath versi MotM berakar pada kehidupan pegunungan; kekuatan fisik dan ketahanan menjadi ciri warisannya.',
  'motm:harengon': 'Harengon adalah humanoid kelinci dengan asal fey; indra waspada dan gerakan melompat menandai petualangannya.',
  'motm:hobgoblin': 'Hobgoblin memiliki akar fey dan ikatan kuat dengan kerja sama; bantuan tim menjadi bagian dari warisan mereka.',
  'motm:kenku': 'Kenku adalah humanoid burung dengan bakat meniru suara dan membuat salinan; pengamat yang mengolah apa yang dipelajarinya.',
  'motm:kobold': 'Kobold adalah humanoid kecil berciri naga. Warisan drakonik mereka dapat tampil melalui keberanian, keahlian, atau sihir.',
  'motm:lizardfolk': 'Lizardfolk adalah humanoid reptil yang akrab dengan perairan; tubuh bersisik menjadi bekal alami dalam penjelajahan.',
  'motm:minotaur': 'Minotaur memiliki kepala dan tanduk banteng; sosok kokoh yang membawa cerita sendiri di luar gambaran labirin.',
  'motm:orc': 'Orc versi MotM menggabungkan tubuh kuat dengan ketangguhan untuk bertahan; warisan yang tidak menentukan watak pemiliknya.',
  'motm:satyr': 'Satyr adalah makhluk fey berkaki kambing, dekat dengan musik, perjalanan, dan pengalaman baru di dunia fana.',
  'motm:sea-elf': 'Sea Elf memiliki hubungan mendalam dengan kehidupan laut; rumah dan petualangannya dapat terbentang di bawah ombak.',
  'motm:shadar-kai': 'Shadar-kai adalah elf yang terhubung dengan Shadowfell, membawa jejak dunia bayangan ke tempat yang mereka kunjungi.',
  'motm:shifter': 'Shifter memiliki jejak kebuasan dalam garis keturunannya, yang tampak lebih jelas saat mereka melakukan shifting.',
  'motm:tabaxi': 'Tabaxi adalah humanoid kucing; rasa ingin tahu dan kelincahan dapat membawa mereka ke banyak kisah baru.',
  'motm:tortle': 'Tortle membawa cangkang sebagai bagian dari tubuhnya; penjelajah yang selalu memiliki tempat berlindung sendiri.',
  'motm:triton': 'Triton berasal dari lingkungan bawah laut, dengan warisan yang menghubungkan mereka pada air dan penghuni samudra.',
  'motm:yuan-ti': 'Yuan-ti memperlihatkan jejak ular dalam rupa dan sihirnya; setiap individu memilih jalannya sendiri di dunia.',
};

export function speciesGuide(build: BuildInput, catalog: Catalog) {
  const race = catalog.races.find(r => r.index === build.race);
  const species = motmFor(build);
  const metadata = race as typeof race & { size?: string; type?: string; size_options?: { from: { options: { size: string }[] } } };
  const sizes = species ? species.sizes || ['Medium'] : phbSpeciesSizes[build.race] || [];
  const selectedSize = build.choices[species ? 'motm.size' : 'race.size']?.[0];
  const subrace = catalog.subraces.find(r => r.index === build.subrace);
  const refs = [...(race?.traits || []), ...(subrace?.racial_traits || []), ...(subrace?.traits || [])];
  return {
    name: race?.name.replace(' (MotM 2022)', '') || '',
    overview: speciesOverviews[build.race],
    size: selectedSize && sizes.includes(selectedSize) ? selectedSize : sizes.join(' / ') || metadata?.size || metadata?.size_options?.from.options.map(o => o.size).join(' / ') || '',
    type: species?.type || metadata?.type || 'Humanoid',
    speed: race?.speed,
    traits: catalog.traits.filter(t => refs.some(r => r.index === t.index)),
  };
}
