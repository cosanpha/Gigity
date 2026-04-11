'use client'

import { useState } from 'react'

type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

interface StoryStepPanelProps {
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

export function StoryStepPanel({
  state,
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
  onContentChange,
}: StoryStepPanelProps) {
  const [editedContent, setEditedContent] = useState(state.llmResponse ?? '')

  function handleEdit(value: string) {
    setEditedContent(value)
    onContentChange(value)
  }

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      {/* Step header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>Step 2 of 11</span>
          <span>·</span>
          <span>Gigity</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Story Script
        </h2>
      </div>

      {/* State: no response yet */}
      {state.status === 'pending' && !state.llmResponse && !state.error && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-[13px] text-zinc-500">
            Ready to generate your story script.
          </p>
          <button
            onClick={onGenerate}
            className="rounded-[6px] bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
          >
            Generate
          </button>
        </div>
      )}

      {/* State: generating */}
      {state.status === 'generating' && (
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
          <p className="text-[13px] text-zinc-500">Generating story script…</p>
        </div>
      )}

      {/* State: approved */}
      {state.status === 'done' && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-green-500 text-[11px] text-white">
              ✓
            </span>
            <span className="text-[13px] font-medium text-green-600">
              Approved
            </span>
            <button
              onClick={onReopen}
              className="text-[13px] text-zinc-400 transition-colors hover:text-zinc-600"
            >
              ↺ Re-open
            </button>
          </div>
          <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-4">
            <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-zinc-800">
              {state.llmResponse}
            </pre>
          </div>
        </div>
      )}

      {/* State: has response — editable */}
      {state.status === 'pending' && (state.llmResponse || state.error) && (
        <div className="flex flex-col gap-5">
          {/* Error */}
          {state.error && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{state.error}</p>
            </div>
          )}

          {/* Editable script textarea */}
          {state.llmResponse && (
            <textarea
              value={editedContent}
              onChange={e => handleEdit(e.target.value)}
              rows={24}
              spellCheck={false}
              className="w-full resize-y rounded-[6px] border border-zinc-200 bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-indigo-400"
            />
          )}

          {/* Follow-up */}
          <div className="flex gap-2">
            <textarea
              value={followUp}
              onChange={e => onFollowUpChange(e.target.value)}
              placeholder="Refine the script… e.g. make it more emotional, shorter, change the ending"
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

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              ↺ Re-generate
            </button>
            <button
              onClick={onApprove}
              className="rounded-[6px] bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
            >
              ✓ Approve
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
