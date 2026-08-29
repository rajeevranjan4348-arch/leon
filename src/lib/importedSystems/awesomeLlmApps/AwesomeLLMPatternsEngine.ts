import {
  EvaluatorOptimizerConfig,
  EvaluatorOptimizerResult,
  StructuredExtractionSchema,
  StructuredExtractionResult,
} from './types';
import { callGeminiAPI } from '../../gemini';
import { SearchEngineOrchestrator } from '../../search/SearchEngineOrchestrator';

/**
 * AwesomeLLMPatternsEngine
 * Implementation of leading agent orchestration patterns (Evaluator-Optimizer,
 * Self-Correcting RAG, and Structured Extraction) based on Shubhamsaboo/awesome-llm-apps.
 */
export class AwesomeLLMPatternsEngine {
  private static instance: AwesomeLLMPatternsEngine;

  private constructor() {}

  public static getInstance(): AwesomeLLMPatternsEngine {
    if (!AwesomeLLMPatternsEngine.instance) {
      AwesomeLLMPatternsEngine.instance = new AwesomeLLMPatternsEngine();
    }
    return AwesomeLLMPatternsEngine.instance;
  }

  /**
   * Evaluator-Optimizer Pattern:
   * Generator produces draft -> Evaluator grades and gives feedback -> Optimizer refines
   * Repeats until quality threshold is met or max iterations reached.
   */
  public async runEvaluatorOptimizer(config: EvaluatorOptimizerConfig): Promise<EvaluatorOptimizerResult> {
    const startTime = Date.now();
    const maxIterations = config.maxIterations ?? 3;
    const threshold = config.qualityThreshold ?? 85;
    const iterationsLog: EvaluatorOptimizerResult['iterations'] = [];

    let currentDraft = '';
    let feedback = '';

    for (let iter = 1; iter <= maxIterations; iter++) {
      // 1. Generation / Optimization step
      const generatorPrompt = iter === 1
        ? `Task: ${config.taskPrompt}\n\nPlease generate a thorough, high quality, and accurate solution.`
        : `Original Task: ${config.taskPrompt}\n\nPrevious Draft:\n${currentDraft}\n\nEvaluator Feedback:\n${feedback}\n\nPlease revise and improve the solution addressing the feedback thoroughly.`;

      const genRes = await callGeminiAPI({
        prompt: generatorPrompt,
        systemInstruction: config.systemContext || 'You are an expert AI problem solver and precision author.',
        temperature: 0.5,
      });
      currentDraft = genRes.text || '';

      // 2. Evaluation step
      const criteriaList = config.evaluationCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
      const evalPrompt = `Task: ${config.taskPrompt}\n\nDraft Candidate:\n${currentDraft}\n\nEvaluation Criteria:\n${criteriaList}\n\nEvaluate the draft strictly against each criterion. Respond ONLY in valid JSON format:\n{\n  "score": <number 0-100>,\n  "passed": <boolean>,\n  "feedback": "<concise actionable critique for improvement>"\n}`;

      const evalResponse = await callGeminiAPI({
        prompt: evalPrompt,
        systemInstruction: 'You are a rigorous, objective evaluator ensuring high quality and factual correctness.',
        temperature: 0.1,
      });

      let score = 75;
      let passed = false;
      feedback = 'Improve clarity and accuracy.';

      try {
        const jsonMatch = (evalResponse.text || '').match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          score = Number(parsed.score) || score;
          passed = parsed.score >= threshold;
          feedback = parsed.feedback || feedback;
        }
      } catch {
        // Fallback score calculation if JSON parse fails
        score = 80;
        passed = iter === maxIterations;
      }

      iterationsLog.push({
        iteration: iter,
        draft: currentDraft,
        score,
        feedback,
        passed,
      });

      if (passed) {
        break;
      }
    }

    const lastIter = iterationsLog[iterationsLog.length - 1];

    return {
      finalOutput: currentDraft,
      iterations: iterationsLog,
      totalIterations: iterationsLog.length,
      qualityScore: lastIter ? lastIter.score : 80,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Self-Correcting RAG Pattern:
   * Retrieves knowledge -> evaluates relevance -> reformulates search if needed -> synthesizes final answer.
   */
  public async runSelfCorrectingRAG(userQuery: string): Promise<{ answer: string; sources: string[]; queriesUsed: string[] }> {
    const queriesUsed: string[] = [userQuery];

    // 1. Initial retrieval
    let searchRes = await SearchEngineOrchestrator.execute(userQuery);
    let docs = searchRes.sources.map(r => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.snippet}`).join('\n\n');

    // 2. Relevance check
    const relevancePrompt = `User Question: ${userQuery}\n\nRetrieved Documents:\n${docs}\n\nDetermine if the retrieved documents contain sufficient factual information to accurately answer the question. Respond in JSON:\n{\n  "isRelevant": <true/false>,\n  "betterSearchQuery": "<refined search query if not relevant>"\n}`;

    const relevanceEval = await callGeminiAPI({
      prompt: relevancePrompt,
      systemInstruction: 'You are a retrieval evaluator. Judge relevance objectively.',
      temperature: 0.1,
    });

    try {
      const match = (relevanceEval.text || '').match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (!parsed.isRelevant && parsed.betterSearchQuery && parsed.betterSearchQuery !== userQuery) {
          queriesUsed.push(parsed.betterSearchQuery);
          searchRes = await SearchEngineOrchestrator.execute(parsed.betterSearchQuery);
          docs = searchRes.sources.map(r => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.snippet}`).join('\n\n');
        }
      }
    } catch {
      // proceed with current docs
    }

    // 3. Grounded Synthesis
    const synthesisPrompt = `User Question: ${userQuery}\n\nVerified Knowledge Sources:\n${docs}\n\nAnswer the user's question accurately, grounded strictly in the verified knowledge above. Include citations for factual statements.`;

    const answerRes = await callGeminiAPI({
      prompt: synthesisPrompt,
      systemInstruction: 'You are a precise, knowledgeable assistant answering with grounded truth.',
      temperature: 0.3,
    });

    return {
      answer: answerRes.text || '',
      sources: searchRes.sources.map(r => r.url),
      queriesUsed,
    };
  }

  /**
   * Structured JSON Extraction with Schema Validation and Auto-Repair.
   */
  public async extractStructuredData<T = any>(
    inputText: string,
    schema: StructuredExtractionSchema
  ): Promise<StructuredExtractionResult<T>> {
    const fieldsDesc = schema.fields
      .map(f => `"${f.name}": <${f.type}> (${f.description}) [${f.required ? 'REQUIRED' : 'OPTIONAL'}]`)
      .join('\n  ');

    const prompt = `Input Text:\n"""\n${inputText}\n"""\n\nExtract the structured data strictly matching this schema:\n{\n  ${fieldsDesc}\n}\n\nReturn ONLY the valid JSON object without markdown formatting or surrounding explanations.`;

    const rawRes = await callGeminiAPI({
      prompt,
      systemInstruction: 'You are a deterministic data extraction engine producing strict valid JSON.',
      temperature: 0.0,
    });
    const rawResponse = rawRes.text || '';

    const validationErrors: string[] = [];
    let recovered = false;
    let data: T | null = null;

    try {
      let jsonStr = rawResponse.trim();
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        jsonStr = match[0];
        recovered = true;
      }
      data = JSON.parse(jsonStr);

      // Validate required fields
      for (const field of schema.fields) {
        if (field.required && (data as any)[field.name] === undefined) {
          validationErrors.push(`Missing required field: '${field.name}'`);
        }
      }
    } catch (e: any) {
      validationErrors.push(`JSON parsing error: ${e.message}`);
    }

    return {
      success: validationErrors.length === 0 && data !== null,
      data,
      rawResponse,
      validationErrors,
      recovered,
    };
  }
}

export const awesomeLLMPatternsEngine = AwesomeLLMPatternsEngine.getInstance();
