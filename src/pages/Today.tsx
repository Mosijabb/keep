import { useState } from "react";
import { format, isBefore, isValid, parseISO, startOfDay } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, CalendarDays, MessageCircle, Plus, Users } from "lucide-react";
import QuickLogSheet from "@/components/QuickLogSheet";
import { db, isPersonDueForContact } from "@/lib/db";
import type { Interaction, OpenLoop, Person } from "@/lib/schema";

interface DashboardData {
  duePeople: Person[];
  dueLoops: OpenLoop[];
  recent: Array<{ interaction: Interaction; personName: string }>;
  hasPeople: boolean;
}

const emptyDashboard: DashboardData = { duePeople: [], dueLoops: [], recent: [], hasPeople: false };

function safeDate(value: string, pattern = "MMM d") {
  const date = parseISO(value);
  return isValid(date) ? format(date, pattern) : value;
}

export default function Today() {
  const [loggingFor, setLoggingFor] = useState<string | undefined>();
  const dashboard = useLiveQuery(async () => {
    const people = await db.people.orderBy("name").toArray();
    const duePeople = (await Promise.all(people.map(async (person) =>
      await isPersonDueForContact(person) ? person : null,
    ))).filter((person): person is Person => person !== null);
    const [loops, interactions] = await Promise.all([
      db.openLoops.toArray(),
      db.interactions.orderBy("date").reverse().limit(4).toArray(),
    ]);
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueLoops = loops.filter((loop) => {
      if ((loop.status !== "open" && loop.status !== "waiting") || !loop.dueAt) return false;
      const dueDate = parseISO(loop.dueAt);
      return isValid(dueDate) && isBefore(dueDate, tomorrow);
    }).sort((left, right) => (left.dueAt ?? "").localeCompare(right.dueAt ?? ""));
    const names = new Map(people.map((person) => [person.id, person.name]));
    const recent = interactions.map((interaction) => ({
      interaction,
      personName: names.get(interaction.personId) ?? "Person removed",
    }));

    return { duePeople, dueLoops, recent, hasPeople: people.length > 0 };
  }, [], emptyDashboard);

  return (
    <div className="space-y-7 pb-8 pt-7">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-indigo-700 px-5 py-6 text-white sm:px-7 sm:py-8 shadow-lg shadow-primary/20">
        <div aria-hidden="true" className="absolute -right-8 -top-10 h-36 w-36 rounded-full border-[18px] border-white/10" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">{format(new Date(), "EEEE, MMMM d")}</p>
        <h1 className="mt-2 max-w-sm text-3xl font-bold leading-tight tracking-tight">Keep showing up.</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/90 font-medium">Small moments are how we stay close.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {dashboard.hasPeople ? (
            <button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-primary shadow-sm hover:bg-slate-50 transition-colors" onClick={() => setLoggingFor("")} type="button">
              <MessageCircle size={17} />Log a moment
            </button>
          ) : (
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-primary shadow-sm hover:bg-slate-50 transition-colors" to="/people">
              <Plus size={17} />Add your first person
            </Link>
          )}
          <span className="text-xs font-medium text-white/80">{dashboard.duePeople.length} people to reach · {dashboard.dueLoops.length} follow-ups due</span>
        </div>
      </header>

      <section aria-labelledby="today-reach-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">A thoughtful nudge</p>
            <h2 className="mt-1 text-lg font-semibold" id="today-reach-heading">Reach out</h2>
          </div>
          <Link className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline" to="/people">All people <ArrowRight size={14} /></Link>
        </div>
        {dashboard.duePeople.length > 0 ? (
          <ul className="divide-y divide-border border-y border-border">
            {dashboard.duePeople.slice(0, 4).map((person) => (
              <li className="flex items-center gap-3 py-3" key={person.id}>
                <Link className="flex min-w-0 flex-1 items-center gap-3" to={`/people/${person.id}`}>
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{person.name.charAt(0).toLocaleUpperCase()}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{person.name}</span>
                    <span className="block text-xs text-muted">{person.contactIntervalDays ? `Every ${person.contactIntervalDays} days` : "Ready for a hello"}</span>
                  </span>
                </Link>
                <button aria-label={`Log an interaction with ${person.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-primary hover:bg-primary/5" onClick={() => setLoggingFor(person.id)} type="button"><MessageCircle size={17} /></button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-border py-4 text-sm text-muted">No one is due right now. Keep a recent moment or add someone to your circle.</p>
        )}
      </section>

      <section aria-labelledby="today-loops-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Close the loop</p>
            <h2 className="mt-1 text-lg font-semibold" id="today-loops-heading">Follow-ups due</h2>
          </div>
          <Link className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline" to="/loops">All follow-ups <ArrowRight size={14} /></Link>
        </div>
        {dashboard.dueLoops.length > 0 ? (
          <ul className="divide-y divide-border border-y border-border">
            {dashboard.dueLoops.slice(0, 4).map((loop) => (
              <li className="flex items-start gap-3 py-3" key={loop.id}>
                <CalendarClock aria-hidden="true" className="mt-0.5 shrink-0 text-amber-700" size={18} />
                <Link className="min-w-0 flex-1" to={`/people/${loop.personId}`}>
                  <span className="block text-sm font-medium">{loop.description}</span>
                  <span className="mt-1 block text-xs text-muted">{loop.status === "waiting" ? "Waiting on them" : "You owe the next step"}{loop.dueAt ? ` · Due ${safeDate(loop.dueAt)}` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-border py-4 text-sm text-muted">Nothing due today. Add a follow-up from a person’s profile when you make a plan.</p>
        )}
      </section>

      <section aria-labelledby="today-recent-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Remembered well</p>
            <h2 className="mt-1 text-lg font-semibold" id="today-recent-heading">Recent moments</h2>
          </div>
          <CalendarDays aria-hidden="true" className="text-muted" size={18} />
        </div>
        {dashboard.recent.length > 0 ? (
          <ul className="divide-y divide-border border-y border-border">
            {dashboard.recent.map(({ interaction, personName }) => (
              <li className="py-3" key={interaction.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <Link className="text-sm font-semibold text-primary hover:underline" to={`/people/${interaction.personId}`}>{personName}</Link>
                  <time className="shrink-0 text-xs text-muted" dateTime={interaction.date}>{safeDate(interaction.date, "MMM d")}</time>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{interaction.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-y border-border py-5 text-center">
            <Users aria-hidden="true" className="mx-auto text-muted" size={21} />
            <p className="mt-2 text-sm text-muted">Your first saved moment will appear here.</p>
          </div>
        )}
      </section>

      <QuickLogSheet initialPersonId={loggingFor || undefined} onClose={() => setLoggingFor(undefined)} open={loggingFor !== undefined} />
    </div>
  );
}