export class GenerationError extends Error {
  constructor(
    public readonly provider: string,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

export function sanitizeErrorForClient(error: unknown): string {
  if (error instanceof GenerationError) {
    return `[${error.provider}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred during execution.";
}
