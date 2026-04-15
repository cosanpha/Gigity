'use client'

import { PasteOnlyUrlInput } from '@/components/ui/PasteOnlyUrlInput'
import { CHARACTER_IMAGE_STYLES } from '@/constants/character-image-styles'
import { apiFetch } from '@/lib/api-fetch'
import { isHttpOrHttpsUrl } from '@/lib/is-http-url'
import { StepState, WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'
import { LucideCheck, LucideRefreshCw } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { CloudinaryImageUploadButton } from './CloudinaryImageUploadButton'
import { CopyButton } from './LLMStepPanel'
import { StepLlmModelCaption } from './StepLlmModelCaption'
import { GenerateSpinner } from './ui/GenerateSpinner'
import { StepActionFooter } from './ui/StepActionFooter'

interface CharacterStepPanelProps {
  projectId: string
  stepState: StepState
  characterStyle: string
  onCharacterStyleChange: (value: string) => void
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: (imageUrls: string) => void
  onReopen: () => void
  onContentChange: (content: string) => void
  onPersistOutput: (outputAssetUrl: string | null) => void
  llmModel?: string | null
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
    const promptMatch = block.match(/DALL-E prompt:\s*([\s\S]*)/i)
    const prompt = promptMatch?.[1]?.trimEnd() ?? ''
    return { name, prompt }
  })
}

const CHARACTER_BLOCK_SEP = '**Character - '

function CharacterStyleSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex w-full max-w-md flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[12px] font-medium text-zinc-600"
      >
        Visual style
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-[6px] border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-800 outline-none focus:border-orange-400"
      >
        {CHARACTER_IMAGE_STYLES.map(opt => (
          <option
            key={opt.value}
            value={opt.value}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function replaceCharacterDallePrompt(
  fullText: string,
  characterIndex: number,
  newPrompt: string
): string {
  const parts = fullText.split(CHARACTER_BLOCK_SEP)
  const i = characterIndex + 1
  if (i <= 0 || i >= parts.length) return fullText
  const next = parts[i].replace(/DALL-E prompt:\s*[\s\S]*$/i, () => {
    return `DALL-E prompt: ${newPrompt}`
  })
  if (next === parts[i] && !/DALL-E prompt:/.test(parts[i])) {
    return fullText
  }
  parts[i] = next
  return parts.join(CHARACTER_BLOCK_SEP)
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
    const res = await apiFetch('/api/v1/workflow/dalle/generate', {
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
        className="w-fit rounded-[6px] bg-orange-500 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
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
  projectId,
  stepState,
  characterStyle,
  onCharacterStyleChange,
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
  onContentChange,
  onPersistOutput,
  llmModel,
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

  const [regenBusyByIndex, setRegenBusyByIndex] = useState<
    Record<number, boolean>
  >({})
  const [regenErrByIndex, setRegenErrByIndex] = useState<
    Record<number, string>
  >({})

  async function regeneratePromptForCharacter(
    i: number,
    name: string,
    prompt: string
  ) {
    setRegenErrByIndex(prev => ({ ...prev, [i]: '' }))
    setRegenBusyByIndex(prev => ({ ...prev, [i]: true }))
    const res = await apiFetch(
      `/api/v1/projects/${projectId}/steps/5/regenerate-character-prompt`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: name,
          currentPrompt: prompt,
          characterStyle,
        }),
      }
    )
    const data = await res.json().catch(() => ({}))
    setRegenBusyByIndex(prev => ({ ...prev, [i]: false }))
    if (!res.ok || typeof data.prompt !== 'string') {
      setRegenErrByIndex(prev => ({
        ...prev,
        [i]:
          typeof data.error === 'string' ? data.error : 'Regeneration failed',
      }))
      return
    }
    const next = replaceCharacterDallePrompt(
      stepState.llmResponse ?? '',
      i,
      data.prompt
    )
    onContentChange(next)
  }

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      {/* Step header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>Step 5 of {WORKFLOW_TOTAL_STEPS}</span>
          <span>·</span>
          <span>DALL-E</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Character Images
        </h2>
        <StepLlmModelCaption model={llmModel} />
      </div>

      {!isFullyDone && (
        <div className="mb-4">
          <CharacterStyleSelect
            id="character-style-top"
            value={characterStyle}
            onChange={onCharacterStyleChange}
          />
        </div>
      )}

      {/* Done state */}
      {isFullyDone && (
        <div>
          <div className="mb-4">
            <p className="text-[13px] text-green-600">
              Approved - Re-open to edit the character prompts and image links.
            </p>
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
                  {doneUrls[i]?.trim() && !isHttpOrHttpsUrl(doneUrls[i]) && (
                    <p className="mb-2 text-[12px] text-red-500">
                      This value is not a valid URL. Paste a link starting with
                      https:// to preview the image.
                    </p>
                  )}
                  {doneUrls[i]?.trim() && isHttpOrHttpsUrl(doneUrls[i]) && (
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
                        <span className="flex items-center gap-1 text-[12px] text-green-600">
                          <LucideCheck
                            className="h-3.5 w-3.5"
                            aria-hidden
                          />
                          Generated
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
          <StepActionFooter
            rightActions={
              <button
                onClick={onReopen}
                className="rounded-[6px] border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                Re-open
              </button>
            }
          />
        </div>
      )}

      {/* State: no LLM output yet */}
      {!isFullyDone &&
        stepState.status === 'pending' &&
        !stepState.llmResponse &&
        !stepState.error && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-[13px] text-zinc-500">
              Choose a look, then generate character prompts.
            </p>
            <button
              onClick={onGenerate}
              className="rounded-[6px] bg-orange-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            >
              Generate
            </button>
          </div>
        )}

      {/* State: generating */}
      {!isFullyDone && stepState.status === 'generating' && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <GenerateSpinner />
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        regeneratePromptForCharacter(i, char.name, char.prompt)
                      }
                      disabled={Boolean(regenBusyByIndex[i])}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-zinc-200 bg-white px-2 py-1 text-[12px] text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Re-generate prompt"
                    >
                      <LucideRefreshCw
                        className={`h-3.5 w-3.5 ${regenBusyByIndex[i] ? 'animate-spin' : ''}`}
                        aria-hidden
                      />
                      <span className="hidden sm:inline">
                        {regenBusyByIndex[i]
                          ? 'Regenerating…'
                          : 'Re-generate prompt'}
                      </span>
                    </button>
                    <CopyButton text={char.prompt} />
                  </div>
                </div>
                <textarea
                  value={char.prompt}
                  onChange={e => {
                    const next = replaceCharacterDallePrompt(
                      stepState.llmResponse ?? '',
                      i,
                      e.target.value
                    )
                    onContentChange(next)
                  }}
                  rows={5}
                  spellCheck={false}
                  className="mb-3 w-full resize-y rounded-[6px] border border-zinc-200 bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-800 outline-none focus:border-orange-400"
                />
                {regenErrByIndex[i] ? (
                  <p className="mb-2 text-[12px] text-red-500">
                    {regenErrByIndex[i]}
                  </p>
                ) : null}

                {characterUrls[i]?.trim() &&
                  !isHttpOrHttpsUrl(characterUrls[i]) && (
                    <p className="mb-2 text-[12px] text-red-500">
                      This value is not a valid URL. Paste a link starting with
                      https:// to preview the image.
                    </p>
                  )}
                {characterUrls[i]?.trim() &&
                  isHttpOrHttpsUrl(characterUrls[i]) && (
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
                        <span className="flex items-center gap-1 text-[12px] text-green-600">
                          <LucideCheck
                            className="h-3.5 w-3.5"
                            aria-hidden
                          />
                          Generated
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
                  <CloudinaryImageUploadButton
                    onUploaded={url => updateCharacterUrl(i, url)}
                  />
                  <DalleGenerateButton
                    prompt={char.prompt}
                    onGenerated={url => updateCharacterUrl(i, url)}
                  />
                </div>

                <div className="mt-2">
                  <PasteOnlyUrlInput
                    placeholder="Paste image URL here (typing disabled)…"
                    value={characterUrls[i] ?? ''}
                    onValueChange={v => updateCharacterUrl(i, v)}
                    className="w-full rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-[13px] text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-orange-400"
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
                className="w-full resize-y rounded-[6px] border border-zinc-200 bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-800 outline-none focus:border-orange-400"
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
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" />
            </>
          )}

          <StepActionFooter
            leftActions={
              stepState.status === 'pending' ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="w-fit rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
                >
                  Start fresh
                </button>
              ) : null
            }
            rightActions={
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
                className="inline-flex items-center gap-2 rounded-[6px] bg-orange-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LucideCheck
                  className="h-4 w-4"
                  aria-hidden
                />
                Approve all images
              </button>
            }
          />
        </div>
      )}
    </div>
  )
}

