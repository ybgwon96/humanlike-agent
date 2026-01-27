import type { TrustMetrics } from './trust-score.types.js';
import type { AgentTask } from '../../db/schema/agent-tasks.js';

const WEIGHTS = {
  TASK_SUCCESS_RATE: 0.4,
  USER_SATISFACTION: 0.3,
  PROACTIVE_VALUE: 0.2,
  ERROR_RECOVERY: 0.1,
} as const;

export function calculateTrustScore(metrics: TrustMetrics): number {
  const score =
    metrics.taskSuccessRate * WEIGHTS.TASK_SUCCESS_RATE +
    metrics.userSatisfaction * WEIGHTS.USER_SATISFACTION +
    metrics.proactiveValue * WEIGHTS.PROACTIVE_VALUE +
    metrics.errorRecovery * WEIGHTS.ERROR_RECOVERY;

  return Math.round(score * 100 * 100) / 100;
}

export function computeMetricsFromTasks(tasks: AgentTask[]): TrustMetrics {
  if (tasks.length === 0) {
    return {
      taskSuccessRate: 0,
      userSatisfaction: 0,
      proactiveValue: 0,
      errorRecovery: 0,
    };
  }

  const completedTasks = tasks.filter(
    (t) => t.status === 'COMPLETED' || t.status === 'FAILED'
  );
  const successfulTasks = tasks.filter((t) => t.status === 'COMPLETED');

  const taskSuccessRate =
    completedTasks.length > 0 ? successfulTasks.length / completedTasks.length : 0;

  const tasksWithFeedback = tasks.filter((t) => t.userFeedback !== null);
  let userSatisfaction = 0;

  if (tasksWithFeedback.length > 0) {
    let feedbackSum = 0;
    for (const t of tasksWithFeedback) {
      switch (t.userFeedback) {
        case 'POSITIVE':
          feedbackSum += 1;
          break;
        case 'NEUTRAL':
          feedbackSum += 0.5;
          break;
        case 'NEGATIVE':
          feedbackSum += 0;
          break;
        default:
          feedbackSum += 0.5;
      }
    }
    userSatisfaction = feedbackSum / tasksWithFeedback.length;
  }

  const suggestionTasks = tasks.filter((t) => t.type === 'SUGGESTION');
  const acceptedSuggestions = suggestionTasks.filter(
    (t) => t.status === 'APPROVED' || t.status === 'COMPLETED'
  );
  const proactiveValue =
    suggestionTasks.length > 0 ? acceptedSuggestions.length / suggestionTasks.length : 0;

  const failedTasks = tasks.filter((t) => t.status === 'FAILED');
  const recoveredTasks = failedTasks.filter((t) => {
    const outcome = t.outcome as Record<string, unknown> | null;
    return outcome?.['recovered'] === true;
  });
  const errorRecovery =
    failedTasks.length > 0 ? recoveredTasks.length / failedTasks.length : 1;

  return {
    taskSuccessRate: Math.round(taskSuccessRate * 1000) / 1000,
    userSatisfaction: Math.round(userSatisfaction * 1000) / 1000,
    proactiveValue: Math.round(proactiveValue * 1000) / 1000,
    errorRecovery: Math.round(errorRecovery * 1000) / 1000,
  };
}

export function getDefaultMetrics(): TrustMetrics {
  return {
    taskSuccessRate: 0,
    userSatisfaction: 0,
    proactiveValue: 0,
    errorRecovery: 0,
  };
}
