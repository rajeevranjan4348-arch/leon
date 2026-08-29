import { ToolArtifact } from "./artifacts.js";

export interface RunStartedEvent {
  type: "run.started";
  runId: string;
  timestamp: string;
}

export interface StepStartedEvent {
  type: "step.started";
  runId: string;
  stepId: string;
  timestamp: string;
}

export interface ToolCallStartedEvent {
  type: "tool.started";
  runId: string;
  stepId: string;
  toolCallId: string;
  toolName: string;
  input?: Record<string, unknown>;
  timestamp: string;
}

export interface ToolCallCompletedEvent {
  type: "tool.completed";
  runId: string;
  stepId: string;
  toolCallId: string;
  toolName: string;
  output?: Record<string, unknown>;
  outputSummary?: string;
  artifacts?: ToolArtifact[];
  timestamp: string;
}

export interface TextDeltaEvent {
  type: "text.delta";
  runId: string;
  stepId: string;
  delta: string;
  timestamp: string;
}

export interface ThinkingDeltaEvent {
  type: "thinking.delta";
  runId: string;
  stepId: string;
  delta: string;
  timestamp: string;
}

export interface RunCompletedEvent {
  type: "run.completed";
  runId: string;
  timestamp: string;
}

export interface RunFailedEvent {
  type: "run.failed";
  runId: string;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export type StreamEvent =
  | RunStartedEvent
  | StepStartedEvent
  | ToolCallStartedEvent
  | ToolCallCompletedEvent
  | TextDeltaEvent
  | ThinkingDeltaEvent
  | RunCompletedEvent
  | RunFailedEvent;
