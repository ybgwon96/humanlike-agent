import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, isAbsolute, dirname } from 'node:path';
import type { Tool, ToolResult } from '../tool.types.js';

interface FileWriteInput {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
  createDirectories?: boolean;
}

export const fileWriteTool: Tool = {
  name: 'file_write',
  description: '지정된 경로에 파일을 생성하거나 덮어씁니다. 쓰기 작업은 사용자 승인이 필요합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '쓸 파일의 경로',
      },
      content: {
        type: 'string',
        description: '파일에 쓸 내용',
      },
      encoding: {
        type: 'string',
        enum: ['utf-8', 'base64'],
        description: '인코딩 방식 (기본값: utf-8)',
      },
      createDirectories: {
        type: 'boolean',
        description: '상위 디렉토리가 없으면 생성할지 여부 (기본값: true)',
      },
    },
    required: ['path', 'content'],
  },
  riskLevel: 2,

  async execute(input: unknown): Promise<ToolResult> {
    const {
      path,
      content,
      encoding = 'utf-8',
      createDirectories = true,
    } = input as FileWriteInput;

    try {
      const absolutePath = isAbsolute(path) ? path : resolve(process.cwd(), path);

      if (createDirectories) {
        await mkdir(dirname(absolutePath), { recursive: true });
      }

      const data = encoding === 'base64' ? Buffer.from(content, 'base64') : content;
      await writeFile(absolutePath, data, { encoding: encoding === 'utf-8' ? 'utf-8' : undefined });

      return {
        success: true,
        output: {
          path: absolutePath,
          bytesWritten: typeof data === 'string' ? Buffer.byteLength(data) : data.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to write file';
      return {
        success: false,
        output: null,
        error: message,
      };
    }
  },
};
