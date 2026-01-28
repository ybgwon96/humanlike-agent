import { toolRegistry } from '../tool-registry.js';
import { fileReadTool } from './file-read.js';
import { fileListTool } from './file-list.js';
import { fileWriteTool } from './file-write.js';
import { webSearchTool } from './web-search.js';
import { shellExecTool } from './shell-exec.js';

export function registerBuiltinTools(): void {
  toolRegistry.register(fileReadTool);
  toolRegistry.register(fileListTool);
  toolRegistry.register(fileWriteTool);
  toolRegistry.register(webSearchTool);
  toolRegistry.register(shellExecTool);
}

export {
  fileReadTool,
  fileListTool,
  fileWriteTool,
  webSearchTool,
  shellExecTool,
};
