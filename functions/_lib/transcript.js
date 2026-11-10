// A raw_leiratok/{N}eps/{N}eps_hu_final.json szegmensenkénti formátumból
// ({ start, end, speaker, hu_raw, hu_cleaned, en }) állítja elő a weboldalon
// használt beszélő-váltásonkénti "turn"-öket. Tisztán mechanikus összevonás,
// nincs benne LLM-hívás.

import { formatSeconds, ValidationError } from './util.js';

// speakerMap: { "SPEAKER_00": "Zsebeházy Bálint", ... }
export function buildTurns(finalJsonText, speakerMap) {
  let segments;
  try {
    segments = JSON.parse(finalJsonText);
  } catch (e) {
    throw new ValidationError(`A leirat fájl nem érvényes JSON: ${e.message}`);
  }
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new ValidationError('A leirat fájl üres, vagy nem egy szegmens-tömb.');
  }

  const unmapped = new Set();
  for (const seg of segments) {
    if (typeof seg.start !== 'number' || !seg.speaker || typeof seg.hu_cleaned !== 'string') {
      throw new ValidationError(
        'A leirat fájl egy szegmensének hiányzik a "start", "speaker" vagy "hu_cleaned" mezője. ' +
        'Várt formátum: a *_final.json (whisperX + LLM-tisztítás utáni végleges fájl).'
      );
    }
    if (typeof seg.en !== 'string' || !seg.en.trim()) {
      throw new ValidationError(
        `Egy szegmensnek nincs angol ("en") szövege: "${seg.hu_cleaned.slice(0, 40)}…". ` +
        'A *_final.json-nak mindkét nyelvet tartalmaznia kell.'
      );
    }
    if (!speakerMap[seg.speaker]) unmapped.add(seg.speaker);
  }
  if (unmapped.size > 0) {
    throw new ValidationError(
      `A leiratban szereplő beszélő-címke(k) nincsenek megfeleltetve névre: ${[...unmapped].join(', ')}. ` +
      'Add meg mindegyikhez a nevet a "Beszélők" mezőben (pl. SPEAKER_00 = Zsebeházy Bálint).'
    );
  }

  const turns = [];
  for (const seg of segments) {
    const speakerName = speakerMap[seg.speaker];
    const hu = seg.hu_cleaned.trim();
    const en = seg.en.trim();
    const last = turns[turns.length - 1];
    if (last && last.speakerName === speakerName) {
      last.hu += (last.hu.endsWith(' ') ? '' : ' ') + hu;
      last.en += (last.en.endsWith(' ') ? '' : ' ') + en;
    } else {
      turns.push({
        speakerName,
        startSeconds: seg.start,
        timeDisplay: formatSeconds(seg.start),
        hu,
        en,
      });
    }
  }
  return turns;
}
