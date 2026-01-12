/**
 * AI Analysis Prompts (Pure Module)
 *
 * Contains prompt templates and composition logic for AI analysis.
 * This is a pure module — no IO, no server-only dependency.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §6 - Technical execution
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */

import type { AnalysisTemplateId } from '@/lib/types/ai-analysis';

import { deidentifyData } from './analysis-pure';

// =============================================================================
// System Prompt
// =============================================================================

/**
 * System prompt for analysis.
 */
export const SYSTEM_PROMPT = `You are a data analyst assistant. Analyze the provided data and generate actionable insights.

Guidelines:
- Provide clear, actionable recommendations
- Use markdown formatting with headers and bullet points
- Include specific numbers and percentages when relevant
- Keep the analysis concise but comprehensive
- Focus on patterns and trends that would help business decisions
- Never reveal PII or sensitive data in your analysis`;

// =============================================================================
// Template Prompts
// =============================================================================

/**
 * Get template-specific prompt.
 * For 'custom' templateId, returns empty string (custom prompt is provided separately).
 */
export function getTemplatePrompt(templateId: AnalysisTemplateId): string {
  if (templateId === 'custom') {
    // Custom template prompt is provided via customTemplateId
    return '';
  }

  const prompts: Record<Exclude<AnalysisTemplateId, 'custom'>, string> = {
    user_behavior: `Analyze user behavior patterns:
- Most popular content types (by engagement)
- Peak activity times
- Comment sentiment distribution (positive/neutral/negative)
- User engagement trends over time
- Recommendations for improving engagement`,

    sales: `Analyze sales performance:
- Top 10 best-selling products
- Average order value and distribution
- Sales trends over time (daily/weekly patterns)
- Slow-moving inventory identification
- Pricing optimization opportunities
- Recommendations for increasing sales`,

    rfm: `Perform RFM (Recency, Frequency, Monetary) customer segmentation:
- Calculate RFM scores for each customer segment
- Identify VIP customers (high value)
- Identify at-risk customers (churning)
- Identify new customers with growth potential
- Segment distribution (percentage in each group)
- Personalized marketing recommendations per segment`,

    content_recommendation: `Analyze content-to-purchase correlations:
- Which content types drive the most conversions?
- "Customers who viewed X also bought Y" patterns
- Content engagement before purchase behavior
- Recommendations for content strategy to boost sales`,
  };

  return prompts[templateId];
}

// =============================================================================
// Prompt Composition
// =============================================================================

/**
 * Compose the full prompt for analysis.
 *
 * @param templateId - The analysis template to use
 * @param data - Raw data to analyze (will be de-identified)
 * @returns Composed prompt ready for LLM
 */
export function composeAnalysisPrompt(
  templateId: AnalysisTemplateId,
  data: Record<string, unknown>[]
): string {
  const templatePrompt = getTemplatePrompt(templateId);
  const deidentifiedData = deidentifyData(data);
  const serializedData = JSON.stringify(deidentifiedData, null, 2);

  return `${templatePrompt}

## Data to Analyze

\`\`\`json
${serializedData}
\`\`\`

Please provide your analysis in markdown format.`;
}

// =============================================================================
// Custom Template Prompts (PR-3)
// =============================================================================

/**
 * Compose the full prompt for custom template analysis.
 *
 * @param promptText - The custom prompt text from user-defined template
 * @param data - Raw data to analyze (will be de-identified)
 * @returns Composed prompt ready for LLM
 */
export function composeCustomAnalysisPrompt(
  promptText: string,
  data: Record<string, unknown>[]
): string {
  const deidentifiedData = deidentifyData(data);
  const serializedData = JSON.stringify(deidentifiedData, null, 2);

  return `${promptText}

## Data to Analyze

\`\`\`json
${serializedData}
\`\`\`

Please provide your analysis in markdown format.`;
}

/**
 * Compose RAG analysis prompt for custom template.
 *
 * @param promptText - The custom prompt text from user-defined template
 * @param contextData - Retrieved context chunks (already deidentified)
 * @param retrievalMetadata - Information about the retrieval process
 * @returns Composed prompt ready for LLM with RAG context
 */
export function composeCustomRagAnalysisPrompt(
  promptText: string,
  contextData: Record<string, unknown>[],
  retrievalMetadata: { totalRetrieved: number; query: string }
): string {
  const serializedContext = JSON.stringify(contextData, null, 2);

  return `${promptText}

## Retrieval Information

- Query: "${retrievalMetadata.query}"
- Chunks Retrieved: ${retrievalMetadata.totalRetrieved}

## Retrieved Context

The following context was retrieved using semantic search. Base your analysis ONLY on this data.

\`\`\`json
${serializedContext}
\`\`\`

## Instructions

1. Analyze the retrieved context following the template requirements above
2. Only cite information that appears in the context
3. If the context is insufficient, note what additional data would be helpful
4. Provide your analysis in markdown format`;
}

// =============================================================================
// RAG Mode Prompts (Phase 6+)
// =============================================================================

/**
 * System prompt for RAG-based analysis.
 * Includes citation rules to prevent hallucination.
 *
 * @see uiux_refactor.md §6.3.2 item 4
 */
export const RAG_SYSTEM_PROMPT = `You are a data analyst assistant using RAG (Retrieval-Augmented Generation).
You have been provided with semantically relevant context chunks retrieved from the database.

CRITICAL RULES:
- ONLY use information from the provided context
- DO NOT make up or hallucinate data not in the context
- When citing information, reference the source type and chunk
- If the context lacks sufficient data, clearly state this limitation
- Provide clear, actionable recommendations based on available context
- Use markdown formatting with headers and bullet points
- Never reveal PII or sensitive data in your analysis`;

/**
 * Compose RAG analysis prompt with context and citation rules.
 *
 * @param templateId - The analysis template to use
 * @param contextData - Retrieved context chunks (already deidentified)
 * @param retrievalMetadata - Information about the retrieval process
 * @returns Composed prompt ready for LLM with RAG context
 */
export function composeRagAnalysisPrompt(
  templateId: AnalysisTemplateId,
  contextData: Record<string, unknown>[],
  retrievalMetadata: { totalRetrieved: number; query: string }
): string {
  const templatePrompt = getTemplatePrompt(templateId);
  const serializedContext = JSON.stringify(contextData, null, 2);

  return `${templatePrompt}

## Retrieval Information

- Query: "${retrievalMetadata.query}"
- Chunks Retrieved: ${retrievalMetadata.totalRetrieved}

## Retrieved Context

The following context was retrieved using semantic search. Base your analysis ONLY on this data.

\`\`\`json
${serializedContext}
\`\`\`

## Instructions

1. Analyze the retrieved context following the template requirements above
2. Only cite information that appears in the context
3. If the context is insufficient, note what additional data would be helpful
4. Provide your analysis in markdown format`;
}

