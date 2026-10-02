import Dexie, { type Table } from "dexie";
import type { Person, Note, Interaction, OpenLoop, ImportantDate, Settings } from "./schema";
import { isBefore, parseISO, startOfDay } from "date-fns";

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
}