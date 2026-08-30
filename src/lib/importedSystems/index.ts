import { unifiedMemoryEngine, UnifiedMemoryEngine } from './unifiedMemory/UnifiedMemoryEngine';
import { standardizedMemoryWrapper, StandardizedMemoryPersistenceWrapper } from './unifiedMemory/StandardizedMemoryPersistenceWrapper';
import { browserAgentEngine, BrowserAgentEngine } from './browserAgent/BrowserAgentEngine';
import { cybersecurityAgentSkills, CybersecurityAgentSkills } from './cybersecurity/CybersecurityAgentSkills';
import { scientificResearchEngine, ScientificResearchEngine } from './scientificResearch/ScientificResearchEngine';
import { diagramGenerationEngine, DiagramGenerationEngine } from './diagramEngine/DiagramGenerationEngine';
import { harnessEngineeringEngine, HarnessEngineeringEngine } from './harnessEngineering/HarnessEngineeringEngine';
import { publicAPIRegistry, publicAPIRouter, publicAPIService } from './publicApis';
import { agencyOrchestrator, agencyAgentRegistry, AgencyOrchestrator, AgencyAgentRegistry } from './agencyAgents';
import { awesomeResourceRegistry, awesomeResourceDiscoveryService } from './awesomeResources';
import { scraplingCrawlerEngine, ScraplingExtractor } from './scrapling';
import { freeDevRegistry, freeDevDiscoveryService } from './freeForDev';
import { ollamaClientService } from './ollama';
import { langflowGraphEngine } from './langflow';
import { mcpToolHubRegistry } from './mcpHub';
import { openDesignEngine } from './openDesign';
import { awesomeLLMPatternsEngine } from './awesomeLlmApps';
import { openHandsCodingEngine } from './openHands';
import { unifiedSystemRouter } from './unifiedRouter';
import { RufloOrchestrator } from '../ruflo/RufloOrchestrator';
import { LettaAgentEngine } from '../letta/LettaAgentEngine';
import { privacyAlignEngine } from '../privacy/PrivacyAlignEngine';
import { fluxInferenceEngine } from '../imageGeneration/FluxInferenceEngine';
import { androidControlEngine } from '../androidControl/AndroidControlEngine';

import { deepSeekAgentRuntime, DeepSeekAgentRuntime, executeWithDeepSeekHarness } from '../deepseekHarness';
import { agentReachEngine, AgentReachEngine, AgentReachDoctor, agentReachRouter } from '../agentReach';

export * from './agencyAgents';
export * from './awesomeResources';
export * from './scrapling';
export * from './freeForDev';
export * from './ollama';
export * from './langflow';
export * from './mcpHub';
export * from './openDesign';
export * from './awesomeLlmApps';
export * from './openHands';
export * from './unifiedRouter';

export * from './unifiedMemory/types';
export * from './unifiedMemory/UnifiedMemoryEngine';
export * from './unifiedMemory/StandardizedMemoryPersistenceWrapper';

export * from './browserAgent/types';
export * from './browserAgent/BrowserAgentEngine';

export * from './cybersecurity/types';
export * from './cybersecurity/CybersecurityAgentSkills';

export * from './scientificResearch/types';
export * from './scientificResearch/ScientificResearchEngine';

export * from './diagramEngine/types';
export * from './diagramEngine/DiagramGenerationEngine';

export * from './harnessEngineering/types';
export * from './harnessEngineering/HarnessEngineeringEngine';

export * from './publicApis';
export * from '../../hooks/useUnifiedMemory';
export * from '../privacy/PrivacyAlignEngine';
export * from '../imageGeneration/FluxInferenceEngine';
export * from '../agentReach';

export class ImportedSystemsFacade {
  public memory = unifiedMemoryEngine;
  public standardizedMemory = standardizedMemoryWrapper;
  public browser = browserAgentEngine;
  public cybersecurity = cybersecurityAgentSkills;
  public scientific = scientificResearchEngine;
  public diagram = diagramGenerationEngine;
  public harness = harnessEngineeringEngine;
  public publicApis = publicAPIService;
  public publicApiRegistry = publicAPIRegistry;
  public publicApiRouter = publicAPIRouter;
  public agency = agencyOrchestrator;
  public agencyRegistry = agencyAgentRegistry;
  public awesome = awesomeResourceDiscoveryService;
  public awesomeRegistry = awesomeResourceRegistry;
  public scrapling = scraplingCrawlerEngine;
  public scraplingExtractor = ScraplingExtractor;
  public freeDev = freeDevDiscoveryService;
  public freeDevRegistry = freeDevRegistry;
  public ollama = ollamaClientService;
  public langflow = langflowGraphEngine;
  public mcpHub = mcpToolHubRegistry;
  public openDesign = openDesignEngine;
  public awesomeLlmApps = awesomeLLMPatternsEngine;
  public openHands = openHandsCodingEngine;
  public unifiedRouter = unifiedSystemRouter;
  public ruflo = RufloOrchestrator;
  public letta = LettaAgentEngine;
  public privacy = privacyAlignEngine;
  public flux = fluxInferenceEngine;
  public androidControl = androidControlEngine;
  public deepSeekHarness = deepSeekAgentRuntime;
  public executeWithDeepSeekHarness = executeWithDeepSeekHarness;
  public agentReach = agentReachEngine;
  public agentReachRouter = agentReachRouter;
  public agentReachDoctor = AgentReachDoctor;

  public getSystemSummary() {
    return {
      status: 'active',
      importedRepositoriesCount: 32,
      importedRepositories: [
        { name: 'DeepSeek Harness', capability: 'Cordis-Inspired Agent Meta-Framework, Plugins, DAG Planning & Task State Machine' },
        { name: 'Awesome', capability: 'Curated Developer Resource Catalog & Structured Discovery' },
        { name: 'Public APIs', capability: 'Public API Catalog, Intent Routing & Fallback Execution' },
        { name: 'Scrapling', capability: 'Recursive Web Crawler, Content Parser & Site Knowledge Indexer' },
        { name: 'Free for Developers', capability: 'Free-Tier Cloud Services Discovery & Stack Recommendations' },
        { name: 'Ollama', capability: 'Local Model Provider Inference, Streaming & Cloud Fallback' },
        { name: 'Langflow', capability: 'DAG Workflow Graph & Multi-Node Execution Engine' },
        { name: 'Awesome MCP Servers', capability: 'Model Context Protocol Tool Registry & Sandboxed Invocation' },
        { name: 'OpenDesign', capability: 'Design-to-Code Architecture Planning & Anti-Slop Auditing' },
        { name: 'Awesome LLM Apps', capability: 'Evaluator-Optimizer, Self-Correcting RAG & Structured Data Extraction' },
        { name: 'OpenHands', capability: 'Autonomous Code Debugging, Patch Planning & Error Diagnosis' },
        { name: 'Agency Agents', capability: 'Role-Specialized Autonomous Agents, Dynamic Routing & DAG Task Decomposition' },
        { name: 'Browser Use', capability: 'Browser Automation, Web Interaction & Recovery' },
        { name: 'Anthropic Cybersecurity Skills', capability: 'Defensive Security Analysis & Vulnerability Audit' },
        { name: 'Awesome Harness Engineering', capability: 'Agent Reliability, Circuit Breakers, Retries & Benchmarks' },
        { name: 'Scientific Agent Skills', capability: 'Structured Research Workflows & Hypothesis Triangulation' },
        { name: 'Diagram Design', capability: 'Mermaid, PlantUML & SVG Graph Rendering Engine' },
        { name: 'Agent Memory', capability: 'Persistent Key-Value & Long-Term Vector Memory' },
        { name: 'OpenViking', capability: 'Hierarchical Context Filesystem Engine (L0/L1/L2)' },
        { name: 'Ruflo', capability: 'Multi-Agent Swarm Orchestration, RAG & MCP Tool Lifecycle' },
        { name: 'Letta', capability: 'Stateful Agent Memory Blocks & Core Archival Memory' },
        { name: 'Deft', capability: 'Android Direct App Resolver & Intent Launcher' },
        { name: 'AutoDroid', capability: 'Android System Automation & Gesture Execution' },
        { name: 'MobileClaw', capability: 'Mobile UI Tree Parsing & Accessibility Node Traversal' },
        { name: 'Open-Jarvis', capability: 'Multi-Modal Voice & Touch Mobile Controller' },
        { name: 'Ghost-in-the-Droid', capability: 'Accessibility Node Action Dispatcher & Input Driver' },
        { name: 'MobileAgent', capability: 'Vision-Language Mobile Task Executor & Screen Verification' },
        { name: 'AutoTask', capability: 'Complex App Step Decomposition & Action Sequence Planning' },
        { name: 'androir-mcp', capability: 'Android Model Context Protocol Bridge & Tool Adapter' },
        { name: 'Agent Search', capability: 'Real-Time Web Search, Source Hierarchy & Citation Engine' },
        { name: 'PrivacyAlign', capability: 'PII Detection, Data Minimization & Privacy Risk Evaluation' },
        { name: 'FLUX', capability: 'Black Forest Labs High-Fidelity Photorealistic Image Inference' },
      ],
      publicApiRegistrySummary: this.publicApiRegistry.getRegistrySummary(),
      health: this.harness.getHealthMetrics(),
    };
  }
}

export const importedSystemsFacade = new ImportedSystemsFacade();


