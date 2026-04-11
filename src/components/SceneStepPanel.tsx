'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  outputAssetUrl: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

interface SceneStepPanelProps {
  stepState: StepState
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: (imageUrls: string) => void
  onReopen: () => void
}

interface SceneParsed {
  sceneNumber: number
  title: string
  lyric: string
  prompt: string
  refUrls: string[] // image reference URLs found inside the prompt
}

function extractScenePrompts(text: string): SceneParsed[] {
  const blocks = text.split(/(?=\*\*Scene \d+)/)
  return blocks
    .filter(block => /^\*\*Scene \d+/.test(block.trim()))
    .map(block => {
      const headerMatch = block.match(/\*\*Scene (\d+)\s*[—-]\s*([^*\n]+)\*\*/)
      const sceneNumber = headerMatch ? parseInt(headerMatch[1], 10) : 0
      const title = headerMatch?.[2]?.trim() ?? ''

      const lyricMatch = block.match(/Lyric:\s*"([^"]+)"/)
      const lyric = lyricMatch?.[1] ?? ''

      const promptMatch = block.match(/Prompt:\s*([\s\S]+?)(?=\n\n|\n\*\*|$)/)
      const prompt = promptMatch?.[1]?.trim().replace(/\n+/g, ' ') ?? ''

      const refUrls = prompt.match(/https?:\/\/\S+/g) ?? []

      return { sceneNumber, title, lyric, prompt, refUrls }
    })
    .filter(s => s.sceneNumber > 0)
}

function DalleGenerateButton({
  getPrompt,
  onGenerated,
}: {
  getPrompt: () => string
  onGenerated: (url: string) => void
}) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setStatus('generating')
    setError(null)
    const res = await fetch('/api/v1/workflow/dalle/generate', {
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

export function SceneStepPanel({
  stepState,
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
}: SceneStepPanelProps) {
  const isDone = stepState.status === 'done'

  const scenes = stepState.llmResponse
    ? extractScenePrompts(stepState.llmResponse)
    : []

  // Editable prompts — initialised once when LLM output arrives
  const [scenePrompts, setScenePrompts] = useState<string[]>(() =>
    stepState.llmResponse ? extractScenePrompts(stepState.llmResponse).map(s => s.prompt) : []
  )

  // Generated / pasted image URLs per scene
  const [sceneUrls, setSceneUrls] = useState<string[]>(() => {
    const source = stepState.outputAssetUrl ?? ''
    return source ? source.split('\n').map(u => u.trim()) : []
  })

  // Sync scenePrompts when LLM output first arrives (or after retry)
  useEffect(() => {
    if (stepState.llmResponse) {
      setScenePrompts(extractScenePrompts(stepState.llmResponse).map(s => s.prompt))
    }
  }, [stepState.llmResponse])

  function updateSceneUrl(i: number, url: string) {
    setSceneUrls(prev => {
      const next = [...prev]
      next[i] = url
      return next
    })
  }

  function updateScenePrompt(i: number, value: string) {
    setScenePrompts(prev => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  const allReady =
    scenes.length > 0 && scenes.every((_, i) => !!sceneUrls[i]?.trim())

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      {/* Step header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>Step 7 of 11</span>
          <span>·</span>
          <span>DALL-E / Midjourney</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Scene Images
        </h2>
      </div>

      {/* Done state */}
      {isDone && (
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
                    {scene.title ? ` — ${scene.title}` : ''}
                  </p>
                  {scene.lyric && (
                    <p className="mb-2 text-[11px] text-zinc-400 italic">
                      &ldquo;{scene.lyric}&rdquo;
                    </p>
                  )}
                  <pre className="mb-3 font-sans text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-500">
                    {scenePrompts[i] ?? scene.prompt}
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
                          alt={`Scene ${scene.sceneNumber}`}
                          width={90}
                          height={160}
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
              className="rounded-[6px] bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
            >
              Generate
            </button>
          </div>
        )}

      {/* State: generating */}
      {!isDone && stepState.status === 'generating' && (
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

          {/* Scene cards */}
          {scenes.length > 0 ? (
            scenes.map((scene, i) => (
              <div
                key={i}
                className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-3"
              >
                {/* Scene header */}
                <p className="mb-0.5 text-[12px] font-semibold text-zinc-700">
                  Scene {scene.sceneNumber}
                  {scene.title ? ` — ${scene.title}` : ''}
                </p>
                {scene.lyric && (
                  <p className="mb-2 text-[11px] text-zinc-400 italic">
                    &ldquo;{scene.lyric}&rdquo;
                  </p>
                )}

                {/* Character reference thumbnails */}
                {scene.refUrls.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {scene.refUrls.map((url, ri) => (
                      <a
                        key={ri}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Character reference"
                      >
                        <Image
                          src={url}
                          alt={`Character ref ${ri + 1}`}
                          width={28}
                          height={48}
                          className="rounded object-cover opacity-80 ring-1 ring-zinc-200 transition-opacity hover:opacity-100"
                        />
                      </a>
                    ))}
                    <span className="self-end text-[11px] text-zinc-400">
                      character refs
                    </span>
                  </div>
                )}

                {/* Editable prompt */}
                <textarea
                  value={scenePrompts[i] ?? scene.prompt}
                  onChange={e => updateScenePrompt(i, e.target.value)}
                  rows={3}
                  className="mb-3 w-full resize-none rounded-[6px] border border-zinc-200 bg-white px-3 py-2 font-sans text-[12px] leading-relaxed text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-indigo-400"
                />

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
                      <span className="text-[12px] text-green-600">
                        ✓ Generated
                      </span>
                      <a
                        href={sceneUrls[i]}
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

                {/* Generate + URL input row */}
                <div className="flex flex-col gap-2">
                  <DalleGenerateButton
                    getPrompt={() => scenePrompts[i] ?? scene.prompt}
                    onGenerated={url => updateSceneUrl(i, url)}
                  />
                  <input
                    type="text"
                    placeholder="Or paste image URL manually…"
                    value={sceneUrls[i] ?? ''}
                    onChange={e => updateSceneUrl(i, e.target.value)}
                    className="w-full rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-indigo-400"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3">
              <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap text-zinc-800">
                {stepState.llmResponse}
              </pre>
            </div>
          )}

          {/* Prompt refinement — only while LLM step is still pending */}
          {stepState.status === 'pending' && (
            <>
              <div className="flex gap-2">
                <textarea
                  value={followUp}
                  onChange={e => onFollowUpChange(e.target.value)}
                  placeholder="Refine scene prompts… e.g. more close-up shots, darker mood"
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
                sceneUrls
                  .map(u => u.trim())
                  .filter(Boolean)
                  .join('\n')
              )
            }
            disabled={!allReady}
            className="self-start rounded-[6px] bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✓ Approve all scenes
          </button>
        </div>
      )}
    </div>
  )
}
