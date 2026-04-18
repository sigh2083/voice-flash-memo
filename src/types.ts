export type ApiProvider = "openai-compatible" | "gemini";

export interface ApiProfile {
  id: string;
  name: string;
  provider: ApiProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface VoiceFlashSettings {
  defaultNoteFile: string;
  attachmentDir: string;
  apiProvider: ApiProvider;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  apiProfiles: ApiProfile[];
  activeApiProfileId: string;
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
  apiProfiles: [],
  activeApiProfileId: "",
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
