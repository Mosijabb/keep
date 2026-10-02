import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PromptPicker from "@/components/PromptPicker";
import { db } from "@/lib/db";
import type { LoopDirection, NoteType, PromptCategory } from "@/lib/schema";

export type PersonEntryCategory = "remember" | "followUp" | "reflect";

interface PersonEntrySheetProps {
  category: PersonEntryCategory | null;
  personId: string;
  onClose: () => void;
}

const categoryCopy: Record<PersonEntryCategory, { title: string; description: string; action: string }> = {
  remember: { title: "Remember something", description: "Keep a useful detail close for next time.", action: "Save note" },
  followUp: { title: "Add a follow-up", description: "Write down what you want to do or ask next.", action: "Add follow-up" },
  reflect: { title: "Save a reflection", description: "Capture what you noticed after spending time together.", action: "Save reflection" },
};

export default function PersonEntrySheet({ category, personId, onClose }: PersonEntrySheetProps) {
  const [text, setText] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("fact");
  const [direction, setDirection] = useState<LoopDirection>("I_owe");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!category) return;
    setText("");
    setNoteType("fact");
    setDirection("I_owe");
    setDueAt("");
    setError("");
  }, [category]);

  useEffect(() => {
    if (!category) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [category, onClose]);

  if (!category) return null;

  const copy = categoryCopy[category];
  const promptCategory: PromptCategory = category;

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || saving) return;

    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    try {
      if (category === "followUp") {
        await db.openLoops.add({
          id: crypto.randomUUID(),
          personId,
          description: cleanText,
          direction,
          status: "open",
          ...(dueAt ? { dueAt: new Date(`${dueAt}T12:00:00`).toISOString() } : {}),
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const type: NoteType = category === "reflect" ? "reflection" : noteType;
        await db.notes.add({
          id: crypto.randomUUID(),
          personId,
          type,
          text: cleanText,
          createdAt: now,
          updatedAt: now,
        });
      }
      onClose();
    } catch {
      setError("Could not save this item. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {category && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.section 
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            aria-labelledby="person-entry-title" aria-modal="true" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-2xl" role="dialog"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{category.replace("followUp", "Follow up")}</p>
                <h2 className="mt-1 text-xl font-semibold" id="person-entry-title">{copy.title}</h2>
                <p className="mt-1 text-sm text-muted">{copy.description}</p>
              </div>
              <button aria-label="Close" className="rounded-full p-2 text-muted hover:bg-background hover:text-text transition-colors" onClick={onClose} type="button"><X size={20} /></button>
            </div>

            <form className="space-y-4" onSubmit={saveEntry}>
              <PromptPicker category={promptCategory} onChoose={setText} />
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="person-entry-text">
                {category === "followUp" ? "What do you want to follow up on?" : category === "reflect" ? "Your reflection" : "What do you want to remember?"}
                <textarea autoFocus className="min-h-28 w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-base font-normal outline-none placeholder:text-muted/80 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" id="person-entry-text" onChange={(event) => setText(event.target.value)} placeholder="Choose a prompt or write your own..." value={text} />
              </label>

              {category === "remember" && (
                <label className="block space-y-1.5 text-sm font-medium" htmlFor="person-entry-note-type">
                  Note type
                  <select className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" id="person-entry-note-type" onChange={(event) => setNoteType(event.target.value as NoteType)} value={noteType}>
                    <option value="fact">Fact</option>
                    <option value="preference">Preference</option>
                    <option value="sensitive">Sensitive</option>
                  </select>
                </label>
              )}

              {category === "followUp" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block min-w-0 space-y-1.5 text-sm font-medium" htmlFor="person-entry-direction">
                    Who owes the next step?
                    <select className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" id="person-entry-direction" onChange={(event) => setDirection(event.target.value as LoopDirection)} value={direction}>
                      <option value="I_owe">I owe</option>
                      <option value="they_owe">They owe</option>
                      <option value="mutual">Mutual</option>
                    </select>
                  </label>
                  <label className="block min-w-0 space-y-1.5 text-sm font-medium" htmlFor="person-entry-due">
                    Due date <span className="font-normal text-muted">(optional)</span>
                    <input className="w-full rounded-xl border border-border bg-background px-2 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" id="person-entry-due" onChange={(event) => setDueAt(event.target.value)} type="date" value={dueAt} />
                  </label>
                </div>
              )}

              {error && <p aria-live="polite" className="text-sm text-rose-700">{error}</p>}
              <button className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-md shadow-primary/20" disabled={!text.trim() || saving} type="submit">
                {saving ? "Saving..." : copy.action}
              </button>
            </form>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}