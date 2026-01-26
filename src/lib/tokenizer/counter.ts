const AVG_CHARS_PER_TOKEN = 4;

export interface TokenCountResult {
  estimatedTokens: number;
  charCount: number;
}

export function countTokens(text: string): TokenCountResult {
  const charCount = text.length;
  const estimatedTokens = Math.ceil(charCount / AVG_CHARS_PER_TOKEN);

  return {
    estimatedTokens,
    charCount,
  };
}

export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * AVG_CHARS_PER_TOKEN;

  if (text.length <= maxChars) {
    return text;
  }

  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxChars * 0.8) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

export function fitMessagesInTokenLimit(
  messages: string[],
  maxTokens: number
): { messages: string[]; totalTokens: number } {
  const result: string[] = [];
  let totalTokens = 0;

  for (const message of messages) {
    const { estimatedTokens } = countTokens(message);

    if (totalTokens + estimatedTokens > maxTokens) {
      break;
    }

    result.push(message);
    totalTokens += estimatedTokens;
  }

  return { messages: result, totalTokens };
}
