import { readFile } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import type { Tool, ToolResult } from '../tool.types.js';

interface FileReadInput {
  path: string;
  encoding?: 'utf-8' | 'base64';
  maxBytes?: number;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export const fileReadTool: Tool = {
  name: 'file_read',
  description: '지정된 경로의 파일 내용을 읽습니다. 텍스트 파일의 경우 utf-8 인코딩을, 바이너리 파일은 base64를 사용합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '읽을 파일의 경로 (상대 경로 또는 절대 경로)',
      },
      encoding: {
        type: 'string',
        enum: ['utf-8', 'base64'],
        description: '파일 인코딩 (기본값: utf-8)',
      },
      maxBytes: {
        type: 'number',
        description: '읽을 최대 바이트 수 (기본값: 1MB)',
      },
    },
    required: ['path'],
  },
  riskLevel: 1,

  async execute(input: unknown): Promise<ToolResult> {
    const { path, encoding = 'utf-8', maxBytes = MAX_FILE_SIZE } = input as FileReadInput;

    try {
      const absolutePath = isAbsolute(path) ? path : resolve(process.cwd(), path);

      const content = await readFile(absolutePath, {
        encoding: encoding === 'utf-8' ? 'utf-8' : undefined,
      });

      const result = encoding === 'base64'
        ? (content as Buffer).toString('base64').slice(0, maxBytes)
        : (content as string).slice(0, maxBytes);

      const truncated = result.length >= maxBytes;

      return {
        success: true,
        output: {
          content: result,
          path: absolutePath,
          encoding,
          truncated,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read file';
      return {
        success: false,
        output: null,
        error: message,
      };
    }
  },
};
