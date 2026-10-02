import { useRef, useState, type ChangeEvent } from "react";
import { format, isValid, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, FileJson, ShieldCheck, Trash2, Upload } from "lucide-react";
import { db } from "@/lib/db";
import { exportAppData, importAppData } from "@/lib/export";
import { promptLabels } from "@/lib/prompts";
import { removeCustomPrompt } from "@/lib/prompts-store";
import type { PromptCategory } from "@/lib/schema";

type BackupMode = "merge" | "replace";
type Message = { kind: "success" | "error"; text: string } | null;

const promptCategories: PromptCategory[] = ["interaction", "remember", "followUp", "reflect"];

export default function Settings() {
  const settings = useLiveQuery(() => db.settings.get("singleton"), [], undefined);
  const fileInput = useRef<HTMLInputElement>(null);
  const [backupMode, setBackupMode] = useState<BackupMode>("merge");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [removingId, setRemovingId] = useState("");

  const lastExportDate = settings?.lastExportAt ? parseISO(settings.lastExportAt) : undefined;

  async function downloadBackup() {
    setBusy(true);
    setMessage(null);
    try {
      const contents = await exportAppData();
      const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `keep-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ kind: "success", text: "Backup downloaded." });
    } catch {
      setMessage({ kind: "error", text: "Could not create a backup. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (backupMode === "replace" && !window.confirm("Replace all Keep data on this device with the backup? This cannot be undone.")) {
      input.value = "";
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      await importAppData(await file.text(), backupMode);
      setMessage({ kind: "success", text: backupMode === "merge" ? "Backup merged into this device." : "This device was restored from the backup." });
    } catch {
      setMessage({ kind: "error", text: "This file is not a valid Keep backup." });
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  async function deleteCustomPrompt(promptId: string) {
    setRemovingId(promptId);
    try {
      await removeCustomPrompt(promptId);
    } catch {
      setMessage({ kind: "error", text: "Could not remove this custom prompt." });
    } finally {
      setRemovingId("");
    }
  }

  return (
    <div className="space-y-8 pb-8 pt-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Your device, your data</p>
        <h1 className="mt-1 text-3xl font-semibold">Settings</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">Keep stores your people and notes on this device. Make a backup before changing devices or clearing browser data.</p>
      </header>

      <section aria-labelledby="backup-heading" className="border-y border-border py-5">
        <div className="flex items-start gap-3">
          <FileJson aria-hidden="true" className="mt-1 shrink-0 text-primary" size={19} />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold" id="backup-heading">Backup and restore</h2>
            <p className="mt-1 text-sm text-muted">A backup includes people, notes, interactions, follow-ups, dates, settings, and custom prompts.</p>
            <button className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50" disabled={busy} onClick={downloadBackup} type="button">
              <Download size={16} />Download backup
            </button>
            {lastExportDate && isValid(lastExportDate) && <p className="mt-2 text-xs text-muted">Last backup: {format(lastExportDate, "MMM d, yyyy 'at' h:mm a")}</p>}

            <div className="mt-6 border-t border-border pt-4">
              <p className="text-sm font-semibold">Restore from a file</p>
              <div aria-label="Restore mode" className="mt-3 inline-flex rounded-lg bg-background p-1" role="group">
                <button aria-pressed={backupMode === "merge"} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${backupMode === "merge" ? "bg-surface text-primary shadow-sm" : "text-muted"}`} onClick={() => setBackupMode("merge")} type="button">Merge</button>
                <button aria-pressed={backupMode === "replace"} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${backupMode === "replace" ? "bg-surface text-rose-700 shadow-sm" : "text-muted"}`} onClick={() => setBackupMode("replace")} type="button">Replace all</button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{backupMode === "merge" ? "Matching IDs will be updated; other items stay on this device." : "All current data will be replaced after you confirm."}</p>
              <input accept="application/json,.json" className="sr-only" onChange={importBackup} ref={fileInput} type="file" />
              <button className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3.5 text-sm font-semibold text-text hover:bg-background disabled:opacity-50" disabled={busy} onClick={() => fileInput.current?.click()} type="button">
                <Upload size={16} />Choose backup file
              </button>
            </div>

            {message && (
              <p aria-live="polite" className={`mt-3 text-sm ${message.kind === "error" ? "text-rose-700" : "text-primary"}`}>{message.text}</p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="prompts-heading">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-1 text-primary"><ShieldCheck size={19} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold" id="prompts-heading">Your custom prompts</h2>
            <p className="mt-1 text-sm text-muted">Prompts you create in Quick Log and person profiles are saved here and included in backups.</p>
            {(settings?.customPrompts?.length ?? 0) > 0 ? (
              <div className="mt-4 space-y-5">
                {promptCategories.map((category) => {
                  const prompts = (settings?.customPrompts ?? []).filter((prompt) => prompt.category === category);
                  if (!prompts.length) return null;
                  return (
                    <div key={category}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{promptLabels[category]}</h3>
                      <ul className="divide-y divide-border border-y border-border">
                        {prompts.map((prompt) => (
                          <li className="flex items-center gap-3 py-2.5" key={prompt.id}>
                            <span className="min-w-0 flex-1 text-sm">{prompt.text}</span>
                            <button aria-label={`Remove custom prompt: ${prompt.text}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50" disabled={removingId === prompt.id} onClick={() => deleteCustomPrompt(prompt.id)} type="button"><Trash2 size={16} /></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 border-y border-border py-4 text-sm text-muted">No custom prompts yet. Add one from any prompt list while logging or writing a note.</p>
            )}
          </div>
        </div>
      </section>

      <p className="border-t border-border pt-4 text-xs text-muted">Keep is private by default. Your data stays in this browser unless you export and move a backup.</p>
    </div>
  );
}