'use client'

import type { StepState } from '@/lib/workflow-templates'
import { WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'
import { LucideCheck } from 'lucide-react'
import { startTransition, useEffect, useRef, useState } from 'react'
import { StepLlmModelCaption } from './StepLlmModelCaption'
import { CopyButton } from './ui/CopyButton'
import { GenerateSpinner } from './ui/GenerateSpinner'
import { StepActionFooter } from './ui/StepActionFooter'

interface EditableTextStepPanelProps {
  stepNumber: number
  title: string
  tool: string
  textareaRows?: number
  generateLabel?: string // e.g. "campaign brief" - used in "Ready to generate your X."
  generatingLabel?: string // e.g. "campaign brief…" - used in "Generating X…"
  approvedLabel?: string // e.g. "brief" - used in "Re-open to edit the X."
  followUpPlaceholder?: string
  state: StepState
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: () => void
  onReopen: () => void
  onContentChange: (content: string) => void
  llmModel?: string | null
}

export function EditableTextStepPanel({
  stepNumber,
  title,
  tool,
  textareaRows = 20,
  generateLabel,
  generatingLabel,
  approvedLabel,
  followUpPlaceholder = 'Refine…',
  state,
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
  onContentChange,
  llmModel,
}: EditableTextStepPanelProps) {
  const [editedContent, setEditedContent] = useState(state.llmResponse ?? '')
  const prevStatusRef = useRef(state.status)

  useEffect(() => {
    if (prevStatusRef.current === 'generating' && state.status === 'pending') {
      startTransition(() => setEditedContent(state.llmResponse ?? ''))
    }
    prevStatusRef.current = state.status
  }, [state.status, state.llmResponse])

  const label = generateLabel ?? title.toLowerCase()
  const gLabel = generatingLabel ?? `${label}…`
  const aLabel = approvedLabel ?? label

  const isEmptyStart =
    state.status === 'pending' && !state.llmResponse && !state.error
  const isGenerating = state.status === 'generating'
  const isLocked = state.status === 'done'
  const showWorkspace =
    !isEmptyStart &&
    !isGenerating &&
    (Boolean(state.llmResponse) || Boolean(state.error) || isLocked)

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>
            Step {stepNumber} of {WORKFLOW_TOTAL_STEPS}
          </span>
          <span>·</span>
          <span>{tool}</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
        <StepLlmModelCaption model={llmModel} />
      </div>

      {isEmptyStart && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-[13px] text-zinc-500">
            Ready to generate your {label}.
          </p>
          <button
            onClick={onGenerate}
            className="rounded-[6px] bg-orange-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            Generate
          </button>
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <GenerateSpinner />
          <p className="text-[13px] text-zinc-500">Generating {gLabel}</p>
        </div>
      )}

      {showWorkspace && (
        <div className="flex flex-col gap-5">
          {isLocked && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-green-600">
                Approved - Re-open to edit the {aLabel}.
              </p>
            </div>
          )}

          {state.error && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{state.error}</p>
            </div>
          )}

          {state.llmResponse && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-zinc-700">
                  {title}
                </span>
                <CopyButton
                  text={isLocked ? (state.llmResponse ?? '') : editedContent}
                />
              </div>
              <textarea
                value={isLocked ? (state.llmResponse ?? '') : editedContent}
                onChange={e => {
                  setEditedContent(e.target.value)
                  onContentChange(e.target.value)
                }}
                readOnly={isLocked}
                rows={textareaRows}
                spellCheck={false}
                className="w-full resize-y rounded-[6px] border border-zinc-200 bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 read-only:bg-zinc-50 read-only:text-zinc-700 focus:border-orange-400"
              />
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              value={followUp}
              onChange={e => onFollowUpChange(e.target.value)}
              placeholder={followUpPlaceholder}
              rows={2}
              className="flex-1 resize-none rounded-[6px] border border-zinc-200 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none"
            />
            <button
              onClick={onSendFollowUp}
              disabled={!followUp.trim()}
              className="self-end rounded-[6px] border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>

          <StepActionFooter
            leftActions={
              <button
                onClick={onRetry}
                className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Re-generate
              </button>
            }
            rightActions={
              isLocked ? (
                <button
                  onClick={onReopen}
                  className="rounded-[6px] border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                >
                  Re-open
                </button>
              ) : (
                <button
                  onClick={onApprove}
                  className="inline-flex items-center gap-2 rounded-[6px] bg-orange-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                >
                  <LucideCheck
                    className="h-4 w-4"
                    aria-hidden
                  />
                  Approve
                </button>
              )
            }
          />
        </div>
      )}
    </div>
  )
}
