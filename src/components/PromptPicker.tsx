import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addCustomPrompt } from "@/lib/prompts-store";
import { presetPrompts, promptLabels } from "@/lib/prompts";
import type { PromptCategory } from "@/lib/schema";

interface PromptPickerProps {
  category: PromptCategory;
  onChoose: (prompt: string) => void;
}

export default function PromptPicker({ category, onChoose }: PromptPickerProps) {
  const settings = useLiveQuery(() => db.settings.get("singleton"), [], undefined);
  const [adding, setAdding] = useState(false);
  const [customText, setCustomText] = useState("");
  const [error, setError] = useState("");
  const customPrompts = (settings?.customPrompts ?? []).filter((prompt) => prompt.category === category);

  async function saveCustomPrompt() {
    const prompt = customText.trim();
    if (!prompt) return;

    try {
      await addCustomPrompt(category, prompt);
      setCustomText("");
      setAdding(false);
      setError("");
      onChoose(prompt);
    } catch {
      setError("Could not save this prompt. Try again.");
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted">{promptLabels[category]} prompts</p>
        {!adding && (
          <button className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary hover:bg-primary/5" onClick={() => setAdding(true)} type="button">
            <Plus size={14} />Add your own
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {[...presetPrompts[category], ...customPrompts.map((prompt) => prompt.text)].map((prompt, index) => (
          <button
            className="min-h-9 rounded-lg border border-border bg-background px-3 py-1.5 text-left text-xs leading-5 text-text transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            key={`${prompt}-${index}`}
            onClick={() => onChoose(prompt)}
            type="button"
          >{prompt}</button>
        ))}
      </div>

      {adding && (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`custom-prompt-${category}`}>Your {promptLabels[category].toLocaleLowerCase()} prompt</label>
          <input
            autoFocus
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            id={`custom-prompt-${category}`}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void saveCustomPrompt();
              }
            }}
            onChange={(event) => setCustomText(event.target.value)}
            placeholder="Write a prompt to reuse..."
            value={customText}
          />
          <button aria-label="Save custom prompt" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50" disabled={!customText.trim()} onClick={() => void saveCustomPrompt()} type="button"><Plus size={18} /></button>
          <button aria-label="Cancel custom prompt" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted" onClick={() => { setAdding(false); setCustomText(""); }} type="button"><X size={18} /></button>
        </div>
      )}
      {error && <p aria-live="polite" className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}