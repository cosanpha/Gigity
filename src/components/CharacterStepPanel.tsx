'use client'

import Image from 'next/image'
import { useState } from 'react'

type Step5State = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

type Step6State = {
  status: 'pending' | 'generating' | 'done'
  outputAssetUrl: string | null
}

interface CharacterStepPanelProps {
  step5State: Step5State
  step6State: Step6State
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: (imageUrls: string) => void
  onReopen: () => void
}

function extractCharacterPrompts(
  text: string
): Array<{ name: string; prompt: string }> {
  const blocks = text.split(/\*\*Character — /).slice(1)
  return blocks.map(block => {
    const name = block
      .split('\n')[0]
      .replace(/\*\*.*/, '')
      .trim()
    const promptMatch = block.match(/Midjourney prompt:\s*(.+)/)
    const prompt = promptMatch?.[1]?.split('\n')[0]?.trim() ?? ''
    return { name, prompt }
  })
}

function DalleGenerateButton({
  prompt,
  onGenerated,
}: {
  prompt: string
  onGenerated: (url: string) => void
}) {
  const [status, setStatus] = useState<
    'idle' | 'generating' | 'done' | 'error'
  >('idle')
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setStatus('generating')
    setError(null)
    const res = await fetch('/api/v1/workflow/dalle/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '1024x1792' }),
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
    <div className="flex flex-col gap-1">
      <button
        onClick={generate}
        disabled={status === 'generating'}
        className="w-fit rounded-[6px] bg-indigo-500 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
      >
        {status === 'generating' ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating…
          </span>
        ) : status === 'done' ? (
          '↺ Re-generate'
        ) : (
          'Generate with DALL-E'
        )}
      </button>
      {status === 'error' && error && (
        <p className="text-[12px] text-red-500">{error}</p>
      )}
    </div>
  )
}

export function CharacterStepPanel({
  step5State,
  step6State,
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
}: CharacterStepPanelProps) {
  const isFullyDone =
    step5State.status === 'done' && step6State.status === 'done'

  const characters = step5State.llmResponse
    ? extractCharacterPrompts(step5State.llmResponse)
    : []

  const [characterUrls, setCharacterUrls] = useState<string[]>(() => {
    const source = step6State.outputAssetUrl ?? ''
    return source ? source.split('\n').map(u => u.trim()) : []
  })

  function updateCharacterUrl(i: number, url: string) {
    setCharacterUrls(prev => {
      const next = [...prev]
      next[i] = url
      return next
    })
  }

  const allReady =
    characters.length > 0 &&
    characters.every((_, i) => !!characterUrls[i]?.trim())

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      {/* Step header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>Step 5 of 11</span>
          <span>·</span>
          <span>Midjourney / DALL-E</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Character Images
        </h2>
      </div>

      {/* Done state */}
      {isFullyDone && (
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

          {/* Read-only character cards */}
          <div className="flex flex-col gap-3">
            {(() => {
              const doneUrls = (step6State.outputAssetUrl ?? '')
                .split('\n')
                .map(u => u.trim())
                .filter(Boolean)
              return characters.map((char, i) => (
                <div
                  key={i}
                  className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-3"
                >
                  <p className="mb-1 text-[12px] font-medium text-zinc-600">
                    {char.name}
                  </p>
                  <pre className="mb-3 font-sans text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-500">
                    {char.prompt}
                  </pre>
                  {doneUrls[i] && (
                    <>
                      <a
                        href={doneUrls[i]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Image
                          src={doneUrls[i]}
                          alt={char.name}
                          width={120}
                          height={210}
                          className="rounded-[6px] object-cover"
                        />
                      </a>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[12px] text-green-600">
                          ✓ Generated
                        </span>
                        <a
                          href={doneUrls[i]}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-[6px] border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                        >
                          ↓ Download
                        </a>
                      </div>
                    </>
                  )}
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* State: no LLM output yet */}
      {!isFullyDone &&
        step5State.status === 'pending' &&
        !step5State.llmResponse &&
        !step5State.error && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-[13px] text-zinc-500">
              Ready to generate character prompts.
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
      {!isFullyDone && step5State.status === 'generating' && (
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
          <p className="text-[13px] text-zinc-500">Generating prompts…</p>
        </div>
      )}

      {/* State: has LLM output (pending or step5 done but step6 pending) */}
      {!isFullyDone && step5State.llmResponse && (
        <div className="flex flex-col gap-4">
          {/* Error from LLM */}
          {step5State.error && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{step5State.error}</p>
            </div>
          )}

          {/* Character cards with image generation */}
          {characters.length > 0 ? (
            characters.map((char, i) => (
              <div
                key={i}
                className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-3"
              >
                <p className="mb-1 text-[12px] font-medium text-zinc-600">
                  {char.name}
                </p>
                <pre className="mb-3 font-sans text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-500">
                  {char.prompt}
                </pre>

                {/* Image preview */}
                {characterUrls[i]?.trim() && (
                  <div className="mb-3">
                    <a
                      href={characterUrls[i]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Image
                        src={characterUrls[i]}
                        alt={char.name}
                        width={120}
                        height={210}
                        className="rounded-[6px] object-cover"
                      />
                    </a>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[12px] text-green-600">
                        ✓ Generated
                      </span>
                      <a
                        href={characterUrls[i]}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[6px] border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                      >
                        ↓ Download
                      </a>
                    </div>
                  </div>
                )}

                <DalleGenerateButton
                  prompt={char.prompt}
                  onGenerated={url => updateCharacterUrl(i, url)}
                />

                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Or paste image URL manually…"
                    value={characterUrls[i] ?? ''}
                    onChange={e => updateCharacterUrl(i, e.target.value)}
                    className="w-full rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-indigo-400"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3">
              <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-zinc-800">
                {step5State.llmResponse}
              </pre>
            </div>
          )}

          {/* Prompt refinement — only when LLM step is still pending */}
          {step5State.status === 'pending' && (
            <>
              <div className="flex gap-2">
                <textarea
                  value={followUp}
                  onChange={e => onFollowUpChange(e.target.value)}
                  placeholder="Refine character prompts… e.g. add more characters, change style"
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
              <div>
                <button
                  onClick={onRetry}
                  className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
                >
                  ↺ Start fresh
                </button>
              </div>
            </>
          )}

          {/* Approve button */}
          <button
            onClick={() =>
              onApprove(
                characterUrls
                  .map(u => u.trim())
                  .filter(Boolean)
                  .join('\n')
              )
            }
            disabled={!allReady}
            className="self-start rounded-[6px] bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✓ Approve all images
          </button>
        </div>
      )}
    </div>
  )
}
