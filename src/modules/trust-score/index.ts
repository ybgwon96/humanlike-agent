export { trustScoreRoutes } from './trust-score.routes.js';
export * from './trust-score.types.js';
export * from './trust-score.schemas.js';
export * as trustScoreService from './trust-score.service.js';
export { calculateTrustScore, computeMetricsFromTasks } from './trust-calculator.js';
export {
  evaluatePromotion,
  evaluateDemotion,
  checkPermission,
} from './autonomy-evaluator.js';
