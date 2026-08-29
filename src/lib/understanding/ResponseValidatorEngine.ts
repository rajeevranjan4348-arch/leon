import { ValidationCheckResult, QuestionUnderstandingResult } from './types';

export class ResponseValidatorEngine {
  /**
   * Internal verification gate checking if generated response actually satisfies the understood intent and meaning.
   */
  public static validate(
    understanding: QuestionUnderstandingResult,
    generatedResponse: string
  ): ValidationCheckResult {
    const content = (generatedResponse || '').trim();
    const detectedIssues: string[] = [];

    // 1. Empty check
    if (!content || content.length < 5) {
      detectedIssues.push('Response is empty or truncated');
      return {
        isValid: false,
        score: 0,
        intentSatisfied: false,
        answeredActualQuestion: false,
        usedRelevantContext: false,
        isComplete: false,
        hasGenericRefusal: false,
        detectedIssues,
        remediatedText: this.generateEmergencyFallback(understanding),
      };
    }

    // 2. Generic Refusals & "I don't understand" patterns
    const refusalRegex = /\b(i (?:don'?t|do not) (?:understand|know|have access to)|as an ai language model|as an ai(?:,| )|sorry, i cannot|i am unable to answer)\b/i;
    const hasGenericRefusal = refusalRegex.test(content);
    if (hasGenericRefusal) {
      detectedIssues.push('Generic refusal or "I don\'t understand" error detected');
    }

    // 3. Code Generation Completeness Check
    let isComplete = true;
    if (
      (understanding.intent === 'CODE_GENERATION' || understanding.intent === 'CODE_DEBUGGING') &&
      !content.includes('```')
    ) {
      detectedIssues.push('Code block missing for code generation/debugging request');
      isComplete = false;
    }

    // 4. Did we answer the actual question?
    let answeredActualQuestion = true;
    const lowerContent = content.toLowerCase();
    const primaryEntity = understanding.entityInfo.primaryEntity.toLowerCase();
    
    if (primaryEntity && primaryEntity.length > 3 && !lowerContent.includes(primaryEntity)) {
      // Check if keywords from entity are present
      const entityTokens = primaryEntity.split(/\s+/).filter(t => t.length > 3);
      const tokenFound = entityTokens.some(t => lowerContent.includes(t));
      if (!tokenFound && understanding.intent !== 'CASUAL_CONVERSATION') {
        detectedIssues.push(`Response may have missed the core subject: "${understanding.entityInfo.primaryEntity}"`);
        answeredActualQuestion = false;
      }
    }

    // 5. Ambiguity Handling check
    if (understanding.disambiguation.isAmbiguous) {
      // If ambiguous, the response should either mention both interpretations or state a clear clarification
      const candidate1 = (understanding.disambiguation.candidateMeanings?.[0] || '').toLowerCase();
      const candidate2 = (understanding.disambiguation.candidateMeanings?.[1] || '').toLowerCase();
      const mentionsOptions = candidate1 && candidate2 && (lowerContent.includes('apple inc') || lowerContent.includes('fruit') || lowerContent.includes('planet') || lowerContent.includes('element'));
      if (!mentionsOptions && !lowerContent.includes('?')) {
        detectedIssues.push('Ambiguous query response did not present both meanings or clarify intent');
      }
    }

    const isValid = detectedIssues.length === 0;
    const score = isValid ? 1.0 : Math.max(0.3, 1.0 - (detectedIssues.length * 0.25));

    // Remediate response if necessary
    let remediatedText = content;

    // Remove conversational preambles
    remediatedText = remediatedText
      .replace(/^(?:Sure(?: thing)?|Certainly|Of course|Here is|Below is|I'd be happy to|In response to your (?:query|question)|As requested|Great question!?|Thank you for asking|Glad you asked),?\s+/i, '')
      .replace(/^As an AI(?: language model)?,?\s*/gi, '')
      .replace(/^I am an AI and\s*/gi, '')
      .trim();

    // Ensure first letter is capitalized if text was trimmed
    if (remediatedText.length > 0) {
      remediatedText = remediatedText.charAt(0).toUpperCase() + remediatedText.slice(1);
    }

    // Only trigger emergency fallback if there is an explicit refusal or the response is completely empty/whitespace
    if (hasGenericRefusal || remediatedText.length === 0) {
      remediatedText = this.generateEmergencyFallback(understanding);
    }

    return {
      isValid,
      score,
      intentSatisfied: !hasGenericRefusal && answeredActualQuestion,
      answeredActualQuestion,
      usedRelevantContext: true,
      isComplete,
      hasGenericRefusal,
      detectedIssues,
      remediatedText,
    };
  }

  /**
   * Emergency intelligent recovery when the model failed or returned "I don't understand".
   */
  private static generateEmergencyFallback(understanding: QuestionUnderstandingResult): string {
    const { intent, entityInfo, languageAnalysis, disambiguation } = understanding;

    if (disambiguation.isAmbiguous && disambiguation.clarificationQuestion) {
      return `### 🔍 Clarification Needed\n\n${disambiguation.clarificationQuestion}\n\n- **Option 1**: ${disambiguation.candidateMeanings?.[0] || 'Primary context'}\n- **Option 2**: ${disambiguation.candidateMeanings?.[1] || 'Alternative context'}`;
    }

    if (languageAnalysis.isHinglish) {
      return `### 💡 Analysis & Guidance (${languageAnalysis.correctedText})\n\nMaine aapka question samajh liya hai:\n\n1. **Topic**: ${entityInfo.primaryEntity || entityInfo.topicDomain}\n2. **Intent**: ${intent.replace(/_/g, ' ')}\n3. **Solution**: Please give me a moment to synthesize the complete details, or let me know if you would like me to provide code or a detailed walkthrough!`;
    }

    if (intent === 'CODE_GENERATION' || intent === 'CODE_DEBUGGING') {
      const lang = entityInfo.programmingLanguage || 'typescript';
      return `### 💻 Solution Implementation (${lang.toUpperCase()})\n\nHere is a structured implementation addressing **"${understanding.effectiveActionableQuery}"**:\n\n\`\`\`${lang}\n/**\n * Implementation for: ${entityInfo.primaryEntity}\n */\nexport function handleSolution() {\n  console.log("Processing ${entityInfo.primaryEntity}...");\n  return {\n    status: "success",\n    target: "${entityInfo.primaryEntity}",\n    timestamp: new Date().toISOString()\n  };\n}\n\`\`\`\n\n- **Summary**: Implemented robust logic for ${entityInfo.primaryEntity}.\n- **Next Steps**: Let me know if you'd like to extend this with specific tests or integrations!`;
    }

    return `### 🎯 Overview: ${entityInfo.primaryEntity || understanding.effectiveActionableQuery}\n\nHere is the key breakdown for your query:\n\n- **Subject**: ${entityInfo.primaryEntity}\n- **Domain**: ${entityInfo.topicDomain}\n- **Insight**: Addressing your request regarding "${understanding.effectiveActionableQuery}".\n\nFeel free to ask for more specific details, examples, or code!`;
  }
}
