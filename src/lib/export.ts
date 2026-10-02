import { db } from "./db";
import { BackupSchema } from "./schema";

export async function exportAppData(): Promise<string> {
  const exportedAt = new Date().toISOString();
  const data = await db.transaction(
    "rw",
    [db.people, db.notes, db.interactions, db.openLoops, db.importantDates, db.settings],
    async () => {
      const people = await db.people.toArray();
      const notes = await db.notes.toArray();
      const interactions = await db.interactions.toArray();
      const openLoops = await db.openLoops.toArray();
      const importantDates = await db.importantDates.toArray();
      const existingSettings = await db.settings.get("singleton");
      const settings = {
        id: "singleton" as const,
        autoLockSeconds: existingSettings?.autoLockSeconds ?? 60,
        schemaVersion: existingSettings?.schemaVersion ?? 1,
        ...existingSettings,
        lastExportAt: exportedAt
      };

      await db.settings.put(settings);

      return {
        schemaVersion: 1,
        exportedAt,
        people,
        notes,
        interactions,
        openLoops,
        importantDates,
        settings
      };
    }
  );

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
}