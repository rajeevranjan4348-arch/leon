import { AgentDefinition } from './types';

export const BUILTIN_ADK_TEMPLATES: AgentDefinition[] = [
  {
    id: 'research-grounding-agent',
    name: 'Research & Grounding Agent',
    description: 'Autonomous research agent with Google Search grounding, multi-source verification, and citation synthesis.',
    role: 'Lead Deep Research & Fact Verification Specialist',
    model: 'gemini-2.5-flash',
    systemPrompt: `You are an expert Autonomous Research Agent built on the Google Agent Development Kit (ADK).
Your mission is to perform comprehensive, evidence-grounded research across real-time web sources.
Always verify claims across multiple independent references, identify conflicting points, and provide verifiable citations for every factual statement.
Structure outputs cleanly with Executive Summaries, Key Findings, Comparative Tables, and Verified References.`,
    tools: [
      {
        name: 'google_search_grounding',
        description: 'Performs live web queries with semantic ranking and domain filtering.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Target search query' },
            freshness: { type: 'string', enum: ['day', 'week', 'month', 'year'] }
          },
          required: ['query']
        },
        handlerType: 'builtin'
      },
      {
        name: 'extract_web_article',
        description: 'Scrapes and extracts key text and metadata from a given URL.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Source webpage URL' }
          },
          required: ['url']
        },
        handlerType: 'builtin'
      }
    ],
    reasoningBudget: 'high',
    memoryPolicy: 'semantic_rag',
    maxSteps: 12,
    temperature: 0.2,
    version: '1.2.0',
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z',
    tags: ['adk', 'research', 'search', 'grounding', 'fact-check']
  },
  {
    id: 'code-sandbox-agent',
    name: 'Code & Sandbox Agent',
    description: 'Coding agent capable of multi-file analysis, sandboxed execution, syntax validation, and unit test generation.',
    role: 'Senior Full-Stack Code Architect & Sandbox Test Engineer',
    model: 'gemini-2.5-flash',
    systemPrompt: `You are a Senior Autonomous Coding Agent adhering to Google ADLC standards.
You analyze user coding requests, produce clean, typed, modular code, evaluate edge cases, and execute test runs in isolated execution sandboxes.
Never use unvetted packages. Ensure zero build errors and self-healing error analysis.`,
    tools: [
      {
        name: 'execute_sandbox_code',
        description: 'Runs JavaScript/TypeScript/Python in a sandboxed runtime environment.',
        parameters: {
          type: 'object',
          properties: {
            language: { type: 'string', enum: ['typescript', 'javascript', 'python'] },
            code: { type: 'string', description: 'Source code to evaluate' }
          },
          required: ['language', 'code']
        },
        handlerType: 'code_sandbox'
      },
      {
        name: 'lint_and_typecheck',
        description: 'Performs AST validation, lint rules checking, and type inference validation.',
        parameters: {
          type: 'object',
          properties: {
            files: { type: 'array', items: { type: 'string' } }
          },
          required: ['files']
        },
        handlerType: 'builtin'
      }
    ],
    reasoningBudget: 'high',
    memoryPolicy: 'sliding_window',
    maxSteps: 15,
    temperature: 0.1,
    version: '2.0.0',
    createdAt: '2026-08-05T00:00:00Z',
    updatedAt: '2026-08-22T00:00:00Z',
    tags: ['adk', 'coding', 'typescript', 'sandbox', 'developer']
  },
  {
    id: 'multimodal-media-agent',
    name: 'Multimodal Media Agent',
    description: 'Generative image, storyboard, audio, and video creation agent with prompt expansion and style consistency.',
    role: 'Creative Generative Director & Storyboard Architect',
    model: 'gemini-2.5-flash',
    systemPrompt: `You are a Creative Multimodal AI Director built with Google ADK.
You transform concepts into detailed image generation prompts (Imagen 3 / Flux) and multi-scene video storyboard scripts with camera movements, lighting, and sound cues.`,
    tools: [
      {
        name: 'generate_image_asset',
        description: 'Synthesizes high-fidelity visual assets based on curated visual prompts.',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            aspectRatio: { type: 'string', enum: ['1:1', '16:9', '9:16', '4:3'] }
          },
          required: ['prompt']
        },
        handlerType: 'api'
      },
      {
        name: 'create_video_storyboard',
        description: 'Builds timed scene sequences with script dialogues and visual prompts.',
        parameters: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            scenesCount: { type: 'number' }
          },
          required: ['topic']
        },
        handlerType: 'builtin'
      }
    ],
    reasoningBudget: 'medium',
    memoryPolicy: 'short_term',
    maxSteps: 8,
    temperature: 0.7,
    version: '1.1.0',
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: '2026-08-25T00:00:00Z',
    tags: ['adk', 'multimodal', 'image', 'video', 'creative']
  },
  {
    id: 'customer-support-agent',
    name: 'Customer Support & Triage Agent',
    description: 'Customer triage agent with intent categorization, policy lookup, sentiment tracking, and escalation routing.',
    role: 'Customer Success & Technical Support Specialist',
    model: 'gemini-1.5-flash',
    systemPrompt: `You are an empathetic, rapid-response Customer Support Agent.
Answer user inquiries accurately based on company documentation, handle edge cases politely, and route complex requests to tier-2 human escalations when required.`,
    tools: [
      {
        name: 'knowledge_base_search',
        description: 'Searches internal FAQ and product policy documentation.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        },
        handlerType: 'builtin'
      },
      {
        name: 'escalate_ticket',
        description: 'Creates an escalated support ticket with summary and user sentiment.',
        parameters: {
          type: 'object',
          properties: {
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            summary: { type: 'string' }
          },
          required: ['priority', 'summary']
        },
        handlerType: 'api'
      }
    ],
    reasoningBudget: 'low',
    memoryPolicy: 'sliding_window',
    maxSteps: 6,
    temperature: 0.3,
    version: '1.0.4',
    createdAt: '2026-08-12T00:00:00Z',
    updatedAt: '2026-08-24T00:00:00Z',
    tags: ['adk', 'support', 'triage', 'customer-service']
  },
  {
    id: 'data-analyst-sql-agent',
    name: 'Data Analyst & SQL Agent',
    description: 'Translates natural questions to SQL, validates query safety, computes statistical metrics, and generates visualizations.',
    role: 'Lead Business Intelligence & Quantitative Data Scientist',
    model: 'gemini-2.5-flash',
    systemPrompt: `You are a Data Analytics Agent built on Google ADK.
Convert business questions into optimized, safe SQL queries, run aggregations, calculate trends, and explain findings with actionable business recommendations.`,
    tools: [
      {
        name: 'execute_sql_query',
        description: 'Runs read-only SQL queries against analytics data warehouse.',
        parameters: {
          type: 'object',
          properties: {
            sqlQuery: { type: 'string' }
          },
          required: ['sqlQuery']
        },
        handlerType: 'api'
      },
      {
        name: 'generate_chart_spec',
        description: 'Generates declarative JSON chart specifications (bar, line, scatter, pie).',
        parameters: {
          type: 'object',
          properties: {
            chartType: { type: 'string', enum: ['line', 'bar', 'pie', 'scatter'] },
            data: { type: 'array', items: { type: 'object' } }
          },
          required: ['chartType', 'data']
        },
        handlerType: 'builtin'
      }
    ],
    reasoningBudget: 'high',
    memoryPolicy: 'persistent',
    maxSteps: 10,
    temperature: 0.1,
    version: '1.3.1',
    createdAt: '2026-08-15T00:00:00Z',
    updatedAt: '2026-08-26T00:00:00Z',
    tags: ['adk', 'data', 'sql', 'analytics', 'charts']
  }
];
