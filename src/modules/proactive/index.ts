export { proactiveRoutes } from './proactive.routes.js';
export * from './proactive.types.js';
export type {
  EvaluateEngagementInput,
  UpdatePreferencesInput,
  PauseEngagementInput,
  EngagementDecisionResponse,
  EngagementPatternResponse,
} from './proactive.schemas.js';
export {
  triggerReasonSchema,
  userResponseSchema,
  frequencyPreferenceSchema,
  messagePrioritySchema,
  evaluateEngagementSchema,
  feedbackSchema,
  updatePreferencesSchema,
  pauseEngagementSchema,
} from './proactive.schemas.js';
export * as proactiveService from './proactive.service.js';
export { evaluateEngagement, generateMessage, getPriorityForReason } from './decision-engine.js';
export { processFeedback, adjustThresholds, getEngagementInsights, type EngagementInsights } from './learning-system.js';
export * as messageQueue from './message-queue.js';
