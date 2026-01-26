import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { audioParamsSchema } from './audio.schemas.js';
import { readAudio, AudioStorageError, type AudioFormat } from '../../services/audio-storage/index.js';

export const audioRoutes = new Hono();

const CONTENT_TYPE_MAP: Record<AudioFormat, string> = {
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
};

audioRoutes.get('/:conversationId/:filename', zValidator('param', audioParamsSchema), async (c) => {
  const { conversationId, filename } = c.req.valid('param');

  const [messageId, format] = filename.split('.') as [string, AudioFormat];

  try {
    const audioBuffer = await readAudio(conversationId, messageId, format);
    const contentType = CONTENT_TYPE_MAP[format];

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    if (error instanceof AudioStorageError && error.code === 'FILE_NOT_FOUND') {
      return c.json({ success: false, error: 'Audio file not found' }, 404);
    }
    throw error;
  }
});
