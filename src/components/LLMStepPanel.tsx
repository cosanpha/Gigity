'use client'

import { StepDefinition } from '@/lib/workflow-templates'
import { useState } from 'react'

type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

interface LLMStepPanelProps {
  stepDef: StepDefinition
  state: StepState
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: (opts?: { outputAssetUrl?: string }) => void
  onReopen?: () => void
  sunoEnabled?: boolean
}

interface ResponseBlock {
  label: string | null
  content: string
}

function parseBlocks(text: string): ResponseBlock[] {
  const lines = text.split('\n')
  const blocks: ResponseBlock[] = []
  let current: ResponseBlock = { label: null, content: '' }

  for (const line of lines) {
    const boldHeading = line.match(/^\*\*(.+?)\*\*\s*$/)
    const h3Heading = line.match(/^###\s+(.+)$/)
    const heading = boldHeading?.[1] ?? h3Heading?.[1] ?? null

    if (heading) {
      if (current.content.trim()) blocks.push(current)
      current = { label: heading, content: '' }
    } else {
      current.content += (current.content ? '\n' : '') + line
    }
  }
  if (current.content.trim() || current.label) blocks.push(current)

  if (blocks.length === 1 && !blocks[0].label) return blocks
  return blocks
}

function extractBlock(content: string, label: string): string {
  const blocks = parseBlocks(content)
  return blocks.find(b => b.label === label)?.content.trim() ?? ''
}

function SunoGenerateButton({
  lyrics,
  stylePrompt,
  onGenerated,
}: {
  lyrics: string
  stylePrompt: string
  onGenerated: (url: string) => void
}) {
  const [status, setStatus] = useState<
    'idle' | 'generating' | 'done' | 'error'
  >('idle')
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setStatus('generating')
    setError(null)
    const res = await fetch('/api/v1/workflow/suno/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics, stylePrompt }),
    })
    if (res.ok) {
      const data = await res.json()
      setStatus('done')
      onGenerated(data.url)
    } else {
      const err = await res.json().catch(() => ({ error: 'Generation failed' }))
      setStatus('error')
      setError(err.error)
    }
  }

  return (
    <div>
      <button
        onClick={generate}
        disabled={status === 'generating'}
        className="rounded-[6px] bg-indigo-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
      >
        {status === 'generating' ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating…
          </span>
        ) : status === 'done' ? (
          '✓ Generated'
        ) : (
          'Generate with SunoAI API'
        )}
      </button>
      {status === 'error' && error && (
        <p className="mt-1.5 text-[12px] text-red-500">{error}</p>
      )}
    </div>
  )
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
      onClick={handleCopy}
      className="text-[12px] text-zinc-400 transition-colors hover:text-zinc-700"
      title="Copy to clipboard"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function ResponseBlocks({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  if (blocks.length === 1 && !blocks[0].label) {
    return <ResponseCard content={content} />
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[6px] border border-zinc-200 bg-zinc-50"
        >
          {block.label && (
            <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2">
              <span className="text-[13px] font-medium text-zinc-700">
                {block.label}
              </span>
              <CopyButton text={block.content.trim()} />
            </div>
          )}
          <pre className="px-4 py-3 font-sans text-sm leading-relaxed whitespace-pre-wrap text-zinc-800">
            {block.content.trim()}
          </pre>
          {!block.label && (
            <div className="flex justify-end border-t border-zinc-200 px-3 py-1.5">
              <CopyButton text={block.content.trim()} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function LLMStepPanel({
  stepDef,
  state,
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
  sunoEnabled,
}: LLMStepPanelProps) {
  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      {/* Step header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>Step {stepDef.stepNumber} of 11</span>
          <span>·</span>
          <span>{stepDef.tool}</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          {stepDef.title}
        </h2>
      </div>

      {/* State 1: No response yet */}
      {state.status === 'pending' && !state.llmResponse && !state.error && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-[13px] text-zinc-500">
            Ready to generate your {stepDef.title.toLowerCase()}.
          </p>
          <button
            onClick={onGenerate}
            className="rounded-[6px] bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
          >
            Generate
          </button>
        </div>
      )}

      {/* State 2: Generating */}
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
          <p className="text-[13px] text-zinc-500">Generating…</p>
        </div>
      )}

      {/* State 3: Approved / done */}
      {state.status === 'done' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-medium text-green-600">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-green-500 text-[11px] text-white">
                ✓
              </span>
              Approved
            </div>
            {onReopen && (
              <button
                onClick={onReopen}
                className="text-[13px] text-zinc-400 transition-colors hover:text-zinc-600"
              >
                ↺ Re-open
              </button>
            )}
          </div>
          <ResponseBlocks content={state.llmResponse!} />
          {/* Step 4 — SunoAI action area */}
          {stepDef?.stepNumber === 4 && (
            <div className="mt-4 rounded-[6px] border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-3 text-[13px] font-medium text-zinc-700">
                Open SunoAI and paste both sections
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://suno.com/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[6px] border border-zinc-200 bg-white px-4 py-2 text-[13px] text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100"
                >
                  Open SunoAI ↗
                </a>
                {sunoEnabled && (
                  <SunoGenerateButton
                    lyrics={extractBlock(state.llmResponse!, 'Lyrics')}
                    stylePrompt={extractBlock(
                      state.llmResponse!,
                      'Style Prompt'
                    )}
                    onGenerated={url => onApprove?.({ outputAssetUrl: url })}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* State 4: Has result — actions available */}
      {state.status === 'pending' && (state.llmResponse || state.error) && (
        <div className="flex flex-col gap-5">
          {/* Error message */}
          {state.error && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{state.error}</p>
              <button
                onClick={onRetry}
                className="mt-2 text-[13px] text-red-600 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Response — conversation thread or single response */}
          {state.llmResponse &&
            (state.conversation.length > 1 ? (
              <ConversationThread messages={state.conversation} />
            ) : (
              <ResponseBlocks content={state.llmResponse} />
            ))}

          {/* Follow-up input */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <textarea
                value={followUp}
                onChange={e => onFollowUpChange(e.target.value)}
                placeholder="Refine this output… e.g. make it shorter, change the tone"
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
          </div>

          {/* Primary actions */}
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              ↺ Start fresh
            </button>
            <button
              onClick={() => onApprove()}
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

function ResponseCard({ content }: { content: string }) {
  return (
    <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-5">
      <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-zinc-800">
        {content}
      </pre>
    </div>
  )
}

function ConversationThread({
  messages,
}: {
  messages: Array<{ role: string; content: string }>
}) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((m, i) => (
        <div
          key={i}
          className={m.role === 'user' ? 'flex justify-end' : ''}
        >
          {m.role === 'user' ? (
            <div className="max-w-[80%] rounded-[6px] border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
              {m.content}
            </div>
          ) : (
            <ResponseBlocks content={m.content} />
          )}
        </div>
      ))}
    </div>
  )
}
