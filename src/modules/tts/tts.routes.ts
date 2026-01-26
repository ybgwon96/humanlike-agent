import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { synthesizeSpeechSchema } from './tts.schemas.js';
import { synthesizeSpeech, TTSError } from '../../services/tts/index.js';
import { AppError } from '../../middleware/error-handler.js';

export const ttsRoutes = new Hono();

ttsRoutes.post('/', zValidator('json', synthesizeSpeechSchema), async (c) => {
  const body = c.req.valid('json');

  try {
    const audioBuffer = await synthesizeSpeech(body.text, body.voice, body.speed ?? 1.0);

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    if (error instanceof TTSError) {
      throw new AppError(error.code, error.message, 400);
    }
    throw error;
  }
});
