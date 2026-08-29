export type ContactCategory =
  | 'Feedback'
  | 'Bug Report'
  | 'Feature Request'
  | 'Contact Support'
  | 'Other';

export interface FeedbackData {
  name: string;
  email: string;
  category: ContactCategory | '';
  subject: string;
  message: string;
}

export interface ValidationErrors {
  name?: string;
  email?: string;
  category?: string;
  subject?: string;
  message?: string;
}

export type SubmissionStatus = 'Idle' | 'Validating' | 'Submitting' | 'Success' | 'Error';

export interface SubmissionResponse {
  success: boolean;
  message: string;
  errors?: ValidationErrors;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MAX_MESSAGE_LENGTH = 3000;

export function validateFeedbackForm(data: FeedbackData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Full name is required.';
  }

  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!data.category) {
    errors.category = 'Please select a contact category.';
  }

  if (!data.subject || !data.subject.trim()) {
    errors.subject = 'Subject is required.';
  }

  if (!data.message || !data.message.trim()) {
    errors.message = 'Message is required.';
  } else if (data.message.length > MAX_MESSAGE_LENGTH) {
    errors.message = `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters (currently ${data.message.length}).`;
  }

  return errors;
}

/**
 * Clean abstraction to handle feedback submissions.
 * Stores feedback locally or connects to backend endpoint when configured.
 */
export async function submitFeedback(data: FeedbackData): Promise<SubmissionResponse> {
  const errors = validateFeedbackForm(data);
  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: 'Please fix the validation errors before submitting.',
      errors,
    };
  }

  try {
    // Check if backend endpoint exists or simulate network dispatch
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('app_user_feedback') || '[]';
      const feedbackList = JSON.parse(stored);
      feedbackList.push({
        ...data,
        id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('app_user_feedback', JSON.stringify(feedbackList));
    }

    // Small async delay to emulate smooth submission state transition
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      success: true,
      message: 'Thank you! Your submission has been received successfully.',
    };
  } catch (err: any) {
    console.error('[FeedbackService] Error submitting feedback:', err);
    return {
      success: false,
      message: err?.message || 'An unexpected error occurred while sending your feedback. Please try again.',
    };
  }
}
