export interface VoiceFlashSettings {
  defaultNoteFile: string;
  attachmentDir: string;
  apiProvider: "openai-compatible" | "gemini";
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  insertAudioLink: boolean;
  audioLinkStyle: "wikilink" | "embed" | "edit-only" | "hidden-comment";
  syncFallbackMs: number;
}

export const DEFAULT_SETTINGS: VoiceFlashSettings = {
  defaultNoteFile: "drafts.md",
  attachmentDir: "attachments",
  apiProvider: "openai-compatible",
  apiBaseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "whisper-1",
  prompt: "请尽量忠实转写，整理口语、断句和标点。",
  insertAudioLink: true,
  audioLinkStyle: "edit-only",
  syncFallbackMs: 6000,
};

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  extension: string;
  durationMs: number;
}
