import type { Tool, ToolResult, RiskLevel } from './tool.types.js';

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getByRiskLevel(maxRiskLevel: RiskLevel): Tool[] {
    return this.getAll().filter((tool) => tool.riskLevel <= maxRiskLevel);
  }

  async execute(name: string, input: unknown): Promise<ToolResult> {
    const tool = this.get(name);
    if (tool === undefined) {
      return {
        success: false,
        output: null,
        error: `Tool "${name}" not found`,
      };
    }

    try {
      return await tool.execute(input);
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  toAnthropicFormat(): Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }> {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Record<string, unknown>,
    }));
  }

  clear(): void {
    this.tools.clear();
  }
}

export const toolRegistry = new ToolRegistry();
