/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { StepDefinition } from '@/lib/workflow-templates'
import { useEffect, useState } from 'react'
import { CharacterStepPanel } from './CharacterStepPanel'
import { ExternalStepPanel } from './ExternalStepPanel'
import { LLMStepPanel } from './LLMStepPanel'
import { SceneStepPanel } from './SceneStepPanel'
import { StepSidebar } from './StepSidebar'
import { StoryStepPanel } from './StoryStepPanel'

type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  outputAssetUrl: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

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
  const characterImages = parseUrls(steps[5]?.outputAssetUrl)
  const sceneImages = parseUrls(steps[6]?.outputAssetUrl)
  const videoClips = parseUrls(steps[8]?.outputAssetUrl)
  const musicTrack = parseUrls(steps[3]?.outputAssetUrl)
  return { characterImages, sceneImages, videoClips, musicTrack }
}

interface WorkflowClientProps {
  project: { _id: string; title: string; steps: any[] }
  brand: { name: string; platforms: string[] }
  stepDefs: StepDefinition[]
  sunoEnabled?: boolean
}

export function WorkflowClient({
  project,
  brand,
  stepDefs,
  sunoEnabled,
}: WorkflowClientProps) {
  const [activeStep, setActiveStep] = useState<number>(1)
  const [title, setTitle] = useState(project.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(project.title)
  const [steps, setSteps] = useState<StepState[]>(
    project.steps.map((s: any) => ({
      status: s.status,
      llmResponse: s.llmResponse ?? null,
      outputAssetUrl: s.outputAssetUrl ?? null,
      conversation: s.conversation ?? [],
      error: null,
    }))
  )
  const [followUp, setFollowUp] = useState('')
  const [assetUrls, setAssetUrls] = useState<Record<number, string>>({})
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')

  function setAssetUrl(n: number, url: string) {
    setAssetUrls(prev => ({ ...prev, [n]: url }))
  }

  function updateStepContent(n: number, content: string) {
    setSteps(prev => patch(prev, n, { llmResponse: content }))
  }

  async function saveProgress(currentSteps: StepState[]) {
    setSaveStatus('saving')
    const res = await fetch(`/api/v1/projects/${project._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steps: currentSteps.map(s => ({
          status: s.status,
          llmResponse: s.llmResponse,
          outputAssetUrl: s.outputAssetUrl,
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

  // Auto-save every 30 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setSteps(current => {
        saveProgress(current)
        return current
      })
    }, 30_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveTitle() {
    if (!titleInput.trim() || titleInput === title) {
      setEditingTitle(false)
      return
    }
    await fetch(`/api/v1/projects/${project._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleInput.trim() }),
    })
    setTitle(titleInput.trim())
    setEditingTitle(false)
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
    setSteps(prev =>
      patch(prev, n, {
        status: 'pending',
        llmResponse: null,
        conversation: [],
        error: null,
      })
    )
    setActiveStep(n)
  }

  // Combined approve for steps 5+6: approves LLM output then saves image URLs
  async function approveCharacterStep(imageUrls: string) {
    const res5 = await fetch(
      `/api/v1/projects/${project._id}/steps/5/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    )
    if (!res5.ok) return

    const res6 = await fetch(
      `/api/v1/projects/${project._id}/steps/6/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputAssetUrl: imageUrls }),
      }
    )
    if (!res6.ok) return

    setSteps(prev => {
      let next = patch(prev, 5, { status: 'done' })
      next = patch(next, 6, { status: 'done', outputAssetUrl: imageUrls })
      return next
    })
    setActiveStep(7)
  }

  // Re-opens both step 5 (LLM) and step 6 (images)
  async function reopenCharacterStep() {
    const [res5, res6] = await Promise.all([
      fetch(`/api/v1/projects/${project._id}/steps/5/reopen`, {
        method: 'POST',
      }),
      fetch(`/api/v1/projects/${project._id}/steps/6/reopen`, {
        method: 'POST',
      }),
    ])
    if (!res5.ok || !res6.ok) return
    setSteps(prev => {
      let next = patch(prev, 5, {
        status: 'pending',
        llmResponse: null,
        conversation: [],
        error: null,
      })
      next = patch(next, 6, {
        status: 'pending',
        outputAssetUrl: null,
      })
      return next
    })
    setActiveStep(5)
  }

  // Approve step 7 (LLM + images combined): saves outputAssetUrl for scene images
  async function approveSceneStep(imageUrls: string) {
    const res = await fetch(`/api/v1/projects/${project._id}/steps/7/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputAssetUrl: imageUrls }),
    })
    if (!res.ok) return
    setSteps(prev =>
      patch(prev, 7, { status: 'done', outputAssetUrl: imageUrls })
    )
    setActiveStep(8)
  }

  // Re-opens step 7 — clears both LLM output and scene image URLs
  async function reopenSceneStep() {
    const res = await fetch(`/api/v1/projects/${project._id}/steps/7/reopen`, {
      method: 'POST',
    })
    if (!res.ok) return
    setSteps(prev =>
      patch(prev, 7, {
        status: 'pending',
        llmResponse: null,
        conversation: [],
        error: null,
        outputAssetUrl: null,
      })
    )
    setActiveStep(7)
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
      setSteps(prev => patch(prev, n, { status: 'done' }))
      if (n < 11) setActiveStep(n + 1) // advance to next step
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
      {/* Project title — editable */}
      <div className="flex h-[44px] items-center gap-2 border-b border-zinc-200 px-6">
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
              className="flex-1 rounded border border-indigo-500 px-2 py-1 text-sm outline-none"
            />
            <button
              onClick={saveTitle}
              className="text-[13px] text-indigo-500 hover:text-indigo-600"
            >
              Save
            </button>
            <button
              onClick={() => setEditingTitle(false)}
              className="text-[13px] text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="truncate text-[14px] font-medium text-zinc-950">
              {title}
            </span>
            <button
              onClick={() => {
                setTitleInput(title)
                setEditingTitle(true)
              }}
              className="text-[12px] text-zinc-400 hover:text-zinc-600"
            >
              Edit
            </button>
          </>
        )}

        {/* Save progress button */}
        <div className="ml-auto">
          <button
            onClick={() => saveProgress(steps)}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 rounded-[6px] border border-zinc-200 bg-white px-3 py-1 text-[13px] text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveStatus === 'saving' && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            )}
            {saveStatus === 'saved' && (
              <span className="text-green-500">✓</span>
            )}
            {saveStatus === 'error' && <span className="text-red-500">!</span>}
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
      <div className="flex flex-1 overflow-hidden">
        <StepSidebar
          steps={steps}
          stepDefs={stepDefs}
          activeStep={activeStep}
          onSelect={n => setActiveStep(n === 6 ? 5 : n)}
        />
        <main className="flex-1 overflow-y-auto">
          {activeStep === 2 ? (
            <StoryStepPanel
              key={`story-${steps[1].llmResponse?.length ?? 0}`}
              state={steps[1]}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(2)}
              onRetry={() => generate(2, { retry: true })}
              onSendFollowUp={() => generate(2, { followUpMessage: followUp })}
              onApprove={() => approve(2)}
              onReopen={() => reopen(2)}
              onContentChange={c => updateStepContent(2, c)}
            />
          ) : activeStep === 5 ? (
            <CharacterStepPanel
              key={5}
              step5State={steps[4]}
              step6State={steps[5]}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(5)}
              onRetry={() => generate(5, { retry: true })}
              onSendFollowUp={() => generate(5, { followUpMessage: followUp })}
              onApprove={approveCharacterStep}
              onReopen={reopenCharacterStep}
            />
          ) : activeStep === 7 ? (
            <SceneStepPanel
              key={7}
              stepState={steps[6]}
              followUp={followUp}
              onFollowUpChange={setFollowUp}
              onGenerate={() => generate(7)}
              onRetry={() => generate(7, { retry: true })}
              onSendFollowUp={() => generate(7, { followUpMessage: followUp })}
              onApprove={approveSceneStep}
              onReopen={reopenSceneStep}
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
              sunoEnabled={sunoEnabled}
            />
          ) : (
            <ExternalStepPanel
              key={activeStep}
              stepNumber={activeStep}
              stepDef={currentStepDef}
              state={currentStepState}
              priorStepOutput={getPriorOutput()}
              brandCtx={{ platform: brand.platforms.join(', ') }}
              assetUrl={assetUrls[activeStep] ?? ''}
              onAssetUrlChange={url => setAssetUrl(activeStep, url)}
              onApprove={() =>
                approve(activeStep, {
                  outputAssetUrl: assetUrls[activeStep] ?? '',
                })
              }
              onReopen={() => reopen(activeStep)}
              projectAssets={
                activeStep === 10 ? collectAssets(steps) : undefined
              }
              step7Images={
                activeStep === 9
                  ? (steps[6]?.outputAssetUrl
                      ?.split('\n')
                      .map(u => u.trim())
                      .filter(Boolean) ?? [])
                  : undefined
              }
              step8Output={
                activeStep === 9 ? (steps[7]?.llmResponse ?? '') : undefined
              }
            />
          )}
        </main>
      </div>
    </div>
  )
}
