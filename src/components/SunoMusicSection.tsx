'use client'

import { PasteOnlyUrlInput } from '@/components/ui/PasteOnlyUrlInput'
import { apiFetch } from '@/lib/api-fetch'
import {
  everyAudioUrlLineIsFinal,
  normalizeSunoStoredUrl,
  pathnameEndsWithAudioFile,
} from '@/lib/suno-record-info'
import { StepState } from '@/lib/workflow-templates'
import { LucideArrowUpRight, LucideCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { GenerateSpinner } from './ui/GenerateSpinner'

export function splitStoredAudioUrls(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split('\n')
    .map(u => u.trim())
    .filter(Boolean)
    .map(normalizeSunoStoredUrl)
}

function clampTrackIndex(idx: number | null | undefined, len: number): number {
  if (len <= 0) return 0
  const n =
    typeof idx === 'number' && Number.isFinite(idx) ? Math.floor(idx) : 0
  return Math.min(Math.max(0, n), len - 1)
}

export type SunoPersist = Partial<
  Pick<
    StepState,
    | 'sunoTaskId'
    | 'outputAssetUrl'
    | 'sunoSelectedTrackIndex'
    | 'sunoApiKeyOverride'
  >
>

type SunoPollCtl = { cancelled: boolean }

function extractSunoTaskIdFromStartBody(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const o = data as Record<string, unknown>
  const pick = (v: unknown): string => {
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
    return ''
  }
  let id = pick(o.taskId ?? o.task_id ?? o.id)
  if (id) return id
  const inner = o.data
  if (inner && typeof inner === 'object') {
    const d = inner as Record<string, unknown>
    id = pick(d.taskId ?? d.task_id ?? d.id)
  }
  return id
}

function normalizeAndValidateAudioUrl(
  raw: string
): { ok: true; href: string } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, error: 'Enter a URL.' }
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, error: 'That is not a valid URL.' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'Use an http or https link.' }
  }
  const pathAndQuery = `${url.pathname}${url.search}`.toLowerCase()
  const extBeforeDelim =
    /\.(mp3|wav|m4a|aac|ogg|flac|opus|weba|webm)(\?|#|&|$)/i.test(
      pathAndQuery
    ) || /\.(mp3|wav|m4a|aac|ogg|flac|opus|weba|webm)$/i.test(url.pathname)
  const formatParam =
    /[?&]format=(mp3|wav|m4a|aac|ogg|flac|opus|weba|webm)(\?|&|$)/i.test(
      url.search
    ) || /[?&]type=audio/i.test(url.search)
  if (extBeforeDelim || formatParam) {
    return { ok: true, href: url.toString() }
  }
  return {
    ok: false,
    error:
      'Does not look like an audio URL. Use a direct file link ending in .mp3, .wav, .m4a, .aac, .ogg, .flac, or .opus (or add format=mp3 in the query).',
  }
}

export function SunoMusicSection({
  lyrics,
  style,
  trackTitle,
  sunoTaskId,
  sunoSelectedTrackIndex,
  outputAssetUrl,
  sunoApiKeyOverride,
  canStart,
  isLocked,
  sunoBaseUrlConfigured,
  sunoEnvKeyConfigured,
  maxSunoStyleChars,
  onPersist,
}: {
  lyrics: string
  style: string
  trackTitle: string
  sunoTaskId: string | null
  sunoSelectedTrackIndex: number | null
  outputAssetUrl: string | null
  sunoApiKeyOverride: string | null
  canStart: boolean
  isLocked: boolean
  sunoBaseUrlConfigured: boolean
  sunoEnvKeyConfigured: boolean
  maxSunoStyleChars: number
  onPersist: (updates: SunoPersist) => void
}) {
  const [localSunoKey, setLocalSunoKey] = useState(sunoApiKeyOverride ?? '')
  useEffect(() => {
    setLocalSunoKey(sunoApiKeyOverride ?? '')
  }, [sunoApiKeyOverride])

  const overrideKey =
    localSunoKey.trim() || (sunoApiKeyOverride ?? '').trim() || ''
  const apiConfigured =
    Boolean(sunoBaseUrlConfigured) &&
    (Boolean(sunoEnvKeyConfigured) || Boolean(overrideKey))

  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState('')
  const [manualUrlError, setManualUrlError] = useState<string | null>(null)
  const [optimisticTaskId, setOptimisticTaskId] = useState<string | null>(null)
  const [manualChecking, setManualChecking] = useState(false)
  const [removedBundleForUndo, setRemovedBundleForUndo] = useState<{
    outputAssetUrl: string
    sunoSelectedTrackIndex: number | null
  } | null>(null)
  const onPersistRef = useRef(onPersist)
  onPersistRef.current = onPersist

  const runSunoStatusCheckRef = useRef<
    (taskId: string, ctl?: SunoPollCtl) => Promise<void>
  >(async () => {})

  runSunoStatusCheckRef.current = async (taskId: string, ctl?: SunoPollCtl) => {
    const tid = taskId.trim()
    if (!tid) return
    const key = localSunoKey.trim() || (sunoApiKeyOverride ?? '').trim() || ''
    const res = await apiFetch(
      `/api/v1/workflow/suno/status?taskId=${encodeURIComponent(tid)}`,
      {
        headers: key ? { 'X-Suno-Api-Key': key } : undefined,
      }
    )
    if (ctl?.cancelled) return
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Status failed' }))
      setPollError(typeof err.error === 'string' ? err.error : 'Status failed')
      setOptimisticTaskId(null)
      onPersistRef.current({ sunoTaskId: null })
      return
    }
    const data = (await res.json()) as {
      state?: string
      audioUrl?: string | null
      audioUrls?: string[]
      detail?: string | null
    }
    if (ctl?.cancelled) return
    const fromList =
      Array.isArray(data.audioUrls) && data.audioUrls.length > 0
        ? data.audioUrls.filter(
            (u): u is string =>
              typeof u === 'string' && u.trim().startsWith('http')
          )
        : []
    const single =
      typeof data.audioUrl === 'string' &&
      data.audioUrl.trim().startsWith('http')
        ? [data.audioUrl.trim()]
        : []
    const trackUrls = fromList.length > 0 ? fromList : single
    if (data.state === 'streaming' && trackUrls.length > 0) {
      setOptimisticTaskId(null)
      setRemovedBundleForUndo(null)
      onPersistRef.current({
        outputAssetUrl: trackUrls.join('\n'),
      })
      setPollError(null)
    } else if (data.state === 'complete' && trackUrls.length > 0) {
      setOptimisticTaskId(null)
      setRemovedBundleForUndo(null)
      onPersistRef.current({
        sunoTaskId: null,
        outputAssetUrl: trackUrls.join('\n'),
        sunoSelectedTrackIndex: 0,
      })
      setPollError(null)
    } else if (data.state === 'failed') {
      setPollError(
        typeof data.detail === 'string' && data.detail.trim()
          ? data.detail
          : 'Generation failed'
      )
      setOptimisticTaskId(null)
      onPersistRef.current({ sunoTaskId: null })
    }
  }

  async function start() {
    if (!lyrics.trim() || !style.trim()) return
    if (splitStoredAudioUrls(outputAssetUrl).length > 0) {
      setStartError(
        'You already have a song URL. Click “Remove audio URL” above the player, then you can generate a new one.'
      )
      return
    }
    if (style.length > maxSunoStyleChars) {
      setStartError(
        `Style prompt must be at most ${maxSunoStyleChars} characters (currently ${style.length}). Shorten it above, then try again.`
      )
      return
    }
    setRemovedBundleForUndo(null)
    setStarting(true)
    setStartError(null)
    setPollError(null)
    setOptimisticTaskId(null)
    const keyForStart =
      localSunoKey.trim() || (sunoApiKeyOverride ?? '').trim() || ''
    const res = await apiFetch('/api/v1/workflow/suno/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lyrics,
        stylePrompt: style,
        title: trackTitle.trim() || 'Gigity track',
        model: 'V4',
        ...(keyForStart ? { sunoApiKey: keyForStart } : {}),
      }),
    })
    setStarting(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Start failed' }))
      setStartError(typeof err.error === 'string' ? err.error : 'Start failed')
      return
    }
    const data: unknown = await res.json().catch(() => null)
    const taskId = extractSunoTaskIdFromStartBody(data)
    if (!taskId) {
      setStartError('No task id returned')
      return
    }
    if (keyForStart) {
      onPersistRef.current({
        sunoApiKeyOverride: keyForStart,
        sunoTaskId: taskId,
      })
    } else {
      onPersistRef.current({ sunoTaskId: taskId })
    }
    setOptimisticTaskId(taskId)
  }

  function applyManualAudioUrl() {
    setManualUrlError(null)
    const result = normalizeAndValidateAudioUrl(manualUrl)
    if (!result.ok) {
      setManualUrlError(result.error)
      return
    }
    onPersistRef.current({
      outputAssetUrl: result.href,
      sunoTaskId: null,
      sunoSelectedTrackIndex: 0,
    })
    setManualUrl('')
    setStartError(null)
    setPollError(null)
    setOptimisticTaskId(null)
    setRemovedBundleForUndo(null)
  }

  function clearManualUrlInput() {
    setManualUrl('')
    setManualUrlError(null)
  }

  function clearPersistedAudioUrl() {
    const prev = outputAssetUrl?.trim() ?? ''
    if (prev) {
      setRemovedBundleForUndo({
        outputAssetUrl: prev,
        sunoSelectedTrackIndex,
      })
    }
    onPersistRef.current({ outputAssetUrl: null, sunoSelectedTrackIndex: null })
    setPollError(null)
    setStartError(null)
  }

  function undoRemoveAudioUrl() {
    const b = removedBundleForUndo
    if (!b?.outputAssetUrl.trim()) return
    onPersistRef.current({
      outputAssetUrl: b.outputAssetUrl,
      sunoSelectedTrackIndex: b.sunoSelectedTrackIndex,
    })
    setRemovedBundleForUndo(null)
    setPollError(null)
    setStartError(null)
  }

  async function checkSunoStatusNow() {
    if (!apiConfigured) return
    const tid = sunoTaskId?.trim() || optimisticTaskId?.trim() || ''
    if (!tid) return
    setManualChecking(true)
    try {
      await runSunoStatusCheckRef.current(tid)
    } finally {
      setManualChecking(false)
    }
  }

  useEffect(() => {
    const p = sunoTaskId?.trim() ?? ''
    const o = optimisticTaskId?.trim() ?? ''
    if (p && o && p === o) {
      setOptimisticTaskId(null)
    }
  }, [sunoTaskId, optimisticTaskId])

  useEffect(() => {
    if (!apiConfigured) return
    const taskId = sunoTaskId?.trim() || optimisticTaskId?.trim() || ''
    if (!taskId) return

    const ctl: SunoPollCtl = { cancelled: false }

    async function tick() {
      await runSunoStatusCheckRef.current(taskId, ctl)
    }

    tick()
    const id = setInterval(tick, 3000)
    return () => {
      ctl.cancelled = true
      clearInterval(id)
    }
  }, [
    apiConfigured,
    sunoTaskId,
    optimisticTaskId,
    localSunoKey,
    sunoApiKeyOverride,
  ])

  const storedAudioUrls = splitStoredAudioUrls(outputAssetUrl)
  const hasStreamingPreview =
    storedAudioUrls.length > 0 &&
    storedAudioUrls.some(u => !pathnameEndsWithAudioFile(u))

  const waiting =
    apiConfigured &&
    Boolean(sunoTaskId?.trim() || optimisticTaskId?.trim()) &&
    storedAudioUrls.length === 0

  const hasSunoTaskIdForPoll = Boolean(
    sunoTaskId?.trim() || optimisticTaskId?.trim()
  )

  const hasPersistedAudioUrl = storedAudioUrls.length > 0

  const selectedTrackIdx = clampTrackIndex(
    sunoSelectedTrackIndex,
    storedAudioUrls.length
  )

  const styleTooLong = style.length > maxSunoStyleChars

  return (
    <div className="rounded-[6px] border border-zinc-200 bg-zinc-50 p-4">
      {!isLocked && (
        <p className="mb-3 text-[13px] font-medium text-zinc-700">
          Generate a song with the API, paste a direct audio URL you already
          have, or open Suno in the browser.
        </p>
      )}
      {canStart && sunoBaseUrlConfigured && !isLocked ? (
        <div className="mb-3 rounded-[6px] border border-zinc-200 bg-white p-3">
          <label
            htmlFor="suno-api-key-override"
            className="mb-1 block text-[12px] font-medium text-zinc-700"
          >
            Suno API key (optional)
          </label>
          <p className="mb-2 text-[12px] leading-relaxed text-zinc-500">
            When set, Generate Song uses this key instead of the server{' '}
            <span className="font-mono text-[11px]">SUNO_API_KEY</span>. It is
            stored on this step when you leave the field or start generation.
          </p>
          <input
            id="suno-api-key-override"
            type="password"
            autoComplete="off"
            value={localSunoKey}
            onChange={e => setLocalSunoKey(e.target.value)}
            onBlur={() => {
              const next = localSunoKey.trim() || null
              const prev = sunoApiKeyOverride ?? null
              if (next !== prev) {
                onPersistRef.current({ sunoApiKeyOverride: next })
              }
            }}
            placeholder={
              sunoEnvKeyConfigured
                ? 'Leave empty to use server SUNO_API_KEY'
                : 'Paste your Suno API key'
            }
            className="w-full rounded-[6px] border border-zinc-200 bg-white px-3 py-2 font-mono text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none"
          />
        </div>
      ) : null}
      {canStart && apiConfigured && styleTooLong && (
        <div className="mb-3 rounded-[6px] border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-[12px] text-red-700">
            Style prompt is {style.length} characters; Suno allows at most{' '}
            {maxSunoStyleChars}. Shorten the Style Prompt field above.
          </p>
        </div>
      )}
      {canStart && apiConfigured && (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <button
              type="button"
              onClick={start}
              disabled={
                starting || waiting || styleTooLong || hasPersistedAudioUrl
              }
              title={
                hasPersistedAudioUrl
                  ? 'Remove the current audio URL above the player before generating again.'
                  : styleTooLong
                    ? `Shorten style prompt to ${maxSunoStyleChars} characters or fewer`
                    : undefined
              }
              className="w-full rounded-[6px] bg-orange-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-0 sm:flex-1"
            >
              {starting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Starting song…
                </span>
              ) : waiting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating song…
                </span>
              ) : (
                'Generate Song'
              )}
            </button>
            <button
              type="button"
              onClick={() => void checkSunoStatusNow()}
              disabled={!hasSunoTaskIdForPoll || manualChecking}
              title={
                hasSunoTaskIdForPoll
                  ? undefined
                  : 'Generate a song first (or reload a project with a task in progress).'
              }
              className="w-full shrink-0 rounded-[6px] border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-4"
            >
              {manualChecking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  Checking…
                </span>
              ) : (
                'Check status now'
              )}
            </button>
          </div>
          {hasPersistedAudioUrl ? (
            <p className="mb-3 text-[12px] text-zinc-600">
              To run <span className="font-medium">Generate Song</span> again,
              click <span className="font-medium">Remove audio URL</span> above
              the player first.
            </p>
          ) : null}
          {waiting ? (
            <p className="mb-3 text-[12px] text-zinc-500">
              Also checks every 3s automatically. You can leave this page and
              come back - progress is saved.
            </p>
          ) : null}
        </>
      )}
      {canStart && !sunoBaseUrlConfigured && (
        <div className="mb-3 flex flex-col gap-2">
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-[6px] border border-zinc-200 bg-zinc-200 px-4 py-3 text-sm font-medium text-zinc-500"
          >
            Generate Song
          </button>
          <p className="text-[12px] leading-relaxed text-amber-800">
            To enable this button, set{' '}
            <span className="rounded bg-amber-100 px-1 font-mono text-[11px] text-amber-950">
              SUNO_API_BASE_URL
            </span>{' '}
            in{' '}
            <span className="font-mono text-[11px] text-amber-950">
              .env.local
            </span>
            , then restart the dev server (
            <span className="font-mono text-[11px]">bun dev</span>). You can
            optionally set{' '}
            <span className="rounded bg-amber-100 px-1 font-mono text-[11px] text-amber-950">
              SUNO_API_KEY
            </span>{' '}
            there, or paste your key in the optional Suno API key field in step
            4 once the base URL is configured.
          </p>
        </div>
      )}
      {canStart && sunoBaseUrlConfigured && !apiConfigured && (
        <div className="mb-3 flex flex-col gap-2">
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-[6px] border border-zinc-200 bg-zinc-200 px-4 py-3 text-sm font-medium text-zinc-500"
          >
            Generate Song
          </button>
          <p className="text-[12px] leading-relaxed text-amber-800">
            Set{' '}
            <span className="rounded bg-amber-100 px-1 font-mono text-[11px] text-amber-950">
              SUNO_API_KEY
            </span>{' '}
            on the server or enter your Suno API key in the optional field
            above.
          </p>
        </div>
      )}
      {canStart && (
        <a
          href="https://suno.com/create"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[6px] border border-zinc-200 bg-white px-4 py-2 text-[13px] text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100"
        >
          Open Suno
          <LucideArrowUpRight
            className="h-3.5 w-3.5"
            aria-hidden
          />
        </a>
      )}
      {canStart && (
        <div className="mt-4 border-t border-zinc-200 pt-4">
          <p className="mb-1 text-[13px] font-medium text-zinc-700">
            Paste an audio file URL
          </p>
          <p className="mb-2 text-[12px] text-zinc-500">
            Must be a valid http(s) link that looks like a direct audio file
            (.mp3, .wav, .m4a, .aac, .ogg, .flac, .opus).
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <PasteOnlyUrlInput
              type="url"
              value={manualUrl}
              onValueChange={v => {
                setManualUrl(v)
                setManualUrlError(null)
              }}
              placeholder="Paste audio URL (typing disabled)…"
              className="min-w-0 flex-1 rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyManualAudioUrl}
                disabled={!manualUrl.trim()}
                className="shrink-0 rounded-[6px] border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Use this URL
              </button>
              <button
                type="button"
                onClick={clearManualUrlInput}
                disabled={!manualUrl.trim()}
                className="shrink-0 rounded-[6px] border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear input
              </button>
            </div>
          </div>
          {manualUrlError ? (
            <p className="mt-2 text-[12px] text-red-600">{manualUrlError}</p>
          ) : null}
        </div>
      )}
      {startError && (
        <p className="mt-2 text-[12px] text-red-600">{startError}</p>
      )}
      {pollError && (
        <p className="mt-2 text-[12px] text-red-600">{pollError}</p>
      )}
      {storedAudioUrls.length > 0 ? (
        <div className="mt-4 rounded-[6px] border border-zinc-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <p className="text-[12px] font-medium text-zinc-600">
              {isLocked
                ? 'Approved song'
                : storedAudioUrls.length >= 2
                  ? 'Your songs - pick a variant, then approve'
                  : 'Your song - listen before approving'}
            </p>
            {canStart ? (
              <button
                type="button"
                onClick={clearPersistedAudioUrl}
                className="shrink-0 rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                Remove audio URL
              </button>
            ) : null}
          </div>
          {hasStreamingPreview && !isLocked ? (
            <p className="mb-2 text-[11px] leading-snug text-amber-800">
              Preview stream (no file extension yet) - keep this page open or
              use Check status; when Suno finishes, the link will update to
              .mp3. Approve stays off until every URL ends with a file
              extension.
            </p>
          ) : null}
          {storedAudioUrls.length >= 2 ? (
            <div className="flex flex-col gap-4">
              {storedAudioUrls.map((url, i) => (
                <div
                  key={`${i}-${url.slice(0, 48)}`}
                  className="flex flex-col gap-2 rounded-[6px] border border-zinc-100 bg-zinc-50/80 p-3"
                >
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-zinc-800">
                    <input
                      type="radio"
                      name="suno-track-variant"
                      checked={selectedTrackIdx === i}
                      onChange={() =>
                        onPersistRef.current({ sunoSelectedTrackIndex: i })
                      }
                      className="h-4 w-4 accent-orange-500"
                    />
                    Variant {i + 1}
                  </label>
                  <audio
                    controls
                    src={url}
                    className="h-10 w-full"
                  />
                </div>
              ))}
            </div>
          ) : (
            <audio
              controls
              src={storedAudioUrls[0]}
              className="h-10 w-full"
            />
          )}
        </div>
      ) : null}
      {canStart && removedBundleForUndo && storedAudioUrls.length === 0 ? (
        <div className="mt-4 rounded-[6px] border border-zinc-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={undoRemoveAudioUrl}
              className="shrink-0 rounded-[6px] border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[12px] font-medium text-zinc-800 transition-colors hover:bg-zinc-100"
            >
              Undo remove
            </button>
            <p className="min-w-0 flex-1 text-[12px] text-zinc-600">
              Brings back the URL from before Remove audio URL.
            </p>
          </div>
        </div>
      ) : null}
      {canStart && waiting ? (
        <div className="mt-4 rounded-[6px] border border-zinc-200 bg-white p-3">
          <div className="flex items-center gap-2 text-[12px] text-zinc-600">
            <GenerateSpinner />
            Waiting for Suno generation...
          </div>
        </div>
      ) : null}
      {canStart && hasPersistedAudioUrl && !hasStreamingPreview && (
        <div className="mt-3 text-[12px] text-zinc-500">
          {everyAudioUrlLineIsFinal(outputAssetUrl) ? (
            <span className="inline-flex items-center gap-1 text-green-600">
              <LucideCheck className="h-3.5 w-3.5" />
              Song URL ready for approval
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}

