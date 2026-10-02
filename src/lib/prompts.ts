import type { PromptCategory } from "./schema";

export const promptLabels: Record<PromptCategory, string> = {
  interaction: "What happened?",
  remember: "Remember",
  followUp: "Follow up",
  reflect: "Reflect",
};

export const presetPrompts: Record<PromptCategory, string[]> = {
  interaction: [
    "Caught up on life",
    "Shared a meal or coffee",
    "Talked about work or a current project",
    "Made plans for next time",
    "Celebrated good news",
    "Checked in during a hard week",
  ],
  remember: [
    "Something they are looking forward to...",
    "A preference that matters to them...",
    "A detail about their family or daily life...",
    "Something they are working through...",
  ],
  followUp: [
    "Ask how their project is going",
    "Send them the link or resource you promised",
    "Check in after their appointment",
    "Make a plan to see each other",
  ],
  reflect: [
    "What seemed important to them today?",
    "What do I want to remember about this conversation?",
    "How did I feel after we talked?",
    "What would help me show up well next time?",
  ],
};