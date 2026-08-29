import { ThinkingStage, ThinkingState, IntentCategory } from './types';

export class ThinkingStateManager {
  private currentState: ThinkingState;
  private listeners: ((state: ThinkingState) => void)[] = [];

  constructor() {
    this.currentState = {
      stage: 'idle',
      stageMessage: '',
      startTime: Date.now(),
    };
  }

  public subscribe(listener: (state: ThinkingState) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentState);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public setStage(stage: ThinkingStage, extraInfo?: {
    intent?: IntentCategory;
    planSteps?: string[];
    memoriesRetrieved?: number;
    searchQueries?: string[];
    customMessage?: string;
  }) {
    let stageMessage = '';

    switch (stage) {
      case 'understanding':
        stageMessage = 'Understanding your question';
        break;
      case 'checking_memory':
        stageMessage = 'Identifying what you need';
        break;
      case 'planning':
        stageMessage = 'Analyzing your request';
        break;
      case 'searching':
        stageMessage = 'Searching the web';
        break;
      case 'generating':
        stageMessage = 'Generating a response';
        break;
      case 'finalizing':
        stageMessage = 'Finalizing the response';
        break;
      case 'idle':
      default:
        stageMessage = '';
        break;
    }

    if (extraInfo?.customMessage) {
      stageMessage = extraInfo.customMessage;
    }

    this.currentState = {
      stage,
      stageMessage,
      intent: extraInfo?.intent || this.currentState.intent,
      planSteps: extraInfo?.planSteps || this.currentState.planSteps,
      memoriesRetrieved: extraInfo?.memoriesRetrieved !== undefined ? extraInfo.memoriesRetrieved : this.currentState.memoriesRetrieved,
      searchQueries: extraInfo?.searchQueries || this.currentState.searchQueries,
      startTime: stage === 'understanding' ? Date.now() : this.currentState.startTime,
    };

    this.listeners.forEach(listener => listener(this.currentState));
  }

  public getState(): ThinkingState {
    return this.currentState;
  }

  public reset() {
    this.setStage('idle');
  }
}
