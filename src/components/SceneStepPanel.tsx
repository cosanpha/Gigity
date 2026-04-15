'use client'

import { apiFetch } from '@/lib/api-fetch'
import {
  CLOUDINARY_CLOUD_NAME_PUBLIC,
  partitionPromptUrlsForCloudinaryRefs,
} from '@/lib/cloudinary-client'
import { isHttpOrHttpsUrl } from '@/lib/is-http-url'
import { StepState, WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'
import { LucideCheck, LucideRefreshCw } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { CloudinaryImageUploadButton } from './CloudinaryImageUploadButton'
import { CopyButton } from './ui/CopyButton'
import { StepLlmModelCaption } from './StepLlmModelCaption'
import { GenerateSpinner } from './ui/GenerateSpinner'
import { PasteOnlyUrlInput } from './ui/PasteOnlyUrlInput'
import { StepActionFooter } from './ui/StepActionFooter'

interface SceneStepPanelProps {
  projectId: string
  stepState: StepState
  /** Approved character image URLs from step 6 - shown as reliable refs (avoids broken LLM-parsed links). */
  characterImageUrls?: string[]
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

interface SceneParsed {
  sceneNumber: number
  title: string
  lyric: string
  prompt: string
}

function extractScenePrompts(text: string): SceneParsed[] {
  const blocks = text.split(/(?=\*\*Scene \d+)/)
  return blocks
    .filter(block => /^\*\*Scene \d+/.test(block.trim()))
    .map(block => {
      const headerMatch = block.match(/\*\*Scene (\d+)\s*[--]\s*([^*\n]+)\*\*/)
      const sceneNumber = headerMatch ? parseInt(headerMatch[1], 10) : 0
      const title = headerMatch?.[2]?.trim() ?? ''

      const lyricMatch = block.match(/Lyric:\s*"([^"]+)"/)
      const lyric = lyricMatch?.[1] ?? ''

      const promptMatch = block.match(/Prompt:\s*([\s\S]+?)(?=\n\n|\n\*\*|$)/)
      const prompt = promptMatch?.[1]?.trim().replace(/\n+/g, ' ') ?? ''

      return { sceneNumber, title, lyric, prompt }
    })
    .filter(s => s.sceneNumber > 0)
}

function replaceNthScenePrompt(
  fullText: string,
  sceneIndex: number,
  newPrompt: string
): string {
  const blocks = fullText.split(/(?=\*\*Scene \d+)/)
  const sceneBlockIndices: number[] = []
  blocks.forEach((block, idx) => {
    if (/^\*\*Scene \d+/.test(block.trim())) sceneBlockIndices.push(idx)
  })
  const bi = sceneBlockIndices[sceneIndex]
  if (bi === undefined) return fullText
  const old = blocks[bi]
  const promptRe = /Prompt:\s*([\s\S]+?)(?=\n\n|\n\*\*|$)/
  let replaced = old.replace(promptRe, `Prompt: ${newPrompt}`)
  if (replaced === old) {
    replaced = old.replace(/Prompt:\s*[^\n]*/, `Prompt: ${newPrompt}`)
  }
  blocks[bi] = replaced
  return blocks.join('')
}

function alignedSceneSlots(raw: string | null, count: number): string[] {
  const lines = (raw ?? '').split('\n')
  return Array.from({ length: count }, (_, i) => lines[i] ?? '')
}

function DalleGenerateButton({
  getPrompt,
  onGenerated,
}: {
  getPrompt: () => string
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
      body: JSON.stringify({ prompt: getPrompt(), size: '1024x1792' }),
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

function ReferenceThumb({ url, label }: { url: string; label: string }) {
  if (!isHttpOrHttpsUrl(url)) {
    return (
      <span
        className="inline-flex max-w-[72px] items-center rounded border border-red-200 bg-red-50 px-1 py-0.5 text-[10px] leading-tight text-red-600"
        title={url}
      >
        Bad link
      </span>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className="inline-block shrink-0 overflow-hidden rounded object-cover opacity-90 ring-1 ring-zinc-200 transition-opacity hover:opacity-100"
    >
      <Image
        src={url}
        alt={`${label} reference`}
        width={56}
        height={96}
        loading="lazy"
        decoding="async"
        className="h-[96px] w-[56px] object-cover"
      />
    </a>
  )
}

export function SceneStepPanel({
  projectId,
  stepState,
  characterImageUrls = [],
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
}: SceneStepPanelProps) {
  const isDone = stepState.status === 'done'

  const scenes = stepState.llmResponse
    ? extractScenePrompts(stepState.llmResponse)
    : []

  const sceneUrls = useMemo(
    () => alignedSceneSlots(stepState.outputAssetUrl, scenes.length),
    [stepState.outputAssetUrl, scenes.length]
  )

  function updateSceneUrl(i: number, url: string) {
    const slots = alignedSceneSlots(stepState.outputAssetUrl, scenes.length)
    const next = [...slots]
    next[i] = url
    const joined = next.join('\n')
    onPersistOutput(/[^\s]/.test(joined) ? joined : null)
  }

  function updateScenePrompt(i: number, value: string) {
    onContentChange(
      replaceNthScenePrompt(stepState.llmResponse ?? '', i, value)
    )
  }

  const allReady =
    scenes.length > 0 && scenes.every((_, i) => !!sceneUrls[i]?.trim())

  const [regenBusyByIndex, setRegenBusyByIndex] = useState<Record<number, boolean>>({})
  const [regenErrByIndex, setRegenErrByIndex] = useState<Record<number, string>>({})

  async function regeneratePromptForScene(
    i: number,
    sceneTitle: string,
    sceneLyric: string,
    currentPrompt: string
  ) {
    setRegenErrByIndex(prev => ({ ...prev, [i]: '' }))
    setRegenBusyByIndex(prev => ({ ...prev, [i]: true }))
    const res = await apiFetch(
      `/api/v1/projects/${projectId}/steps/6/regenerate-scene-prompt`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneTitle,
          sceneLyric,
          currentPrompt,
        }),
      }
    )
    const data = await res.json().catch(() => ({}))
    setRegenBusyByIndex(prev => ({ ...prev, [i]: false }))
    if (!res.ok || typeof data.prompt !== 'string') {
      setRegenErrByIndex(prev => ({
        ...prev,
        [i]: typeof data.error === 'string' ? data.error : 'Regeneration failed',
      }))
      return
    }
    updateScenePrompt(i, data.prompt)
  }

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      {/* Step header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>Step 6 of {WORKFLOW_TOTAL_STEPS}</span>
          <span>·</span>
          <span>DALL-E</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Scene Images
        </h2>
        <StepLlmModelCaption model={llmModel} />
      </div>

      {/* Done state */}
      {isDone && (
        <div>
          <div className="mb-4">
            <p className="text-[13px] text-green-600">
              Approved - Re-open to edit the scene prompts and image links.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {(() => {
              const doneUrls = (stepState.outputAssetUrl ?? '')
                .split('\n')
                .map(u => u.trim())
                .filter(Boolean)
              return scenes.map((scene, i) => (
                <div
                  key={i}
                  className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-3"
                >
                  <p className="mb-0.5 text-[12px] font-semibold text-zinc-700">
                    Scene {scene.sceneNumber}
                    {scene.title ? ` - ${scene.title}` : ''}
                  </p>
                  {scene.lyric && (
                    <p className="mb-2 text-[11px] text-zinc-400 italic">
                      &ldquo;{scene.lyric}&rdquo;
                    </p>
                  )}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-500">DALL-E prompt</span>
                    <CopyButton text={scene.prompt} />
                  </div>
                  <pre className="mb-2 font-sans text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-500">
                    {scene.prompt}
                  </pre>
                  {(() => {
                    const live = scene.prompt
                    const { validCloudinaryImageRefs } =
                      partitionPromptUrlsForCloudinaryRefs(live)
                    if (validCloudinaryImageRefs.length === 0) return null
                    return (
                      <div className="mb-3 flex flex-wrap items-end gap-1.5">
                        {validCloudinaryImageRefs.map((url, ri) => (
                          <ReferenceThumb
                            key={`done-${url}-${ri}`}
                            url={url}
                            label={`Cloudinary reference ${ri + 1}`}
                          />
                        ))}
                        <span className="text-[11px] text-zinc-400">
                          Cloudinary refs in prompt
                        </span>
                      </div>
                    )
                  })()}
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
                          alt={`Scene ${scene.sceneNumber}`}
                          width={90}
                          height={160}
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
      {!isDone &&
        stepState.status === 'pending' &&
        !stepState.llmResponse &&
        !stepState.error && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-[13px] text-zinc-500">
              Ready to generate scene image prompts.
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
      {!isDone && stepState.status === 'generating' && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <GenerateSpinner />
          <p className="text-[13px] text-zinc-500">Generating scene prompts…</p>
        </div>
      )}

      {/* State: has LLM output */}
      {!isDone && stepState.llmResponse && (
        <div className="flex flex-col gap-4">
          {/* Error from LLM */}
          {stepState.error && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{stepState.error}</p>
            </div>
          )}

          {characterImageUrls.length > 0 && (
            <div className="rounded-[6px] border border-zinc-200 bg-white px-3 py-2">
              <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                Character images (step 6)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {characterImageUrls.map((url, ci) => (
                  <ReferenceThumb
                    key={`${url}-${ci}`}
                    url={url}
                    label={`Character ${ci + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {!CLOUDINARY_CLOUD_NAME_PUBLIC && (
            <p className="text-[11px] text-amber-700">
              Set{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px]">
                NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
              </code>{' '}
              (same as{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px]">
                CLOUDINARY_CLOUD_NAME
              </code>
              ) to restrict prompt references to your Cloudinary account.
            </p>
          )}

          {/* Scene cards */}
          {scenes.length > 0 ? (
            scenes.map((scene, i) => {
              const livePrompt = scene.prompt
              const { validCloudinaryImageRefs, otherHttpUrls } =
                partitionPromptUrlsForCloudinaryRefs(livePrompt)
              return (
                <div
                  key={i}
                  className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-3"
                >
                  {/* Scene header */}
                  <p className="mb-0.5 text-[12px] font-semibold text-zinc-700">
                    Scene {scene.sceneNumber}
                    {scene.title ? ` - ${scene.title}` : ''}
                  </p>
                  {scene.lyric && (
                    <p className="mb-2 text-[11px] text-zinc-400 italic">
                      &ldquo;{scene.lyric}&rdquo;
                    </p>
                  )}

                  {/* Editable prompt */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-500">DALL-E prompt</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          regeneratePromptForScene(
                            i,
                            scene.title,
                            scene.lyric,
                            livePrompt
                          )
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
                          {regenBusyByIndex[i] ? 'Regenerating…' : 'Re-generate prompt'}
                        </span>
                      </button>
                      <CopyButton text={livePrompt} />
                    </div>
                  </div>
                  <textarea
                    value={livePrompt}
                    onChange={e => updateScenePrompt(i, e.target.value)}
                    rows={3}
                    placeholder="Scene prompt - paste a Cloudinary image URL (…/image/upload/…) to preview it below."
                    className="mb-2 w-full resize-none rounded-[6px] border border-zinc-200 bg-white px-3 py-2 font-sans text-[12px] leading-relaxed text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-orange-400"
                  />
                  {regenErrByIndex[i] ? (
                    <p className="mb-2 text-[12px] text-red-500">
                      {regenErrByIndex[i]}
                    </p>
                  ) : null}

                  {validCloudinaryImageRefs.length > 0 && (
                    <div className="mb-2 flex flex-wrap items-end gap-1.5">
                      {validCloudinaryImageRefs.map((url, ri) => (
                        <ReferenceThumb
                          key={`${url}-${ri}`}
                          url={url}
                          label={`Cloudinary reference ${ri + 1}`}
                        />
                      ))}
                      <span className="text-[11px] text-zinc-400">
                        Cloudinary refs in prompt
                      </span>
                    </div>
                  )}

                  {otherHttpUrls.length > 0 && (
                    <p className="mb-3 text-[11px] text-amber-700">
                      {otherHttpUrls.length} link(s) in this prompt are not
                      accepted as reference images (need{' '}
                      <code className="rounded bg-amber-100 px-1 text-[10px]">
                        res.cloudinary.com/…/image/upload/…
                      </code>
                      {CLOUDINARY_CLOUD_NAME_PUBLIC
                        ? ` under cloud "${CLOUDINARY_CLOUD_NAME_PUBLIC}".`
                        : ').'}
                    </p>
                  )}

                  {/* Image preview */}
                  {sceneUrls[i]?.trim() && (
                    <div className="mb-3">
                      <a
                        href={sceneUrls[i]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Image
                          src={sceneUrls[i]}
                          alt={`Scene ${scene.sceneNumber}`}
                          width={90}
                          height={160}
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
                          href={sceneUrls[i]}
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
                      onUploaded={url => updateSceneUrl(i, url)}
                    />
                    <DalleGenerateButton
                      getPrompt={() => scene.prompt}
                      onGenerated={url => updateSceneUrl(i, url)}
                    />
                  </div>
                  <div className="mt-2">
                    <PasteOnlyUrlInput
                      placeholder="Paste image URL here (typing disabled)…"
                      value={sceneUrls[i] ?? ''}
                      onValueChange={v => updateSceneUrl(i, v)}
                      className="w-full rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-[13px] text-zinc-700 outline-none focus:border-orange-400"
                    />
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3">
              <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-zinc-800">
                {stepState.llmResponse}
              </pre>
            </div>
          )}

          {/* Prompt refinement - only while LLM step is still pending */}
          {stepState.status === 'pending' && (
            <>
              <div className="flex gap-2">
                <textarea
                  value={followUp}
                  onChange={e => onFollowUpChange(e.target.value)}
                  placeholder="Refine scene prompts… e.g. more close-up shots, darker mood"
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
            </>
          )}

          <StepActionFooter
            leftActions={
              stepState.status === 'pending' ? (
                <button
                  onClick={onRetry}
                  className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
                >
                  Start fresh
                </button>
              ) : null
            }
            rightActions={
              <button
                onClick={() =>
                  onApprove(
                    sceneUrls
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
                Approve all scenes
              </button>
            }
          />
        </div>
      )}
    </div>
  )
}

