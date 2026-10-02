import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/db";
import PromptPicker from "@/components/PromptPicker";

interface QuickLogSheetProps {
  open: boolean;
  onClose: () => void;
  initialPersonId?: string;
  onSaved?: () => void;
}

export default function QuickLogSheet({
  open,
  onClose,
  initialPersonId,
  onSaved,
}: QuickLogSheetProps) {
  const people = useLiveQuery(() => db.people.orderBy("name").toArray(), [], []);
  const [personId, setPersonId] = useState(initialPersonId ?? "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [text, setText] = useState("");
  const [quickHello, setQuickHello] = useState(false);
  const [nextTime, setNextTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPersonId(initialPersonId ?? "");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setText("");
    setQuickHello(false);
    setNextTime("");
    setError("");
  }, [initialPersonId, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const canSave = Boolean(personId) && (quickHello || Boolean(text.trim())) && !saving;

  async function saveInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    const interactionDate = new Date(`${date}T12:00:00`);

    try {
      await db.transaction("rw", [db.interactions, db.people], async () => {
        await db.interactions.add({
          id: crypto.randomUUID(),
          personId,
          date: interactionDate.toISOString(),
          text: text.trim() || "Quick hello",
          meaningful: !quickHello,
          createdAt: now,
          updatedAt: now,
        });

        if (nextTime.trim()) {
          await db.people.update(personId, {
            nextTime: { text: nextTime.trim() },
            updatedAt: now,
          });
        }
      });
      onSaved?.();
      onClose();
    } catch {
      setError("The interaction could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            aria-labelledby="quick-log-title"
            aria-modal="true"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:rounded-2xl"
            role="dialog"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Quick log</p>
                <h2 className="mt-1 text-xl font-semibold" id="quick-log-title">A moment worth keeping</h2>
              </div>
              <button
                aria-label="Close quick log"
                className="rounded-full p-2 text-muted transition-colors hover:bg-background hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                onClick={onClose}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={saveInteraction}>
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="quick-log-person">
                Person
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  id="quick-log-person"
                  onChange={(event) => setPersonId(event.target.value)}
                  required
                  value={personId}
                >
                  <option disabled value="">Choose someone</option>
                  {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
              </label>

              <div className="space-y-3">
                <p className="text-sm font-medium">What happened?</p>
                <PromptPicker category="interaction" onChoose={setText} />
                <label className="block space-y-1.5 text-sm font-medium" htmlFor="quick-log-text">
                  <span className="sr-only">Interaction notes</span>
                <textarea
                  autoFocus
                  className="min-h-24 w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-base font-normal text-text outline-none placeholder:text-muted/80 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  id="quick-log-text"
                  onChange={(event) => setText(event.target.value)}
                  placeholder="A detail you want to remember..."
                  value={text}
                />
                </label>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm" htmlFor="quick-hello">
                  <input
                    checked={quickHello}
                    className="peer sr-only"
                    id="quick-hello"
                    onChange={(event) => setQuickHello(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="flex h-6 w-11 items-center rounded-full bg-border p-1 transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                    <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${quickHello ? "translate-x-5" : ""}`} />
                  </span>
                  <span>Quick hello <span className="text-muted">(not meaningful)</span></span>
                </label>
                <label className="shrink-0 space-y-1 text-xs text-muted" htmlFor="quick-log-date">
                  Date
                  <input
                    className="block w-36 rounded-xl border border-border bg-background px-2 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    id="quick-log-date"
                    onChange={(event) => setDate(event.target.value)}
                    required
                    type="date"
                    value={date}
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-sm font-medium" htmlFor="quick-log-next-time">
                Next time <span className="font-normal text-muted">(optional)</span>
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base font-normal text-text outline-none placeholder:text-muted/80 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  id="quick-log-next-time"
                  onChange={(event) => setNextTime(event.target.value)}
                  placeholder="Ask about their new project..."
                  value={nextTime}
                />
              </label>

              {error && <p aria-live="polite" className="text-sm text-red-700">{error}</p>}

              <button
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-md shadow-primary/20"
                disabled={!canSave}
                type="submit"
              >
                <Check size={18} />
                {saving ? "Saving..." : "Save interaction"}
              </button>
            </form>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}