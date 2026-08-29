import { LettaStore } from './LettaStore';
import { FileMemoryIngester } from './fileMemoryIngester';
import { executeLettaTool } from './LettaTools';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export async function runLettaTestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  const runTest = async (name: string, fn: () => Promise<void> | void) => {
    const start = performance.now();
    try {
      await fn();
      results.push({
        name,
        passed: true,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (err: any) {
      results.push({
        name,
        passed: false,
        error: err?.message || String(err),
        durationMs: Math.round(performance.now() - start),
      });
    }
  };

  // Test 1: Initialize Agent
  await runTest('Initialize Letta Agent with Core Memory Blocks', () => {
    const agent = LettaStore.getOrCreateAgent('test_agent_1');
    if (!agent || agent.id !== 'test_agent_1') {
      throw new Error('Agent initialization failed');
    }
    if (!agent.coreMemory.human || !agent.coreMemory.persona) {
      throw new Error('Core memory blocks missing');
    }
  });

  // Test 2: Core Memory Append and Replace
  await runTest('Append & Replace in Core Memory Blocks', () => {
    const agentId = 'test_agent_2';
    LettaStore.getOrCreateAgent(agentId);

    const appRes = LettaStore.appendCoreMemory(agentId, 'human', 'User prefers TypeScript with strict types');
    if (!appRes.success || !appRes.newContent.includes('TypeScript with strict types')) {
      throw new Error('Core memory append failed');
    }

    const repRes = LettaStore.replaceCoreMemory(agentId, 'human', 'strict types', 'robust zero-error types');
    if (!repRes.success || !repRes.newContent.includes('robust zero-error types')) {
      throw new Error('Core memory replace failed');
    }
  });

  // Test 3: Archival Memory Insertion & Semantic Search
  await runTest('Insert & Search Archival Memory Passages', () => {
    const agentId = 'test_agent_3';
    LettaStore.getOrCreateAgent(agentId);

    LettaStore.insertArchivalPassage(
      agentId,
      'PostgreSQL production connection pool size set to 25',
      ['database', 'postgres']
    );

    const hits = LettaStore.searchArchivalPassages(agentId, 'postgres connection pool', 5);
    if (hits.length === 0 || !hits[0].passage.content.includes('PostgreSQL')) {
      throw new Error('Archival passage search failed to return relevant hit');
    }
  });

  // Test 4: Recall Memory Event Logging
  await runTest('Record & Search Recall Memory Event Stream', () => {
    const agentId = 'test_agent_4';
    LettaStore.getOrCreateAgent(agentId);

    LettaStore.recordRecallEvent({
      agentId,
      conversationId: 'conv_test_4',
      role: 'user',
      content: 'Implement Dijkstra shortest path algorithm in Python',
    });

    const recallHits = LettaStore.searchRecallMemory(agentId, 'Dijkstra shortest path', 3);
    if (recallHits.length === 0) {
      throw new Error('Recall event search failed');
    }
  });

  // Test 5: Document Chunking & File Ingestion
  await runTest('File Memory Ingestion & Document Chunking', async () => {
    const agentId = 'test_agent_5';
    LettaStore.getOrCreateAgent(agentId);

    const sampleDoc = `
Letta Architecture Specification.
Hierarchical memory enables LLMs to maintain infinite context and continuous state across sessions.
Core memory blocks are perpetually present in-context.
Archival memory houses deep reference documentation.
`.repeat(3);

    const metadata = await FileMemoryIngester.ingestDocument(
      agentId,
      'LettaSpec.md',
      sampleDoc,
      'markdown',
      'conv_doc_5'
    );

    if (metadata.totalChunks < 1) {
      throw new Error('File chunking failed to generate passages');
    }
  });

  // Test 6: Letta Tool Execution
  await runTest('Execute Letta Tools', async () => {
    const agentId = 'test_agent_6';
    LettaStore.getOrCreateAgent(agentId);

    const result = await executeLettaTool(
      'archival_memory_insert',
      { content: 'Stripe webhook secret endpoint', tags: 'stripe,security' },
      { agentId, conversationId: 'conv_6', query: 'secret' }
    );

    if (!result.success) {
      throw new Error('Tool execution failed');
    }
  });

  const passed = results.filter(r => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
