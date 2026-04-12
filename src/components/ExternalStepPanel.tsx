'use client'

import { interpolate } from '@/lib/interpolate'
import { decodePublishLinks } from '@/lib/publish-links'
import {
  StepDefinition,
  StepState,
  WORKFLOW_TOTAL_STEPS,
} from '@/lib/workflow-templates'
import { strToU8, zip } from 'fflate'
import {
  LucideAlertTriangle,
  LucideArrowUpRight,
  LucideCheck,
  LucideChevronDown,
  LucideChevronRight,
  LucideDownload,
  LucideImages,
  LucideMusic,
  LucideUser,
  LucideVideo,
} from 'lucide-react'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { useEffect, useState, type ChangeEvent } from 'react'

interface ProjectAssets {
  characterImages: string[]
  sceneImages: string[]
  videoClips: string[]
  musicTrack: string[]
}

interface ExternalStepPanelProps {
  stepNumber: number
  stepDef: StepDefinition
  state: StepState
  priorStepOutput: string | null // shown in collapsible context card
  brandCtx: { platform: string }
  onApprove: () => void
  onReopen?: () => void
  projectAssets?: ProjectAssets // CapCut: all collected project assets
  /** Used for zip download filename (project / video title). */
  projectTitle?: string
  /** Step 9 (Publish): AI descriptions + optional published URLs. */
  publishStep?: {
    onDescriptionChange: (content: string) => void
    onGenerate: () => Promise<void>
    onSaveLinks: (tiktok: string, youtube: string) => void
  }
}

function AssetGroup({
  title,
  urls,
  icon,
}: {
  title: string
  urls: string[]
  icon: ReactNode
}) {
  if (urls.length === 0) return null

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
        <span className="inline-flex shrink-0 text-zinc-400">{icon}</span>
        {title} ({urls.length})
      </p>
      <div className="flex flex-col gap-1">
        {urls.map((url, i) => {
          const filename =
            url.split('/').pop()?.split('?')[0] ?? `asset-${i + 1}`
          const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url)
          const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url)

          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-[6px] border border-zinc-100 bg-zinc-50 px-3 py-2"
            >
              {isImage && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src={url}
                    alt={filename}
                    className="h-8 w-5 shrink-0 rounded object-cover"
                    width={32}
                    height={32}
                  />
                </a>
              )}
              {isVideo && (
                <span className="flex h-8 w-5 shrink-0 items-center justify-center rounded bg-zinc-200 text-[10px] text-zinc-500">
                  MP4
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-600">
                {filename}
              </span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
              >
                Open
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function extFromUrl(url: string): string {
  const seg = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? '')
  const m = seg.match(/(\.[a-z0-9]{1,8})$/i)
  return m ? m[1].toLowerCase() : '.bin'
}

function padIndex(i: number): string {
  return String(i + 1).padStart(2, '0')
}

function zipDownloadFilename(projectTitle: string | undefined): string {
  const raw = projectTitle?.trim() ?? ''
  if (!raw) return 'gigity-assets.zip'
  const base = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  const safe = base.length > 0 ? base : 'gigity-assets'
  return `${safe}.zip`
}

type ZipTask = { path: string; url: string }

function buildZipTasks(assets: ProjectAssets): ZipTask[] {
  const tasks: ZipTask[] = []
  assets.characterImages.forEach((url, i) => {
    tasks.push({
      path: `character-images/${padIndex(i)}${extFromUrl(url)}`,
      url,
    })
  })
  assets.sceneImages.forEach((url, i) => {
    tasks.push({
      path: `scene-images/${padIndex(i)}${extFromUrl(url)}`,
      url,
    })
  })
  assets.videoClips.forEach((url, i) => {
    tasks.push({
      path: `video-clips/${padIndex(i)}${extFromUrl(url)}`,
      url,
    })
  })
  assets.musicTrack.forEach((url, i) => {
    tasks.push({
      path: `music/${padIndex(i)}${extFromUrl(url)}`,
      url,
    })
  })
  return tasks
}

function DownloadAllButton({
  assets,
  projectTitle,
}: {
  assets: ProjectAssets
  projectTitle?: string
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const total =
    assets.characterImages.length +
    assets.sceneImages.length +
    assets.videoClips.length +
    assets.musicTrack.length

  if (total === 0) return null

  async function downloadAllZip() {
    setBusy(true)
    setErr(null)
    const tasks = buildZipTasks(assets)
    const manifest: string[] = ['# Gigity asset manifest', '']
    const entries: Record<string, Uint8Array> = {}

    for (const { path, url } of tasks) {
      try {
        const res = await fetch(url, { mode: 'cors' })
        if (!res.ok) {
          manifest.push(`MISSING\t${path}\t${res.status}\t${url}`)
          continue
        }
        const buf = new Uint8Array(await res.arrayBuffer())
        entries[path] = buf
        manifest.push(`OK\t${path}\t${url}`)
      } catch {
        manifest.push(`MISSING\t${path}\tcors_or_network\t${url}`)
      }
    }

    manifest.push(
      '',
      '# All source URLs (for manual download if some files failed)',
      ''
    )
    if (assets.characterImages.length > 0) {
      manifest.push('## Character images')
      assets.characterImages.forEach(u => manifest.push(u))
      manifest.push('')
    }
    if (assets.sceneImages.length > 0) {
      manifest.push('## Scene images')
      assets.sceneImages.forEach(u => manifest.push(u))
      manifest.push('')
    }
    if (assets.videoClips.length > 0) {
      manifest.push('## Video clips')
      assets.videoClips.forEach(u => manifest.push(u))
      manifest.push('')
    }
    if (assets.musicTrack.length > 0) {
      manifest.push('## Music track')
      assets.musicTrack.forEach(u => manifest.push(u))
    }

    entries['manifest.txt'] = strToU8(manifest.join('\n'))

    zip(entries, (zipErr, out) => {
      setBusy(false)
      if (zipErr) {
        setErr('Could not build zip file.')
        return
      }
      const blob = new Blob([out as unknown as BlobPart], {
        type: 'application/zip',
      })
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = zipDownloadFilename(projectTitle)
      a.click()
      URL.revokeObjectURL(href)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void downloadAllZip()}
        className="rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-[12px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            Zipping…
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <LucideDownload className="h-3.5 w-3.5" aria-hidden />
            Download all as zip ({total})
          </span>
        )}
      </button>
      {err ? (
        <p className="max-w-[280px] text-right text-[11px] text-red-600">
          {err}
        </p>
      ) : null}
    </div>
  )
}

function PublishStepSection({
  description,
  outputAssetUrl,
  onDescriptionChange,
  onGenerate,
  onSaveLinks,
}: {
  description: string | null
  outputAssetUrl: string | null
  onDescriptionChange: (content: string) => void
  onGenerate: () => Promise<void>
  onSaveLinks: (tiktok: string, youtube: string) => void
}) {
  const [genBusy, setGenBusy] = useState(false)
  const [genErr, setGenErr] = useState<string | null>(null)
  const [tiktok, setTiktok] = useState('')
  const [youtube, setYoutube] = useState('')

  useEffect(() => {
    const d = decodePublishLinks(outputAssetUrl)
    setTiktok(d.tiktok)
    setYoutube(d.youtube)
  }, [outputAssetUrl])

  async function handleGenerate() {
    setGenErr(null)
    setGenBusy(true)
    try {
      await onGenerate()
    } catch (e) {
      setGenErr(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenBusy(false)
    }
  }

  function maybeAutoSaveAfterPaste(
    e: ChangeEvent<HTMLInputElement>,
    field: 'tiktok' | 'youtube',
    value: string
  ) {
    const ne = e.nativeEvent
    if (
      ne instanceof InputEvent &&
      ne.inputType === 'insertFromPaste' &&
      value.trim()
    ) {
      if (field === 'tiktok') {
        onSaveLinks(value, youtube)
      } else {
        onSaveLinks(tiktok, value)
      }
    }
  }

  function persistLinksFromBlur() {
    onSaveLinks(tiktok, youtube)
  }

  return (
    <div className="flex flex-col gap-4 rounded-[6px] border border-zinc-200 bg-white px-4 py-4">
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-zinc-700">
          Video description (TikTok + YouTube)
        </p>
        <p className="mb-2 text-[11px] text-zinc-500">
          Generated from your workflow and brand. Edit before posting.
        </p>
        <textarea
          value={description ?? ''}
          onChange={e => onDescriptionChange(e.target.value)}
          rows={14}
          spellCheck={false}
          placeholder='Press "Generate video description" to create TikTok and YouTube copy from prior steps…'
          className="w-full resize-y rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-2 font-sans text-[13px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-orange-400"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={genBusy}
            onClick={() => void handleGenerate()}
            className="rounded-[6px] bg-orange-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {genBusy ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating…
              </span>
            ) : (
              'Generate video description'
            )}
          </button>
          {genErr ? (
            <span className="text-[12px] text-red-600">{genErr}</span>
          ) : null}
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <p className="mb-1.5 text-[12px] font-medium text-zinc-700">
          Published video links (optional)
        </p>
        <p className="mb-3 text-[11px] text-zinc-500">
          After your video is live, add URLs here — they save when you paste or
          when you leave a field.
        </p>
        <label className="mb-2 block">
          <span className="mb-1 block text-[11px] font-medium text-zinc-600">
            TikTok URL
          </span>
          <input
            type="url"
            value={tiktok}
            onChange={e => {
              const v = e.target.value
              setTiktok(v)
              maybeAutoSaveAfterPaste(e, 'tiktok', v)
            }}
            onBlur={persistLinksFromBlur}
            placeholder="https://www.tiktok.com/@…"
            className="w-full rounded-[6px] border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-orange-400"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-zinc-600">
            YouTube URL
          </span>
          <input
            type="url"
            value={youtube}
            onChange={e => {
              const v = e.target.value
              setYoutube(v)
              maybeAutoSaveAfterPaste(e, 'youtube', v)
            }}
            onBlur={persistLinksFromBlur}
            placeholder="https://www.youtube.com/watch?v=…"
            className="w-full rounded-[6px] border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-orange-400"
          />
        </label>
      </div>
    </div>
  )
}

function PublishStepDoneView({
  llmResponse,
  outputAssetUrl,
}: {
  llmResponse: string | null
  outputAssetUrl: string | null
}) {
  const { tiktok, youtube } = decodePublishLinks(outputAssetUrl)
  const hasContent = llmResponse?.trim() || tiktok || youtube

  return (
    <div className="flex flex-col gap-4">
      {!hasContent && (
        <p className="text-[13px] text-zinc-500">
          No description or publish links saved. Re-open this step to add them.
        </p>
      )}
      {llmResponse?.trim() ? (
        <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="mb-2 text-[12px] font-medium text-zinc-500">
            Video description
          </p>
          <pre className="max-h-64 overflow-y-auto font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-800">
            {llmResponse}
          </pre>
        </div>
      ) : null}
      {(tiktok || youtube) && (
        <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="mb-2 text-[12px] font-medium text-zinc-500">
            Published links
          </p>
          <div className="flex flex-col gap-2">
            {tiktok ? (
              <a
                href={tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] break-all text-orange-600 hover:underline"
              >
                TikTok - {tiktok}
              </a>
            ) : null}
            {youtube ? (
              <a
                href={youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] break-all text-orange-600 hover:underline"
              >
                YouTube - {youtube}
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export function ExternalStepPanel({
  stepNumber,
  stepDef,
  state,
  priorStepOutput,
  brandCtx,
  onApprove,
  onReopen,
  projectAssets,
  projectTitle,
  publishStep,
}: ExternalStepPanelProps) {
  const [contextOpen, setContextOpen] = useState(true)
  const instruction = interpolate(stepDef.instruction ?? '', {
    platform: brandCtx.platform,
  })

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      {/* Step header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>
            Step {stepNumber} of {WORKFLOW_TOTAL_STEPS}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="flex items-center rounded border border-zinc-300 px-1 py-0.5 text-zinc-500">
              <LucideArrowUpRight className="h-3 w-3" aria-hidden />
            </span>
            {stepDef.tool}
          </span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          {stepDef.title}
        </h2>
      </div>

      {/* Approved state */}
      {state.status === 'done' && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-green-500 text-white">
              <LucideCheck className="h-3 w-3" strokeWidth={3} aria-hidden />
            </span>
            <span className="text-[13px] font-medium text-green-600">
              Completed
            </span>
            {onReopen && (
              <button
                onClick={onReopen}
                className="bg-secondary cursor-pointer rounded-lg px-2 py-1 text-[13px] text-zinc-400 transition-colors hover:text-zinc-600"
              >
                Re-open
              </button>
            )}
          </div>

          {stepNumber === WORKFLOW_TOTAL_STEPS ? (
            <PublishStepDoneView
              llmResponse={state.llmResponse}
              outputAssetUrl={state.outputAssetUrl}
            />
          ) : state.outputAssetUrl ? (
            <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="mb-1 text-[12px] tracking-wide text-zinc-400 uppercase">
                Asset URL
              </p>
              <a
                href={state.outputAssetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm break-all text-orange-600 hover:underline"
              >
                {state.outputAssetUrl}
              </a>
            </div>
          ) : null}
        </div>
      )}

      {/* Active state */}
      {state.status !== 'done' && (
        <div className="flex flex-col gap-5">
          {/* CapCut: project asset panel */}
          {projectAssets && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-zinc-700">
                  Project assets
                </h3>
                <DownloadAllButton
                  assets={projectAssets}
                  projectTitle={projectTitle}
                />
              </div>

              <div className="flex flex-col gap-4">
                <AssetGroup
                  title="Character images"
                  urls={projectAssets.characterImages}
                  icon={<LucideUser className="h-3.5 w-3.5" aria-hidden />}
                />
                <AssetGroup
                  title="Scene images"
                  urls={projectAssets.sceneImages}
                  icon={<LucideImages className="h-3.5 w-3.5" aria-hidden />}
                />
                <AssetGroup
                  title="Video clips"
                  urls={projectAssets.videoClips}
                  icon={<LucideVideo className="h-3.5 w-3.5" aria-hidden />}
                />
                <AssetGroup
                  title="Music track"
                  urls={projectAssets.musicTrack}
                  icon={<LucideMusic className="h-3.5 w-3.5" aria-hidden />}
                />
              </div>
            </div>
          )}

          {/* Collapsible context card - prior step output */}
          {priorStepOutput && (
            <div className="overflow-hidden rounded-[6px] border border-zinc-200">
              <button
                onClick={() => setContextOpen(o => !o)}
                className="flex w-full items-center justify-between bg-zinc-50 px-4 py-2.5 text-[13px] text-zinc-600 transition-colors hover:bg-zinc-100"
              >
                <span>Context from previous step</span>
                <span className="text-zinc-400">
                  {contextOpen ? (
                    <LucideChevronDown className="h-4 w-4" aria-hidden />
                  ) : (
                    <LucideChevronRight className="h-4 w-4" aria-hidden />
                  )}
                </span>
              </button>
              {contextOpen && (
                <div className="border-t border-zinc-200 px-4 py-3">
                  <pre className="max-h-48 overflow-y-auto font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-700">
                    {priorStepOutput}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Instruction card */}
          <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-5 py-4">
            <p className="text-sm leading-relaxed whitespace-pre-line text-zinc-700">
              {instruction}
            </p>
            {stepDef.externalLink && (
              <a
                href={stepDef.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-[6px] border border-zinc-200 bg-white px-4 py-2 text-[13px] text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              >
                Open {stepDef.tool}
                <LucideArrowUpRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
              </a>
            )}
          </div>

          {stepNumber === WORKFLOW_TOTAL_STEPS && publishStep ? (
            <PublishStepSection
              description={state.llmResponse}
              outputAssetUrl={state.outputAssetUrl}
              onDescriptionChange={publishStep.onDescriptionChange}
              onGenerate={publishStep.onGenerate}
              onSaveLinks={publishStep.onSaveLinks}
            />
          ) : null}

          {/* Expiry warning */}
          {stepDef.expiryWarning && (
            <div className="flex items-start gap-2 rounded-[6px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
              <LucideAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span>{stepDef.expiryWarning}</span>
            </div>
          )}

          {/* Approve button */}
          <button
            onClick={onApprove}
            className="inline-flex items-center gap-2 self-start rounded-[6px] bg-orange-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LucideCheck className="h-4 w-4" aria-hidden />
            {stepNumber === WORKFLOW_TOTAL_STEPS
              ? 'Mark as published'
              : 'Mark as done'}
          </button>
        </div>
      )}
    </div>
  )
}
