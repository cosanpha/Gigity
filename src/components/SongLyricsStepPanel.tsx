'use client'

import { WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'
import { startTransition, useEffect, useRef, useState } from 'react'

type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
      title="Copy to clipboard"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

interface SongLyricsStepPanelProps {
  state: StepState
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: () => void
  onReopen: () => void
  onContentChange: (content: string) => void
}

export function SongLyricsStepPanel({
  state,
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
  onContentChange,
}: SongLyricsStepPanelProps) {
  const [editedContent, setEditedContent] = useState(state.llmResponse ?? '')
  const prevStatusRef = useRef(state.status)

  useEffect(() => {
    if (prevStatusRef.current === 'generating' && state.status === 'pending') {
      startTransition(() => setEditedContent(state.llmResponse ?? ''))
    }
    prevStatusRef.current = state.status
  }, [state.status, state.llmResponse])

  function handleEdit(value: string) {
    setEditedContent(value)
    onContentChange(value)
  }

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
          <span>Step 3 of {WORKFLOW_TOTAL_STEPS}</span>
          <span>·</span>
          <span>SunoAI</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Song Lyrics
        </h2>
      </div>

      {isEmptyStart && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-[13px] text-zinc-500">
            Ready to generate your song lyrics.
          </p>
          <button
            onClick={onGenerate}
            className="rounded-[6px] bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
          >
            Generate
          </button>
        </div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <svg
            className="h-6 w-6 animate-spin text-indigo-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
            />
          </svg>
          <p className="text-[13px] text-zinc-500">Generating song lyrics…</p>
        </div>
      )}

      {showWorkspace && (
        <div className="flex flex-col gap-5">
          {isLocked && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-green-600">
                Approved - Re-open to edit the lyrics.
              </p>
              {state.llmResponse ? (
                <CopyButton text={state.llmResponse} />
              ) : null}
            </div>
          )}

          {state.error && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{state.error}</p>
            </div>
          )}

          {state.llmResponse && (
            <textarea
              value={isLocked ? (state.llmResponse ?? '') : editedContent}
              onChange={e => handleEdit(e.target.value)}
              readOnly={isLocked}
              rows={24}
              spellCheck={false}
              className="w-full resize-y rounded-[6px] border border-zinc-200 bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 read-only:bg-zinc-50 read-only:text-zinc-700 focus:border-indigo-400"
            />
          )}

          <div className="flex gap-2">
            <textarea
              value={followUp}
              onChange={e => onFollowUpChange(e.target.value)}
              placeholder="Refine the lyrics… e.g. shorter chorus, different rhyme, clearer hook"
              rows={2}
              className="flex-1 resize-none rounded-[6px] border border-zinc-200 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={onSendFollowUp}
              disabled={!followUp.trim()}
              className="self-end rounded-[6px] border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Re-generate
            </button>
            {isLocked ? (
              <button
                onClick={onReopen}
                className="rounded-[6px] border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                Re-open
              </button>
            ) : (
              <button
                onClick={onApprove}
                className="rounded-[6px] bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
              >
                ✓ Approve
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

