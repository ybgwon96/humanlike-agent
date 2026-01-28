import { createClient } from '@deepgram/sdk';
import { env } from '../../config/env.js';

export interface TranscriptionResult {
  transcription: string;
  confidence: number;
  duration: number;
  lowConfidence: boolean;
}

export class STTError extends Error {
  constructor(
    public code: 'AUDIO_TOO_LARGE' | 'INVALID_AUDIO_FORMAT' | 'TRANSCRIPTION_FAILED',
    message: string
  ) {
    super(message);
    this.name = 'STTError';
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_MIME_TYPES = ['audio/webm', 'audio/ogg'];
const CONFIDENCE_THRESHOLD = 0.6;

function validateAudio(audioBuffer: Buffer, mimeType: string): void {
  if (audioBuffer.length > MAX_FILE_SIZE) {
    throw new STTError('AUDIO_TOO_LARGE', `Audio file exceeds maximum size of 10MB`);
  }

  const isValidFormat = mimeType.startsWith('audio/webm') || mimeType.startsWith('audio/ogg');
  if (!isValidFormat) {
    throw new STTError(
      'INVALID_AUDIO_FORMAT',
      `Invalid audio format. Supported formats: ${VALID_MIME_TYPES.join(', ')}`
    );
  }
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  language: 'ko' | 'en',
  mimeType: string
): Promise<TranscriptionResult> {
  validateAudio(audioBuffer, mimeType);

  const deepgram = createClient(env.DEEPGRAM_API_KEY);

  const response = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
    model: 'nova-3',
    smart_format: true,
    punctuate: true,
    language,
    mimetype: mimeType,
  });

  const result = response.result;
  if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
    throw new STTError('TRANSCRIPTION_FAILED', 'Failed to transcribe audio');
  }

  const alternative = result.results.channels[0].alternatives[0];
  const confidence = alternative.confidence ?? 0;
  const duration = result.metadata?.duration ?? 0;

  return {
    transcription: alternative.transcript ?? '',
    confidence,
    duration,
    lowConfidence: confidence < CONFIDENCE_THRESHOLD,
  };
}
