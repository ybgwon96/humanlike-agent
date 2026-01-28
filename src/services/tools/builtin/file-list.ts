import { readdir, stat } from 'node:fs/promises';
import { resolve, isAbsolute, join } from 'node:path';
import type { Tool, ToolResult } from '../tool.types.js';

interface FileListInput {
  path: string;
  recursive?: boolean;
  maxDepth?: number;
}

interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: string;
}

const MAX_ENTRIES = 1000;

async function listDirectory(
  dirPath: string,
  recursive: boolean,
  maxDepth: number,
  currentDepth: number = 0
): Promise<FileInfo[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const results: FileInfo[] = [];

  for (const entry of entries) {
    if (results.length >= MAX_ENTRIES) break;

    const fullPath = join(dirPath, entry.name);
    const stats = await stat(fullPath);

    const fileInfo: FileInfo = {
      name: entry.name,
      path: fullPath,
      type: entry.isDirectory() ? 'directory' : 'file',
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    };

    results.push(fileInfo);

    if (recursive && entry.isDirectory() && currentDepth < maxDepth) {
      const subEntries = await listDirectory(fullPath, recursive, maxDepth, currentDepth + 1);
      results.push(...subEntries);
    }
  }

  return results;
}

export const fileListTool: Tool = {
  name: 'file_list',
  description: '디렉토리의 파일 및 폴더 목록을 조회합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '조회할 디렉토리 경로 (기본값: 현재 디렉토리)',
      },
      recursive: {
        type: 'boolean',
        description: '하위 디렉토리도 조회할지 여부 (기본값: false)',
      },
      maxDepth: {
        type: 'number',
        description: '재귀 조회 시 최대 깊이 (기본값: 3)',
      },
    },
  },
  riskLevel: 1,

  async execute(input: unknown): Promise<ToolResult> {
    const { path = '.', recursive = false, maxDepth = 3 } = (input as FileListInput) ?? {};

    try {
      const absolutePath = isAbsolute(path) ? path : resolve(process.cwd(), path);
      const entries = await listDirectory(absolutePath, recursive, maxDepth);

      return {
        success: true,
        output: {
          path: absolutePath,
          entries,
          totalCount: entries.length,
          truncated: entries.length >= MAX_ENTRIES,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list directory';
      return {
        success: false,
        output: null,
        error: message,
      };
    }
  },
};
