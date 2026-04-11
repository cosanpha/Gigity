'use client'

import { interpolate } from '@/lib/interpolate'
import { StepDefinition, WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'
import Image from 'next/image'
import { useState } from 'react'

type StepState = {
  status: 'pending' | 'generating' | 'done'
  outputAssetUrl: string | null
}

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
}

function AssetGroup({
  title,
  urls,
  icon,
}: {
  title: string
  urls: string[]
  icon: string
}) {
  if (urls.length === 0) return null

  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-zinc-500">
        {icon} {title} ({urls.length})
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
                download
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
              >
                ↓
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DownloadAllButton({ assets }: { assets: ProjectAssets }) {
  const total =
    assets.characterImages.length +
    assets.sceneImages.length +
    assets.videoClips.length +
    assets.musicTrack.length

  if (total === 0) return null

  function downloadAll() {
    const lines: string[] = []

    if (assets.characterImages.length > 0) {
      lines.push('# Character images')
      lines.push(...assets.characterImages)
      lines.push('')
    }
    if (assets.sceneImages.length > 0) {
      lines.push('# Scene images')
      lines.push(...assets.sceneImages)
      lines.push('')
    }
    if (assets.videoClips.length > 0) {
      lines.push('# Video clips')
      lines.push(...assets.videoClips)
      lines.push('')
    }
    if (assets.musicTrack.length > 0) {
      lines.push('# Music track')
      lines.push(...assets.musicTrack)
      lines.push('')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gigity-assets.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={downloadAll}
      className="rounded-[6px] border border-zinc-200 bg-white px-3 py-1.5 text-[12px] text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      ↓ Download all ({total})
    </button>
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
            <span className="rounded border border-zinc-300 px-1.5 py-0.5 text-[11px]">
              ↗
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
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-green-500 text-[11px] text-white">
              ✓
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

          {state.outputAssetUrl ? (
            <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="mb-1 text-[12px] tracking-wide text-zinc-400 uppercase">
                Asset URL
              </p>
              <a
                href={state.outputAssetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm break-all text-indigo-600 hover:underline"
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
                <DownloadAllButton assets={projectAssets} />
              </div>

              <div className="flex flex-col gap-4">
                <AssetGroup
                  title="Character images"
                  urls={projectAssets.characterImages}
                  icon="🧑"
                />
                <AssetGroup
                  title="Scene images"
                  urls={projectAssets.sceneImages}
                  icon="🎬"
                />
                <AssetGroup
                  title="Video clips"
                  urls={projectAssets.videoClips}
                  icon="📹"
                />
                <AssetGroup
                  title="Music track"
                  urls={projectAssets.musicTrack}
                  icon="🎵"
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
                <span className="text-[11px] text-zinc-400">
                  {contextOpen ? '▼' : '▶'}
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
                <span className="text-zinc-400">↗</span>
              </a>
            )}
          </div>

          {/* Expiry warning */}
          {stepDef.expiryWarning && (
            <div className="flex items-start gap-2 rounded-[6px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
              <span className="shrink-0">⚠</span>
              <span>{stepDef.expiryWarning}</span>
            </div>
          )}

          {/* Approve button */}
          <button
            onClick={onApprove}
            className="self-start rounded-[6px] bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {stepNumber === WORKFLOW_TOTAL_STEPS
              ? 'Mark as published ✓'
              : 'Mark as done ✓'}
          </button>
        </div>
      )}
    </div>
  )
}
