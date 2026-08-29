/**
 * Ruflo EventBus & Inter-Agent Message Broker
 * Handles agent-to-agent messaging, swarm broadcast, and telemetry events.
 */

import { AgentMessage, RufloProgressEvent } from './types';

export type MessageHandler = (message: AgentMessage) => void;
export type TelemetryHandler = (event: RufloProgressEvent) => void;

export class RufloEventBus {
  private static instance: RufloEventBus;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private broadcastHandlers: Set<MessageHandler> = new Set();
  private telemetryHandlers: Set<TelemetryHandler> = new Set();
  private messageHistory: AgentMessage[] = [];
  private telemetryHistory: RufloProgressEvent[] = [];

  public static getInstance(): RufloEventBus {
    if (!RufloEventBus.instance) {
      RufloEventBus.instance = new RufloEventBus();
    }
    return RufloEventBus.instance;
  }

  /**
   * Subscribe an agent to receive direct messages addressed to its ID.
   */
  public subscribeAgent(agentId: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(agentId)) {
      this.messageHandlers.set(agentId, new Set());
    }
    this.messageHandlers.get(agentId)!.add(handler);

    return () => {
      this.messageHandlers.get(agentId)?.delete(handler);
    };
  }

  /**
   * Subscribe to all swarm broadcast messages.
   */
  public subscribeBroadcast(handler: MessageHandler): () => void {
    this.broadcastHandlers.add(handler);
    return () => {
      this.broadcastHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to all telemetry progress events.
   */
  public subscribeTelemetry(handler: TelemetryHandler): () => void {
    this.telemetryHandlers.add(handler);
    return () => {
      this.telemetryHandlers.delete(handler);
    };
  }

  /**
   * Send a direct or broadcast message between agents.
   */
  public sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): AgentMessage {
    const fullMessage: AgentMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };

    this.messageHistory.push(fullMessage);
    if (this.messageHistory.length > 500) {
      this.messageHistory.shift();
    }

    if (fullMessage.toAgentId) {
      // Direct message
      const handlers = this.messageHandlers.get(fullMessage.toAgentId);
      if (handlers) {
        handlers.forEach(fn => {
          try {
            fn(fullMessage);
          } catch (e) {
            console.error(`Error in message handler for agent ${fullMessage.toAgentId}:`, e);
          }
        });
      }
    } else {
      // Broadcast to all agents
      this.broadcastHandlers.forEach(fn => {
        try {
          fn(fullMessage);
        } catch (e) {
          console.error('Error in broadcast message handler:', e);
        }
      });
      // Also deliver to individual agent handlers
      this.messageHandlers.forEach(handlerSet => {
        handlerSet.forEach(fn => {
          try {
            fn(fullMessage);
          } catch (e) {
            console.error('Error in agent handler during broadcast:', e);
          }
        });
      });
    }

    // Emit a telemetry event for the message
    this.emitTelemetry({
      type: 'agent_message',
      agentId: fullMessage.fromAgentId,
      message: `[${fullMessage.fromAgentId} ➔ ${fullMessage.toAgentId || 'ALL'}]: ${fullMessage.content.slice(0, 100)}`,
      details: fullMessage,
    });

    return fullMessage;
  }

  /**
   * Emit a telemetry progress event.
   */
  public emitTelemetry(event: Omit<RufloProgressEvent, 'id' | 'timestamp'>): RufloProgressEvent {
    const fullEvent: RufloProgressEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    this.telemetryHistory.push(fullEvent);
    if (this.telemetryHistory.length > 1000) {
      this.telemetryHistory.shift();
    }

    this.telemetryHandlers.forEach(fn => {
      try {
        fn(fullEvent);
      } catch (e) {
        console.error('Error in telemetry handler:', e);
      }
    });

    return fullEvent;
  }

  public getMessageHistory(): AgentMessage[] {
    return [...this.messageHistory];
  }

  public getTelemetryHistory(): RufloProgressEvent[] {
    return [...this.telemetryHistory];
  }

  public clear(): void {
    this.messageHistory = [];
    this.telemetryHistory = [];
  }
}

export const eventBus = RufloEventBus.getInstance();
