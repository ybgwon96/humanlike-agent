import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { env } from '../../config/env.js';

export type RecordingFormat = 'webm' | 'ogg';
export type AudioFormat = RecordingFormat | 'mp3';

export class AudioStorageError extends Error {
  constructor(
    public code: 'FILE_TOO_LARGE' | 'INVALID_FORMAT' | 'STORAGE_ERROR' | 'FILE_NOT_FOUND',
    message: string
  ) {
    super(message);
    this.name = 'AudioStorageError';
  }
}

const MAX_RECORDING_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_RECORDING_FORMATS: RecordingFormat[] = ['webm', 'ogg'];

function getFilePath(conversationId: string, messageId: string, format: AudioFormat): string {
  return join(env.AUDIO_STORAGE_PATH, conversationId, `${messageId}.${format}`);
}

async function ensureDirectory(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
}

export async function saveRecording(
  conversationId: string,
  messageId: string,
  audioBuffer: Buffer,
  format: RecordingFormat
): Promise<string> {
  if (!VALID_RECORDING_FORMATS.includes(format)) {
    throw new AudioStorageError(
      'INVALID_FORMAT',
      `Invalid recording format. Supported formats: ${VALID_RECORDING_FORMATS.join(', ')}`
    );
  }

  if (audioBuffer.length > MAX_RECORDING_SIZE) {
    throw new AudioStorageError(
      'FILE_TOO_LARGE',
      `Recording exceeds maximum size of ${MAX_RECORDING_SIZE / 1024 / 1024}MB`
    );
  }

  const filePath = getFilePath(conversationId, messageId, format);

  try {
    await ensureDirectory(filePath);
    await writeFile(filePath, audioBuffer);
    return filePath;
  } catch (error) {
    throw new AudioStorageError(
      'STORAGE_ERROR',
      `Failed to save recording: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function saveTTSAudio(
  conversationId: string,
  messageId: string,
  audioBuffer: Buffer
): Promise<string> {
  const filePath = getFilePath(conversationId, messageId, 'mp3');

  try {
    await ensureDirectory(filePath);
    await writeFile(filePath, audioBuffer);
    return filePath;
  } catch (error) {
    throw new AudioStorageError(
      'STORAGE_ERROR',
      `Failed to save TTS audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function getAudioUrl(
  conversationId: string,
  messageId: string,
  format: AudioFormat
): string {
  return `/api/v1/audio/${conversationId}/${messageId}.${format}`;
}

export async function deleteAudio(
  conversationId: string,
  messageId: string,
  format: AudioFormat
): Promise<void> {
  const filePath = getFilePath(conversationId, messageId, format);

  try {
    await unlink(filePath);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new AudioStorageError('FILE_NOT_FOUND', `Audio file not found: ${filePath}`);
    }
    throw new AudioStorageError(
      'STORAGE_ERROR',
      `Failed to delete audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function readAudio(
  conversationId: string,
  messageId: string,
  format: AudioFormat
): Promise<Buffer> {
  const filePath = getFilePath(conversationId, messageId, format);

  try {
    return await readFile(filePath);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new AudioStorageError('FILE_NOT_FOUND', `Audio file not found: ${filePath}`);
    }
    throw new AudioStorageError(
      'STORAGE_ERROR',
      `Failed to read audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
