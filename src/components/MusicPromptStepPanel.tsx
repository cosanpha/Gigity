'use client'

import { MAX_SUNO_STYLE_PROMPT_CHARS } from '@/constants/suno'
import { everyAudioUrlLineIsFinal } from '@/lib/suno-record-info'
import { StepState, WORKFLOW_TOTAL_STEPS } from '@/lib/workflow-templates'
import { LucideCheck } from 'lucide-react'
import { startTransition, useEffect, useRef, useState } from 'react'
import { extractBlock } from './LLMStepPanel'
import {
  SunoMusicSection,
  SunoPersist,
  splitStoredAudioUrls,
} from './SunoMusicSection'
import { StepLlmModelCaption } from './StepLlmModelCaption'
import { CopyButton } from './ui/CopyButton'
import { GenerateSpinner } from './ui/GenerateSpinner'
import { StepActionFooter } from './ui/StepActionFooter'

function composeStep4Document(lyrics: string, stylePrompt: string): string {
  return `**Lyrics**\n${lyrics.trimEnd()}\n\n**Style Prompt**\n${stylePrompt.trimEnd()}`
}

interface MusicPromptStepPanelProps {
  state: StepState
  trackTitle: string
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: (opts?: { outputAssetUrl?: string }) => void
  onReopen: () => void
  onContentChange: (content: string) => void
  onPersistSuno: (updates: SunoPersist) => void
  sunoBaseUrlConfigured?: boolean
  sunoEnvKeyConfigured?: boolean
  llmModel?: string | null
}

export function MusicPromptStepPanel({
  state,
  trackTitle,
  followUp,
  onFollowUpChange,
  onGenerate,
  onRetry,
  onSendFollowUp,
  onApprove,
  onReopen,
  onContentChange,
  onPersistSuno,
  sunoBaseUrlConfigured,
  sunoEnvKeyConfigured,
  llmModel,
}: MusicPromptStepPanelProps) {
  const full = state.llmResponse ?? ''
  const lyricsFromDoc = extractBlock(full, 'Lyrics')

  const [editedStyle, setEditedStyle] = useState(() =>
    extractBlock(full, 'Style Prompt')
  )
  const prevStatusRef = useRef(state.status)

  useEffect(() => {
    if (prevStatusRef.current === 'generating' && state.status === 'pending') {
      const next = state.llmResponse ?? ''
      startTransition(() => setEditedStyle(extractBlock(next, 'Style Prompt')))
    }
    prevStatusRef.current = state.status
  }, [state.status, state.llmResponse])

  function handleStyleEdit(value: string) {
    setEditedStyle(value)
    onContentChange(composeStep4Document(lyricsFromDoc, value))
  }

  const isEmptyStart =
    state.status === 'pending' && !state.llmResponse && !state.error
  const isGenerating = state.status === 'generating'
  const isLocked = state.status === 'done'
  const showWorkspace =
    !isEmptyStart &&
    !isGenerating &&
    (Boolean(state.llmResponse) || Boolean(state.error) || isLocked)

  const lyricsForSuno = lyricsFromDoc
  const styleForSuno = isLocked
    ? extractBlock(full, 'Style Prompt')
    : editedStyle

  const stylePromptFromDoc = extractBlock(full, 'Style Prompt')

  const styleCharCount = styleForSuno.length
  const styleExceedsSunoLimit = styleCharCount > MAX_SUNO_STYLE_PROMPT_CHARS

  const hasPreviewOrFinalAudioUrl =
    splitStoredAudioUrls(state.outputAssetUrl).length > 0
  const hasFinalSongUrl = everyAudioUrlLineIsFinal(state.outputAssetUrl)
  const approveRequiresSong =
    Boolean(sunoBaseUrlConfigured) &&
    (Boolean(sunoEnvKeyConfigured) || Boolean(state.sunoApiKeyOverride?.trim()))
  const canApprove = !approveRequiresSong || hasFinalSongUrl

  return (
    <div className="mx-auto max-w-[720px] px-8 py-8">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-[13px] text-zinc-400">
          <span>Step 4 of {WORKFLOW_TOTAL_STEPS}</span>
          <span>·</span>
          <span>SunoAI</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          Song Audio
        </h2>
        <StepLlmModelCaption model={llmModel} />
      </div>

      {isEmptyStart && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-[13px] text-zinc-500">
            Ready to generate your music prompt package.
          </p>
          <button
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
          <p className="text-[13px] text-zinc-500">Generating music prompt…</p>
        </div>
      )}

      {showWorkspace && (
        <div className="flex flex-col gap-5">
          {isLocked && (
            <p className="text-[13px] text-green-600">
              Approved - Re-open to edit the style prompt.
            </p>
          )}

          {state.error && (
            <div className="rounded-[6px] border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{state.error}</p>
            </div>
          )}

          {state.llmResponse && (
            <>
              <div className="overflow-hidden rounded-[6px] border border-zinc-200 bg-zinc-50">
                <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2">
                  <span className="text-[13px] font-medium text-zinc-700">
                    Lyrics
                  </span>
                  {lyricsFromDoc ? <CopyButton text={lyricsFromDoc} /> : null}
                </div>
                <pre className="max-h-[min(50vh,28rem)] overflow-y-auto px-4 py-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-zinc-800">
                  {lyricsFromDoc || '-'}
                </pre>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-zinc-700">
                    Style Prompt
                  </span>
                  {isLocked && stylePromptFromDoc ? (
                    <CopyButton text={stylePromptFromDoc} />
                  ) : null}
                </div>
                <textarea
                  value={isLocked ? stylePromptFromDoc : editedStyle}
                  onChange={e => handleStyleEdit(e.target.value)}
                  readOnly={isLocked}
                  rows={3}
                  spellCheck={false}
                  className={`w-full resize-y rounded-[6px] border bg-white px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-800 outline-none read-only:bg-zinc-50 read-only:text-zinc-700 focus:border-orange-400 ${
                    !isLocked && styleExceedsSunoLimit
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-zinc-200'
                  }`}
                />
                {!isLocked && (
                  <div className="flex flex-col gap-1">
                    <p
                      className={
                        styleExceedsSunoLimit
                          ? 'text-[12px] font-medium text-red-600'
                          : 'text-[12px] text-zinc-500'
                      }
                    >
                      {styleCharCount} / {MAX_SUNO_STYLE_PROMPT_CHARS}{' '}
                      characters (Suno style limit)
                    </p>
                    {styleExceedsSunoLimit ? (
                      <p className="text-[12px] text-red-600">
                        Shorten this text to {MAX_SUNO_STYLE_PROMPT_CHARS}{' '}
                        characters or fewer before using Generate Song.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          )}

          {state.llmResponse && (
            <SunoMusicSection
              lyrics={lyricsForSuno}
              style={styleForSuno}
              trackTitle={trackTitle}
              sunoTaskId={state.sunoTaskId}
              sunoSelectedTrackIndex={state.sunoSelectedTrackIndex}
              outputAssetUrl={state.outputAssetUrl}
              sunoApiKeyOverride={state.sunoApiKeyOverride}
              canStart={!isLocked}
              isLocked={isLocked}
              sunoBaseUrlConfigured={Boolean(sunoBaseUrlConfigured)}
              sunoEnvKeyConfigured={Boolean(sunoEnvKeyConfigured)}
              maxSunoStyleChars={MAX_SUNO_STYLE_PROMPT_CHARS}
              onPersist={onPersistSuno}
            />
          )}

          <div className="flex gap-2">
            <textarea
              value={followUp}
              onChange={e => onFollowUpChange(e.target.value)}
              placeholder="Refine the package… e.g. adjust BPM, genre, or style descriptors"
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

          <StepActionFooter
            leftActions={
              <button
                onClick={onRetry}
                className="rounded-[6px] border border-zinc-200 px-4 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                Re-generate
              </button>
            }
            rightActions={
              isLocked ? (
                <button
                  onClick={onReopen}
                  className="rounded-[6px] border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                >
                  Re-open
                </button>
              ) : (
                <button
                  onClick={() =>
                    onApprove({
                      outputAssetUrl: state.outputAssetUrl?.trim() || undefined,
                    })
                  }
                  disabled={!canApprove}
                  className="inline-flex items-center gap-2 rounded-[6px] bg-orange-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <LucideCheck
                    className="h-4 w-4"
                    aria-hidden
                  />
                  Approve
                </button>
              )
            }
            helperText={
              !isLocked && approveRequiresSong && !hasPreviewOrFinalAudioUrl ? (
                <p className="text-[12px] text-zinc-500">
                  Generate a song above, then approve when you are happy with
                  the preview.
                </p>
              ) : !isLocked &&
                approveRequiresSong &&
                hasPreviewOrFinalAudioUrl &&
                !hasFinalSongUrl ? (
                <p className="text-[12px] text-zinc-500">
                  Listen to the preview stream above. Approve unlocks when each
                  audio URL ends with a file extension (e.g. .mp3) - that means
                  the final file is ready.
                </p>
              ) : null
            }
          />
        </div>
      )}
    </div>
  )
}

