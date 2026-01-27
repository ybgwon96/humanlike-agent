import * as repository from './feedback-learning.repository.js';
import type { FeedbackEvent } from '../../db/schema/feedback-events.js';
import type { SubmitFeedbackInput, FeedbackContext } from './feedback-learning.types.js';

export async function processFeedback(input: SubmitFeedbackInput): Promise<FeedbackEvent> {
  const context = enrichContext(input.context);

  const event = await repository.createFeedbackEvent({
    userId: input.userId,
    feedbackType: input.feedbackType,
    context,
    feedbackText: input.feedbackText,
  });

  return event;
}

function enrichContext(context?: FeedbackContext): FeedbackContext {
  const now = new Date();

  return {
    ...context,
    timeOfDay: context?.timeOfDay ?? now.getHours(),
    dayOfWeek: context?.dayOfWeek ?? now.getDay(),
  };
}

export async function processImplicitFeedback(
  userId: string,
  accepted: boolean,
  context?: FeedbackContext
): Promise<FeedbackEvent> {
  return processFeedback({
    userId,
    feedbackType: accepted ? 'IMPLICIT_ACCEPT' : 'IMPLICIT_IGNORE',
    context,
  });
}

export async function processTaskFeedback(
  userId: string,
  helpful: boolean,
  context?: FeedbackContext,
  feedbackText?: string
): Promise<FeedbackEvent> {
  return processFeedback({
    userId,
    feedbackType: helpful ? 'TASK_HELPFUL' : 'TASK_NOT_HELPFUL',
    context,
    feedbackText,
  });
}

export async function processExplicitFeedback(
  userId: string,
  positive: boolean,
  context?: FeedbackContext,
  feedbackText?: string
): Promise<FeedbackEvent> {
  return processFeedback({
    userId,
    feedbackType: positive ? 'EXPLICIT_POSITIVE' : 'EXPLICIT_NEGATIVE',
    context,
    feedbackText,
  });
}
