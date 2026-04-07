import { App, normalizePath, TFile } from "obsidian";

import { formatEditedTimestamp, formatFileTimestamp } from "./time";
import { VoiceFlashSettings } from "./types";

export interface SavedAudio {
  path: string;
  fileName: string;
}

const ensureFolderExists = async (app: App, folderPath: string): Promise<void> => {
  const normalized = normalizePath(folderPath).replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return;
  }

  const segments = normalized.split("/").filter(Boolean);
  let current = "";

  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const existing = app.vault.getAbstractFileByPath(current);
    if (existing instanceof TFile) {
      throw new Error(`路径 ${current} 已存在同名文件，无法创建文件夹。`);
    }
    if (!existing) {
      await app.vault.createFolder(current);
    }
  }
};

const ensureParentFolder = async (app: App, fullPath: string): Promise<void> => {
  const normalized = normalizePath(fullPath);
  const slash = normalized.lastIndexOf("/");
  if (slash <= 0) {
    return;
  }

  const folder = normalized.slice(0, slash);
  await ensureFolderExists(app, folder);
};

const ensureMarkdownPath = (path: string): string => {
  const normalized = normalizePath((path.trim() || "drafts.md").replace(/^\/+/, ""));
  return normalized.toLowerCase().endsWith(".md") ? normalized : `${normalized}.md`;
};

const buildFilePath = (folder: string, extension: string, baseName: string, index: number): string => {
  const suffix = index === 0 ? "" : `_${index}`;
  const fileName = `${baseName}${suffix}.${extension}`;
  return normalizePath(`${folder}/${fileName}`);
};

const isAlreadyExistsError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists/i.test(message);
};

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const saveAudioToVault = async (
  app: App,
  settings: VoiceFlashSettings,
  blob: Blob,
  extension: string,
): Promise<SavedAudio> => {
  const targetFolder = normalizePath(settings.attachmentDir.trim() || "attachments");
  await ensureFolderExists(app, targetFolder);

  const bytes = await blob.arrayBuffer();
  const baseName = formatFileTimestamp(new Date());

  // Some platforms can race with vault indexing; retry with suffix on "already exists".
  for (let index = 0; index < 200; index += 1) {
    const filePath = buildFilePath(targetFolder, extension, baseName, index);
    try {
      await app.vault.createBinary(filePath, bytes);
      return {
        path: filePath,
        fileName: filePath.split("/").pop() ?? filePath,
      };
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("录音文件名连续冲突，保存失败。请稍后重试。");
};

const buildEntry = (settings: VoiceFlashSettings, audioPath: string, transcription: string): string => {
  const lines: string[] = [];

  if (settings.insertAudioLink) {
    lines.push(`- [[${audioPath}]]`);
  }

  lines.push(transcription.trim());
  lines.push(`<!-- edited: ${formatEditedTimestamp(new Date())} -->`);

  return `${lines.join("\n")}\n`;
};

export const appendTranscriptionEntry = async (
  app: App,
  settings: VoiceFlashSettings,
  audioPath: string,
  transcription: string,
): Promise<void> => {
  const cleaned = transcription.trim();
  if (!cleaned) {
    throw new Error("转写结果为空，已取消写入。");
  }

  const targetPath = ensureMarkdownPath(settings.defaultNoteFile);
  await ensureParentFolder(app, targetPath);
  const entry = buildEntry(settings, audioPath, cleaned);
  const abstract = app.vault.getAbstractFileByPath(targetPath);
  if (abstract && !(abstract instanceof TFile)) {
    throw new Error(`默认写入文件 ${targetPath} 不是 Markdown 文件。`);
  }
  const appendByAdapter = async (): Promise<void> => {
    const stat = await app.vault.adapter.stat(targetPath);
    const prefix = stat && stat.size > 0 ? "\n" : "";
    await app.vault.adapter.append(targetPath, `${prefix}${entry}`);
  };

  // Strict logic: if file exists, append directly; if not, create.
  const existsOnDisk = await app.vault.adapter.exists(targetPath);
  if (existsOnDisk) {
    const file = app.vault.getFileByPath(targetPath);
    if (file) {
      const prefix = file.stat.size > 0 ? "\n" : "";
      await app.vault.append(file, `${prefix}${entry}`);
      return;
    }

    // Cache may be stale briefly; append at adapter level.
    await appendByAdapter();
    return;
  }

  try {
    await app.vault.create(targetPath, entry);
    return;
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      throw error;
    }
  }

  // Race condition: another operation created the file; append now.
  for (let i = 0; i < 5; i += 1) {
    const file = app.vault.getFileByPath(targetPath);
    if (file) {
      const prefix = file.stat.size > 0 ? "\n" : "";
      await app.vault.append(file, `${prefix}${entry}`);
      return;
    }
    await delay(80);
  }

  const existsAfterCreateRace = await app.vault.adapter.exists(targetPath);
  if (!existsAfterCreateRace) {
    throw new Error(`默认写入文件 ${targetPath} 创建失败。`);
  }
  await appendByAdapter();
};
