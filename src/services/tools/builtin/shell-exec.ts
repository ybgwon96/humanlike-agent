import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Tool, ToolResult } from '../tool.types.js';

const execAsync = promisify(exec);

interface ShellExecInput {
  command: string;
  cwd?: string;
  timeout?: number;
}

const BLOCKED_COMMANDS = [
  'rm -rf /',
  'rm -rf ~',
  'rm -rf /*',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',
  '> /dev/sda',
  'chmod -R 777 /',
];

const DEFAULT_TIMEOUT = 30000; // 30초

function isBlockedCommand(command: string): boolean {
  const normalized = command.toLowerCase().trim();
  return BLOCKED_COMMANDS.some((blocked) => normalized.includes(blocked.toLowerCase()));
}

export const shellExecTool: Tool = {
  name: 'shell_exec',
  description: '쉘 명령어를 실행합니다. 위험한 명령어는 차단됩니다. 이 도구는 사용자 승인이 필요합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: '실행할 쉘 명령어',
      },
      cwd: {
        type: 'string',
        description: '작업 디렉토리 (기본값: 현재 디렉토리)',
      },
      timeout: {
        type: 'number',
        description: '타임아웃 밀리초 (기본값: 30000)',
      },
    },
    required: ['command'],
  },
  riskLevel: 3,

  async execute(input: unknown): Promise<ToolResult> {
    const { command, cwd = process.cwd(), timeout = DEFAULT_TIMEOUT } = input as ShellExecInput;

    if (isBlockedCommand(command)) {
      return {
        success: false,
        output: null,
        error: '이 명령어는 보안상 차단되었습니다',
      };
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024, // 1MB
      });

      return {
        success: true,
        output: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command,
          cwd,
        },
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const execError = error as Error & { code: number; stdout?: string; stderr?: string };
        return {
          success: false,
          output: {
            stdout: execError.stdout ?? '',
            stderr: execError.stderr ?? '',
            exitCode: execError.code,
          },
          error: `Command exited with code ${execError.code}`,
        };
      }

      const message = error instanceof Error ? error.message : 'Command execution failed';
      return {
        success: false,
        output: null,
        error: message,
      };
    }
  },
};
