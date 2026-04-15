/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { DEFAULT_CHARACTER_IMAGE_STYLE } from '@/constants/character-image-styles'
import { workflowStepLlmModelLabel } from '@/constants/workflow-llm-models'
import { apiFetch } from '@/lib/api-fetch'
import { normalizeNoEmDash } from '@/lib/no-em-dash'
import {
  joinPublishMarkdown,
  mergeParsedIntoPlatformOrder,
  normalizePublishPlatforms,
  splitPublishMarkdownByHeading,
  encodePublishLinks,
} from '@/lib/publish'
import {
  StepDefinition,
  StepState,
  WORKFLOW_TOTAL_STEPS,
} from '@/lib/workflow-templates'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LucideAlertCircle,
  LucideArrowLeft,
  LucideCheck,
  LucideMenu,
  LucidePencil,
  LucideX,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  lyrics: string
  selectedMusicTrackIndex: number | null
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
  const lyrics = steps[2]?.llmResponse?.trim() ?? ''
  const selectedMusicTrackIndex =
    typeof steps[3]?.sunoSelectedTrackIndex === 'number'
      ? steps[3].sunoSelectedTrackIndex
      : null
  return {
    characterImages,
    sceneImages,
    videoClips,
    musicTrack,
    lyrics,
    selectedMusicTrackIndex,
  }
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    project.steps.map((s: any, idx: number) => {
      let publishPlatforms: Record<string, string> | null = null
      if (
        s.publishPlatforms &&
        typeof s.publishPlatforms === 'object' &&
        !Array.isArray(s.publishPlatforms)
      ) {
        publishPlatforms = Object.fromEntries(
          Object.entries(s.publishPlatforms).map(([k, v]) => [
            k,
            typeof v === 'string' ? normalizeNoEmDash(v) : '',
          ])
        )
      } else if (
        idx === 8 &&
        typeof s.llmResponse === 'string' &&
        s.llmResponse.trim()
      ) {
        publishPlatforms = mergeParsedIntoPlatformOrder(
          splitPublishMarkdownByHeading(s.llmResponse),
          normalizePublishPlatforms(brand.platforms)
        )
      }
      return {
        status: s.status,
        llmResponse:
          typeof s.llmResponse === 'string'
            ? normalizeNoEmDash(s.llmResponse)
            : null,
        publishPlatforms,
        outputAssetUrl: s.outputAssetUrl ?? null,
        sunoTaskId: s.sunoTaskId ?? null,
        sunoSelectedTrackIndex:
          typeof s.sunoSelectedTrackIndex === 'number'
            ? s.sunoSelectedTrackIndex
            : null,
        sunoApiKeyOverride:
          typeof s.sunoApiKeyOverride === 'string' &&
          s.sunoApiKeyOverride.trim()
            ? s.sunoApiKeyOverride.trim()
            : null,
        conversation: Array.isArray(s.conversation)
          ? s.conversation.map((m: { role: string; content: string }) => ({
              role: m.role,
              content:
                typeof m.content === 'string'
                  ? normalizeNoEmDash(m.content)
                  : '',
            }))
          : [],
        error: null,
      }
    })
  )
  const [followUp, setFollowUp] = useState('')
  const [characterImageStyle, setCharacterImageStyle] = useState(
    DEFAULT_CHARACTER_IMAGE_STYLE
  )
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [approveError, setApproveError] = useState<string | null>(null)

  const stepsRef = useRef(steps)
  stepsRef.current = steps

  function updateStepContent(n: number, content: string) {
    setSteps(prev =>
      patch(prev, n, { llmResponse: normalizeNoEmDash(content) })
    )
  }

  function updatePublishPlatforms(next: Record<string, string>) {
    const normalized: Record<string, string> = {}
    for (const [k, v] of Object.entries(next)) {
      normalized[k] = normalizeNoEmDash(v)
    }
    const order = normalizePublishPlatforms(brand.platforms)
    const joined = joinPublishMarkdown(order, normalized)
    setSteps(prev =>
      patch(prev, 9, { llmResponse: joined, publishPlatforms: normalized })
    )
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
    const res = await apiFetch(`/api/v1/projects/${project._id}`, {
      method: 'PATCH',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steps: currentSteps.map(s => ({
          status: s.status,
          llmResponse: s.llmResponse,
          publishPlatforms: s.publishPlatforms ?? null,
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
    const res = await apiFetch(`/api/v1/projects/${project._id}`, {
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
    opts: {
      retry?: boolean
      followUpMessage?: string
      characterStyle?: string
    } = {}
  ) {
    setSteps(prev => patch(prev, n, { status: 'generating', error: null }))

    try {
      const res = await apiFetch(
        `/api/v1/projects/${project._id}/steps/${n}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(opts),
        }
      )

      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (!data || typeof data.llmResponse !== 'string') {
          setSteps(prev =>
            patch(prev, n, {
              status: 'pending',
              error: 'Invalid response from server',
            })
          )
          return
        }
        setSteps(prev => {
          const current = prev[n - 1]
          const newConversation = opts.retry
            ? [
                {
                  role: 'assistant',
                  content: normalizeNoEmDash(data.llmResponse),
                },
              ]
            : opts.followUpMessage
              ? [
                  ...current.conversation,
                  {
                    role: 'user',
                    content: normalizeNoEmDash(opts.followUpMessage),
                  },
                  {
                    role: 'assistant',
                    content: normalizeNoEmDash(data.llmResponse),
                  },
                ]
              : [
                  {
                    role: 'assistant',
                    content: normalizeNoEmDash(data.llmResponse),
                  },
                ]

          const next = patch(prev, n, {
            status: 'pending',
            llmResponse: normalizeNoEmDash(data.llmResponse),
            conversation: newConversation,
            error: null,
            ...(n === 5 || n === 6 || n === 7 ? { outputAssetUrl: null } : {}),
          })
          void saveProgress(next)
          return next
        })
        if (opts.followUpMessage) setFollowUp('')
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setSteps(prev =>
          patch(prev, n, { status: 'pending', error: err.error })
        )
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Network error'
      setSteps(prev => patch(prev, n, { status: 'pending', error: message }))
    }
  }

  useEffect(() => {
    const idx = activeStep - 1
    if (idx < 0 || idx >= WORKFLOW_TOTAL_STEPS) return
    if (stepsRef.current[idx]?.status !== 'generating') return

    let cancelled = false
    ;(async () => {
      const res = await apiFetch(`/api/v1/projects/${project._id}`)
      if (!res.ok || cancelled) return
      const data = await res.json().catch(() => null)
      if (!data || !Array.isArray(data.steps) || cancelled) return
      const serverRow = data.steps[idx]
      if (!serverRow || typeof serverRow !== 'object') return

      setSteps(prev => {
        const local = prev[idx]
        if (!local || local.status !== 'generating') return prev
        if (serverRow.status === 'generating') return prev
        return prev.map((s, i) =>
          i === idx
            ? {
                ...s,
                status: serverRow.status,
                llmResponse:
                  typeof serverRow.llmResponse === 'string'
                    ? normalizeNoEmDash(serverRow.llmResponse)
                    : null,
                publishPlatforms:
                  serverRow.publishPlatforms &&
                  typeof serverRow.publishPlatforms === 'object' &&
                  !Array.isArray(serverRow.publishPlatforms)
                    ? Object.fromEntries(
                        Object.entries(
                          serverRow.publishPlatforms as Record<string, string>
                        ).map(([k, v]) => [
                          k,
                          typeof v === 'string' ? normalizeNoEmDash(v) : '',
                        ])
                      )
                    : null,
                outputAssetUrl: serverRow.outputAssetUrl ?? null,
                sunoTaskId: serverRow.sunoTaskId ?? null,
                sunoSelectedTrackIndex:
                  typeof serverRow.sunoSelectedTrackIndex === 'number'
                    ? serverRow.sunoSelectedTrackIndex
                    : null,
                conversation: Array.isArray(serverRow.conversation)
                  ? serverRow.conversation
                  : [],
                error: null,
              }
            : s
        )
      })
    })()

    return () => {
      cancelled = true
    }
  }, [activeStep, project._id])

  async function reopen(n: number) {
    const res = await apiFetch(
      `/api/v1/projects/${project._id}/steps/${n}/reopen`,
      { method: 'POST' }
    )
    if (!res.ok) return
    setSteps(prev =>
      patch(prev, n, {
        status: 'pending',
      })
    )
    setActiveStep(n)
  }

  async function approve(n: number, opts: { outputAssetUrl?: string } = {}) {
    setApproveError(null)
    const res = await apiFetch(
      `/api/v1/projects/${project._id}/steps/${n}/approve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Approve failed' }))
      setApproveError(err.error ?? 'Approve failed')
      return
    }

    const url = opts.outputAssetUrl?.trim()
    setSteps(prev =>
      patch(prev, n, {
        status: 'done',
        ...(url ? { outputAssetUrl: url } : {}),
      })
    )
    if (n < WORKFLOW_TOTAL_STEPS) setActiveStep(n + 1)
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
      <div className="flex flex-col border-b border-zinc-200">
        {/* Row 1: nav + save */}
        <div className="flex h-[44px] items-center gap-2 px-5">
          {/* Mobile sidebar toggle - hidden on md+ */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open steps"
            className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 md:hidden"
          >
            <LucideMenu
              className="h-4 w-4"
              aria-hidden
            />
          </button>
          {/* Back link */}
          <Link
            href={`/?brand=${encodeURIComponent(brandProfileId)}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-[4px] px-2 py-1 text-[13px] text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            <LucideArrowLeft
              className="h-3.5 w-3.5"
              aria-hidden
            />
            Videos
          </Link>

          {/* Title */}
          <span className="hidden h-4 w-px shrink-0 bg-zinc-200 md:block" />
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
                className="hidden flex-1 rounded-[4px] border border-orange-400 px-2 py-1 text-[13px] ring-2 ring-orange-100 outline-none md:block"
              />
              <button
                onClick={saveTitle}
                className="hidden shrink-0 text-[13px] text-orange-500 hover:text-orange-600 md:block"
              >
                Save
              </button>
              <button
                onClick={() => setEditingTitle(false)}
                className="hidden shrink-0 text-[13px] text-zinc-400 hover:text-zinc-600 md:block"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setTitleInput(title)
                setEditingTitle(true)
              }}
              className="group hidden min-w-0 items-center gap-1.5 rounded-[4px] px-1 py-0.5 text-left transition-colors hover:bg-zinc-100 md:flex"
              title="Edit title"
            >
              <span className="min-w-0 truncate text-[14px] font-medium text-zinc-950">
                {title}
              </span>
              <LucidePencil
                className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500"
                aria-hidden
              />
            </button>
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
                <LucideCheck
                  className="h-3.5 w-3.5 text-green-500"
                  aria-hidden
                />
              )}
              {saveStatus === 'error' && (
                <LucideAlertCircle
                  className="h-3.5 w-3.5 text-red-500"
                  aria-hidden
                />
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

        {/* Row 2: title - mobile only */}
        <div className="px-5 pb-2 md:hidden">
          {editingTitle ? (
            <div className="flex items-center gap-2">
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
            </div>
          ) : (
            <button
              onClick={() => {
                setTitleInput(title)
                setEditingTitle(true)
              }}
              className="group flex h-8 w-full min-w-0 items-center gap-1.5 rounded-[6px] px-1.5 py-0.5 text-left transition-colors hover:bg-zinc-100"
              title="Edit title"
            >
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-zinc-950">
                {title}
              </span>
              <LucidePencil
                className="h-3 w-3 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500"
                aria-hidden
              />
            </button>
          )}
        </div>
      </div>
      {approveError && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-[13px] text-red-600">
          {approveError}
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden h-full md:flex md:w-[228px] md:shrink-0">
          <StepSidebar
            steps={steps}
            stepDefs={stepDefs}
            activeStep={activeStep}
            onSelect={setActiveStep}
          />
        </div>

        {/* Mobile drawer overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <motion.div
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative flex h-full w-[260px] flex-col bg-white shadow-xl"
                onClick={e => e.stopPropagation()}
              >
                {/* Drawer header */}
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                  <span className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                    Steps
                  </span>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close steps"
                    className="rounded-[4px] p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                  >
                    <LucideX
                      className="h-4 w-4"
                      aria-hidden
                    />
                  </button>
                </div>
                <StepSidebar
                  steps={steps}
                  stepDefs={stepDefs}
                  activeStep={activeStep}
                  onSelect={n => {
                    setActiveStep(n)
                    setSidebarOpen(false)
                  }}
                  hideHeader
                />
              </motion.div>
              {/* Backdrop */}
              <div className="flex-1 bg-black/40" />
            </motion.div>
          )}
        </AnimatePresence>

        <main className="relative min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence
            mode="sync"
            initial={false}
          >
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.13, ease: 'easeOut' }}
              className="h-full"
            >
              {activeStep === 1 ? (
                <EditableTextStepPanel
                  key={`brief-${steps[0].status}`}
                  stepNumber={1}
                  title="Campaign Brief"
                  llmModel={workflowStepLlmModelLabel(1)}
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
                  onSendFollowUp={() =>
                    generate(1, { followUpMessage: followUp })
                  }
                  onApprove={() => approve(1)}
                  onReopen={() => reopen(1)}
                  onContentChange={content => updateStepContent(1, content)}
                />
              ) : activeStep === 2 ? (
                <EditableTextStepPanel
                  key={`story-${steps[1].status}`}
                  stepNumber={2}
                  title="Story Script"
                  llmModel={workflowStepLlmModelLabel(2)}
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
                  onSendFollowUp={() =>
                    generate(2, { followUpMessage: followUp })
                  }
                  onApprove={() => approve(2)}
                  onReopen={() => reopen(2)}
                  onContentChange={content => updateStepContent(2, content)}
                />
              ) : activeStep === 3 ? (
                <EditableTextStepPanel
                  key={`lyrics-${steps[2].status}`}
                  stepNumber={3}
                  title="Song Lyrics"
                  llmModel={workflowStepLlmModelLabel(3)}
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
                  onSendFollowUp={() =>
                    generate(3, { followUpMessage: followUp })
                  }
                  onApprove={() => approve(3)}
                  onReopen={() => reopen(3)}
                  onContentChange={content => updateStepContent(3, content)}
                />
              ) : activeStep === 4 ? (
                <MusicPromptStepPanel
                  key={`music-${steps[3].status}`}
                  state={steps[3]}
                  llmModel={workflowStepLlmModelLabel(4)}
                  trackTitle={title}
                  followUp={followUp}
                  onFollowUpChange={setFollowUp}
                  onGenerate={() => generate(4)}
                  onRetry={() => generate(4, { retry: true })}
                  onSendFollowUp={() =>
                    generate(4, { followUpMessage: followUp })
                  }
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
                  key={`char-${project._id}-${steps[4].status}`}
                  projectId={project._id}
                  stepState={steps[4]}
                  llmModel={workflowStepLlmModelLabel(5)}
                  characterStyle={characterImageStyle}
                  onCharacterStyleChange={setCharacterImageStyle}
                  followUp={followUp}
                  onFollowUpChange={setFollowUp}
                  onGenerate={() =>
                    generate(5, { characterStyle: characterImageStyle })
                  }
                  onRetry={() =>
                    generate(5, {
                      retry: true,
                      characterStyle: characterImageStyle,
                    })
                  }
                  onSendFollowUp={() =>
                    generate(5, { followUpMessage: followUp })
                  }
                  onApprove={imageUrls =>
                    approve(5, { outputAssetUrl: imageUrls })
                  }
                  onReopen={() => reopen(5)}
                  onContentChange={c => updateStepContent(5, c)}
                  onPersistOutput={v => persistStepOutput(5, v)}
                />
              ) : activeStep === 6 ? (
                <SceneStepPanel
                  key={`scene-${project._id}-${steps[5].status}`}
                  projectId={project._id}
                  stepState={steps[5]}
                  llmModel={workflowStepLlmModelLabel(6)}
                  characterImageUrls={collectAssets(steps).characterImages}
                  followUp={followUp}
                  onFollowUpChange={setFollowUp}
                  onGenerate={() => generate(6)}
                  onRetry={() => generate(6, { retry: true })}
                  onSendFollowUp={() =>
                    generate(6, { followUpMessage: followUp })
                  }
                  onApprove={imageUrls =>
                    approve(6, { outputAssetUrl: imageUrls })
                  }
                  onReopen={() => reopen(6)}
                  onContentChange={c => updateStepContent(6, c)}
                  onPersistOutput={v => persistStepOutput(6, v)}
                />
              ) : activeStep === 7 ? (
                <KlingStepPanel
                  key={`kling-${project._id}-${steps[6].status}`}
                  projectId={project._id}
                  stepDef={currentStepDef}
                  state={steps[6]}
                  llmModel={workflowStepLlmModelLabel(7)}
                  sceneImageUrls={collectAssets(steps).sceneImages}
                  followUp={followUp}
                  onFollowUpChange={setFollowUp}
                  onGenerate={() => generate(7)}
                  onRetry={() => generate(7, { retry: true })}
                  onSendFollowUp={() =>
                    generate(7, { followUpMessage: followUp })
                  }
                  onApprove={videoUrls =>
                    approve(7, { outputAssetUrl: videoUrls })
                  }
                  onReopen={() => reopen(7)}
                  onContentChange={c => updateStepContent(7, c)}
                  onPersistOutput={v => persistStepOutput(7, v)}
                />
              ) : currentStepDef.type === 'llm' ? (
                <LLMStepPanel
                  stepDef={currentStepDef}
                  state={currentStepState}
                  llmModel={workflowStepLlmModelLabel(activeStep)}
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
                  llmModel={workflowStepLlmModelLabel(activeStep)}
                  priorStepOutput={getPriorOutput()}
                  brandCtx={{ platform: brand.platforms.join(', ') }}
                  publishPlatformOrder={normalizePublishPlatforms(
                    brand.platforms
                  )}
                  onApprove={() => approve(activeStep, {})}
                  onReopen={() => reopen(activeStep)}
                  projectTitle={title}
                  projectAssets={
                    activeStep === 8 ? collectAssets(steps) : undefined
                  }
                  publishStep={
                    activeStep === 9
                      ? {
                          onPublishPlatformsChange: updatePublishPlatforms,
                          onGenerate: async () => {
                            const res = await apiFetch(
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
                            const pp =
                              data.publishPlatforms &&
                              typeof data.publishPlatforms === 'object' &&
                              !Array.isArray(data.publishPlatforms)
                                ? Object.fromEntries(
                                    Object.entries(data.publishPlatforms).map(
                                      ([k, v]) => [
                                        k,
                                        typeof v === 'string'
                                          ? normalizeNoEmDash(v)
                                          : '',
                                      ]
                                    )
                                  )
                                : null
                            setSteps(prev => {
                              const next = patch(prev, 9, {
                                llmResponse:
                                  typeof data.llmResponse === 'string'
                                    ? normalizeNoEmDash(data.llmResponse)
                                    : null,
                                publishPlatforms: pp,
                              })
                              saveProgress(next)
                              return next
                            })
                          },
                          onSaveLinks: links => {
                            persistStepOutput(9, encodePublishLinks(links))
                          },
                        }
                      : undefined
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

