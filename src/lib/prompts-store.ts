import { db } from "./db";
import type { PromptCategory } from "./schema";

export async function addCustomPrompt(category: PromptCategory, text: string): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) return;

  await db.transaction("rw", db.settings, async () => {
    const settings = await db.settings.get("singleton");
    const existingPrompts = settings?.customPrompts ?? [];
    const duplicate = existingPrompts.some((prompt) =>
      prompt.category === category && prompt.text.toLocaleLowerCase() === cleanText.toLocaleLowerCase(),
    );
    if (duplicate) return;

    await db.settings.put({
      id: "singleton",
      autoLockSeconds: settings?.autoLockSeconds ?? 60,
      schemaVersion: settings?.schemaVersion ?? 1,
      ...settings,
      customPrompts: [...existingPrompts, { id: crypto.randomUUID(), category, text: cleanText }],
    });
  });
}

export async function removeCustomPrompt(promptId: string): Promise<void> {
  await db.transaction("rw", db.settings, async () => {
    const settings = await db.settings.get("singleton");
    if (!settings) return;
    await db.settings.put({
      ...settings,
      customPrompts: (settings.customPrompts ?? []).filter((prompt) => prompt.id !== promptId),
    });
  });
}