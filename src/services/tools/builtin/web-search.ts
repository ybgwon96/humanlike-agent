import type { Tool, ToolResult } from '../tool.types.js';

interface WebSearchInput {
  query: string;
  maxResults?: number;
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export const webSearchTool: Tool = {
  name: 'web_search',
  description: '웹에서 정보를 검색합니다. 최신 정보나 외부 데이터가 필요할 때 사용합니다.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '검색 쿼리',
      },
      maxResults: {
        type: 'number',
        description: '최대 결과 수 (기본값: 5)',
      },
    },
    required: ['query'],
  },
  riskLevel: 1,

  async execute(input: unknown): Promise<ToolResult> {
    const { query, maxResults = 5 } = input as WebSearchInput;

    try {
      const results = await performWebSearch(query, maxResults);

      return {
        success: true,
        output: {
          query,
          results,
          totalResults: results.length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      return {
        success: false,
        output: null,
        error: message,
      };
    }
  },
};

async function performWebSearch(query: string, maxResults: number): Promise<SearchResult[]> {
  // 실제 구현 시 외부 검색 API (Brave, Serper, Tavily 등) 연동
  // 현재는 placeholder 구현
  return [
    {
      title: `${query} - 검색 결과 1`,
      url: `https://example.com/search?q=${encodeURIComponent(query)}`,
      snippet: `"${query}"에 대한 검색 결과입니다. 실제 구현 시 검색 API를 연동하세요.`,
    },
  ].slice(0, maxResults);
}
