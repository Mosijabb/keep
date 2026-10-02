import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Check, CheckCircle2, ClipboardList, MessageCircle, Plus, Sparkles } from "lucide-react";
import QuickLogSheet from "@/components/QuickLogSheet";
import PersonEntrySheet, { type PersonEntryCategory } from "@/components/PersonEntrySheet";
import { db, isPersonDueForContact } from "@/lib/db";
import type { ImportantDate, Interaction, Note, OpenLoop, Person } from "@/lib/schema";

interface PersonProfile {
  person: Person;
  notes: Note[];
  interactions: Interaction[];
  openLoops: OpenLoop[];
  importantDates: ImportantDate[];
  dueForContact: boolean;
}

function displayDate(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, "MMM d, yyyy") : value;
}

function EmptySection({ children }: { children: string }) {
  return <p className="py-3 text-sm text-muted">{children}</p>;
}

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [showPrepare, setShowPrepare] = useState(false);
  const [entryCategory, setEntryCategory] = useState<PersonEntryCategory | null>(null);
  const [actionError, setActionError] = useState("");

  const profile = useLiveQuery(async () => {
    if (!id) return null;
    const person = await db.people.get(id);
    if (!person) return null;

    const [notes, interactions, openLoops, importantDates, dueForContact] = await Promise.all([
      db.notes.where("personId").equals(id).toArray(),
      db.interactions.where("personId").equals(id).toArray(),
      db.openLoops.where("personId").equals(id).toArray(),
      db.importantDates.where("personId").equals(id).toArray(),
      isPersonDueForContact(person),
    ]);

    return {
      person,
      notes: notes.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      interactions: interactions.sort((left, right) => right.date.localeCompare(left.date)),
      openLoops: openLoops.filter((loop) => loop.status === "open" || loop.status === "waiting"),
      importantDates: importantDates.sort((left, right) => left.date.localeCompare(right.date)),
      dueForContact,
    } satisfies PersonProfile;
  }, [id], null);

  if (profile === undefined) {
    return <p className="py-12 text-center text-sm text-muted">Opening this person...</p>;
  }

  if (!profile) {
    return (
      <div className="pt-8">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary" to="/people"><ArrowLeft size={18} />People</Link>
        <div className="border-b border-border py-14 text-center">
          <h1 className="text-xl font-semibold">Person not found</h1>
          <p className="mt-2 text-sm text-muted">They may have been removed from your people list.</p>
        </div>
      </div>
    );
  }

  const { person, notes, interactions, openLoops, importantDates, dueForContact } = profile;
  const remembered = notes.filter((note) => note.type !== "reflection");
  const reflections = notes.filter((note) => note.type === "reflection");
  const nextTime = person.nextTime && !person.nextTime.doneAt ? person.nextTime : undefined;

  async function completeNextTime() {
    if (!person.nextTime) return;
    try {
      await db.people.update(person.id, {
        nextTime: { ...person.nextTime, doneAt: new Date().toISOString() },
        updatedAt: new Date().toISOString(),
      });
      setActionError("");
    } catch {
      setActionError("Could not complete this follow-up. Try again.");
    }
  }

  async function completeOpenLoop(loop: OpenLoop) {
    const now = new Date().toISOString();
    try {
      await db.openLoops.update(loop.id, { status: "completed", completedAt: now, updatedAt: now });
      setActionError("");
    } catch {
      setActionError("Could not complete this follow-up. Try again.");
    }
  }

  return (
    <div className="pb-8 pt-5">
      <div className="mb-5 flex items-center justify-between">
        <Link aria-label="Back to people" className="inline-flex min-h-10 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" to="/people">
          <ArrowLeft size={19} />People
        </Link>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${dueForContact ? "bg-rose-50 text-rose-800" : "bg-primary/10 text-primary"}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dueForContact ? "bg-rose-600" : "bg-primary"}`} />
          {dueForContact ? "Reach out" : person.contactIntervalDays ? "In touch" : "No cadence"}
        </span>
      </div>

      <header className="border-b border-border pb-5">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
            {person.name.trim().charAt(0).toLocaleUpperCase()}
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Person</p>
            <h1 className="mt-1 break-words text-3xl font-semibold">{person.name}</h1>
            {person.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {person.tags.map((tag) => <span className="rounded bg-background px-2 py-1 text-xs text-muted" key={tag}>{tag}</span>)}
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => setShowQuickLog(true)}
            type="button"
          >
            <MessageCircle size={17} />Log interaction
          </button>
          <button
            aria-controls="prepare-panel"
            aria-expanded={showPrepare}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => setShowPrepare(!showPrepare)}
            type="button"
          >
            <Sparkles size={17} />Prepare
          </button>
        </div>
        {person.contactIntervalDays && (
          <p className="mt-3 text-xs text-muted">Your reach-out rhythm: every {person.contactIntervalDays} days</p>
        )}
      </header>

      {actionError && <p aria-live="polite" className="mt-3 text-sm text-rose-700">{actionError}</p>}

      {showPrepare && (
        <section aria-labelledby="prepare-title" className="my-5 border-y border-primary/30 bg-primary/5 px-4 py-4" id="prepare-panel">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-0.5 text-primary"><ClipboardList size={19} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">A little context</p>
                  <h2 className="mt-1 font-semibold" id="prepare-title">Before you reach out to {person.name}</h2>
                </div>
                <button aria-label="Close prepare panel" className="rounded p-1 text-muted hover:text-text" onClick={() => setShowPrepare(false)} type="button"><span aria-hidden="true">×</span></button>
              </div>
              {remembered.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted">Worth remembering</p>
                  <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                    {remembered.slice(0, 3).map((note) => <li className="break-words" key={note.id}>{note.text}</li>)}
                  </ul>
                </div>
              )}
              {nextTime && <p className="mt-3 text-sm"><span className="font-semibold">Pick up next time:</span> {nextTime.text}</p>}
              {openLoops.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted">Still open</p>
                  <ul className="mt-1 space-y-1 text-sm">{openLoops.slice(0, 3).map((loop) => <li className="break-words" key={loop.id}>{loop.description}</li>)}</ul>
                </div>
              )}
              {importantDates.length > 0 && (
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted"><CalendarDays size={15} />{importantDates[0].label}: {displayDate(importantDates[0].date)}</p>
              )}
              {remembered.length === 0 && !nextTime && openLoops.length === 0 && importantDates.length === 0 && (
                <p className="mt-3 text-sm text-muted">No notes yet. Start with what you learn in your next conversation.</p>
              )}
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="remember-heading" className="border-b border-border py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Keep close</p>
            <h2 className="mt-1 text-lg font-semibold" id="remember-heading">Remember</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{remembered.length}</span>
            <button className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/5" onClick={() => setEntryCategory("remember")} type="button"><Plus size={15} />Add note</button>
          </div>
        </div>
        {remembered.length > 0 ? (
          <ul className="mt-3 divide-y divide-border/70">
            {remembered.map((note) => (
              <li className="py-3 first:pt-0 last:pb-0" key={note.id}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.text}</p>
                <p className="mt-1 text-xs capitalize text-muted">{note.type} · {displayDate(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : <EmptySection>No details saved yet. Add a note after your next conversation.</EmptySection>}

        {importantDates.length > 0 && (
          <div className="mt-4 border-t border-border/70 pt-3">
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted"><CalendarDays size={14} />Important dates</p>
            <ul className="space-y-2">
              {importantDates.map((importantDate) => (
                <li className="flex items-baseline justify-between gap-3 text-sm" key={importantDate.id}>
                  <span>{importantDate.label}{importantDate.repeatsYearly && <span className="ml-1 text-xs text-muted">yearly</span>}</span>
                  <time className="shrink-0 text-xs text-muted" dateTime={importantDate.date}>{displayDate(importantDate.date)}</time>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="follow-up-heading" className="border-b border-border py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Keep a promise</p>
            <h2 className="mt-1 text-lg font-semibold" id="follow-up-heading">Follow up</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{openLoops.length + (nextTime ? 1 : 0)} open</span>
            <button className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-amber-800 hover:bg-amber-50" onClick={() => setEntryCategory("followUp")} type="button"><Plus size={15} />Add follow-up</button>
          </div>
        </div>
        {nextTime && (
          <div className="mt-3 flex items-start gap-3 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-950">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700" size={17} />
            <p className="min-w-0 flex-1">{nextTime.text}</p>
            <button aria-label="Complete next-time note" className="inline-flex shrink-0 items-center gap-1 rounded px-1 text-xs font-semibold text-amber-800 hover:bg-amber-100" onClick={completeNextTime} type="button"><Check size={15} />Done</button>
          </div>
        )}
        {openLoops.length > 0 ? (
          <ul className="mt-2 divide-y divide-border/70">
            {openLoops.map((loop) => (
              <li className="flex items-start justify-between gap-3 py-3" key={loop.id}>
                <div>
                  <p className="text-sm">{loop.description}</p>
                  <p className="mt-1 text-xs capitalize text-muted">{loop.direction.replace("_", " ")} · {loop.status}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {loop.dueAt && <time className="text-xs text-muted" dateTime={loop.dueAt}>{displayDate(loop.dueAt)}</time>}
                  <button aria-label={`Complete follow-up: ${loop.description}`} className="inline-flex min-h-8 items-center gap-1 rounded px-2 text-xs font-semibold text-primary hover:bg-primary/5" onClick={() => completeOpenLoop(loop)} type="button"><Check size={14} />Done</button>
                </div>
              </li>
            ))}
          </ul>
        ) : !nextTime ? <EmptySection>Nothing waiting on you right now.</EmptySection> : null}
      </section>

      <section aria-labelledby="reflect-heading" className="border-b border-border py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Make space to notice</p>
            <h2 className="mt-1 text-lg font-semibold" id="reflect-heading">Reflect</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{reflections.length}</span>
            <button className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/5" onClick={() => setEntryCategory("reflect")} type="button"><Plus size={15} />Reflect</button>
          </div>
        </div>
        {reflections.length > 0 ? (
          <ul className="mt-3 divide-y divide-border/70">
            {reflections.map((note) => (
              <li className="py-3 first:pt-0 last:pb-0" key={note.id}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.text}</p>
                <p className="mt-1 text-xs text-muted">{displayDate(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : <EmptySection>No reflections saved yet.</EmptySection>}
      </section>

      <section aria-labelledby="history-heading" className="py-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">The moments</p>
            <h2 className="mt-1 text-lg font-semibold" id="history-heading">Interaction history</h2>
          </div>
          <span className="text-xs text-muted">{interactions.length} total</span>
        </div>
        {interactions.length > 0 ? (
          <ol className="mt-4">
            {interactions.map((interaction, index) => (
              <li className="relative flex gap-3 pb-5 last:pb-0" key={interaction.id}>
                <span aria-hidden="true" className="relative flex w-4 shrink-0 justify-center">
                  <span className={`absolute top-1 h-2.5 w-2.5 rounded-full ${interaction.meaningful ? "bg-primary" : "bg-border"}`} />
                  {index < interactions.length - 1 && <span className="absolute bottom-0 top-3 w-px bg-border" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <time className="text-xs font-medium text-muted" dateTime={interaction.date}>{displayDate(interaction.date)}</time>
                    {!interaction.meaningful && <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Quick hello</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{interaction.text}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : <EmptySection>No interactions logged yet. Keep the next one here.</EmptySection>}
      </section>

      <QuickLogSheet initialPersonId={person.id} onClose={() => setShowQuickLog(false)} open={showQuickLog} />
      <PersonEntrySheet category={entryCategory} onClose={() => setEntryCategory(null)} personId={person.id} />
    </div>
  );
}