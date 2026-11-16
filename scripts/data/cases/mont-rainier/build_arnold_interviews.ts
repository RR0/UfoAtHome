/**
 * Writes public/demo-data/interview-arnold-*.json: Kenneth Arnold's accounts of 1947-06-24 as interviews of the Mount Rainier case, their
 * transcripts read from the pages rr0.org holds of them, so that the values of the case can cite the very passage they were said in.
 *
 * The radio interview of the next day, the two newspaper accounts of the days after (a reporter's, the reporter speaking), his report to
 * the Army Air Forces two weeks later (a letter), and his book of 1952 (with Ray Palmer). Each paragraph is a segment; in the radio
 * interview, a paragraph opening with a speaker's name in bold starts that speaker's turn and the paragraphs after it go on with it.
 * What rr0.org adds to the text (its abstract, its source lines, its notes, its section headings) is left out; a date it marks up as a
 * time is written back as the text had it.
 *
 *     npx tsx scripts/data/cases/mont-rainier/build_arnold_interviews.ts [rr0.org checkout, default ../rr0.org]
 */
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const demoData = path.join(here, "..", "..", "..", "..", "public", "demo-data")
const rr0 = path.resolve(process.argv[2] ?? path.join(here, "..", "..", "..", "..", "..", "rr0.org"))

interface Segment { speaker: string, text: string }

class Rr0Page {
  static readonly MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  /** The page's paragraphs, as text, with the speaker in bold that opens one, if any. */
  static paragraphs(file: string): { lead?: string, text: string }[] {
    const html = readFileSync(path.join(rr0, file), "utf8")
    const body = html.slice(html.indexOf("header-end.html") + 1)
    const found: { lead?: string, text: string }[] = []
    // Paragraphs, and the plain blocks of text the handwritten notes of a drawing are laid out in (in a table, as the AAF report's are).
    for (const match of body.matchAll(/<p(\s[^>]*)?>([\s\S]*?)<\/p>|<div>([^<]+)<\/div>/g)) {
      if (/class="[^"]*(abstract|source|note)/.test(match[1] ?? "")) continue
      let inner = match[2] ?? match[3]
      // rr0.org's own additions inside a paragraph: its notes and source citations.
      inner = inner.replace(/<span class="(note|source)">[\s\S]*?<\/span>/g, "").replace(/<a class="source"[^>]*>[\s\S]*?<\/a>/g, "")
      const lead = /^\s*(?:<a [^>]*>)?\s*<strong>([^<]+)<\/strong>\s*(?:<\/a>)?\s*:\s*/.exec(inner)
      if (lead) inner = inner.slice(lead[0].length)
      const text = Rr0Page.text(inner)
      if (text) found.push({ lead: lead?.[1].trim(), text })
    }
    return found
  }

  /** A paragraph's markup as its text: a time as it was written, a quotation in its marks, entities decoded. */
  static text(markup: string): string {
    return markup
      .replace(/<time>(\d{4})-(\d{2})-(\d{2})<\/time>/g, (_, y, m, d) => `${Rr0Page.MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`)
      .replace(/<q>([\s\S]*?)<\/q>/g, "“$1”")
      .replace(/<br\s*\/?>/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim()
  }
}

const ARNOLD = { role: "witness", by: { people: "ArnoldKennethE" }, title: { en: "Kenneth Arnold", fr: "Kenneth Arnold" }, of: "arnold" }

/**
 * The passages of each account that tell of a moment of the observation, and that moment, seconds after 14:58:00 (the recording's start,
 * see build_mont_rainier.ts): the flash on his airplane at once, the chain found twenty to thirty seconds after ("I spent the next twenty
 * to thirty seconds urgently searching the sky", the book), the first passing Rainier's edge "one minute to 3", the last passing Adams
 * 1 min 42 s later. What he says of their look all along is set where they are best seen, just past Rainier (70 to 80 s).
 */
const MOMENTS: Record<string, { quote: string, at: number }[]> = {
  "interview-arnold-radio-1947-06-25": [
    { quote: "I noticed to the left of me a chain", at: 25 }, { quote: "flip and flash in the sun", at: 30 },
    { quote: "one minute to three when I started clocking", at: 60 }, { quote: "pie plate that was cut in half", at: 70 },
    { quote: "one minute and 42 seconds", at: 162 }
  ],
  "interview-arnold-east-oregonian-1947-06-26": [
    { quote: "as if someone had started an arc light", at: 0 }, { quote: "Chinese kite", at: 70 }
  ],
  "interview-arnold-oregon-journal-1947-06-27": [
    { quote: "weaving and ducking", at: 80 }, { quote: "rocking", at: 80 }
  ],
  "interview-arnold-aaf-1947-07": [
    { quote: "a bright flash reflected on my airplane", at: 0 }, { quote: "I observed a chain of nine", at: 25 },
    { quote: "two or three of them every few seconds", at: 30 }, { quote: "outline against the snow", at: 60 },
    { quote: "read one minute to 3", at: 60 }, { quote: "just a black thin line", at: 70 },
    { quote: "one minute and forty-two seconds", at: 162 }, { quote: "follow by their flashes", at: 162 }
  ],
  "interview-arnold-book-1952": [
    { quote: "a tremendously bright flash lit up the surfaces of my aircraft", at: 0 }, { quote: "next twenty to thirty seconds", at: 25 },
    { quote: "a larger gap in their echelon", at: 30 }, { quote: "jetted to the southward", at: 60 },
    { quote: "elevation of the first craft was greater", at: 70 }, { quote: "tipping their wings alternately", at: 80 },
    { quote: "beyond the southernmost crest of Mount Adams", at: 162 }
  ]
}

interface Account {
  id: string
  file: string
  time: string
  medium: "in-person" | "letter" | "other"
  title: { en: string, fr: string }
  summary: { en: string, fr: string }
  speakers: Record<string, object>
  /** Who speaks in a paragraph, from the name in bold that opens it (the one before it going on otherwise). */
  speakerOf: (lead: string | undefined, previous: string) => string
  by?: object[]
}

const ACCOUNTS: Account[] = [
  {
    id: "interview-arnold-radio-1947-06-25", file: "time/1/9/4/7/06/25/Arnold_Interview/index.html", time: "1947-06-25", medium: "other",
    title: { en: "Radio interview with Kenneth Arnold", fr: "Interview radio de Kenneth Arnold" },
    summary: {
      en: "The day after, in a radio studio: his flight, the chain of nine \"like the tail of a Chinese kite\" across Mount Rainier, the timing between Rainier and Adams, \"like a pie plate that was cut in half with a sort of a convex triangle in the rear\", seen plainly only when they tipped and the Sun flashed on them.",
      fr: "Le lendemain, dans un studio de radio : son vol, la chaîne de neuf « comme la queue d'un cerf-volant chinois » devant le mont Rainier, le chronométrage entre Rainier et Adams, « comme une assiette à tarte coupée en deux avec une sorte de triangle convexe à l'arrière », vus nettement seulement quand ils basculaient et que le Soleil les faisait étinceler."
    },
    speakers: { newscaster: { role: "interviewer", title: { en: "Newscaster", fr: "Présentateur" } }, arnold: ARNOLD },
    speakerOf: (lead, previous) => lead === undefined ? previous : /arnold/i.test(lead) ? "arnold" : "newscaster"
  },
  {
    id: "interview-arnold-east-oregonian-1947-06-26", file: "time/1/9/4/7/06/26/Bequette_BoiseFlyerMaintainsHeSawEm_EastOregonian/index.html", time: "1947-06-26", medium: "in-person",
    title: { en: "Bill Bequette's account in the East Oregonian", fr: "Le compte rendu de Bill Bequette dans l'East Oregonian" },
    summary: {
      en: "The reporter who met him in Pendleton tells what he said: the flashes \"as if someone had started an arc light\", the weaving like a Chinese kite's tail.",
      fr: "Le journaliste qui l'a rencontré à Pendleton rapporte ce qu'il a dit : les éclats « comme si quelqu'un avait allumé un arc électrique », l'ondulation comme la queue d'un cerf-volant chinois."
    },
    speakers: { bequette: { role: "journalist", title: { en: "Bill Bequette", fr: "Bill Bequette" } }, arnold: ARNOLD },
    speakerOf: () => "bequette"
  },
  {
    id: "interview-arnold-oregon-journal-1947-06-27", file: "time/1/9/4/7/06/27/ArnoldInsistsTaleOfFlyingObjectsOK_OregonJournal/index.html", time: "1947-06-27", medium: "in-person",
    title: { en: "The Oregon Journal's account", fr: "Le compte rendu de l'Oregon Journal" },
    summary: {
      en: "A reporter's account of his telling: the objects \"weaving and ducking in and out\", as if \"rocking\".",
      fr: "Le compte rendu d'un journaliste de ce qu'il a raconté : les objets « louvoyant et plongeant », comme s'ils « se balançaient »."
    },
    speakers: { journal: { role: "journalist", title: { en: "Oregon Journal", fr: "Oregon Journal" } }, arnold: ARNOLD },
    speakerOf: () => "journal"
  },
  {
    id: "interview-arnold-aaf-1947-07", file: "time/1/9/4/7/07/12/Arnold_Report_AAF/index.html", time: "1947-07-12", medium: "letter",
    title: { en: "Kenneth Arnold's report to the Army Air Forces", fr: "Le rapport de Kenneth Arnold aux Army Air Forces" },
    summary: {
      en: "His own written account, two weeks after: the flight at 9,200 feet, the flash on his airplane, the chain of nine at about 9,500 feet, the DC-4 for scale, the clocking from Rainier to Adams in 1 min 42 s, \"just a black thin line\" when level, \"Mirror Bright\".",
      fr: "Son propre récit écrit, deux semaines après : le vol à 9 200 pieds, l'éclair sur son avion, la chaîne de neuf vers 9 500 pieds, le DC-4 pour l'échelle, le chronométrage du Rainier à l'Adams en 1 min 42 s, « just a black thin line » quand ils volaient à plat, « Mirror Bright »."
    },
    speakers: { arnold: ARNOLD },
    speakerOf: () => "arnold"
  },
  {
    id: "interview-arnold-book-1952", file: "time/1/9/5/2/Arnold_TheComingOfTheSaucers/index.html", time: "1952", medium: "other",
    title: { en: "The Coming of the Saucers (Kenneth Arnold and Ray Palmer)", fr: "The Coming of the Saucers (Kenneth Arnold et Ray Palmer)" },
    summary: {
      en: "His telling of it five years after, in the book he wrote with Ray Palmer: a larger gap between the first four and the last five, the leader higher than the last, wings tipping alternately and blue-white flashes, his clock perhaps on Mountain time.",
      fr: "Son récit cinq ans après, dans le livre écrit avec Ray Palmer : un écart plus grand entre les quatre premiers et les cinq derniers, le premier plus haut que le dernier, des ailes basculant alternativement et des éclats bleu-blanc, son horloge peut-être à l'heure des Rocheuses."
    },
    speakers: { arnold: ARNOLD },
    speakerOf: () => "arnold"
  }
]

for (const account of ACCOUNTS) {
  const segments: Segment[] = []
  let speaker = Object.keys(account.speakers)[0]
  for (const paragraph of Rr0Page.paragraphs(account.file)) {
    speaker = account.speakerOf(paragraph.lead, speaker)
    segments.push({ speaker, text: paragraph.text })
  }
  // Each moment told, on the segment and the characters that tell it: an error if the words are not there, never a link to nothing.
  for (const { quote, at } of MOMENTS[account.id] ?? []) {
    const index = segments.findIndex(segment => segment.text.toLowerCase().includes(quote.toLowerCase()))
    if (index < 0) throw new Error(`"${quote}" is nowhere in ${account.id}`)
    const from = segments[index].text.toLowerCase().indexOf(quote.toLowerCase())
    const segment = segments[index] as Segment & { refs?: object[] }
    ;(segment.refs ??= []).push({ sighting: "arnold", at, range: [from, from + quote.length] })
  }
  const interview = {
    version: 1,
    id: account.id,
    language: "en",
    title: account.title,
    time: account.time,
    medium: account.medium,
    ...(account.by ? { by: account.by } : {}),
    interviewOf: "arnold",
    summary: account.summary,
    speakers: account.speakers,
    transcription: { method: "manual", note: `As rr0.org holds it: https://rr0.org/${path.dirname(account.file)}/` },
    segments
  }
  writeFileSync(path.join(demoData, `${account.id}.json`), JSON.stringify(interview, null, 1) + "\n")
  console.log(`${account.id}: ${segments.length} segments, ${segments.reduce((n, s) => n + s.text.length, 0)} characters`)
}
