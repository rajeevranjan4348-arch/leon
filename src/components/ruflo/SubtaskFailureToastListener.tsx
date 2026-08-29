import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { eventBus } from '@/lib/ruflo/EventBus';
import { RufloProgressEvent } from '@/lib/ruflo/types';
import { AlertOctagon, Terminal } from 'lucide-react';

/**
 * SubtaskFailureToastListener
 * Subscribes to Ruflo Swarm telemetry and alerts the user whenever a
 * high-priority or critical agent subtask fails, providing an immediate
 * 'Inspect' button to open the activity log.
 */
export const SubtaskFailureToastListener: React.FC = () => {
  useEffect(() => {
    const unsub = eventBus.subscribeTelemetry((evt: RufloProgressEvent) => {
      if (evt.type === 'subtask_failed') {
        const details = evt.details || {};
        const priority = details.priority || 'high';
        const isHighPriority = priority === 'high' || priority === 'critical';

        // Only alert for high-priority or critical subtasks
        if (isHighPriority) {
          const subtaskTitle = details.title || evt.subtaskId || 'Agent Subtask';
          const agentName = evt.agentType ? evt.agentType.replace('-', ' ') : 'Swarm agent';
          const errorMsg = details.error || evt.message || 'Execution encountered an unexpected failure.';

          toast.error(`High-Priority Subtask Failed: ${subtaskTitle}`, {
            description: `${agentName.toUpperCase()} — ${errorMsg}`,
            duration: 9000,
            icon: <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />,
            action: {
              label: 'Inspect',
              onClick: () => {
                window.dispatchEvent(new CustomEvent('open_agent_activity_log', {
                  detail: {
                    subtaskId: evt.subtaskId,
                    event: evt,
                  }
                }));
              },
            },
          });
        }
      }
    });

    return () => {
      unsub();
    };
  }, []);

  return null;
};
