import { AI_MODELS } from '@/constants/ai-models'

type ModelKey = keyof typeof AI_MODELS

const WORKFLOW_GENERATE_STEP_MODEL: Record<number, ModelKey> = {
  1: 'gpt-4.1',
  2: 'gpt-4.1',
  3: 'gpt-4.1-mini',
  4: 'gpt-4.1-mini',
  5: 'gpt-4.1-mini',
  6: 'gpt-4.1-mini',
  7: 'gpt-4.1-mini',
}

export function llmModelForWorkflowGenerateStep(stepNumber: number): string {
  const key = WORKFLOW_GENERATE_STEP_MODEL[stepNumber]
  if (!key) {
    throw new Error(`No LLM model configured for workflow step ${stepNumber}`)
  }
  return AI_MODELS[key].name
}

export function llmModelSuggestTitle(): string {
  return AI_MODELS['gpt-4.1-mini'].name
}

export function llmModelPublishDescription(): string {
  return AI_MODELS['gpt-4.1'].name
}

export function workflowStepLlmModelLabel(stepNumber: number): string | null {
  if (stepNumber >= 1 && stepNumber <= 7) {
    return llmModelForWorkflowGenerateStep(stepNumber)
  }
  if (stepNumber === 9) {
    return llmModelPublishDescription()
  }
  return null
}
