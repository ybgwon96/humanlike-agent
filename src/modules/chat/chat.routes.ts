import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as chatService from './chat.service.js';
import {
  sendTextMessageSchema,
  streamChatSchema,
  type TextMessageResponse,
  type VoiceMessageResponse,
} from './chat.schemas.js';
import type { SingleResponse } from '../../types/api.js';

export const chatRoutes = new Hono();

chatRoutes.post('/messages', zValidator('json', sendTextMessageSchema), async (c) => {
  const body = c.req.valid('json');

  const result = await chatService.sendTextMessage({
    conversationId: body.conversationId,
    content: body.content,
  });

  return c.json<SingleResponse<TextMessageResponse>>(
    {
      success: true,
      data: result,
    },
    201
  );
});

const voiceQuerySchema = z.object({
  conversationId: z.string().uuid(),
  language: z.enum(['ko', 'en']).default('ko'),
});

chatRoutes.post('/voice', zValidator('query', voiceQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const body = await c.req.parseBody();
  const audioFile = body['audio'];

  if (!(audioFile instanceof File)) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Audio file is required',
        },
      },
      400
    );
  }

  const mimeType = audioFile.type;
  const validMimeTypes = ['audio/webm', 'audio/ogg'];

  if (!validMimeTypes.includes(mimeType)) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_AUDIO_FORMAT',
          message: `Invalid audio format. Supported formats: ${validMimeTypes.join(', ')}`,
        },
      },
      400
    );
  }

  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  const result = await chatService.sendVoiceMessage({
    conversationId: query.conversationId,
    audioBuffer,
    mimeType,
    language: query.language,
  });

  return c.json<SingleResponse<VoiceMessageResponse>>(
    {
      success: true,
      data: result,
    },
    201
  );
});

chatRoutes.post('/stream', zValidator('json', streamChatSchema), async (c) => {
  const body = c.req.valid('json');

  return streamSSE(c, async (stream) => {
    try {
      for await (const chunk of chatService.streamChat({
        conversationId: body.conversationId,
        content: body.content,
      })) {
        await stream.writeSSE({
          data: JSON.stringify(chunk),
        });
      }
    } catch (error) {
      await stream.writeSSE({
        data: JSON.stringify({
          type: 'error',
          data: error instanceof Error ? error.message : 'Unknown error',
        }),
      });
    }
  });
});
