'use client'

import { PasteOnlyUrlInput } from '@/components/ui/PasteOnlyUrlInput'
import { decodePublishLinks } from '@/lib/publish'
import { useEffect, useState } from 'react'
import { CopyButton } from './ui/CopyButton'

export function PublishStepSection({
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

export function PublishStepDoneView({
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
