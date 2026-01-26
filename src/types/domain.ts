export type SenderType = 'USER' | 'AGENT';

export interface MessageDto {
  id: string;
  conversationId: string;
  sender: SenderType;
  content: string;
  maskedContent: string | null;
  sentiment: number | null;
  createdAt: Date;
}

export interface ConversationDto {
  id: string;
  userId: string;
  contextSummary: string | null;
  startedAt: Date;
  endedAt: Date | null;
  messageCount?: number;
}

export interface UserDto {
  id: string;
  externalId: string;
  profile: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  preferences: Record<string, unknown>;
  workPatterns: Record<string, unknown>;
  emotionalBaseline: number;
}

export interface SearchResult {
  message: MessageDto;
  rank: number;
  highlight?: string;
}

export interface ContextData {
  conversation: ConversationDto;
  messages: MessageDto[];
  user: UserDto;
  totalTokens: number;
}
