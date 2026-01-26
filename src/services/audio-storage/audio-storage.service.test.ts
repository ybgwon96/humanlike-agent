import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveRecording,
  saveTTSAudio,
  getAudioUrl,
  deleteAudio,
  readAudio,
  AudioStorageError,
} from './audio-storage.service.js';

vi.mock('../../config/env.js', () => ({
  env: {
    AUDIO_STORAGE_PATH: '/tmp/test-audio-storage',
  },
}));

const mockMkdir = vi.fn();
const mockWriteFile = vi.fn();
const mockReadFile = vi.fn();
const mockUnlink = vi.fn();

vi.mock('node:fs/promises', () => ({
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
}));

describe('Audio Storage Service', () => {
  const conversationId = '550e8400-e29b-41d4-a716-446655440000';
  const messageId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(Buffer.from('test audio data'));
    mockUnlink.mockResolvedValue(undefined);
  });

  describe('saveRecording', () => {
    it('webm 포맷 녹음 파일을 저장한다', async () => {
      const audioBuffer = Buffer.from('webm audio data');

      const result = await saveRecording(conversationId, messageId, audioBuffer, 'webm');

      expect(mockMkdir).toHaveBeenCalledWith(
        `/tmp/test-audio-storage/${conversationId}`,
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        `/tmp/test-audio-storage/${conversationId}/${messageId}.webm`,
        audioBuffer
      );
      expect(result).toBe(`/tmp/test-audio-storage/${conversationId}/${messageId}.webm`);
    });

    it('ogg 포맷 녹음 파일을 저장한다', async () => {
      const audioBuffer = Buffer.from('ogg audio data');

      const result = await saveRecording(conversationId, messageId, audioBuffer, 'ogg');

      expect(mockWriteFile).toHaveBeenCalledWith(
        `/tmp/test-audio-storage/${conversationId}/${messageId}.ogg`,
        audioBuffer
      );
      expect(result).toBe(`/tmp/test-audio-storage/${conversationId}/${messageId}.ogg`);
    });

    it('10MB 초과 파일은 FILE_TOO_LARGE 에러를 발생시킨다', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      await expect(saveRecording(conversationId, messageId, largeBuffer, 'webm'))
        .rejects.toThrow(AudioStorageError);

      await expect(saveRecording(conversationId, messageId, largeBuffer, 'webm'))
        .rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
    });

    it('10MB 파일은 허용된다', async () => {
      const maxBuffer = Buffer.alloc(10 * 1024 * 1024);

      const result = await saveRecording(conversationId, messageId, maxBuffer, 'webm');

      expect(result).toBe(`/tmp/test-audio-storage/${conversationId}/${messageId}.webm`);
    });

    it('지원하지 않는 포맷은 INVALID_FORMAT 에러를 발생시킨다', async () => {
      const audioBuffer = Buffer.from('audio data');

      // @ts-expect-error 의도적으로 잘못된 포맷 전달
      await expect(saveRecording(conversationId, messageId, audioBuffer, 'mp3'))
        .rejects.toThrow(AudioStorageError);

      // @ts-expect-error 의도적으로 잘못된 포맷 전달
      await expect(saveRecording(conversationId, messageId, audioBuffer, 'wav'))
        .rejects.toMatchObject({ code: 'INVALID_FORMAT' });
    });

    it('파일 쓰기 실패 시 STORAGE_ERROR 에러를 발생시킨다', async () => {
      mockWriteFile.mockRejectedValueOnce(new Error('Disk full'));
      const audioBuffer = Buffer.from('audio data');

      await expect(saveRecording(conversationId, messageId, audioBuffer, 'webm'))
        .rejects.toMatchObject({ code: 'STORAGE_ERROR' });
    });
  });

  describe('saveTTSAudio', () => {
    it('TTS mp3 파일을 저장한다', async () => {
      const audioBuffer = Buffer.from('mp3 audio data');

      const result = await saveTTSAudio(conversationId, messageId, audioBuffer);

      expect(mockMkdir).toHaveBeenCalledWith(
        `/tmp/test-audio-storage/${conversationId}`,
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        `/tmp/test-audio-storage/${conversationId}/${messageId}.mp3`,
        audioBuffer
      );
      expect(result).toBe(`/tmp/test-audio-storage/${conversationId}/${messageId}.mp3`);
    });

    it('파일 쓰기 실패 시 STORAGE_ERROR 에러를 발생시킨다', async () => {
      mockWriteFile.mockRejectedValueOnce(new Error('Permission denied'));
      const audioBuffer = Buffer.from('audio data');

      await expect(saveTTSAudio(conversationId, messageId, audioBuffer))
        .rejects.toMatchObject({ code: 'STORAGE_ERROR' });
    });
  });

  describe('getAudioUrl', () => {
    it('webm 오디오 URL을 생성한다', () => {
      const url = getAudioUrl(conversationId, messageId, 'webm');

      expect(url).toBe(`/api/v1/audio/${conversationId}/${messageId}.webm`);
    });

    it('ogg 오디오 URL을 생성한다', () => {
      const url = getAudioUrl(conversationId, messageId, 'ogg');

      expect(url).toBe(`/api/v1/audio/${conversationId}/${messageId}.ogg`);
    });

    it('mp3 오디오 URL을 생성한다', () => {
      const url = getAudioUrl(conversationId, messageId, 'mp3');

      expect(url).toBe(`/api/v1/audio/${conversationId}/${messageId}.mp3`);
    });
  });

  describe('deleteAudio', () => {
    it('오디오 파일을 삭제한다', async () => {
      await deleteAudio(conversationId, messageId, 'webm');

      expect(mockUnlink).toHaveBeenCalledWith(
        `/tmp/test-audio-storage/${conversationId}/${messageId}.webm`
      );
    });

    it('존재하지 않는 파일 삭제 시 FILE_NOT_FOUND 에러를 발생시킨다', async () => {
      const enoentError = new Error('ENOENT') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockUnlink.mockRejectedValueOnce(enoentError);

      await expect(deleteAudio(conversationId, messageId, 'webm'))
        .rejects.toThrow(AudioStorageError);

      mockUnlink.mockRejectedValueOnce(enoentError);
      await expect(deleteAudio(conversationId, messageId, 'webm'))
        .rejects.toMatchObject({ code: 'FILE_NOT_FOUND' });
    });

    it('기타 에러 시 STORAGE_ERROR 에러를 발생시킨다', async () => {
      mockUnlink.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(deleteAudio(conversationId, messageId, 'webm'))
        .rejects.toMatchObject({ code: 'STORAGE_ERROR' });
    });
  });

  describe('readAudio', () => {
    it('오디오 파일을 읽는다', async () => {
      const expectedBuffer = Buffer.from('audio content');
      mockReadFile.mockResolvedValueOnce(expectedBuffer);

      const result = await readAudio(conversationId, messageId, 'mp3');

      expect(mockReadFile).toHaveBeenCalledWith(
        `/tmp/test-audio-storage/${conversationId}/${messageId}.mp3`
      );
      expect(result).toBe(expectedBuffer);
    });

    it('존재하지 않는 파일 읽기 시 FILE_NOT_FOUND 에러를 발생시킨다', async () => {
      const enoentError = new Error('ENOENT') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockReadFile.mockRejectedValueOnce(enoentError);

      await expect(readAudio(conversationId, messageId, 'webm'))
        .rejects.toThrow(AudioStorageError);

      mockReadFile.mockRejectedValueOnce(enoentError);
      await expect(readAudio(conversationId, messageId, 'webm'))
        .rejects.toMatchObject({ code: 'FILE_NOT_FOUND' });
    });

    it('기타 에러 시 STORAGE_ERROR 에러를 발생시킨다', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('IO Error'));

      await expect(readAudio(conversationId, messageId, 'webm'))
        .rejects.toMatchObject({ code: 'STORAGE_ERROR' });
    });
  });

  describe('AudioStorageError', () => {
    it('에러 이름이 AudioStorageError이다', () => {
      const error = new AudioStorageError('FILE_NOT_FOUND', 'File not found');

      expect(error.name).toBe('AudioStorageError');
      expect(error.code).toBe('FILE_NOT_FOUND');
      expect(error.message).toBe('File not found');
    });
  });
});
