import { z } from "zod";

export type NoteType = "fact" | "preference" | "sensitive" | "reflection";
export type LoopDirection = "I_owe" | "they_owe" | "mutual";
export type LoopStatus = "open" | "waiting" | "completed" | "cancelled";
export type PromptCategory = "interaction" | "remember" | "followUp" | "reflect";

export interface CustomPrompt {
  id: string;
  category: PromptCategory;
  text: string;
}

export interface Person {
  id: string;
  name: string;
  tags: string[];
  contactIntervalDays?: number;
  snoozedUntil?: string;
  plannedContactAt?: string;
  nextTime?: { text: string; doneAt?: string };
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  personId: string;
  type: NoteType;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  personId: string;
  date: string;
  text: string;
  meaningful: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OpenLoop {
  id: string;
  personId: string;
  description: string;
  direction: LoopDirection;
  status: LoopStatus;
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportantDate {
  id: string;
  personId: string;
  label: string;
  date: string;
  repeatsYearly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: "singleton";
  pinHash?: string;
  pinSalt?: string;
  lastExportAt?: string;
  autoLockSeconds: number;
  schemaVersion: number;
  customPrompts?: CustomPrompt[];
}

export const BackupSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  people: z.array(z.object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    contactIntervalDays: z.number().optional(),
    snoozedUntil: z.string().optional(),
    plannedContactAt: z.string().optional(),
    nextTime: z.object({ text: z.string(), doneAt: z.string().optional() }).optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  notes: z.array(z.object({
    id: z.string(),
    personId: z.string(),
    type: z.enum(["fact", "preference", "sensitive", "reflection"]),
    text: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  interactions: z.array(z.object({
    id: z.string(),
    personId: z.string(),
    date: z.string(),
    text: z.string(),
    meaningful: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  openLoops: z.array(z.object({
    id: z.string(),
    personId: z.string(),
    description: z.string(),
    direction: z.enum(["I_owe", "they_owe", "mutual"]),
    status: z.enum(["open", "waiting", "completed", "cancelled"]),
    dueAt: z.string().optional(),
    completedAt: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  importantDates: z.array(z.object({
    id: z.string(),
    personId: z.string(),
    label: z.string(),
    date: z.string(),
    repeatsYearly: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
  })),
  settings: z.object({
    id: z.literal("singleton"),
    pinHash: z.string().optional(),
    pinSalt: z.string().optional(),
    lastExportAt: z.string().optional(),
    autoLockSeconds: z.number(),
    schemaVersion: z.number(),
    customPrompts: z.array(z.object({
      id: z.string(),
      category: z.enum(["interaction", "remember", "followUp", "reflect"]),
      text: z.string()
    })).optional()
  }).optional()
});