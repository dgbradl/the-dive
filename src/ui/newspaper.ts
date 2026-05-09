import { Station, type GameCatalog, type GameState, type ShiftEntry, type ShiftReport } from '../game/types';

/**
 * Generate body sentences for the end-of-day newspaper. Pure — same inputs
 * always produce the same paragraph. Sentences are returned in narrative order;
 * the renderer joins them with spaces or paragraph breaks.
 */
export function composeStory(
  report: ShiftReport,
  state: GameState,
  _catalog: GameCatalog,
): string[] {
  const sentences: string[] = [];

  // Lead: served + walkouts.
  const served = report.customersServed;
  const lost = report.customersLost;
  if (served === 0 && lost === 0) {
    sentences.push('A quiet night. Dust settled on the bar.');
  } else if (lost === 0) {
    sentences.push(`The bar served ${served} ${nGuests(served)} clean — nobody walked.`);
  } else if (served === 0) {
    sentences.push(`Nobody got a drink. ${lost} gave up and walked.`);
  } else {
    sentences.push(`${served} ${nGuests(served)} got their drinks; ${lost} got tired and left.`);
  }

  // Crew at the bar.
  const bartenderNames = state.assignments
    .filter((a) => a.station === Station.Bar)
    .map((a) => state.hiredStaff.find((h) => h.instanceId === a.staffInstanceId)?.displayName)
    .filter((n): n is string => Boolean(n));
  if (served > 0) {
    if (bartenderNames.length === 1) {
      sentences.push(`${bartenderNames[0]} held the bar.`);
    } else if (bartenderNames.length > 1) {
      sentences.push(`${joinNames(bartenderNames)} traded pours.`);
    }
  }

  // Tray drops (Klutz mishaps).
  const trayDrops = report.entries.filter((e) => e.kind === 'Mishap' && e.text.includes('drops a tray'));
  if (trayDrops.length > 0) {
    const culprits = uniqueStaffNames(trayDrops, state);
    const who = culprits.length > 0 ? joinNames(culprits) : 'Someone';
    sentences.push(`${who} dropped ${nTimes(trayDrops.length, 'a tray', 'trays')}.`);
  }

  // Smoke breaks (Lazy Note entries).
  const smokeBreaks = report.entries.filter((e) => e.kind === 'Note' && e.text.includes('smoke'));
  if (smokeBreaks.length > 0) {
    const names = uniqueStaffNames(smokeBreaks, state);
    const who = names.length > 0 ? joinNames(names) : 'A bartender';
    const tail = smokeBreaks.length === 1 ? 'mid-shift' : `${smokeBreaks.length} times`;
    sentences.push(`${who} ducked out for a smoke ${tail}.`);
  }

  // Notable events.
  const eventCounts = new Map<string, number>();
  for (const e of report.entries) {
    if (e.kind !== 'Event') continue;
    const key = e.text.toLowerCase();
    eventCounts.set(key, (eventCounts.get(key) ?? 0) + 1);
  }
  const jukebox = countMatching(eventCounts, 'jukebox');
  if (jukebox > 0) sentences.push(`The jukebox ate ${nTimes(jukebox, 'a quarter', 'quarters')}.`);
  if (countMatching(eventCounts, 'inspector') > 0) sentences.push('The health inspector dropped in.');
  if (countMatching(eventCounts, 'singalong') > 0) sentences.push('Someone started a Sweet Caroline singalong.');
  if (countMatching(eventCounts, 'toilet') > 0) sentences.push('The bathroom situation deteriorated.');

  // Big single tip.
  const servedEntries = report.entries.filter((e) => e.kind === 'Served');
  if (servedEntries.length > 0) {
    const biggest = servedEntries.reduce((a, b) => (a.cashDelta > b.cashDelta ? a : b));
    if (biggest.cashDelta >= 30) {
      sentences.push(`One round netted a fat $${biggest.cashDelta}.`);
    }
  }

  // Rep-tier color.
  const archIds = new Set(
    report.entries.filter((e) => e.kind === 'CustomerArrived').map((e) => e.customerArchetypeId),
  );
  if (archIds.has('yelp_reviewer')) {
    sentences.push('Someone with a notepad asked too many questions.');
  }
  if (archIds.has('wedding_party')) {
    sentences.push('A wedding party stumbled in past last call.');
  }
  if (archIds.has('date_night_couple')) {
    sentences.push('A couple held hands across the bar through one slow song.');
  }

  return sentences;
}

export function pickHeadline(net: number, served: number, lost: number): string {
  if (net > 80) return 'Banner Night';
  if (net > 0 && lost === 0) return 'Clean Sweep';
  if (net > 0) return 'Solid Night';
  if (net === 0) return 'Broke Even';
  if (lost > served) return 'Brutal';
  return 'Rough One';
}

// ---------- helpers ----------

function nGuests(n: number): string {
  return n === 1 ? 'guest' : 'guests';
}

function nTimes(n: number, singular: string, plural: string): string {
  if (n === 1) return singular;
  if (n === 2) return `${plural} (twice)`;
  return `${n} ${plural}`;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function uniqueStaffNames(entries: ShiftEntry[], state: GameState): string[] {
  const out: string[] = [];
  for (const e of entries) {
    if (!e.staffInstanceId) continue;
    const hired = state.hiredStaff.find((h) => h.instanceId === e.staffInstanceId);
    if (!hired) continue;
    if (!out.includes(hired.displayName)) out.push(hired.displayName);
  }
  return out;
}

function countMatching(counts: Map<string, number>, needle: string): number {
  let total = 0;
  for (const [text, n] of counts) if (text.includes(needle)) total += n;
  return total;
}
