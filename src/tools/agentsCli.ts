import { agentsCliEngine } from '@/lib/agentsCli/AgentsCliEngine';
import { ToolResult } from '@/controllers/appController';

export const AGENTS_CLI_TOOL_NAME = 'agents_cli';

export const AGENTS_CLI_TOOL_SCHEMA = {
  name: AGENTS_CLI_TOOL_NAME,
  description:
    'Google Agents CLI tool for managing the Agent Development Lifecycle (ADLC). Allows scaffolding ADK agents, evaluating reasoning/grounding/safety metrics, running interactive trace simulations, and generating Google Cloud Run / Vertex AI deployment manifests.',
  parameters: {
    type: 'OBJECT',
    properties: {
      action: {
        type: 'STRING',
        enum: ['list', 'show', 'init', 'eval', 'run', 'deploy', 'tools', 'execute_command'],
        description: 'The agents-cli action to execute.',
      },
      agentId: {
        type: 'STRING',
        description: 'Target agent identifier (e.g. research-grounding-agent, code-sandbox-agent, multimodal-media-agent, customer-support-agent, data-analyst-sql-agent).',
      },
      command: {
        type: 'STRING',
        description: 'Raw agents-cli command string (e.g. "agents eval research-grounding-agent" or "agents init my-agent --role Analyst").',
      },
      name: {
        type: 'STRING',
        description: 'Name for a new agent during init/scaffold.',
      },
      role: {
        type: 'STRING',
        description: 'Role or specialty description for new agent.',
      },
      input: {
        type: 'STRING',
        description: 'Input prompt to execute during test/run action.',
      },
      target: {
        type: 'STRING',
        enum: ['cloud-run', 'vertex-agent-builder', 'docker', 'fastapi'],
        description: 'Deployment target platform.',
      },
    },
    required: ['action'],
  },
};

export interface AgentsCliToolArgs {
  action: 'list' | 'show' | 'init' | 'eval' | 'run' | 'deploy' | 'tools' | 'execute_command';
  agentId?: string;
  command?: string;
  name?: string;
  role?: string;
  input?: string;
  target?: 'cloud-run' | 'vertex-agent-builder' | 'docker' | 'fastapi';
}

export async function executeAgentsCliTool(args: AgentsCliToolArgs): Promise<ToolResult> {
  try {
    if (args.command) {
      const res = agentsCliEngine.executeCommand(args.command);
      return {
        success: res.success,
        action: AGENTS_CLI_TOOL_NAME,
        message: res.outputText,
        value: res.data,
      };
    }

    switch (args.action) {
      case 'list': {
        const res = agentsCliEngine.executeCommand('agents list');
        return {
          success: true,
          action: AGENTS_CLI_TOOL_NAME,
          message: res.outputText,
          value: res.data,
        };
      }
      case 'show': {
        const id = args.agentId || 'research-grounding-agent';
        const res = agentsCliEngine.executeCommand(`agents show ${id}`);
        return {
          success: res.success,
          action: AGENTS_CLI_TOOL_NAME,
          message: res.outputText,
          value: res.data,
        };
      }
      case 'init': {
        const name = args.name || 'custom-adk-agent';
        const role = args.role ? ` --role "${args.role}"` : '';
        const res = agentsCliEngine.executeCommand(`agents init ${name}${role}`);
        return {
          success: res.success,
          action: AGENTS_CLI_TOOL_NAME,
          message: res.outputText,
          value: res.data,
        };
      }
      case 'eval': {
        const id = args.agentId || 'research-grounding-agent';
        const res = agentsCliEngine.executeCommand(`agents eval ${id}`);
        return {
          success: res.success,
          action: AGENTS_CLI_TOOL_NAME,
          message: res.outputText,
          value: res.data,
        };
      }
      case 'run': {
        const id = args.agentId || 'research-grounding-agent';
        const inputArg = args.input ? ` --input "${args.input}"` : '';
        const res = agentsCliEngine.executeCommand(`agents run ${id}${inputArg}`);
        return {
          success: res.success,
          action: AGENTS_CLI_TOOL_NAME,
          message: res.outputText,
          value: res.data,
        };
      }
      case 'deploy': {
        const id = args.agentId || 'research-grounding-agent';
        const target = args.target ? ` --target ${args.target}` : '';
        const res = agentsCliEngine.executeCommand(`agents deploy ${id}${target}`);
        return {
          success: res.success,
          action: AGENTS_CLI_TOOL_NAME,
          message: res.outputText,
          value: res.data,
        };
      }
      case 'tools': {
        const res = agentsCliEngine.executeCommand('agents tools');
        return {
          success: true,
          action: AGENTS_CLI_TOOL_NAME,
          message: res.outputText,
          value: res.data,
        };
      }
      case 'execute_command':
      default: {
        const raw = args.command || 'agents help';
        const res = agentsCliEngine.executeCommand(raw);
        return {
          success: res.success,
          action: AGENTS_CLI_TOOL_NAME,
          message: res.outputText,
          value: res.data,
        };
      }
    }
  } catch (err: any) {
    return {
      success: false,
      action: AGENTS_CLI_TOOL_NAME,
      error: err?.message || 'Failed to execute agents-cli operation',
    };
  }
}
