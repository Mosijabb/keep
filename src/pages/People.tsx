import { useMemo, useState, type FormEvent } from "react";
import { formatDistanceToNowStrict, isAfter, isValid, parseISO, startOfDay } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { Plus, Search, UserRound, X } from "lucide-react";
import QuickLogSheet from "@/components/QuickLogSheet";
import { db, getLatestMeaningfulContact, isPersonDueForContact } from "@/lib/db";
import type { Person } from "@/lib/schema";

type ContactStatus = "due" | "snoozed" | "on-track" | "no-cadence";

interface PersonRow {
  person: Person;
  status: ContactStatus;
  lastContact?: string;
}

const statusCopy: Record<ContactStatus, string> = {
  due: "Reach out",
  snoozed: "Snoozed",
  "on-track": "In touch",
  "no-cadence": "No cadence",
};

const statusColor: Record<ContactStatus, string> = {
  due: "bg-rose-600",
  snoozed: "bg-amber-500",
  "on-track": "bg-primary",
  "no-cadence": "bg-muted/50",
};

export default function People() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loggingFor, setLoggingFor] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [contactInterval, setContactInterval] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const peopleRows = useLiveQuery(async () => {
    const people = await db.people.orderBy("name").toArray();
    return Promise.all(people.map(async (person): Promise<PersonRow> => {
      const [due, latest] = await Promise.all([
        isPersonDueForContact(person),
        getLatestMeaningfulContact(person.id),
      ]);
      const snoozedUntil = person.snoozedUntil ? startOfDay(parseISO(person.snoozedUntil)) : undefined;
      const snoozed = Boolean(snoozedUntil && isAfter(snoozedUntil, startOfDay(new Date())));
      const status: ContactStatus = snoozed
        ? "snoozed"
        : due
          ? "due"
          : person.contactIntervalDays
            ? "on-track"
            : "no-cadence";

      return { person, status, lastContact: latest?.date };
    }));
  }, [], []);

  const rows = peopleRows ?? [];
  const tags = useMemo(() => [...new Set(rows.flatMap(({ person }) => person.tags))].sort(), [rows]);
  const visibleRows = rows.filter(({ person }) => {
    const query = search.trim().toLocaleLowerCase();
    const matchesSearch = !query
      || person.name.toLocaleLowerCase().includes(query)
      || person.tags.some((tag) => tag.toLocaleLowerCase().includes(query));
    return matchesSearch && (!selectedTag || person.tags.includes(selectedTag));
  });

  async function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    setSaving(true);
    setFormError("");
    const now = new Date().toISOString();
    const tags = [...new Set(tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean))];
    const interval = contactInterval ? Number(contactInterval) : undefined;

    try {
      await db.people.add({
        id: crypto.randomUUID(),
        name: cleanName,
        tags,
        ...(interval ? { contactIntervalDays: interval } : {}),
        createdAt: now,
        updatedAt: now,
      });
      setName("");
      setTagsInput("");
      setContactInterval("");
      setShowAdd(false);
    } catch {
      setFormError("Could not add this person. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function closeAddPerson() {
    setShowAdd(false);
    setFormError("");
  }

  return (
    <div className="pb-6 pt-7">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Your circle</p>
          <h1 className="mt-1 text-3xl font-semibold">People</h1>
          <p className="mt-1 text-sm text-muted">{rows.length} {rows.length === 1 ? "person" : "people"} kept close</p>
        </div>
        <button
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white transition-colors hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={() => setShowAdd(true)}
          type="button"
        >
          <Plus size={18} />
          Add person
        </button>
      </header>

      <label className="relative block" htmlFor="people-search">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <span className="sr-only">Search people and tags</span>
        <input
          className="min-h-12 w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-10 text-sm outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          id="people-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search people or tags"
          type="search"
          value={search}
        />
        {search && (
          <button
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-muted hover:text-text"
            onClick={() => setSearch("")}
            type="button"
          >
            <X size={16} />
          </button>
        )}
      </label>

      {tags.length > 0 && (
        <div aria-label="Filter by tag" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group">
          <button
            aria-pressed={!selectedTag}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${!selectedTag ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:text-text"}`}
            onClick={() => setSelectedTag("")}
            type="button"
          >All</button>
          {tags.map((tag) => (
            <button
              aria-pressed={selectedTag === tag}
              className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${selectedTag === tag ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:text-text"}`}
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
              type="button"
            >{tag}</button>
          ))}
        </div>
      )}

      <div aria-live="polite" className="mt-5">
        {visibleRows.length > 0 ? (
          <ul className="divide-y divide-border">
            {visibleRows.map(({ person, status, lastContact }) => {
              const contactSummary = lastContact && isValid(parseISO(lastContact))
                ? `Last meaningful contact ${formatDistanceToNowStrict(parseISO(lastContact), { addSuffix: true })}`
                : "No meaningful contact logged yet";
              return (
                <li className="flex items-center gap-3 py-4" key={person.id}>
                  <Link className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" to={`/people/${person.id}`}>
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {person.name.trim().charAt(0).toLocaleUpperCase() || <UserRound size={18} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{person.name}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${statusColor[status]}`} />
                        <span>{statusCopy[status]}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{contactSummary}</span>
                      </span>
                      {person.tags.length > 0 && (
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {person.tags.slice(0, 3).map((tag) => <span className="rounded bg-background px-2 py-0.5 text-[11px] text-muted" key={tag}>{tag}</span>)}
                          {person.tags.length > 3 && <span className="px-1 py-0.5 text-[11px] text-muted">+{person.tags.length - 3}</span>}
                        </span>
                      )}
                    </span>
                  </Link>
                  <button
                    aria-label={`Log an interaction with ${person.name}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() => setLoggingFor(person.id)}
                    title="Log interaction"
                    type="button"
                  >
                    <Plus size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="border-y border-border py-12 text-center">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound size={22} /></span>
            <h2 className="mt-4 font-semibold">{rows.length ? "No matches" : "Start with one person"}</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
              {rows.length ? "Try another name or remove the tag filter." : "Keep the small details that help you show up for people."}
            </p>
            {!rows.length && (
              <button className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5" onClick={() => setShowAdd(true)} type="button">
                Add your first person
              </button>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAddPerson(); }}>
          <section aria-labelledby="add-person-title" aria-modal="true" className="w-full max-w-md rounded-t-2xl border border-border bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-2xl" role="dialog">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Make room for a person</p>
                <h2 className="mt-1 text-xl font-semibold" id="add-person-title">Add person</h2>
              </div>
              <button aria-label="Close add person" className="rounded-full p-2 text-muted hover:bg-background hover:text-text" onClick={closeAddPerson} type="button"><X size={20} /></button>
            </div>
            <form className="space-y-4" onSubmit={addPerson}>
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="new-person-name">
                Name
                <input autoFocus className="w-full rounded-lg border border-border bg-background px-3 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" id="new-person-name" onChange={(event) => setName(event.target.value)} required value={name} />
              </label>
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="new-person-tags">
                Tags <span className="font-normal text-muted">(comma separated, optional)</span>
                <input className="w-full rounded-lg border border-border bg-background px-3 py-3 text-base font-normal outline-none placeholder:text-muted/80 focus:border-primary focus:ring-2 focus:ring-primary/20" id="new-person-tags" onChange={(event) => setTagsInput(event.target.value)} placeholder="Family, work, old friends" value={tagsInput} />
              </label>
              <label className="block space-y-1.5 text-sm font-medium" htmlFor="new-person-cadence">
                Reach-out rhythm <span className="font-normal text-muted">(days, optional)</span>
                <input className="w-full rounded-lg border border-border bg-background px-3 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" id="new-person-cadence" min="1" onChange={(event) => setContactInterval(event.target.value)} placeholder="30" type="number" value={contactInterval} />
              </label>
              {formError && <p aria-live="polite" className="text-sm text-rose-700">{formError}</p>}
              <button className="min-h-12 w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white hover:brightness-95 disabled:opacity-60" disabled={saving || !name.trim()} type="submit">
                {saving ? "Adding..." : "Add person"}
              </button>
            </form>
          </section>
        </div>
      )}

      <QuickLogSheet initialPersonId={loggingFor} onClose={() => setLoggingFor(undefined)} open={Boolean(loggingFor)} />
    </div>
  );
}