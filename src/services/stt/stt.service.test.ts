import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transcribeAudio, STTError } from './stt.service.js';

vi.mock('@deepgram/sdk', () => ({
  createClient: () => ({
    listen: {
      prerecorded: {
        transcribeFile: vi.fn().mockResolvedValue({
          result: {
            results: {
              channels: [{
                alternatives: [{
                  transcript: 'Hello world',
                  confidence: 0.95,
                }],
              }],
            },
            metadata: {
              duration: 2.5,
            },
          },
        }),
      },
    },
  }),
}));

vi.mock('../../config/env.js', () => ({
  env: {
    DEEPGRAM_API_KEY: 'test-api-key',
  },
}));

describe('STT Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('파일 크기 검증', () => {
    it('10MB 초과 파일은 AUDIO_TOO_LARGE 에러를 발생시킨다', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      await expect(transcribeAudio(largeBuffer, 'ko', 'audio/webm'))
        .rejects.toThrow(STTError);

      await expect(transcribeAudio(largeBuffer, 'ko', 'audio/webm'))
        .rejects.toMatchObject({ code: 'AUDIO_TOO_LARGE' });
    });

    it('10MB 이하 파일은 검증을 통과한다', async () => {
      const validBuffer = Buffer.alloc(5 * 1024 * 1024);

      const result = await transcribeAudio(validBuffer, 'ko', 'audio/webm');

      expect(result.transcription).toBeDefined();
    });
  });

  describe('오디오 포맷 검증', () => {
    it('webm 포맷은 허용된다', async () => {
      const buffer = Buffer.alloc(1024);

      const result = await transcribeAudio(buffer, 'ko', 'audio/webm');

      expect(result.transcription).toBeDefined();
    });

    it('ogg 포맷은 허용된다', async () => {
      const buffer = Buffer.alloc(1024);

      const result = await transcribeAudio(buffer, 'ko', 'audio/ogg');

      expect(result.transcription).toBeDefined();
    });

    it('지원하지 않는 포맷은 INVALID_AUDIO_FORMAT 에러를 발생시킨다', async () => {
      const buffer = Buffer.alloc(1024);

      await expect(transcribeAudio(buffer, 'ko', 'audio/mp3'))
        .rejects.toThrow(STTError);

      await expect(transcribeAudio(buffer, 'ko', 'audio/mp3'))
        .rejects.toMatchObject({ code: 'INVALID_AUDIO_FORMAT' });
    });

    it('wav 포맷은 지원하지 않는다', async () => {
      const buffer = Buffer.alloc(1024);

      await expect(transcribeAudio(buffer, 'ko', 'audio/wav'))
        .rejects.toMatchObject({ code: 'INVALID_AUDIO_FORMAT' });
    });
  });

  describe('transcription 결과', () => {
    it('정상적인 transcription 결과를 반환한다', async () => {
      const buffer = Buffer.alloc(1024);

      const result = await transcribeAudio(buffer, 'ko', 'audio/webm');

      expect(result).toMatchObject({
        transcription: 'Hello world',
        confidence: 0.95,
        duration: 2.5,
        lowConfidence: false,
      });
    });

    it('한국어와 영어 언어 설정을 지원한다', async () => {
      const buffer = Buffer.alloc(1024);

      const koResult = await transcribeAudio(buffer, 'ko', 'audio/webm');
      const enResult = await transcribeAudio(buffer, 'en', 'audio/webm');

      expect(koResult.transcription).toBeDefined();
      expect(enResult.transcription).toBeDefined();
    });
  });
});
