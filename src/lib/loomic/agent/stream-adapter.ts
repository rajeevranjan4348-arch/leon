import type { StreamEvent } from "../shared/events.js";

export async function* adaptLoomicStream(
  runId: string,
  responseStream: AsyncIterable<string>
): AsyncGenerator<StreamEvent> {
  const now = () => new Date().toISOString();
  
  yield {
    type: "run.started",
    runId,
    timestamp: now(),
  };

  const stepId = `step_${Date.now()}`;
  yield {
    type: "step.started",
    runId,
    stepId,
    timestamp: now(),
  };

  try {
    for await (const chunk of responseStream) {
      yield {
        type: "text.delta",
        runId,
        stepId,
        delta: chunk,
        timestamp: now(),
      };
    }

    yield {
      type: "run.completed",
      runId,
      timestamp: now(),
    };
  } catch (err) {
    yield {
      type: "run.failed",
      runId,
      error: {
        code: "stream_error",
        message: err instanceof Error ? err.message : String(err),
      },
      timestamp: now(),
    };
  }
}
