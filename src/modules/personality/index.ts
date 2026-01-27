export { personalityRoutes } from './personality.routes.js';
export {
  getDefaultPersonality,
  getUserPersonalityAdjustments,
  updateUserPersonalityAdjustments,
  getPersonalityForUser,
  buildSystemPrompt,
} from './personality.service.js';
export type {
  PersonalityProfileResponse,
  UserPersonalityAdjustmentResponse,
  UpdateUserAdjustmentRequest,
} from './personality.schemas.js';
