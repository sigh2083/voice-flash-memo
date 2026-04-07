export interface VoiceFlashSettings {
  defaultNoteFile: string;
  attachmentDir: string;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  insertAudioLink: boolean;
  syncFallbackMs: number;
}

export const DEFAULT_SETTINGS: VoiceFlashSettings = {
  defaultNoteFile: "drafts.md",
  attachmentDir: "attachments",
  apiBaseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "whisper-1",
  prompt: "请尽量忠实转写，整理口语、断句和标点。",
  insertAudioLink: true,
  syncFallbackMs: 6000,
};

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  extension: string;
  durationMs: number;
}
