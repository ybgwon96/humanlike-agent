import { describe, it, expect, vi, beforeEach } from 'vitest';
import { synthesizeSpeech, TTSError } from './tts.service.js';

vi.mock('../../config/env.js', () => ({
  env: {
    FISH_AUDIO_API_KEY: 'test-api-key',
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TTS Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
  });

  describe('텍스트 검증', () => {
    it('빈 텍스트는 TEXT_REQUIRED 에러를 발생시킨다', async () => {
      await expect(synthesizeSpeech('', 'en-US-male'))
        .rejects.toThrow(TTSError);

      await expect(synthesizeSpeech('', 'en-US-male'))
        .rejects.toMatchObject({ code: 'TEXT_REQUIRED' });
    });

    it('공백만 있는 텍스트는 TEXT_REQUIRED 에러를 발생시킨다', async () => {
      await expect(synthesizeSpeech('   ', 'en-US-male'))
        .rejects.toMatchObject({ code: 'TEXT_REQUIRED' });
    });

    it('유효한 텍스트는 검증을 통과한다', async () => {
      const result = await synthesizeSpeech('Hello world', 'en-US-male');

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('음성 검증', () => {
    it('en-US-male 음성은 허용된다', async () => {
      const result = await synthesizeSpeech('Test', 'en-US-male');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('en-US-female 음성은 허용된다', async () => {
      const result = await synthesizeSpeech('Test', 'en-US-female');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('ko-KR-female 음성은 허용된다', async () => {
      const result = await synthesizeSpeech('테스트', 'ko-KR-female');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('지원하지 않는 음성은 INVALID_VOICE 에러를 발생시킨다', async () => {
      // @ts-expect-error 의도적으로 잘못된 음성 전달
      await expect(synthesizeSpeech('Test', 'invalid-voice'))
        .rejects.toThrow(TTSError);

      // @ts-expect-error 의도적으로 잘못된 음성 전달
      await expect(synthesizeSpeech('Test', 'invalid-voice'))
        .rejects.toMatchObject({ code: 'INVALID_VOICE' });
    });
  });

  describe('속도 검증', () => {
    it('기본 속도(1.0)로 합성한다', async () => {
      await synthesizeSpeech('Test', 'en-US-male');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.fish.audio/v1/tts',
        expect.objectContaining({
          body: expect.stringContaining('"speed":1'),
        })
      );
    });

    it('0.75 속도는 허용된다', async () => {
      const result = await synthesizeSpeech('Test', 'en-US-male', 0.75);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('1.25 속도는 허용된다', async () => {
      const result = await synthesizeSpeech('Test', 'en-US-male', 1.25);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('0.75 미만 속도는 INVALID_SPEED 에러를 발생시킨다', async () => {
      await expect(synthesizeSpeech('Test', 'en-US-male', 0.5))
        .rejects.toThrow(TTSError);

      await expect(synthesizeSpeech('Test', 'en-US-male', 0.5))
        .rejects.toMatchObject({ code: 'INVALID_SPEED' });
    });

    it('1.25 초과 속도는 INVALID_SPEED 에러를 발생시킨다', async () => {
      await expect(synthesizeSpeech('Test', 'en-US-male', 1.5))
        .rejects.toMatchObject({ code: 'INVALID_SPEED' });
    });
  });

  describe('API 호출', () => {
    it('Fish Audio API를 올바른 설정으로 호출한다', async () => {
      await synthesizeSpeech('Hello', 'en-US-male', 1.0);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.fish.audio/v1/tts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('API 에러 시 SYNTHESIS_FAILED 에러를 발생시킨다', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(synthesizeSpeech('Test', 'en-US-male'))
        .rejects.toMatchObject({ code: 'SYNTHESIS_FAILED' });
    });
  });
});
