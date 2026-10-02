const fs = require('fs');
const path = require('path');

console.log("🚀 Updating project for Phase 2 (Data Layer)...");

const files = {
  "src/lib/schema.ts": `import { z } from "zod";

export type NoteType = "fact" | "preference" | "sensitive" | "reflection";
export type LoopDirection = "I_owe" | "they_owe" | "mutual";
export type LoopStatus = "open" | "waiting" | "completed" | "cancelled";

export interface Person {
  id: string;
  name: string;
  tags: string[];
  contactIntervalDays?: number;
  snoozedUntil?: string;
  plannedContactAt?: string;
  nextTime?: { text: string; doneAt?: string };
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  personId: string;
  type: NoteType;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  personId: string;
  date: string;
  text: string;
  meaningful: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpenLoop {
  id: string;
  personId: string;
  description: string;
  direction: LoopDirection;
  status: LoopStatus;
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportantDate {
  id: string;
  personId: string;
  label: string;
  date: string;
  repeatsYearly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: "singleton";
  pinHash?: string;
  pinSalt?: string;
  lastExportAt?: string;
  autoLockSeconds: number;
  schemaVersion: number;
}

export const BackupSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  people: z.array(z.object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    contactIntervalDays: z.number().optional(),
    snoozedUntil: z.string().optional(),
    plannedContactAt: z.string().optional(),
    nextTime: z.object({ text: z.string(), doneAt: z.string().optional() }).optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  notes: z.array(z.object({
    id: z.string(),
    personId: z.string(),
    type: z.enum(["fact", "preference", "sensitive", "reflection"]),
    text: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  interactions: z.array(z.object({
    id: z.string(),
    personId: z.string(),
    date: z.string(),
    text: z.string(),
    meaningful: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  openLoops: z.array(z.object({
    id: z.string(),
    personId: z.string(),
    description: z.string(),
    direction: z.enum(["I_owe", "they_owe", "mutual"]),
    status: z.enum(["open", "waiting", "completed", "cancelled"]),
    dueAt: z.string().optional(),
    completedAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  importantDates: z.array(z.object({
    id: z.string(),
    personId: z.string(),
    label: z.string(),
    date: z.string(),
    repeatsYearly: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  settings: z.object({
    id: z.literal("singleton"),
    pinHash: z.string().optional(),
    pinSalt: z.string().optional(),
    lastExportAt: z.string().optional(),
    autoLockSeconds: z.number(),
    schemaVersion: z.number()
  }).optional()
});`,

  "src/lib/db.ts": `import Dexie, { type Table } from "dexie";
import type { Person, Note, Interaction, OpenLoop, ImportantDate, Settings } from "./schema";
import { isAfter, isBefore, parseISO, startOfDay } from "date-fns";

export class KeepDatabase extends Dexie {
  people!: Table<Person, string>;
  notes!: Table<Note, string>;
  interactions!: Table<Interaction, string>;
  openLoops!: Table<OpenLoop, string>;
  importantDates!: Table<ImportantDate, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("KeepDatabase");
    this.version(1).stores({
      people: "id, name, *tags, snoozedUntil, plannedContactAt",
      notes: "id, personId, type, createdAt",
      interactions: "id, personId, date, meaningful",
      openLoops: "id, personId, status, direction, dueAt",
      importantDates: "id, personId, date",
      settings: "id"
    });
  }
}

export const db = new KeepDatabase();

export async function getLatestMeaningfulContact(personId: string): Promise<Interaction | undefined> {
  const interactions = await db.interactions
    .where("personId")
    .equals(personId)
    .filter(i => i.meaningful === true)
    .sortBy("date");
  return interactions.reverse()[0];
}

export async function isPersonDueForContact(person: Person, today = new Date()): Promise<boolean> {
  if (!person.contactIntervalDays) return false;

  const todayStart = startOfDay(today);

  if (person.snoozedUntil) {
    const snoozeDate = startOfDay(parseISO(person.snoozedUntil));
    if (isBefore(todayStart, snoozeDate)) return false;
  }

  const lastMeaningful = await getLatestMeaningfulContact(person.id);
  if (!lastMeaningful) return true;

  const lastContactDate = startOfDay(parseISO(lastMeaningful.date));
  const nextDueDate = new Date(lastContactDate);
  nextDueDate.setDate(nextDueDate.getDate() + person.contactIntervalDays);

  return !isBefore(todayStart, nextDueDate);
}`,

  "src/lib/export.ts": `import { db } from "./db";
import { BackupSchema } from "./schema";

export async function exportAppData(): Promise<string> {
  const people = await db.people.toArray();
  const notes = await db.notes.toArray();
  const interactions = await db.interactions.toArray();
  const openLoops = await db.openLoops.toArray();
  const importantDates = await db.importantDates.toArray();
  const settingsArray = await db.settings.toArray();

  const data = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    people,
    notes,
    interactions,
    openLoops,
    importantDates,
    settings: settingsArray[0]
  };

  await db.settings.put({
    id: "singleton",
    autoLockSeconds: settingsArray[0]?.autoLockSeconds ?? 60,
    schemaVersion: 1,
    ...settingsArray[0],
    lastExportAt: data.exportedAt
  });

  return JSON.stringify(data, null, 2);
}

export async function importAppData(jsonString: string, mode: "merge" | "replace"): Promise<void> {
  const parsed = JSON.parse(jsonString);
  const validated = BackupSchema.parse(parsed);

  await db.transaction("rw", [db.people, db.notes, db.interactions, db.openLoops, db.importantDates, db.settings], async () => {
    if (mode === "replace") {
      await db.people.clear();
      await db.notes.clear();
      await db.interactions.clear();
      await db.openLoops.clear();
      await db.importantDates.clear();
      await db.settings.clear();
    }

    await db.people.bulkPut(validated.people);
    await db.notes.bulkPut(validated.notes);
    await db.interactions.bulkPut(validated.interactions);
    await db.openLoops.bulkPut(validated.openLoops);
    await db.importantDates.bulkPut(validated.importantDates);
    if (validated.settings) {
      await db.settings.put(validated.settings);
    }
  });
}`
};

for (const [filePath, content] of Object.entries(files)) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content.trim());
}

console.log("✅ Phase 2 files updated successfully!");
