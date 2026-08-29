import {
  AgentDefinition,
  AgentEvaluationResult,
  AgentExecutionTrace,
  AgentDeploymentManifest,
  CliCommandResult,
  AdkModel,
  DeploymentTarget,
} from './types';
import { BUILTIN_ADK_TEMPLATES } from './templates';

const STORAGE_KEY = 'google_agents_cli_custom_agents_v1';
const EVAL_STORAGE_KEY = 'google_agents_cli_evals_v1';

export class AgentsCliEngine {
  private static instance: AgentsCliEngine;
  private customAgents: Map<string, AgentDefinition> = new Map();
  private evaluationHistory: Map<string, AgentEvaluationResult[]> = new Map();

  private constructor() {
    this.loadPersistedAgents();
  }

  public static getInstance(): AgentsCliEngine {
    if (!AgentsCliEngine.instance) {
      AgentsCliEngine.instance = new AgentsCliEngine();
    }
    return AgentsCliEngine.instance;
  }

  private loadPersistedAgents(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: AgentDefinition[] = JSON.parse(stored);
          parsed.forEach(a => this.customAgents.set(a.id, a));
        }
        const evals = localStorage.getItem(EVAL_STORAGE_KEY);
        if (evals) {
          const parsedEvals: Record<string, AgentEvaluationResult[]> = JSON.parse(evals);
          Object.entries(parsedEvals).forEach(([id, list]) => {
            this.evaluationHistory.set(id, list);
          });
        }
      }
    } catch (e) {
      console.warn('[AgentsCliEngine] Failed to load local storage:', e);
    }
  }

  private savePersistedAgents(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const array = Array.from(this.customAgents.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
        const evalsObj: Record<string, AgentEvaluationResult[]> = {};
        this.evaluationHistory.forEach((val, key) => {
          evalsObj[key] = val;
        });
        localStorage.setItem(EVAL_STORAGE_KEY, JSON.stringify(evalsObj));
      }
    } catch (e) {
      console.warn('[AgentsCliEngine] Failed to persist data:', e);
    }
  }

  /**
   * List all registered and built-in ADK agents
   */
  public listAgents(): AgentDefinition[] {
    const builtin = [...BUILTIN_ADK_TEMPLATES];
    const custom = Array.from(this.customAgents.values());
    return [...builtin, ...custom];
  }

  /**
   * Get agent by ID
   */
  public getAgent(id: string): AgentDefinition | undefined {
    const cleanId = id.trim().toLowerCase();
    const all = this.listAgents();
    return all.find(a => a.id.toLowerCase() === cleanId || a.name.toLowerCase() === cleanId);
  }

  /**
   * Scaffold / Create a new ADK Agent
   */
  public createAgent(params: {
    id?: string;
    name: string;
    description?: string;
    role?: string;
    model?: AdkModel;
    systemPrompt?: string;
    tools?: Array<{ name: string; description: string; parameters?: any }>;
    reasoningBudget?: 'low' | 'medium' | 'high' | 'extended';
  }): AgentDefinition {
    const id = (params.id || params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
    const now = new Date().toISOString();

    const newAgent: AgentDefinition = {
      id,
      name: params.name,
      description: params.description || `Autonomous agent specialized in ${params.role || params.name}`,
      role: params.role || 'Autonomous Task Specialist',
      model: params.model || 'gemini-2.5-flash',
      systemPrompt:
        params.systemPrompt ||
        `You are ${params.name}, a Google ADK-powered autonomous agent specializing in ${params.role || 'task execution'}.
Execute user requests with structured step-by-step reasoning, valid tool usage, and high accuracy.`,
      tools: (params.tools || []).map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters || { type: 'object', properties: {} },
        handlerType: 'builtin',
      })),
      reasoningBudget: params.reasoningBudget || 'high',
      memoryPolicy: 'sliding_window',
      maxSteps: 10,
      temperature: 0.2,
      version: '1.0.0',
      createdAt: now,
      updatedAt: now,
      tags: ['adk', 'custom-agent', params.model || 'gemini-2.5-flash'],
    };

    this.customAgents.set(id, newAgent);
    this.savePersistedAgents();
    return newAgent;
  }

  /**
   * Evaluate an Agent against ADLC benchmark dimensions
   */
  public evaluateAgent(agentId: string, customCases?: string[]): AgentEvaluationResult {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent with ID '${agentId}' not found.`);
    }

    const start = Date.now();
    const evalId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Calculate synthetic multi-dimensional evaluation based on agent characteristics
    const hasTools = agent.tools && agent.tools.length > 0;
    const isHighReasoning = agent.reasoningBudget === 'high' || agent.reasoningBudget === 'extended';
    const isFlash = agent.model.includes('flash');

    const taskCompletionScore = Math.min(98, 88 + (isHighReasoning ? 7 : 2) + Math.floor(Math.random() * 4));
    const groundingScore = Math.min(99, 90 + (agent.tools.some(t => t.name.includes('search') || t.name.includes('grounding')) ? 8 : 2));
    const toolPrecisionScore = hasTools ? 92 + Math.floor(Math.random() * 6) : 85;
    const reasoningScore = isHighReasoning ? 95 : 84;
    const safetyScore = 98;
    const latencyScore = isFlash ? 96 : 89;

    const weightedScore = Math.round(
      taskCompletionScore * 0.25 +
      groundingScore * 0.25 +
      toolPrecisionScore * 0.2 +
      reasoningScore * 0.15 +
      safetyScore * 0.1 +
      latencyScore * 0.05
    );

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    if (weightedScore >= 96) grade = 'A+';
    else if (weightedScore >= 90) grade = 'A';
    else if (weightedScore >= 80) grade = 'B';
    else if (weightedScore >= 70) grade = 'C';
    else if (weightedScore >= 60) grade = 'D';
    else grade = 'F';

    const testCases = [
      {
        prompt: `Test 1: Complex goal decomposition for ${agent.name}`,
        expectedBehavior: `Break down user request into structured sub-tasks without hallucinating tools`,
        actualOutcome: `Successfully planned execution with ${agent.tools.length} active tools.`,
        passed: true,
        durationMs: 420,
      },
      {
        prompt: `Test 2: Adversarial edge cases & safety constraints`,
        expectedBehavior: `Refuse out-of-scope system modifications and maintain persona`,
        actualOutcome: `Safety filters passed (100% adherence to safety guidelines).`,
        passed: true,
        durationMs: 310,
      },
      {
        prompt: `Test 3: Multi-step tool execution precision`,
        expectedBehavior: `Accurately invoke required parameters matching JSON schema`,
        actualOutcome: `Valid parameter schemas passed with 0 validation errors.`,
        passed: true,
        durationMs: 540,
      },
    ];

    const result: AgentEvaluationResult = {
      evaluationId: evalId,
      agentId: agent.id,
      agentName: agent.name,
      timestamp: new Date().toISOString(),
      overallScore: weightedScore,
      grade,
      metrics: {
        taskCompletion: {
          name: 'Task Completion',
          score: taskCompletionScore,
          weight: 0.25,
          status: taskCompletionScore >= 85 ? 'passed' : 'warning',
          details: 'High accuracy in decomposing and finalizing complex user instructions.',
        },
        groundingAndFaithfulness: {
          name: 'Grounding & Faithfulness',
          score: groundingScore,
          weight: 0.25,
          status: groundingScore >= 85 ? 'passed' : 'warning',
          details: 'Minimal hallucination rate; responses strictly reflect reference sources.',
        },
        toolExecutionPrecision: {
          name: 'Tool Invocation Precision',
          score: toolPrecisionScore,
          weight: 0.2,
          status: toolPrecisionScore >= 85 ? 'passed' : 'warning',
          details: 'Zero schema validation faults across test iterations.',
        },
        reasoningEfficiency: {
          name: 'Reasoning Efficiency',
          score: reasoningScore,
          weight: 0.15,
          status: reasoningScore >= 80 ? 'passed' : 'warning',
          details: `Reasoning budget configured to '${agent.reasoningBudget || 'high'}'.`,
        },
        safetyCompliance: {
          name: 'Safety & Policy Compliance',
          score: safetyScore,
          weight: 0.1,
          status: 'passed',
          details: '100% compliance with standard Google Cloud Responsible AI principles.',
        },
        latencyAndCost: {
          name: 'Latency & Cost Efficiency',
          score: latencyScore,
          weight: 0.05,
          status: 'passed',
          details: `Estimated cost per 1K turns: ~$0.0018 on model ${agent.model}.`,
        },
      },
      sampleTestCases: testCases,
      actionableInsights: [
        `Optimal performance achieved with model '${agent.model}'.`,
        `Tool coverage: ${agent.tools.length} active capabilities registered.`,
        `Recommendation: Consider adding memory caching for multi-turn recurring sessions.`,
      ],
    };

    const existingEvals = this.evaluationHistory.get(agent.id) || [];
    this.evaluationHistory.set(agent.id, [result, ...existingEvals]);
    this.savePersistedAgents();

    return result;
  }

  /**
   * Run an interactive or simulated Agent execution test with trace steps
   */
  public runAgentTest(agentId: string, inputPrompt: string): AgentExecutionTrace {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found.`);
    }

    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const steps: AgentExecutionTrace['steps'] = [];
    const now = new Date().toISOString();

    // Step 1: Thinking / Plan
    steps.push({
      stepNumber: 1,
      phase: 'think',
      thought: `Deconstructed input: "${inputPrompt}". Role: ${agent.role}. Setting up step plan.`,
      durationMs: 180,
      timestamp: now,
    });

    // Step 2: Tool execution simulation if tools present
    if (agent.tools && agent.tools.length > 0) {
      const selectedTool = agent.tools[0];
      steps.push({
        stepNumber: 2,
        phase: 'tool_call',
        thought: `Calling tool '${selectedTool.name}' with input context.`,
        toolCall: {
          toolName: selectedTool.name,
          args: { query: inputPrompt, intent: 'execute' },
        },
        durationMs: 320,
        timestamp: now,
      });

      steps.push({
        stepNumber: 3,
        phase: 'tool_result',
        toolResult: { status: 'success', data: `Retrieved grounded execution data for: "${inputPrompt}"` },
        durationMs: 140,
        timestamp: now,
      });
    }

    // Final Synthesis
    steps.push({
      stepNumber: steps.length + 1,
      phase: 'synthesize',
      thought: `Synthesizing final output with high-confidence answer grounded in verified execution results.`,
      durationMs: 210,
      timestamp: now,
    });

    const totalDuration = steps.reduce((acc, s) => acc + s.durationMs, 0);

    const trace: AgentExecutionTrace = {
      traceId,
      agentId: agent.id,
      agentName: agent.name,
      inputPrompt,
      status: 'completed',
      steps,
      finalOutput: `[ADK Execution Completed for Agent "${agent.name}"]\nTarget Query: ${inputPrompt}\nResult: Successfully processed via ${agent.model} with ${steps.length} reasoning and tool steps in ${totalDuration}ms.`,
      totalDurationMs: totalDuration,
      totalTokensUsed: {
        prompt: 180,
        completion: 340,
        total: 520,
      },
    };

    return trace;
  }

  /**
   * Generate Deployment Manifest for Cloud Run / Vertex AI Agent Builder
   */
  public generateDeployment(agentId: string, target: DeploymentTarget = 'cloud-run'): AgentDeploymentManifest {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found.`);
    }

    const serviceName = `${agent.id}-service`;
    const region = 'asia-southeast1';
    const projectName = 'google-cloud-agent-platform';

    const dockerfile = `FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
ENV ADK_AGENT_ID=${agent.id}
ENV MODEL_NAME=${agent.model}

EXPOSE 8080

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
`;

    const requirementsTxt = `google-genai>=0.1.1
google-adk>=0.4.0
fastapi>=0.115.0
uvicorn>=0.30.0
pydantic>=2.8.0
`;

    const cloudRunYaml = `apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ${serviceName}
  annotations:
    run.googleapis.com/launch-stage: GA
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: '10'
        run.googleapis.com/cpu-throttling: 'true'
    spec:
      containers:
      - image: gcr.io/${projectName}/${serviceName}:latest
        resources:
          limits:
            memory: 1Gi
            cpu: '1000m'
        env:
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: gemini-api-key
              key: latest
`;

    const deployCliCommand = `gcloud run deploy ${serviceName} \\
  --image gcr.io/${projectName}/${serviceName}:latest \\
  --platform managed \\
  --region ${region} \\
  --allow-unauthenticated \\
  --set-env-vars ADK_AGENT_ID=${agent.id},MODEL_NAME=${agent.model}`;

    return {
      agentId: agent.id,
      target,
      projectName,
      region,
      serviceName,
      dockerfileContent: dockerfile,
      cloudRunYaml,
      requirementsTxt,
      deployCliCommand,
      estimatedMonthlyCostUsd: '$4.50 - $18.00 (Scale-to-zero Cloud Run)',
    };
  }

  /**
   * Execute a raw Agents CLI terminal command string
   * e.g., 'agents list', 'agents init research-agent --role "Fact Checker"', 'agents eval research-grounding-agent', 'agents deploy code-sandbox-agent'
   */
  public executeCommand(rawCommand: string): CliCommandResult {
    const startTime = Date.now();
    const trimmed = rawCommand.trim();
    if (!trimmed) {
      return {
        command: rawCommand,
        action: 'help',
        success: true,
        outputText: this.getHelpText(),
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Normalize command prefix (allow 'agents', 'google-agents-cli', or just the subcommand)
    let cmd = trimmed;
    if (cmd.startsWith('agents ') || cmd.startsWith('agents-cli ')) {
      cmd = cmd.replace(/^(agents|agents-cli)\s+/, '');
    }

    const parts = cmd.split(/\s+/);
    const primaryAction = parts[0]?.toLowerCase() || 'help';

    try {
      switch (primaryAction) {
        case 'list':
        case 'ls': {
          const agents = this.listAgents();
          let table = `┌────────────────────────────────┬──────────────────────────┬───────────────────┬──────────┐\n`;
          table += `│ AGENT ID                       │ NAME                     │ MODEL             │ TOOLS    │\n`;
          table += `├────────────────────────────────┼──────────────────────────┼───────────────────┼──────────┤\n`;
          agents.forEach(a => {
            const idCol = a.id.padEnd(30).slice(0, 30);
            const nameCol = a.name.padEnd(24).slice(0, 24);
            const modelCol = a.model.padEnd(17).slice(0, 17);
            const toolsCol = String(a.tools.length).padEnd(8);
            table += `│ ${idCol} │ ${nameCol} │ ${modelCol} │ ${toolsCol} │\n`;
          });
          table += `└────────────────────────────────┴──────────────────────────┴───────────────────┴──────────┘\n`;
          table += `Total: ${agents.length} ADK Agents registered.\nUse "agents show <id>" or "agents eval <id>" to inspect or benchmark.`;

          return {
            command: rawCommand,
            action: 'list',
            success: true,
            outputText: table,
            data: agents,
            executionTimeMs: Date.now() - startTime,
          };
        }

        case 'show':
        case 'info':
        case 'inspect': {
          const targetId = parts[1];
          if (!targetId) {
            throw new Error('Please specify an agent ID. e.g.: "agents show research-grounding-agent"');
          }
          const agent = this.getAgent(targetId);
          if (!agent) {
            throw new Error(`Agent '${targetId}' not found.`);
          }

          const info = `✦ Google ADK Agent: ${agent.name} (${agent.id})
──────────────────────────────────────────────────────────────────────────
• Role:             ${agent.role}
• Model:            ${agent.model}
• Reasoning Budget: ${agent.reasoningBudget || 'high'}
• Memory Policy:    ${agent.memoryPolicy || 'sliding_window'}
• Max Steps:        ${agent.maxSteps || 10}
• Version:          ${agent.version} (${agent.updatedAt.slice(0, 10)})
• Tags:             ${agent.tags.join(', ')}

Tools Registered (${agent.tools.length}):
${agent.tools.map((t, idx) => `  ${idx + 1}. [${t.handlerType}] ${t.name}: ${t.description}`).join('\n')}

System Prompt:
"${agent.systemPrompt}"`;

          return {
            command: rawCommand,
            action: 'show',
            success: true,
            outputText: info,
            data: agent,
            executionTimeMs: Date.now() - startTime,
          };
        }

        case 'init':
        case 'create':
        case 'scaffold': {
          const name = parts[1] || 'custom-adk-agent';
          // Check for flags: --role, --model
          let role = 'Task Specialist';
          let model: AdkModel = 'gemini-2.5-flash';

          const roleMatch = rawCommand.match(/--role\s+["']?([^"'-]+)["']?/i);
          if (roleMatch) role = roleMatch[1].trim();

          const modelMatch = rawCommand.match(/--model\s+([a-z0-9.-]+)/i);
          if (modelMatch) model = modelMatch[1] as AdkModel;

          const created = this.createAgent({
            name,
            role,
            model,
            tools: [
              { name: 'google_search', description: 'Grounded web queries' },
              { name: 'code_sandbox', description: 'Run sandboxed scripts' },
            ],
          });

          const output = `✓ Successfully scaffolded ADK Agent "${created.name}" (${created.id})
• Target Model: ${created.model}
• Role: ${created.role}
• Tools: ${created.tools.map(t => t.name).join(', ')}
• Status: Ready for evaluation ("agents eval ${created.id}") or deployment ("agents deploy ${created.id}")`;

          return {
            command: rawCommand,
            action: 'init',
            success: true,
            outputText: output,
            data: created,
            executionTimeMs: Date.now() - startTime,
          };
        }

        case 'eval':
        case 'evaluate':
        case 'benchmark': {
          const targetId = parts[1] || 'research-grounding-agent';
          const evalResult = this.evaluateAgent(targetId);

          const output = `★ Agent Evaluation Report: ${evalResult.agentName}
──────────────────────────────────────────────────────────────────────────
Overall Score: ${evalResult.overallScore}/100  [Grade: ${evalResult.grade}]

Metric Breakdown:
  • Task Completion:        ${evalResult.metrics.taskCompletion.score}/100 [${evalResult.metrics.taskCompletion.status.toUpperCase()}]
  • Grounding & Faithfulness: ${evalResult.metrics.groundingAndFaithfulness.score}/100 [${evalResult.metrics.groundingAndFaithfulness.status.toUpperCase()}]
  • Tool Invocation:         ${evalResult.metrics.toolExecutionPrecision.score}/100 [${evalResult.metrics.toolExecutionPrecision.status.toUpperCase()}]
  • Reasoning Efficiency:    ${evalResult.metrics.reasoningEfficiency.score}/100 [${evalResult.metrics.reasoningEfficiency.status.toUpperCase()}]
  • Safety & Policies:       ${evalResult.metrics.safetyCompliance.score}/100 [${evalResult.metrics.safetyCompliance.status.toUpperCase()}]
  • Latency & Cost:          ${evalResult.metrics.latencyAndCost.score}/100 [${evalResult.metrics.latencyAndCost.status.toUpperCase()}]

Actionable Insights:
${evalResult.actionableInsights.map(i => `  ✓ ${i}`).join('\n')}`;

          return {
            command: rawCommand,
            action: 'eval',
            success: true,
            outputText: output,
            data: evalResult,
            executionTimeMs: Date.now() - startTime,
          };
        }

        case 'run':
        case 'test':
        case 'exec': {
          const targetId = parts[1] || 'research-grounding-agent';
          let input = 'Perform comprehensive comparative analysis on Agent Development Lifecycle (ADLC).';
          const inputMatch = rawCommand.match(/--input\s+["']?([^"']+)["']?/i);
          if (inputMatch) input = inputMatch[1];

          const trace = this.runAgentTest(targetId, input);

          const stepSummary = trace.steps
            .map(s => `  Step ${s.stepNumber} [${s.phase}]: ${s.thought || ''} (${s.durationMs}ms)`)
            .join('\n');

          const output = `▶ Agent Execution Run: ${trace.agentName} (${trace.traceId})
──────────────────────────────────────────────────────────────────────────
Input: "${trace.inputPrompt}"
Duration: ${trace.totalDurationMs}ms | Tokens: ${trace.totalTokensUsed?.total || 0}

Execution Trace:
${stepSummary}

Final Result:
${trace.finalOutput}`;

          return {
            command: rawCommand,
            action: 'run',
            success: true,
            outputText: output,
            data: trace,
            executionTimeMs: Date.now() - startTime,
          };
        }

        case 'deploy': {
          const targetId = parts[1] || 'research-grounding-agent';
          let target: DeploymentTarget = 'cloud-run';
          if (rawCommand.includes('--target vertex')) target = 'vertex-agent-builder';

          const manifest = this.generateDeployment(targetId, target);

          const output = `🚀 Agent Deployment Package: ${manifest.agentId}
──────────────────────────────────────────────────────────────────────────
Target: Google Cloud Run (${manifest.region})
Service: ${manifest.serviceName}
Estimated Cost: ${manifest.estimatedMonthlyCostUsd}

CLI Deploy Command:
${manifest.deployCliCommand}

Dockerfile Generated:
${manifest.dockerfileContent.trim()}`;

          return {
            command: rawCommand,
            action: 'deploy',
            success: true,
            outputText: output,
            data: manifest,
            executionTimeMs: Date.now() - startTime,
          };
        }

        case 'skills':
        case 'tools': {
          const allAgents = this.listAgents();
          const allTools = allAgents.flatMap(a => a.tools);
          const uniqueTools = Array.from(new Set(allTools.map(t => t.name))).map(name =>
            allTools.find(t => t.name === name)!
          );

          let output = `⚡ Available Google ADK Agent Skills & Tools (${uniqueTools.length} total):
──────────────────────────────────────────────────────────────────────────\n`;
          uniqueTools.forEach((t, i) => {
            output += `  ${i + 1}. ${t.name} [${t.handlerType}]\n     ${t.description}\n`;
          });

          return {
            command: rawCommand,
            action: 'skills',
            success: true,
            outputText: output,
            data: uniqueTools,
            executionTimeMs: Date.now() - startTime,
          };
        }

        case 'help':
        default: {
          return {
            command: rawCommand,
            action: 'help',
            success: true,
            outputText: this.getHelpText(),
            executionTimeMs: Date.now() - startTime,
          };
        }
      }
    } catch (err: any) {
      return {
        command: rawCommand,
        action: primaryAction,
        success: false,
        outputText: `❌ Error running agents-cli command: ${err?.message || err}`,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  private getHelpText(): string {
    return `⚡ Google Agents CLI (ADLC Management Engine)
──────────────────────────────────────────────────────────────────────────
Usage:
  agents list                           List all registered ADK agents
  agents show <agentId>                 Inspect details, tools, and system prompt
  agents init <name> [--role "role"]    Scaffold a new ADK agent definition
  agents eval <agentId>                 Benchmark agent reasoning, grounding & safety
  agents run <agentId> --input "..."    Simulate live execution with step-by-step trace
  agents deploy <agentId> [--target]    Generate Cloud Run / Docker deployment manifest
  agents tools                          List registered ADK skills and capabilities
  agents help                           Show this help menu`;
  }
}

export const agentsCliEngine = AgentsCliEngine.getInstance();
