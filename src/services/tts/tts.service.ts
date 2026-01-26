import { env } from '../../config/env.js';

export type VoiceId = 'en-US-male' | 'en-US-female' | 'ko-KR-female';

export class TTSError extends Error {
  constructor(
    public code: 'TEXT_REQUIRED' | 'INVALID_VOICE' | 'INVALID_SPEED' | 'SYNTHESIS_FAILED',
    message: string
  ) {
    super(message);
    this.name = 'TTSError';
  }
}

const VOICE_MAP: Record<VoiceId, string> = {
  'en-US-male': 'e58b0d7efca34eb38d5c4985e378abcf',
  'en-US-female': 'a0e99d7d9c5f49b8a8ad3766f1e8ef8f',
  'ko-KR-female': 'c8a9d8b6e3f24b2a9c1d5e7f8a0b2c3d',
};

const MIN_SPEED = 0.75;
const MAX_SPEED = 1.25;
const DEFAULT_SPEED = 1.0;

function validateParams(text: string, voice: VoiceId, speed: number): void {
  if (!text || text.trim().length === 0) {
    throw new TTSError('TEXT_REQUIRED', 'Text is required for speech synthesis');
  }

  if (!Object.keys(VOICE_MAP).includes(voice)) {
    throw new TTSError(
      'INVALID_VOICE',
      `Invalid voice. Supported voices: ${Object.keys(VOICE_MAP).join(', ')}`
    );
  }

  if (speed < MIN_SPEED || speed > MAX_SPEED) {
    throw new TTSError(
      'INVALID_SPEED',
      `Speed must be between ${MIN_SPEED} and ${MAX_SPEED}`
    );
  }
}

export async function synthesizeSpeech(
  text: string,
  voice: VoiceId,
  speed: number = DEFAULT_SPEED
): Promise<Buffer> {
  validateParams(text, voice, speed);

  const response = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.FISH_AUDIO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      reference_id: VOICE_MAP[voice],
      format: 'mp3',
      mp3_bitrate: 128,
      latency: 'normal',
      prosody: {
        speed,
        volume: 0,
      },
      emotion: 'warm',
    }),
  });

  if (!response.ok) {
    throw new TTSError(
      'SYNTHESIS_FAILED',
      `Fish Audio API error: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
