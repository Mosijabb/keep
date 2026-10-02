import { useState, type FormEvent } from "react";
import { format, isValid, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CircleDashed, Clock3, Plus, X } from "lucide-react";
import PromptPicker from "@/components/PromptPicker";
import { db } from "@/lib/db";
import type { LoopDirection, LoopStatus, OpenLoop, Person } from "@/lib/schema";

type LoopFilter = "all" | LoopDirection;

interface LoopPageData {
  loops: OpenLoop[];
  people: Person[];
}

const emptyData: LoopPageData = { loops: [], people: [] };
const filters: Array<{ value: LoopFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "I_owe", label: "I owe" },
  { value: "they_owe", label: "They owe" },
  { value: "mutual", label: "Mutual" },
];

function formatDueDate(value?: string) {
  if (!value) return "No due date";
  const date = parseISO(value);
  return isValid(date) ? format(date, "MMM d, yyyy") : value;
}

export default function OpenLoops() {
  const [filter, setFilter] = useState<LoopFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [personId, setPersonId] = useState("");
  const [description, setDescription] = useState("");
  const [direction, setDirection] = useState<LoopDirection>("I_owe");
  const [status, setStatus] = useState<LoopStatus>("open");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const data = useLiveQuery(async () => {
    const [loops, people] = await Promise.all([db.openLoops.toArray(), db.people.orderBy("name").toArray()]);
    return {
      loops: loops.filter((loop) => loop.status === "open" || loop.status === "waiting")
        .sort((left, right) => (left.dueAt ?? "9999").localeCompare(right.dueAt ?? "9999")),
      people,
    };
  }, [], emptyData);

  const peopleById = new Map(data.people.map((person) => [person.id, person]));
  const visibleLoops = data.loops.filter((loop) => filter === "all" || loop.direction === filter);

  async function addLoop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!personId || !description.trim()) return;

    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    try {
      await db.openLoops.add({
        id: crypto.randomUUID(),
        personId,
        description: description.trim(),
        direction,
        status,
        ...(dueAt ? { dueAt: new Date(`${dueAt}T12:00:00`).toISOString() } : {}),
        createdAt: now,
        updatedAt: now,
      });
      setDescription("");
      setDueAt("");
      setShowAdd(false);
    } catch {
      setError("Could not add this follow-up. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function completeLoop(loop: OpenLoop) {
    const now = new Date().toISOString();
    try {
      await db.openLoops.update(loop.id, { status: "completed", completedAt: now, updatedAt: now });
      setError("");
    } catch {
      setError("Could not complete this follow-up. Try again.");
    }
  }

  function openComposer() {
    setPersonId(data.people[0]?.id ?? "");
    setError("");
    setShowAdd(true);
  }

  return (
    <div className="pb-8 pt-7">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Keep your word</p>
          <h1 className="mt-1 text-3xl font-semibold">Follow-ups</h1>
          <p className="mt-1 text-sm text-muted">{data.loops.length} {data.loops.length === 1 ? "open item" : "open items"}</p>
        </div>
        <button className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50" disabled={!data.people.length} onClick={openComposer} type="button">
          <Plus size={18} />Add follow-up
        </button>
      </header>

      <div aria-label="Filter follow-ups by who owes the next step" className="mb-5 grid grid-cols-4 gap-1 rounded-lg bg-background p-1" role="group">
        {filters.map(({ value, label }) => (
          <button aria-pressed={filter === value} className={`min-h-9 rounded-md px-2 text-xs font-semibold transition-colors ${filter === value ? "bg-surface text-primary shadow-sm" : "text-muted hover:text-text"}`} key={value} onClick={() => setFilter(value)} type="button">{label}</button>
        ))}
      </div>

      {error && !showAdd && <p aria-live="polite" className="mb-4 text-sm text-rose-700">{error}</p>}

      {visibleLoops.length > 0 ? (
        <ul className="divide-y divide-border border-y border-border">
          {visibleLoops.map((loop) => {
            const person = peopleById.get(loop.personId);
            return (
              <li className="flex items-start gap-3 py-4" key={loop.id}>
                <span aria-hidden="true" className="mt-0.5 text-amber-700"><CircleDashed size={19} /></span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">{loop.description}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    {person ? <Link className="font-medium text-primary hover:underline" to={`/people/${person.id}`}>{person.name}</Link> : <span>Person removed</span>}
                    <span aria-hidden="true">·</span>
                    <span>{loop.direction === "I_owe" ? "I owe" : loop.direction === "they_owe" ? "They owe" : "Mutual"}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{loop.status}</span>
                  </div>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted"><Clock3 size={13} />{formatDueDate(loop.dueAt)}</p>
                </div>
                <button aria-label={`Mark as done: ${loop.description}`} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-primary hover:border-primary/40 hover:bg-primary/5" onClick={() => completeLoop(loop)} type="button"><Check size={15} />Done</button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="border-y border-border py-12 text-center">
          <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Check size={22} /></span>
          <h2 className="mt-4 font-semibold">{data.loops.length ? "Nothing in this view" : "No open follow-ups"}</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
            {data.people.length ? "Keep a promise or a question here so it is easy to pick up next time." : "Add someone to your people list before creating a follow-up."}
          </p>
          {data.people.length ? (
            <button className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-primary hover:bg-primary/5" onClick={openComposer} type="button"><Plus size={16} />Add a follow-up</button>
          ) : <Link className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline" to="/people">Go to People <ArrowRight size={15} /></Link>}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAdd(false); }}>
          <section aria-labelledby="add-loop-title" aria-modal="true" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-2xl" role="dialog">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Keep a promise</p>
                <h2 className="mt-1 text-xl font-semibold" id="add-loop-title">Add a follow-up</h2>
              </div>
              <button aria-label="Close add follow-up" className="rounded-full p-2 text-muted hover:bg-background hover:text-text" onClick={() => setShowAdd(false)} type="button"><X size={20} /></button>
            </div>
            <form className="space-y-4" onSubmit={addLoop}>
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="loop-person">
                Person
                <select className="w-full rounded-lg border border-border bg-background px-3 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" id="loop-person" onChange={(event) => setPersonId(event.target.value)} required value={personId}>
                  {data.people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                </select>
              </label>
              <PromptPicker category="followUp" onChoose={setDescription} />
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="loop-description">
                What needs doing?
                <textarea autoFocus className="min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-base font-normal outline-none placeholder:text-muted/80 focus:border-primary focus:ring-2 focus:ring-primary/20" id="loop-description" onChange={(event) => setDescription(event.target.value)} placeholder="A clear next step..." value={description} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5 text-sm font-medium" htmlFor="loop-direction">
                  Next step belongs to
                  <select className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" id="loop-direction" onChange={(event) => setDirection(event.target.value as LoopDirection)} value={direction}>
                    <option value="I_owe">Me</option>
                    <option value="they_owe">Them</option>
                    <option value="mutual">Both of us</option>
                  </select>
                </label>
                <label className="block space-y-1.5 text-sm font-medium" htmlFor="loop-status">
                  Status
                  <select className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" id="loop-status" onChange={(event) => setStatus(event.target.value as LoopStatus)} value={status}>
                    <option value="open">Open</option>
                    <option value="waiting">Waiting</option>
                  </select>
                </label>
              </div>
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="loop-due-date">
                Due date <span className="font-normal text-muted">(optional)</span>
                <input className="w-full rounded-lg border border-border bg-background px-3 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" id="loop-due-date" onChange={(event) => setDueAt(event.target.value)} type="date" value={dueAt} />
              </label>
              {error && <p aria-live="polite" className="text-sm text-rose-700">{error}</p>}
              <button className="min-h-12 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:brightness-95 disabled:opacity-50" disabled={!description.trim() || !personId || saving} type="submit">{saving ? "Saving..." : "Add follow-up"}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}