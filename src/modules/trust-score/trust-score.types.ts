export interface TrustMetrics {
  taskSuccessRate: number;
  userSatisfaction: number;
  proactiveValue: number;
  errorRecovery: number;
}

export interface PromotionCriteria {
  fromLevel: number;
  toLevel: number;
  requiredTasks: number;
  minSuccessRate: number;
}

export type LevelChangeReason =
  | 'promotion'
  | 'demotion_failures'
  | 'demotion_low_score'
  | null;

export interface LevelChangeResult {
  levelChanged: boolean;
  previousLevel: number;
  currentLevel: number;
  reason: LevelChangeReason;
  notification: string | null;
}

export interface AgentStats {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  consecutiveFailures: number;
  taskSuccessRate: number;
}

export interface CreateTaskInput {
  type: 'SUGGESTION' | 'DRAFT' | 'EXECUTION' | 'DECISION';
  requiresLevel: number;
  description: string;
}

export interface TaskFeedbackInput {
  feedback: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  outcome?: Record<string, unknown>;
  errorMessage?: string;
}

export interface AgentTrustScoreResponse {
  agentId: string;
  autonomyLevel: number;
  trustScore: number;
  metrics: TrustMetrics;
  stats: AgentStats;
}

export const AUTONOMY_LEVEL_NAMES: Record<number, string> = {
  1: 'Intern',
  2: 'Junior',
  3: 'Middle',
  4: 'Senior',
  5: 'Lead',
};

export const AUTONOMY_LEVEL_PERMISSIONS: Record<number, string> = {
  1: '읽기/분석/제안만',
  2: '초안 작성 (실행 불가)',
  3: '제한된 실행 (되돌릴 수 있는 작업)',
  4: '독립 실행 (전략적 결정만 승인 필요)',
  5: '완전 자율 (사후 보고만)',
};
