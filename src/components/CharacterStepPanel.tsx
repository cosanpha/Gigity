'use client'

import { WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'
import Image from 'next/image'
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { CopyButton } from './LLMStepPanel'

type CharacterStepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  outputAssetUrl: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

interface CharacterStepPanelProps {
  stepState: CharacterStepState
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: (imageUrls: string) => void
  onReopen: () => void
  onContentChange: (content: string) => void
  onPersistOutput: (outputAssetUrl: string | null) => void
}

function alignedCharacterSlots(raw: string | null, count: number): string[] {
  const lines = (raw ?? '').split('\n')
  return Array.from({ length: count }, (_, i) => lines[i] ?? '')
}

function extractCharacterPrompts(
  text: string
): Array<{ name: string; prompt: string }> {
  const blocks = text.split(/\*\*Character - /).slice(1)
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

const CHARACTER_BLOCK_SEP = '**Character - '

function replaceCharacterMidjourneyPrompt(
  fullText: string,
  characterIndex: number,
  newPrompt: string
): string {
  const parts = fullText.split(CHARACTER_BLOCK_SEP)
  const i = characterIndex + 1
  if (i <= 0 || i >= parts.length) return fullText
  const next = parts[i].replace(/Midjourney prompt:\s*[^\n]*/, () => {
    return `Midjourney prompt: ${newPrompt}`
  })
  if (next === parts[i] && !/Midjourney prompt:/.test(parts[i])) {
    return fullText
  }
  parts[i] = next
  return parts.join(CHARACTER_BLOCK_SEP)
}

function CharacterImageFileUploadButton({
  onUploaded,
}: {
  onUploaded: (url: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Choose an image file (e.g. PNG, JPEG, WebP).')
      return
    }
    setBusy(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch('/api/v1/workflow/cloudinary/upload-image-file', {
      method: 'POST',
      body: fd,
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok && typeof data.url === 'string') {
      onUploaded(data.url)
    } else {
      setUploadError(
        typeof data.error === 'string' ? data.error : 'Upload failed'
      )
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.avif"
        className="sr-only"
        onChange={onFileChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        className="w-fit rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            Uploading…
          </span>
        ) : (
          'Choose image file…'
        )}
      </button>
      {uploadError ? (
        <p className="text-[12px] text-red-500">{uploadError}</p>
      ) : null}
    </div>
  )
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
          'Re-generate'
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
  stepState,
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
  onContentChange,
  onPersistOutput,
}: CharacterStepPanelProps) {
  const isFullyDone =
    stepState.status === 'done' && Boolean(stepState.outputAssetUrl?.trim())

  const characters = stepState.llmResponse
    ? extractCharacterPrompts(stepState.llmResponse)
    : []

  const characterUrls = useMemo(
    () => alignedCharacterSlots(stepState.outputAssetUrl, characters.length),
    [stepState.outputAssetUrl, characters.length]
  )

  function updateCharacterUrl(i: number, url: string) {
    const slots = alignedCharacterSlots(
      stepState.outputAssetUrl,
      characters.length
    )
    const next = [...slots]
    next[i] = url
    const joined = next.join('\n')
    onPersistOutput(/[^\s]/.test(joined) ? joined : null)
  }

  const allReady =
    characters.length > 0 &&
    characters.every((_, i) => !!characterUrls[i]?.trim())

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      {/* Step header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>Step 5 of {WORKFLOW_TOTAL_STEPS}</span>
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
              className="bg-secondary cursor-pointer rounded-lg px-2 py-1 text-[13px] text-zinc-400 transition-colors hover:text-zinc-600"
            >
              Re-open
            </button>
          </div>

          {/* Read-only character cards */}
          <div className="flex flex-col gap-3">
            {(() => {
              const doneUrls = (stepState.outputAssetUrl ?? '')
                .split('\n')
                .map(u => u.trim())
                .filter(Boolean)
              return characters.map((char, i) => (
                <div
                  key={i}
                  className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-zinc-600">
                      {char.name}
                    </p>
                    <CopyButton text={char.prompt} />
                  </div>
                  <textarea
                    value={char.prompt}
                    readOnly
                    rows={4}
                    spellCheck={false}
                    className="mb-3 w-full resize-y rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-700 outline-none read-only:bg-zinc-50 read-only:text-zinc-700"
                  />
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
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-[6px] border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                        >
                          Open
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
        stepState.status === 'pending' &&
        !stepState.llmResponse &&
        !stepState.error && (
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
      {!isFullyDone && stepState.status === 'generating' && (
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
      {!isFullyDone && stepState.llmResponse && (
        <div className="flex flex-col gap-4">
          {/* Error from LLM */}
          {stepState.error && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{stepState.error}</p>
            </div>
          )}

          {/* Character cards with image generation */}
          {characters.length > 0 ? (
            characters.map((char, i) => (
              <div
                key={i}
                className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-zinc-600">
                    {char.name}
                  </p>
                  <CopyButton text={char.prompt} />
                </div>
                <textarea
                  value={char.prompt}
                  onChange={e => {
                    const next = replaceCharacterMidjourneyPrompt(
                      stepState.llmResponse ?? '',
                      i,
                      e.target.value
                    )
                    onContentChange(next)
                  }}
                  rows={5}
                  spellCheck={false}
                  className="mb-3 w-full resize-y rounded-[6px] border border-zinc-200 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-800 outline-none focus:border-indigo-400"
                />

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
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[6px] border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-start gap-3">
                  <CharacterImageFileUploadButton
                    onUploaded={url => updateCharacterUrl(i, url)}
                  />
                  <DalleGenerateButton
                    prompt={char.prompt}
                    onGenerated={url => updateCharacterUrl(i, url)}
                  />
                </div>

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
            <div className="flex flex-col gap-2">
              <div className="flex justify-end">
                <CopyButton text={stepState.llmResponse ?? ''} />
              </div>
              <textarea
                value={stepState.llmResponse ?? ''}
                onChange={e => onContentChange(e.target.value)}
                rows={18}
                spellCheck={false}
                className="w-full resize-y rounded-[6px] border border-zinc-200 bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-800 outline-none focus:border-indigo-400"
              />
            </div>
          )}

          {/* Prompt refinement - only when LLM step is still pending */}
          {stepState.status === 'pending' && (
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
                  Start fresh
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
