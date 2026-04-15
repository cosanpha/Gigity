'use client'

import { PasteOnlyUrlInput } from '@/components/ui/PasteOnlyUrlInput'
import { interpolate } from '@/lib/interpolate'
import { isHttpOrHttpsUrl } from '@/lib/is-http-url'
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
import { useEffect, useState } from 'react'
import { StepLlmModelCaption } from './StepLlmModelCaption'
import { CopyButton } from './ui/CopyButton'
import { StepActionFooter } from './ui/StepActionFooter'

interface ProjectAssets {
  characterImages: string[]
  sceneImages: string[]
  videoClips: string[]
  musicTrack: string[]
  lyrics: string
  selectedMusicTrackIndex: number | null
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
  /** Step 9: normalized brand publishing platforms (same order as generate API). */
  publishPlatformOrder?: string[]
  /** Step 9 (Publish): AI descriptions + optional published URLs. */
  publishStep?: {
    onPublishPlatformsChange: (next: Record<string, string>) => void
    onGenerate: () => Promise<void>
    onSaveLinks: (next: Record<string, string>) => void
  }
  llmModel?: string | null
}

function AssetGroup({
  title,
  urls,
  icon,
  selectedIndex,
}: {
  title: string
  urls: string[]
  icon: ReactNode
  selectedIndex?: number | null
}) {
  if (urls.length === 0) return null

  function isImageUrl(url: string): boolean {
    return /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(url)
  }

  function isVideoUrl(url: string): boolean {
    return (
      /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ||
      /\/video\/upload\//i.test(url)
    )
  }

  function isAudioUrl(url: string): boolean {
    return /\.(mp3|wav|m4a|aac|ogg|flac)(\?|$)/i.test(url)
  }

  const allImages = urls.every(u => isImageUrl(u) && isHttpOrHttpsUrl(u))
  const allVideos = urls.every(isVideoUrl)
  const allAudios = urls.every(isAudioUrl)

  if (allImages) {
    return (
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
          <span className="inline-flex shrink-0 text-zinc-400">{icon}</span>
          {title} ({urls.length})
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {urls.map((url, i) => (
            <a
              key={`${url}-${i}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group overflow-hidden rounded-[8px] border border-zinc-200 bg-white"
            >
              <Image
                src={url}
                alt={`${title} ${i + 1}`}
                width={360}
                height={640}
                className="h-auto w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              />
            </a>
          ))}
        </div>
      </div>
    )
  }

  if (allVideos) {
    return (
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
          <span className="inline-flex shrink-0 text-zinc-400">{icon}</span>
          {title} ({urls.length})
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {urls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="overflow-hidden rounded-[8px] border border-zinc-200 bg-black"
            >
              <video
                src={url}
                controls
                className="h-52 w-full object-contain"
                playsInline
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (allAudios) {
    return (
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
          <span className="inline-flex shrink-0 text-zinc-400">{icon}</span>
          {title} ({urls.length})
        </p>
        <div className="flex flex-col gap-2">
          {urls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className={`rounded-[8px] border px-3 py-2 ${
                selectedIndex === i
                  ? 'border-orange-400 bg-orange-50'
                  : 'border-zinc-200 bg-white'
              }`}
            >
              {selectedIndex === i ? (
                <div className="mb-1 text-[11px] font-medium text-orange-600">
                  Selected track
                </div>
              ) : null}
              <audio
                src={url}
                controls
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

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
              {isImage && isHttpOrHttpsUrl(url) && (
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
  const selectedMusicIndex = assets.selectedMusicTrackIndex
  if (
    typeof selectedMusicIndex === 'number' &&
    selectedMusicIndex >= 0 &&
    selectedMusicIndex < assets.musicTrack.length
  ) {
    const selectedUrl = assets.musicTrack[selectedMusicIndex]
    tasks.push({
      path: `music/${padIndex(selectedMusicIndex)}${extFromUrl(selectedUrl)}`,
      url: selectedUrl,
    })
  } else {
    assets.musicTrack.forEach((url, i) => {
      tasks.push({
        path: `music/${padIndex(i)}${extFromUrl(url)}`,
        url,
      })
    })
  }
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
    (typeof assets.selectedMusicTrackIndex === 'number' &&
    assets.selectedMusicTrackIndex >= 0 &&
    assets.selectedMusicTrackIndex < assets.musicTrack.length
      ? 1
      : assets.musicTrack.length)

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
            <LucideDownload
              className="h-3.5 w-3.5"
              aria-hidden
            />
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
  platformOrder,
  publishPlatforms,
  outputAssetUrl,
  onPublishPlatformsChange,
  onGenerate,
  onSaveLinks,
}: {
  platformOrder: string[]
  publishPlatforms: Record<string, string> | null
  outputAssetUrl: string | null
  onPublishPlatformsChange: (next: Record<string, string>) => void
  onGenerate: () => Promise<void>
  onSaveLinks: (next: Record<string, string>) => void
}) {
  const [genBusy, setGenBusy] = useState(false)
  const [genErr, setGenErr] = useState<string | null>(null)
  const [publishLinks, setPublishLinks] = useState<Record<string, string>>({})

  useEffect(() => {
    setPublishLinks(decodePublishLinks(outputAssetUrl, platformOrder))
  }, [outputAssetUrl, platformOrder])

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

  function persistLinksFromBlur() {
    onSaveLinks(publishLinks)
  }

  function setPlatformText(platform: string, text: string) {
    const base: Record<string, string> = {}
    for (const p of platformOrder) base[p] = publishPlatforms?.[p] ?? ''
    base[platform] = text
    onPublishPlatformsChange(base)
  }

  return (
    <div className="flex flex-col gap-4 rounded-[6px] border border-zinc-200 bg-white px-4 py-4">
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-zinc-700">
          Publish copy by platform
        </p>
        <p className="mb-3 text-[11px] text-zinc-500">
          One box per publishing platform from your brand profile. Generate
          fills them all; edit each before posting.
        </p>
        <div className="flex flex-col gap-4">
          {platformOrder.map(platform => (
            <div key={platform}>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[12px] font-medium text-zinc-600">
                  {platform}
                </label>
                <CopyButton text={publishPlatforms?.[platform] ?? ''} />
              </div>
              <textarea
                value={publishPlatforms?.[platform] ?? ''}
                onChange={e => setPlatformText(platform, e.target.value)}
                rows={platform === 'YouTube' ? 14 : 8}
                spellCheck={false}
                placeholder={`Paste or generate copy for ${platform}…`}
                className="w-full resize-y rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-2 font-sans text-[13px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-orange-400"
              />
            </div>
          ))}
        </div>
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
          After your video is live, paste URLs here - they save on paste/drop or
          when you leave a field.
        </p>
        <div className="flex flex-col gap-2">
          {platformOrder.map(platform => (
            <label
              key={platform}
              className="block"
            >
              <span className="mb-1 block text-[11px] font-medium text-zinc-600">
                {platform} URL
              </span>
              <PasteOnlyUrlInput
                type="url"
                value={publishLinks[platform] ?? ''}
                onValueChange={v => {
                  const next = { ...publishLinks, [platform]: v }
                  setPublishLinks(next)
                  onSaveLinks(next)
                }}
                onBlur={persistLinksFromBlur}
                placeholder={`Paste ${platform} URL (typing disabled)…`}
                className="w-full rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-orange-400"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function PublishStepDoneView({
  platformOrder,
  publishPlatforms,
  llmResponse,
  outputAssetUrl,
}: {
  platformOrder: string[]
  publishPlatforms: Record<string, string> | null
  llmResponse: string | null
  outputAssetUrl: string | null
}) {
  const links = decodePublishLinks(outputAssetUrl, platformOrder)
  const linkEntries = platformOrder
    .map(platform => [platform, (links[platform] ?? '').trim()] as const)
    .filter(([, url]) => Boolean(url))
  const hasPerPlatform =
    publishPlatforms &&
    platformOrder.some(p => (publishPlatforms[p] ?? '').trim())
  const hasContent =
    hasPerPlatform || llmResponse?.trim() || linkEntries.length > 0

  return (
    <div className="flex flex-col gap-4">
      {!hasContent && (
        <p className="text-[13px] text-zinc-500">
          No description or publish links saved. Re-open this step to add them.
        </p>
      )}
      {hasPerPlatform ? (
        <div className="flex flex-col gap-3">
          {platformOrder.map(platform => {
            const text = (publishPlatforms?.[platform] ?? '').trim()
            if (!text) return null
            return (
              <div
                key={platform}
                className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12px] font-medium text-zinc-500">
                    {platform}
                  </p>
                  <CopyButton text={text} />
                </div>
                <pre className="max-h-64 overflow-y-auto font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-800">
                  {text}
                </pre>
              </div>
            )
          })}
        </div>
      ) : llmResponse?.trim() ? (
        <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-medium text-zinc-500">
              Video description
            </p>
            <CopyButton text={llmResponse ?? ''} />
          </div>
          <pre className="max-h-64 overflow-y-auto font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-800">
            {llmResponse}
          </pre>
        </div>
      ) : null}
      {linkEntries.length > 0 && (
        <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="mb-2 text-[12px] font-medium text-zinc-500">
            Published links
          </p>
          <div className="flex flex-col gap-2">
            {linkEntries.map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] break-all text-orange-600 hover:underline"
              >
                {platform} - {url}
              </a>
            ))}
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
  publishPlatformOrder = [],
  publishStep,
  llmModel,
}: ExternalStepPanelProps) {
  const [contextOpen, setContextOpen] = useState(true)
  const isCapCutStep = stepNumber === 8
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
              <LucideArrowUpRight
                className="h-3 w-3"
                aria-hidden
              />
            </span>
            {stepDef.tool}
          </span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          {stepDef.title}
        </h2>
        <StepLlmModelCaption model={llmModel} />
      </div>

      {/* Approved state */}
      {state.status === 'done' && (
        <div>
          <div className="mb-4">
            <p className="text-[13px] text-green-600">
              Approved - Re-open to edit this step.
            </p>
          </div>

          {stepNumber === WORKFLOW_TOTAL_STEPS ? (
            <PublishStepDoneView
              platformOrder={publishPlatformOrder}
              publishPlatforms={state.publishPlatforms}
              llmResponse={state.llmResponse}
              outputAssetUrl={state.outputAssetUrl}
            />
          ) : state.outputAssetUrl && !isCapCutStep ? (
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

          {onReopen ? (
            <StepActionFooter
              rightActions={
                <button
                  type="button"
                  onClick={onReopen}
                  className="rounded-[6px] border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                >
                  Re-open
                </button>
              }
            />
          ) : null}
        </div>
      )}

      {/* Active state */}
      {(state.status !== 'done' || isCapCutStep) && (
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
                  icon={
                    <LucideUser
                      className="h-3.5 w-3.5"
                      aria-hidden
                    />
                  }
                />
                <AssetGroup
                  title="Scene images"
                  urls={projectAssets.sceneImages}
                  icon={
                    <LucideImages
                      className="h-3.5 w-3.5"
                      aria-hidden
                    />
                  }
                />
                <AssetGroup
                  title="Video clips"
                  urls={projectAssets.videoClips}
                  icon={
                    <LucideVideo
                      className="h-3.5 w-3.5"
                      aria-hidden
                    />
                  }
                />
                <AssetGroup
                  title="Music track"
                  urls={projectAssets.musicTrack}
                  selectedIndex={projectAssets.selectedMusicTrackIndex}
                  icon={
                    <LucideMusic
                      className="h-3.5 w-3.5"
                      aria-hidden
                    />
                  }
                />
                {projectAssets.lyrics.trim() ? (
                  <div className="rounded-[8px] border border-zinc-200 bg-white px-4 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[12px] font-medium text-zinc-500">
                        Lyrics
                      </p>
                      <CopyButton text={projectAssets.lyrics} />
                    </div>
                    <pre className="max-h-64 overflow-y-auto font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-800">
                      {projectAssets.lyrics}
                    </pre>
                  </div>
                ) : null}
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
                    <LucideChevronDown
                      className="h-4 w-4"
                      aria-hidden
                    />
                  ) : (
                    <LucideChevronRight
                      className="h-4 w-4"
                      aria-hidden
                    />
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
                <LucideArrowUpRight
                  className="h-3.5 w-3.5 text-zinc-400"
                  aria-hidden
                />
              </a>
            )}
          </div>

          {stepNumber === WORKFLOW_TOTAL_STEPS && publishStep ? (
            <PublishStepSection
              platformOrder={publishPlatformOrder}
              publishPlatforms={state.publishPlatforms}
              outputAssetUrl={state.outputAssetUrl}
              onPublishPlatformsChange={publishStep.onPublishPlatformsChange}
              onGenerate={publishStep.onGenerate}
              onSaveLinks={publishStep.onSaveLinks}
            />
          ) : null}

          {/* Expiry warning */}
          {stepDef.expiryWarning && (
            <div className="flex items-start gap-2 rounded-[6px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
              <LucideAlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                aria-hidden
              />
              <span>{stepDef.expiryWarning}</span>
            </div>
          )}

          {state.status !== 'done' ? (
            <StepActionFooter
              rightActions={
                <button
                  onClick={onApprove}
                  className="inline-flex items-center gap-2 rounded-[6px] bg-orange-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LucideCheck
                    className="h-4 w-4"
                    aria-hidden
                  />
                  {stepNumber === WORKFLOW_TOTAL_STEPS
                    ? 'Mark as published'
                    : 'Mark as done'}
                </button>
              }
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
