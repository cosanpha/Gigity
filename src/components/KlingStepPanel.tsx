'use client'

import { PasteOnlyUrlInput } from '@/components/ui/PasteOnlyUrlInput'
import { isLikelyCloudinaryVideoDeliveryUrl } from '@/lib/cloudinary-client'
import {
  extractKlingScenesForEdit,
  replaceKlingScenePrompt,
} from '@/lib/kling-scenes'
import { isProbablyVideoHttpUrl } from '@/lib/video-url'
import {
  StepDefinition,
  StepState,
  WORKFLOW_TOTAL_STEPS,
} from '@/lib/workflow-templates'
import { LucideCheck } from 'lucide-react'
import Image from 'next/image'
import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { CopyButton } from './ui/CopyButton'
import { GenerateSpinner } from './ui/GenerateSpinner'

function splitLines(raw: string | null): string[] {
  if (!raw?.trim()) return []
  return raw
    .split('\n')
    .map(u => u.trim())
    .filter(Boolean)
}

function slotCountForLlm(llm: string | null): number {
  const scenes = extractKlingScenesForEdit(llm ?? '')
  if (scenes.length > 0) return scenes.length
  return llm?.trim() ? 1 : 0
}

function alignedVideoSlots(raw: string | null, rowCount: number): string[] {
  const lines = (raw ?? '').split('\n')
  return Array.from({ length: rowCount }, (_, i) => lines[i] ?? '')
}

function step7RefUrl(
  sceneImageUrls: string[],
  sceneIndex: number,
  sceneNumber: number
): string | undefined {
  const byOrder = sceneImageUrls[sceneIndex]
  if (byOrder) return byOrder
  const n = sceneNumber - 1
  if (n >= 0 && n < sceneImageUrls.length) return sceneImageUrls[n]
  return undefined
}

function SceneReferenceThumb({ url, label }: { url: string; label: string }) {
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
        alt=""
        width={56}
        height={96}
        loading="lazy"
        decoding="async"
        className="h-[96px] w-[56px] object-cover"
      />
    </a>
  )
}

function SceneVideoSlot({
  url,
  onUrlChange,
}: {
  url: string
  onUrlChange: (v: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileBusy, setFileBusy] = useState(false)
  const [urlBusy, setUrlBusy] = useState(false)
  const busy = fileBusy || urlBusy
  const [uploadError, setUploadError] = useState<string | null>(null)
  const trimmed = url.trim()
  const localValid = Boolean(trimmed && isProbablyVideoHttpUrl(trimmed))
  const onCloudinary = Boolean(
    trimmed && isLikelyCloudinaryVideoDeliveryUrl(trimmed)
  )
  const canUploadPastedUrl = localValid && !onCloudinary

  async function uploadPastedUrlToCloudinary() {
    if (!canUploadPastedUrl) return
    setUrlBusy(true)
    setUploadError(null)
    const res = await fetch('/api/v1/workflow/cloudinary/upload-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: trimmed }),
    })
    const data = await res.json().catch(() => ({}))
    setUrlBusy(false)
    if (res.ok && typeof data.url === 'string') {
      onUrlChange(data.url)
    } else {
      setUploadError(
        typeof data.error === 'string' ? data.error : 'Upload failed'
      )
    }
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setUploadError('Choose a video file (e.g. MP4, WebM, MOV).')
      return
    }
    setFileBusy(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('video', file)
    const res = await fetch('/api/v1/workflow/cloudinary/upload-video-file', {
      method: 'POST',
      body: fd,
    })
    const data = await res.json().catch(() => ({}))
    setFileBusy(false)
    if (res.ok && typeof data.url === 'string') {
      onUrlChange(data.url)
    } else {
      setUploadError(
        typeof data.error === 'string' ? data.error : 'Upload failed'
      )
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.webm,.mov,.m4v"
        className="sr-only"
        onChange={onFileChange}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {fileBusy ? 'Uploading…' : 'Choose video file…'}
        </button>
        <button
          type="button"
          onClick={uploadPastedUrlToCloudinary}
          disabled={!canUploadPastedUrl || busy}
          className="rounded-[6px] bg-orange-500 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {urlBusy ? 'Uploading…' : 'Upload pasted URL to Cloudinary'}
        </button>
        {trimmed && !isProbablyVideoHttpUrl(trimmed) && (
          <span className="text-[11px] text-amber-700">
            Does not look like a video URL.
          </span>
        )}
        {localValid && !onCloudinary && (
          <span className="text-[11px] text-zinc-500">
            Optional - mirror pasted URL to Cloudinary, or keep as-is.
          </span>
        )}
      </div>
      {uploadError && <p className="text-[11px] text-red-600">{uploadError}</p>}
      {localValid && (
        <div className="overflow-hidden rounded-[6px] border border-zinc-100 bg-black">
          <video
            src={trimmed}
            controls
            className="max-h-[140px] w-full object-contain"
            playsInline
          />
        </div>
      )}
    </div>
  )
}

interface KlingStepPanelProps {
  stepDef: StepDefinition
  state: StepState
  /** Approved scene stills from step 7 - same order as scenes (line 1 = scene 1, …). */
  sceneImageUrls?: string[]
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: (videoUrlsJoined: string) => void
  onReopen: () => void
  onContentChange: (content: string) => void
  onPersistOutput: (outputAssetUrl: string | null) => void
}

export function KlingStepPanel({
  stepDef,
  state,
  sceneImageUrls = [],
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
  onContentChange,
  onPersistOutput,
}: KlingStepPanelProps) {
  const scenes = state.llmResponse
    ? extractKlingScenesForEdit(state.llmResponse)
    : []
  const unstructured = Boolean(state.llmResponse?.trim()) && scenes.length === 0
  const slotCount = unstructured ? 1 : Math.max(0, scenes.length)
  const videoRowCount = Math.max(1, slotCountForLlm(state.llmResponse))

  const sceneVideoUrls = useMemo(
    () => alignedVideoSlots(state.outputAssetUrl, videoRowCount),
    [state.outputAssetUrl, videoRowCount]
  )

  function setSceneVideo(i: number, v: string) {
    const slots = alignedVideoSlots(state.outputAssetUrl, videoRowCount)
    const next = [...slots]
    next[i] = v
    const joined = next.join('\n')
    onPersistOutput(/[^\s]/.test(joined) ? joined : null)
  }

  const allVideosReady =
    slotCount > 0 &&
    sceneVideoUrls.length >= slotCount &&
    Array.from({ length: slotCount }, (_, i) => sceneVideoUrls[i] ?? '').every(
      u => u.trim() && isProbablyVideoHttpUrl(u)
    )

  const isEmptyStart =
    state.status === 'pending' && !state.llmResponse && !state.error
  const isGenerating = state.status === 'generating'
  const isLocked = state.status === 'done'
  const showWorkspace =
    !isEmptyStart &&
    !isGenerating &&
    (Boolean(state.llmResponse) || Boolean(state.error) || isLocked)

  const doneVideoLines = splitLines(state.outputAssetUrl)
  const doneScenes = state.llmResponse
    ? extractKlingScenesForEdit(state.llmResponse)
    : []

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>
            Step {stepDef.stepNumber} of {WORKFLOW_TOTAL_STEPS}
          </span>
          <span>·</span>
          <span>{stepDef.tool}</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          {stepDef.title}
        </h2>
      </div>

      {isEmptyStart && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-[13px] text-zinc-500">
            Ready to generate KlingAI animation prompts.
          </p>
          <button
            type="button"
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
          <p className="text-[13px] text-zinc-500">Generating…</p>
        </div>
      )}

      {isLocked && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-green-600">
              Approved - Re-open to edit prompts or video links.
            </p>
            {state.llmResponse ? <CopyButton text={state.llmResponse} /> : null}
          </div>
          {doneScenes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {doneScenes.map((scene, i) => (
                <div
                  key={scene.sceneNumber}
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
                  <pre className="mb-3 font-sans text-[12px] leading-relaxed whitespace-pre-wrap text-zinc-700">
                    {scene.prompt}
                  </pre>
                  {(() => {
                    const refUrl = step7RefUrl(
                      sceneImageUrls,
                      i,
                      scene.sceneNumber
                    )
                    if (!refUrl) return null
                    return (
                      <div className="mb-3 flex flex-wrap items-end gap-2">
                        <SceneReferenceThumb
                          url={refUrl}
                          label={`Scene ${scene.sceneNumber} still (step 7)`}
                        />
                        <span className="text-[11px] text-zinc-400">
                          Reference still from step 7
                        </span>
                      </div>
                    )
                  })()}
                  {doneVideoLines[i] &&
                    isProbablyVideoHttpUrl(doneVideoLines[i]) && (
                      <div className="overflow-hidden rounded-[6px] border border-zinc-200 bg-black">
                        <video
                          src={doneVideoLines[i]}
                          controls
                          className="max-h-[140px] w-full object-contain"
                          playsInline
                        />
                      </div>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <textarea
                value={state.llmResponse ?? ''}
                readOnly
                rows={18}
                spellCheck={false}
                className="w-full resize-y rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-700 outline-none read-only:bg-zinc-50"
              />
              {doneVideoLines.length > 0 && (
                <div className="flex flex-col gap-2">
                  {doneVideoLines.map((u, i) =>
                    isProbablyVideoHttpUrl(u) ? (
                      <div
                        key={`${u}-${i}`}
                        className="overflow-hidden rounded-[6px] border border-zinc-200 bg-black"
                      >
                        <video
                          src={u}
                          controls
                          className="max-h-[140px] w-full object-contain"
                          playsInline
                        />
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onReopen}
            className="w-fit rounded-[6px] border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
          >
            Re-open
          </button>
        </div>
      )}

      {showWorkspace && !isLocked && (
        <div className="flex flex-col gap-5">
          {state.error && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{state.error}</p>
            </div>
          )}

          {state.llmResponse && slotCount > 0 && (
            <div className="flex flex-col gap-3">
              {unstructured ? (
                <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-zinc-600">
                      Kling prompts
                    </p>
                    <CopyButton text={state.llmResponse} />
                  </div>
                  {sceneImageUrls.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-end gap-2">
                      {sceneImageUrls.map((url, ri) => (
                        <SceneReferenceThumb
                          key={`${url}-${ri}`}
                          url={url}
                          label={`Scene ${ri + 1} still (step 7)`}
                        />
                      ))}
                      <span className="text-[11px] text-zinc-400">
                        Step 7 reference stills
                      </span>
                    </div>
                  )}
                  <textarea
                    value={state.llmResponse}
                    onChange={e => onContentChange(e.target.value)}
                    rows={14}
                    spellCheck={false}
                    className="mb-3 w-full resize-y rounded-[6px] border border-zinc-200 bg-white px-3 py-2 font-mono text-[12px] leading-relaxed text-zinc-800 outline-none focus:border-orange-400"
                  />
                  <p className="mb-1.5 text-[12px] font-medium text-zinc-600">
                    Video clip
                  </p>
                  <PasteOnlyUrlInput
                    value={sceneVideoUrls[0] ?? ''}
                    onValueChange={v => setSceneVideo(0, v)}
                    placeholder="Paste video URL (typing disabled)…"
                    className="mb-2 w-full rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-[13px] text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-orange-400"
                  />
                  <SceneVideoSlot
                    url={sceneVideoUrls[0] ?? ''}
                    onUrlChange={v => setSceneVideo(0, v)}
                  />
                </div>
              ) : (
                scenes.map((scene, i) => {
                  const livePrompt = scene.prompt
                  return (
                    <div
                      key={`${scene.sceneNumber}-${i}`}
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
                      {(() => {
                        const refUrl = step7RefUrl(
                          sceneImageUrls,
                          i,
                          scene.sceneNumber
                        )
                        if (!refUrl) return null
                        return (
                          <div className="mb-2 flex flex-wrap items-end gap-2">
                            <SceneReferenceThumb
                              url={refUrl}
                              label={`Scene ${scene.sceneNumber} still (step 7)`}
                            />
                            <span className="text-[11px] text-zinc-400">
                              Preferred reference from step 7
                            </span>
                          </div>
                        )
                      })()}
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="text-[11px] text-zinc-500">
                          KlingAI prompt
                        </span>
                        <CopyButton text={livePrompt} />
                      </div>
                      <textarea
                        value={livePrompt}
                        onChange={e => {
                          const next = replaceKlingScenePrompt(
                            state.llmResponse ?? '',
                            i,
                            e.target.value
                          )
                          onContentChange(next)
                        }}
                        rows={4}
                        spellCheck={false}
                        className="mb-3 w-full resize-y rounded-[6px] border border-zinc-200 bg-white px-3 py-2 font-sans text-[12px] leading-relaxed text-zinc-700 outline-none focus:border-orange-400"
                      />
                      <p className="mb-1.5 text-[12px] font-medium text-zinc-600">
                        Video clip URL
                      </p>
                      <PasteOnlyUrlInput
                        value={sceneVideoUrls[i] ?? ''}
                        onValueChange={v => setSceneVideo(i, v)}
                        placeholder="Paste video URL (typing disabled)…"
                        className="mb-2 w-full rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-[13px] text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-orange-400"
                      />
                      <SceneVideoSlot
                        url={sceneVideoUrls[i] ?? ''}
                        onUrlChange={v => setSceneVideo(i, v)}
                      />
                    </div>
                  )
                })
              )}
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              value={followUp}
              onChange={e => onFollowUpChange(e.target.value)}
              placeholder="Refine Kling prompts… e.g. slower camera, more dramatic lighting"
              rows={2}
              className="flex-1 resize-none rounded-[6px] border border-zinc-200 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={onSendFollowUp}
              disabled={!followUp.trim()}
              className="self-end rounded-[6px] border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Re-generate
            </button>
            <button
              type="button"
              onClick={() =>
                onApprove(
                  Array.from({ length: slotCount }, (_, i) =>
                    (sceneVideoUrls[i] ?? '').trim()
                  ).join('\n')
                )
              }
              disabled={!allVideosReady}
              className="inline-flex items-center gap-2 rounded-[6px] bg-orange-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LucideCheck
                className="h-4 w-4"
                aria-hidden
              />
              Approve
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
