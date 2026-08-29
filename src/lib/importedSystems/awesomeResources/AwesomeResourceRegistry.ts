import { AwesomeCategory, AwesomeResourceItem, AwesomeTopicList } from './types';

/**
 * AwesomeResourceRegistry
 * Curated knowledge & developer reference catalog based on sindresorhus/awesome.
 */
export class AwesomeResourceRegistry {
  private static instance: AwesomeResourceRegistry;
  private resources = new Map<string, AwesomeResourceItem>();
  private topics = new Map<string, AwesomeTopicList>();

  private constructor() {
    this.seedCatalog();
  }

  public static getInstance(): AwesomeResourceRegistry {
    if (!AwesomeResourceRegistry.instance) {
      AwesomeResourceRegistry.instance = new AwesomeResourceRegistry();
    }
    return AwesomeResourceRegistry.instance;
  }

  private seedCatalog(): void {
    const rawItems: AwesomeResourceItem[] = [
      // AI & ML
      {
        id: 'awesome-ai-agents',
        name: 'Awesome AI Agents',
        category: 'ai-machine-learning',
        subcategory: 'Autonomous Agents',
        description: 'Curated list of autonomous AI agents, multi-agent frameworks, and research papers.',
        url: 'https://github.com/e2b-dev/awesome-ai-agents',
        githubRepo: 'e2b-dev/awesome-ai-agents',
        tags: ['ai', 'agents', 'autonomous', 'llm', 'multi-agent'],
        language: 'Python/TypeScript',
        isCurated: true,
      },
      {
        id: 'awesome-llm-apps',
        name: 'Awesome LLM Apps',
        category: 'ai-machine-learning',
        subcategory: 'LLM Applications',
        description: 'Build awesome LLM apps with LangChain, LlamaIndex, LiteLLM, Ollama, and agent frameworks.',
        url: 'https://github.com/Shubhamsaboo/awesome-llm-apps',
        githubRepo: 'Shubhamsaboo/awesome-llm-apps',
        tags: ['llm', 'rag', 'genai', 'python', 'langchain'],
        language: 'Python',
        isCurated: true,
      },
      {
        id: 'awesome-mcp-servers',
        name: 'Awesome MCP Servers',
        category: 'ai-machine-learning',
        subcategory: 'Model Context Protocol',
        description: 'Curated list of Model Context Protocol (MCP) servers, tools, and integrations for AI models.',
        url: 'https://github.com/punkpeye/awesome-mcp-servers',
        githubRepo: 'punkpeye/awesome-mcp-servers',
        tags: ['mcp', 'tools', 'context-protocol', 'ai-integration'],
        language: 'TypeScript/Python',
        isCurated: true,
      },
      {
        id: 'awesome-generative-ai',
        name: 'Awesome Generative AI',
        category: 'ai-machine-learning',
        subcategory: 'Generative Models',
        description: 'A curated list of modern Generative Artificial Intelligence tools, models, and platforms.',
        url: 'https://github.com/steven2358/awesome-generative-ai',
        githubRepo: 'steven2358/awesome-generative-ai',
        tags: ['generative-ai', 'diffusers', 'gemini', 'gpt', 'flux'],
        language: 'Multi',
        isCurated: true,
      },

      // Front-End Development
      {
        id: 'awesome-react',
        name: 'Awesome React',
        category: 'front-end-development',
        subcategory: 'React Ecosystem',
        description: 'A collection of awesome things regarding React ecosystem (hooks, state management, components, SSR).',
        url: 'https://github.com/enaqx/awesome-react',
        githubRepo: 'enaqx/awesome-react',
        tags: ['react', 'frontend', 'javascript', 'typescript', 'ui'],
        language: 'TypeScript/JavaScript',
        isCurated: true,
      },
      {
        id: 'awesome-tailwindcss',
        name: 'Awesome Tailwind CSS',
        category: 'front-end-development',
        subcategory: 'CSS & Styling',
        description: 'Awesome things related to Tailwind CSS, plugins, component kits, and utility-first styling.',
        url: 'https://github.com/aniftyco/awesome-tailwindcss',
        githubRepo: 'aniftyco/awesome-tailwindcss',
        tags: ['tailwindcss', 'css', 'design-system', 'styling'],
        language: 'CSS',
        isCurated: true,
      },
      {
        id: 'awesome-vite',
        name: 'Awesome Vite',
        category: 'front-end-development',
        subcategory: 'Build Tools',
        description: 'Curated list of delightful Vite plugins, templates, and developer tooling.',
        url: 'https://github.com/vitejs/awesome-vite',
        githubRepo: 'vitejs/awesome-vite',
        tags: ['vite', 'bundler', 'esm', 'build-tool', 'dx'],
        language: 'JavaScript',
        isCurated: true,
      },

      // Back-End Development
      {
        id: 'awesome-nodejs',
        name: 'Awesome Node.js',
        category: 'back-end-development',
        subcategory: 'Node.js & Runtime',
        description: 'Delightful Node.js packages and resources for server development.',
        url: 'https://github.com/sindresorhus/awesome-nodejs',
        githubRepo: 'sindresorhus/awesome-nodejs',
        tags: ['nodejs', 'backend', 'express', 'server', 'typescript'],
        language: 'JavaScript/TypeScript',
        isCurated: true,
      },
      {
        id: 'awesome-fastapi',
        name: 'Awesome FastAPI',
        category: 'back-end-development',
        subcategory: 'Python APIs',
        description: 'A curated list of awesome things related to FastAPI, async Python, and OpenAPI.',
        url: 'https://github.com/mjhea0/awesome-fastapi',
        githubRepo: 'mjhea0/awesome-fastapi',
        tags: ['fastapi', 'python', 'async', 'api', 'openapi'],
        language: 'Python',
        isCurated: true,
      },

      // Databases
      {
        id: 'awesome-postgres',
        name: 'Awesome PostgreSQL',
        category: 'databases',
        subcategory: 'Relational DB',
        description: 'A curated list of awesome PostgreSQL software, libraries, tools and resources.',
        url: 'https://github.com/dhamaniasad/awesome-postgres',
        githubRepo: 'dhamaniasad/awesome-postgres',
        tags: ['postgres', 'sql', 'database', 'indexing', 'cloudsql'],
        language: 'SQL/C',
        isCurated: true,
      },
      {
        id: 'awesome-vector-databases',
        name: 'Awesome Vector Databases',
        category: 'databases',
        subcategory: 'Vector & Embeddings',
        description: 'Vector databases, similarity search engines, ANN algorithms, and embeddings storage.',
        url: 'https://github.com/currents-dev/awesome-vector-databases',
        githubRepo: 'currents-dev/awesome-vector-databases',
        tags: ['vector-db', 'rag', 'embeddings', 'similarity-search', 'ai'],
        language: 'Multi',
        isCurated: true,
      },

      // Security
      {
        id: 'awesome-security',
        name: 'Awesome Security',
        category: 'security',
        subcategory: 'Application Security',
        description: 'A collection of awesome software, libraries, documents, books, and resources regarding security.',
        url: 'https://github.com/sbilly/awesome-security',
        githubRepo: 'sbilly/awesome-security',
        tags: ['security', 'appsec', 'owasp', 'penetration-testing', 'hardening'],
        language: 'Multi',
        isCurated: true,
      },
      {
        id: 'awesome-threat-intelligence',
        name: 'Awesome Threat Intelligence',
        category: 'security',
        subcategory: 'Threat Detection',
        description: 'A curated list of Awesome Threat Intelligence sources, formats, and tools.',
        url: 'https://github.com/hslatman/awesome-threat-intelligence',
        githubRepo: 'hslatman/awesome-threat-intelligence',
        tags: ['threat-intelligence', 'cve', 'mitre', 'cybersecurity'],
        language: 'Multi',
        isCurated: true,
      },

      // DevOps & Cloud
      {
        id: 'awesome-docker',
        name: 'Awesome Docker',
        category: 'devops-cloud',
        subcategory: 'Containers',
        description: 'Curated list of Docker resources and projects for modern containerized development.',
        url: 'https://github.com/veggiemonk/awesome-docker',
        githubRepo: 'veggiemonk/awesome-docker',
        tags: ['docker', 'containers', 'cloud-run', 'devops', 'kubernetes'],
        language: 'Multi',
        isCurated: true,
      },
      {
        id: 'awesome-actions',
        name: 'Awesome GitHub Actions',
        category: 'devops-cloud',
        subcategory: 'CI/CD',
        description: 'A curated list of awesome GitHub Actions and resources for CI/CD pipelines.',
        url: 'https://github.com/sdras/awesome-actions',
        githubRepo: 'sdras/awesome-actions',
        tags: ['github-actions', 'cicd', 'automation', 'devops'],
        language: 'YAML',
        isCurated: true,
      },

      // Mobile
      {
        id: 'awesome-android',
        name: 'Awesome Android',
        category: 'mobile',
        subcategory: 'Android Development',
        description: 'A curated list of awesome Android libraries and resources (Kotlin, Jetpack Compose, Coroutines).',
        url: 'https://github.com/JStumpp/awesome-android',
        githubRepo: 'JStumpp/awesome-android',
        tags: ['android', 'kotlin', 'compose', 'mobile', 'intents'],
        language: 'Kotlin',
        isCurated: true,
      },

      // Testing & QA
      {
        id: 'awesome-testing',
        name: 'Awesome Testing',
        category: 'testing-qa',
        subcategory: 'Test Automation',
        description: 'A curated list of testing software, frameworks and resources (Vitest, Playwright, Jest).',
        url: 'https://github.com/TheJambo/awesome-testing',
        githubRepo: 'TheJambo/awesome-testing',
        tags: ['testing', 'qa', 'vitest', 'jest', 'playwright', 'unit-test'],
        language: 'Multi',
        isCurated: true,
      },

      // Tools & Productivity
      {
        id: 'free-for-dev',
        name: 'Free for Developers',
        category: 'tools-productivity',
        subcategory: 'Free Tiers',
        description: 'A list of SaaS, PaaS and IaaS systems offering free tiers for developers.',
        url: 'https://github.com/ripienaar/free-for-dev',
        githubRepo: 'ripienaar/free-for-dev',
        tags: ['free-tier', 'hosting', 'database', 'cloud', 'developer-tools'],
        language: 'Markdown',
        isCurated: true,
      },
      {
        id: 'public-apis-list',
        name: 'Public APIs Directory',
        category: 'tools-productivity',
        subcategory: 'Web APIs',
        description: 'A collective list of free APIs for use in software and web development.',
        url: 'https://github.com/public-apis/public-apis',
        githubRepo: 'public-apis/public-apis',
        tags: ['api', 'public-apis', 'rest', 'http', 'free-apis'],
        language: 'Markdown',
        isCurated: true,
      },
    ];

    rawItems.forEach(item => {
      this.resources.set(item.id, item);
    });
  }

  public getResource(id: string): AwesomeResourceItem | undefined {
    return this.resources.get(id);
  }

  public getAllResources(): AwesomeResourceItem[] {
    return Array.from(this.resources.values());
  }

  public getByCategory(category: AwesomeCategory): AwesomeResourceItem[] {
    return Array.from(this.resources.values()).filter(r => r.category === category);
  }

  public getByTag(tag: string): AwesomeResourceItem[] {
    const lower = tag.toLowerCase();
    return Array.from(this.resources.values()).filter(r =>
      r.tags.some(t => t.toLowerCase() === lower)
    );
  }
}

export const awesomeResourceRegistry = AwesomeResourceRegistry.getInstance();
