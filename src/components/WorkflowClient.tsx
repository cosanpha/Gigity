/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { encodePublishLinks } from '@/lib/publish-links'
import {
  StepDefinition,
  StepState,
  WORKFLOW_TOTAL_STEPS,
} from '@/lib/workflow-templates'
import { LucideAlertCircle, LucideArrowLeft, LucideCheck } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useState } from 'react'
import { CharacterStepPanel } from './CharacterStepPanel'
import { EditableTextStepPanel } from './EditableTextStepPanel'
import { ExternalStepPanel } from './ExternalStepPanel'
import { KlingStepPanel } from './KlingStepPanel'
import { LLMStepPanel } from './LLMStepPanel'
import { MusicPromptStepPanel } from './MusicPromptStepPanel'
import { SceneStepPanel } from './SceneStepPanel'
import { StepSidebar } from './StepSidebar'

interface ProjectAssets {
  characterImages: string[]
  sceneImages: string[]
  videoClips: string[]
  musicTrack: string[]
}

function parseUrls(raw: string | null): string[] {
  if (!raw?.trim()) return []
  return raw
    .split('\n')
    .map(u => u.trim())
    .filter(Boolean)
}

function collectAssets(steps: StepState[]): ProjectAssets {
  const characterImages = parseUrls(steps[4]?.outputAssetUrl)
  const sceneImages = parseUrls(steps[5]?.outputAssetUrl)
  const videoClips = parseUrls(steps[6]?.outputAssetUrl)
  const musicTrack = parseUrls(steps[3]?.outputAssetUrl)
  return { characterImages, sceneImages, videoClips, musicTrack }
}

interface WorkflowClientProps {
  project: { _id: string; title: string; steps: any[] }
  brand: { name: string; platforms: string[] }
  brandProfileId: string
  stepDefs: StepDefinition[]
  sunoBaseUrlConfigured?: boolean
  sunoEnvKeyConfigured?: boolean
}

export function WorkflowClient({
  project,
  brand,
  brandProfileId,
  stepDefs,
  sunoBaseUrlConfigured,
  sunoEnvKeyConfigured,
}: WorkflowClientProps) {
  const activeStepStorageKey = `gigity:activeWorkflowStep:${project._id}`
  const [activeStep, setActiveStep] = useState<number>(1)

  useLayoutEffect(() => {
    try {
      const raw = sessionStorage.getItem(activeStepStorageKey)
      if (!raw) return
      const n = parseInt(raw, 10)
      if (Number.isFinite(n) && n >= 1 && n <= WORKFLOW_TOTAL_STEPS) {
        setActiveStep(n)
      }
    } catch {
      // sessionStorage may be unavailable (e.g. private mode)
    }
  }, [activeStepStorageKey])

  useEffect(() => {
    try {
      sessionStorage.setItem(activeStepStorageKey, String(activeStep))
    } catch {
      // ignore
    }
  }, [activeStep, activeStepStorageKey])

  const [title, setTitle] = useState(project.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(project.title)
  const [steps, setSteps] = useState<StepState[]>(
    project.steps.map((s: any) => ({
      status: s.status,
      llmResponse: s.llmResponse ?? null,
      outputAssetUrl: s.outputAssetUrl ?? null,
      sunoTaskId: s.sunoTaskId ?? null,
      sunoSelectedTrackIndex:
        typeof s.sunoSelectedTrackIndex === 'number'
          ? s.sunoSelectedTrackIndex
          : null,
      sunoApiKeyOverride:
        typeof s.sunoApiKeyOverride === 'string' && s.sunoApiKeyOverride.trim()
          ? s.sunoApiKeyOverride.trim()
          : null,
      conversation: s.conversation ?? [],
      error: null,
    }))
  )
  const [followUp, setFollowUp] = useState('')
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [approveError, setApproveError] = useState<string | null>(null)

  function updateStepContent(n: number, content: string) {
    setSteps(prev => patch(prev, n, { llmResponse: content }))
  }

  function persistStepOutput(n: number, outputAssetUrl: string | null) {
    setSteps(prev => {
      const v =
        outputAssetUrl != null && /[^\s]/.test(outputAssetUrl)
          ? outputAssetUrl
          : null
      const next = patch(prev, n, { outputAssetUrl: v })
      saveProgress(next)
      return next
    })
  }

  async function saveProgress(currentSteps: StepState[], signal?: AbortSignal) {
    setSaveStatus('saving')
    const res = await fetch(`/api/v1/projects/${project._id}`, {
      method: 'PATCH',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steps: currentSteps.map(s => ({
          status: s.status,
          llmResponse: s.llmResponse,
          outputAssetUrl: s.outputAssetUrl,
          sunoTaskId: s.sunoTaskId,
          sunoSelectedTrackIndex: s.sunoSelectedTrackIndex,
          // Only send sunoApiKeyOverride when the user has set a new key;
          // null means "don't change the stored key" (ISSUE-004/019)
          ...(s.sunoApiKeyOverride
            ? { sunoApiKeyOverride: s.sunoApiKeyOverride }
            : {}),
          conversation: s.conversation,
        })),
      }),
    })
    if (res.ok) {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } else {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  async function saveProgressSafe(
    currentSteps: StepState[],
    signal?: AbortSignal
  ) {
    try {
      await saveProgress(currentSteps, signal)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // Auto-save every 30 seconds (ISSUE-014: abort in-flight fetch on unmount)
  useEffect(() => {
    let controller = new AbortController()
    const id = setInterval(() => {
      controller.abort()
      controller = new AbortController()
      setSteps(current => {
        saveProgressSafe(current, controller.signal)
        return current
      })
    }, 30_000)
    return () => {
      clearInterval(id)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveTitle() {
    if (!titleInput.trim() || titleInput === title) {
      setEditingTitle(false)
      return
    }
    const res = await fetch(`/api/v1/projects/${project._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleInput.trim() }),
    })
    if (res.ok) {
      setTitle(titleInput.trim())
      setEditingTitle(false)
    } else {
      setTitleInput(title)
      setEditingTitle(false)
    }
  }

  // Auto-start step 1 when landing on a brand-new project
  useEffect(() => {
    const step1 = steps[0]
    if (step1.status === 'pending' && !step1.llmResponse) {
      generate(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generate(
    n: number,
    opts: { retry?: boolean; followUpMessage?: string } = {}
  ) {
    setSteps(prev => patch(prev, n, { status: 'generating', error: null }))

    const res = await fetch(
      `/api/v1/projects/${project._id}/steps/${n}/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      }
    )

    if (res.ok) {
      const data = await res.json()
      setSteps(prev => {
        const current = prev[n - 1]
        const newConversation = opts.retry
          ? [{ role: 'assistant', content: data.llmResponse }]
          : opts.followUpMessage
            ? [
                ...current.conversation,
                { role: 'user', content: opts.followUpMessage },
                { role: 'assistant', content: data.llmResponse },
              ]
            : [{ role: 'assistant', content: data.llmResponse }]

        return patch(prev, n, {
          status: 'pending',
          llmResponse: data.llmResponse,
          conversation: newConversation,
          error: null,
          ...(n === 5 || n === 6 || n === 7 ? { outputAssetUrl: null } : {}),
        })
      })
      if (opts.followUpMessage) setFollowUp('')
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      setSteps(prev => patch(prev, n, { status: 'pending', error: err.error }))
    }
  }

  async function reopen(n: number) {
    const res = await fetch(
      `/api/v1/projects/${project._id}/steps/${n}/reopen`,
      { method: 'POST' }
    )
    if (!res.ok) return
    if (
      n === 1 ||
      n === 2 ||
      n === 3 ||
      n === 4 ||
      n === 5 ||
      n === 6 ||
      n === 7
    ) {
      setSteps(prev =>
        patch(prev, n, {
          status: 'pending',
          ...(n === 4 ? { sunoTaskId: null } : {}),
          ...(n === 7 ? { outputAssetUrl: null } : {}),
        })
      )
    } else {
      setSteps(prev =>
        patch(prev, n, {
          status: 'pending',
          llmResponse: null,
          conversation: [],
          error: null,
        })
      )
    }
    setActiveStep(n)
  }

  async function approveCharacterStep(imageUrls: string) {
    setApproveError(null)
    const res = await fetch(`/api/v1/projects/${project._id}/steps/5/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputAssetUrl: imageUrls }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Approve failed' }))
      setApproveError(err.error ?? 'Approve failed')
      return
    }
    setSteps(prev =>
      patch(prev, 5, {
        status: 'done',
        outputAssetUrl: imageUrls,
      })
    )
    setActiveStep(6)
  }

  async function reopenCharacterStep() {
    const res = await fetch(`/api/v1/projects/${project._id}/steps/5/reopen`, {
      method: 'POST',
    })
    if (!res.ok) return
    setSteps(prev => patch(prev, 5, { status: 'pending' }))
    setActiveStep(5)
  }

  async function approveSceneStep(imageUrls: string) {
    setApproveError(null)
    const res = await fetch(`/api/v1/projects/${project._id}/steps/6/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputAssetUrl: imageUrls }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Approve failed' }))
      setApproveError(err.error ?? 'Approve failed')
      return
    }
    setSteps(prev =>
      patch(prev, 6, { status: 'done', outputAssetUrl: imageUrls })
    )
    setActiveStep(7)
  }

  async function approveKlingStep(videoUrls: string) {
    setApproveError(null)
    const res = await fetch(`/api/v1/projects/${project._id}/steps/7/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputAssetUrl: videoUrls }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Approve failed' }))
      setApproveError(err.error ?? 'Approve failed')
      return
    }
    setSteps(prev =>
      patch(prev, 7, { status: 'done', outputAssetUrl: videoUrls })
    )
    setActiveStep(8)
  }

  async function reopenSceneStep() {
    const res = await fetch(`/api/v1/projects/${project._id}/steps/6/reopen`, {
      method: 'POST',
    })
    if (!res.ok) return
    setSteps(prev => patch(prev, 6, { status: 'pending' }))
    setActiveStep(6)
  }

  async function approve(n: number, opts: { outputAssetUrl?: string } = {}) {
    const res = await fetch(
      `/api/v1/projects/${project._id}/steps/${n}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      }
    )

    if (res.ok) {
      const url = opts.outputAssetUrl?.trim()
      setSteps(prev =>
        patch(prev, n, {
          status: 'done',
          ...(url ? { outputAssetUrl: url } : {}),
        })
      )
      if (n < WORKFLOW_TOTAL_STEPS) setActiveStep(n + 1)
    }
  }

  function patch(
    prev: StepState[],
    n: number,
    updates: Partial<StepState>
  ): StepState[] {
    return prev.map((s, i) => (i === n - 1 ? { ...s, ...updates } : s))
  }

  const currentStepState = steps[activeStep - 1]
  const currentStepDef = stepDefs.find(d => d.stepNumber === activeStep)!

  // Get the prior step's output for ExternalStepPanel context card
  function getPriorOutput(): string | null {
    if (activeStep <= 1) return null
    const prior = steps[activeStep - 2]
    return prior?.llmResponse ?? prior?.outputAssetUrl ?? null
  }

  return (
    <div className="flex h-[calc(100vh-52px)] flex-col">
      {/* Project title bar */}
      <div className="flex h-[44px] items-center gap-2 border-b border-zinc-200 px-5">
        {/* Back link */}
        <Link
          href={`/?brand=${encodeURIComponent(brandProfileId)}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-[4px] px-2 py-1 text-[13px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <LucideArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Videos
        </Link>
        <span className="h-4 w-px shrink-0 bg-zinc-200" />

        {editingTitle ? (
          <>
            <input
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') setEditingTitle(false)
              }}
              autoFocus
              className="flex-1 rounded-[4px] border border-orange-400 px-2 py-1 text-[13px] ring-2 ring-orange-100 outline-none"
            />
            <button
              onClick={saveTitle}
              className="shrink-0 text-[13px] text-orange-500 hover:text-orange-600"
            >
              Save
            </button>
            <button
              onClick={() => setEditingTitle(false)}
              className="shrink-0 text-[13px] text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="min-w-0 truncate text-[14px] font-medium text-zinc-950">
              {title}
            </span>
            <button
              onClick={() => {
                setTitleInput(title)
                setEditingTitle(true)
              }}
              className="shrink-0 rounded-[4px] px-2 py-1 text-[12px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            >
              Edit
            </button>
          </>
        )}

        {/* Save progress button */}
        <div className="ml-auto shrink-0">
          <button
            onClick={() => saveProgress(steps)}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 rounded-[6px] border border-zinc-200 bg-white px-3 py-1 text-[13px] text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveStatus === 'saving' && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500" />
            )}
            {saveStatus === 'saved' && (
              <LucideCheck className="h-3.5 w-3.5 text-green-500" aria-hidden />
            )}
            {saveStatus === 'error' && (
              <LucideAlertCircle className="h-3.5 w-3.5 text-red-500" aria-hidden />
            )}
            <span>
              {saveStatus === 'saving'
                ? 'Saving…'
                : saveStatus === 'saved'
                  ? 'Saved'
                  : saveStatus === 'error'
                    ? 'Save failed'
                    : 'Save'}
            </span>
          </button>
        </div>
      </div>
      {approveError && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-[13px] text-red-600">
          {approveError}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <StepSidebar
          steps={steps}
          stepDefs={stepDefs}
          activeStep={activeStep}
          onSelect={setActiveStep}
        />
        <main className="flex-1 overflow-y-auto">
          {activeStep === 1 ? (
            <EditableTextStepPanel
              key={`brief-${steps[0].status}`}
              stepNumber={1}
              title="Campaign Brief"
              tool="Gigity"
              textareaRows={18}
              generateLabel="campaign brief"
              generatingLabel="campaign brief…"
              approvedLabel="brief"
              followUpPlaceholder="Refine the brief… e.g. stronger hook, clearer CTA, different tone"
              state={steps[0]}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(1)}
              onRetry={() => generate(1, { retry: true })}
              onSendFollowUp={() => generate(1, { followUpMessage: followUp })}
              onApprove={() => approve(1)}
              onReopen={() => reopen(1)}
              onContentChange={content => updateStepContent(1, content)}
            />
          ) : activeStep === 2 ? (
            <EditableTextStepPanel
              key={`story-${steps[1].status}`}
              stepNumber={2}
              title="Story Script"
              tool="Gigity"
              textareaRows={24}
              generateLabel="story script"
              generatingLabel="story script…"
              approvedLabel="script"
              followUpPlaceholder="Refine the script… e.g. make it more emotional, shorter, change the ending"
              state={steps[1]}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(2)}
              onRetry={() => generate(2, { retry: true })}
              onSendFollowUp={() => generate(2, { followUpMessage: followUp })}
              onApprove={() => approve(2)}
              onReopen={() => reopen(2)}
              onContentChange={content => updateStepContent(2, content)}
            />
          ) : activeStep === 3 ? (
            <EditableTextStepPanel
              key={`lyrics-${steps[2].status}`}
              stepNumber={3}
              title="Song Lyrics"
              tool="SunoAI"
              textareaRows={24}
              generateLabel="song lyrics"
              generatingLabel="song lyrics…"
              approvedLabel="lyrics"
              followUpPlaceholder="Refine the lyrics… e.g. shorter chorus, different rhyme, clearer hook"
              state={steps[2]}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(3)}
              onRetry={() => generate(3, { retry: true })}
              onSendFollowUp={() => generate(3, { followUpMessage: followUp })}
              onApprove={() => approve(3)}
              onReopen={() => reopen(3)}
              onContentChange={content => updateStepContent(3, content)}
            />
          ) : activeStep === 4 ? (
            <MusicPromptStepPanel
              key={`music-${steps[3].status}`}
              state={steps[3]}
              trackTitle={title}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(4)}
              onRetry={() => generate(4, { retry: true })}
              onSendFollowUp={() => generate(4, { followUpMessage: followUp })}
              onApprove={opts => approve(4, opts ?? {})}
              onReopen={() => reopen(4)}
              onContentChange={c => updateStepContent(4, c)}
              onPersistSuno={updates =>
                setSteps(prev => {
                  const next = patch(prev, 4, updates)
                  saveProgress(next)
                  return next
                })
              }
              sunoBaseUrlConfigured={sunoBaseUrlConfigured}
              sunoEnvKeyConfigured={sunoEnvKeyConfigured}
            />
          ) : activeStep === 5 ? (
            <CharacterStepPanel
              key={`char-${steps[4].status}-${steps[4].llmResponse?.length ?? 0}`}
              stepState={steps[4]}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(5)}
              onRetry={() => generate(5, { retry: true })}
              onSendFollowUp={() => generate(5, { followUpMessage: followUp })}
              onApprove={approveCharacterStep}
              onReopen={reopenCharacterStep}
              onContentChange={c => updateStepContent(5, c)}
              onPersistOutput={v => persistStepOutput(5, v)}
            />
          ) : activeStep === 6 ? (
            <SceneStepPanel
              key={`scene-${steps[5].status}-${steps[5].llmResponse?.length ?? 0}`}
              stepState={steps[5]}
              characterImageUrls={collectAssets(steps).characterImages}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(6)}
              onRetry={() => generate(6, { retry: true })}
              onSendFollowUp={() => generate(6, { followUpMessage: followUp })}
              onApprove={approveSceneStep}
              onReopen={reopenSceneStep}
              onContentChange={c => updateStepContent(6, c)}
              onPersistOutput={v => persistStepOutput(6, v)}
            />
          ) : activeStep === 7 ? (
            <KlingStepPanel
              key={`kling-7-${steps[6].status}-${steps[6].llmResponse?.length ?? 0}`}
              stepDef={currentStepDef}
              state={steps[6]}
              sceneImageUrls={collectAssets(steps).sceneImages}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(7)}
              onRetry={() => generate(7, { retry: true })}
              onSendFollowUp={() => generate(7, { followUpMessage: followUp })}
              onApprove={approveKlingStep}
              onReopen={() => reopen(7)}
              onContentChange={c => updateStepContent(7, c)}
              onPersistOutput={v => persistStepOutput(7, v)}
            />
          ) : currentStepDef.type === 'llm' ? (
            <LLMStepPanel
              stepDef={currentStepDef}
              state={currentStepState}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(activeStep)}
              onRetry={() => generate(activeStep, { retry: true })}
              onSendFollowUp={() =>
                generate(activeStep, { followUpMessage: followUp })
              }
              onApprove={opts => approve(activeStep, opts)}
              onReopen={() => reopen(activeStep)}
            />
          ) : (
            <ExternalStepPanel
              key={activeStep}
              stepNumber={activeStep}
              stepDef={currentStepDef}
              state={currentStepState}
              priorStepOutput={getPriorOutput()}
              brandCtx={{ platform: brand.platforms.join(', ') }}
              onApprove={() => approve(activeStep, {})}
              onReopen={() => reopen(activeStep)}
              projectTitle={title}
              projectAssets={
                activeStep === 8 ? collectAssets(steps) : undefined
              }
              publishStep={
                activeStep === 9
                  ? {
                      onDescriptionChange: c => updateStepContent(9, c),
                      onGenerate: async () => {
                        const res = await fetch(
                          `/api/v1/projects/${project._id}/steps/9/generate-publish-description`,
                          { method: 'POST' }
                        )
                        const data = await res.json().catch(() => ({}))
                        if (!res.ok) {
                          throw new Error(
                            typeof data.error === 'string'
                              ? data.error
                              : 'Generation failed'
                          )
                        }
                        setSteps(prev => {
                          const next = patch(prev, 9, {
                            llmResponse:
                              typeof data.llmResponse === 'string'
                                ? data.llmResponse
                                : null,
                          })
                          saveProgress(next)
                          return next
                        })
                      },
                      onSaveLinks: (tiktok, youtube) => {
                        persistStepOutput(
                          9,
                          encodePublishLinks(tiktok, youtube)
                        )
                      },
                    }
                  : undefined
              }
            />
          )}
        </main>
      </div>
    </div>
  )
}

