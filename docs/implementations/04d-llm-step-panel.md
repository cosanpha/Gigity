# 04d — Workflow View: LLMStepPanel

## What this builds

The main panel for LLM steps (1–5, 7–8). Renders 4 sub-states: empty (generate button),
generating (spinner), has result (response + follow-up actions), and approved (read-only).

## Prerequisites

[04b-workflow-client.md](04b-workflow-client.md) — WorkflowClient passes handlers here.

## Files to create

```
src/components/LLMStepPanel.tsx
```

Reference design: `docs/designs/workflow-view.html` (main content area, LLM states)

---

## Sub-states

```
State 1: status=pending, no llmResponse, no error → "Generate" button
State 2: status=generating                         → Spinner
State 3: status=done                               → Read-only approved result
State 4: status=pending, has llmResponse           → Response + follow-up + retry + approve
         (includes error sub-state within State 4)
```

---

## `src/components/LLMStepPanel.tsx`

```tsx
import { StepDefinition } from '@/lib/workflow-templates'

type StepState = {
  status: 'pending' | 'generating' | 'done'
  llmResponse: string | null
  conversation: Array<{ role: string; content: string }>
  error: string | null
}

interface LLMStepPanelProps {
  stepDef: StepDefinition
  state: StepState
  followUp: string
  onFollowUpChange: (v: string) => void
  onGenerate: () => void
  onRetry: () => void
  onSendFollowUp: () => void
  onApprove: () => void
}

export function LLMStepPanel({
  stepDef, state, followUp,
  onFollowUpChange, onGenerate, onRetry, onSendFollowUp, onApprove,
}: LLMStepPanelProps) {
  return (
    <div className="max-w-[720px] mx-auto px-8 py-8">
      {/* Step header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[13px] text-zinc-400 mb-1">
          <span>Step {stepDef.stepNumber} of 11</span>
          <span>·</span>
          <span>{stepDef.tool}</span>
        </div>
        <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">
          {stepDef.title}
        </h2>
      </div>

      {/* State 1: No response yet */}
      {state.status === 'pending' && !state.llmResponse && !state.error && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-[13px] text-zinc-500">
            Ready to generate your {stepDef.title.toLowerCase()}.
          </p>
          <button
            onClick={onGenerate}
            className="px-6 py-2.5 bg-indigo-500 text-white text-sm font-medium
                       rounded-[6px] hover:bg-indigo-600 transition-colors"
          >
            Generate
          </button>
        </div>
      )}

      {/* State 2: Generating */}
      {state.status === 'generating' && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <svg className="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          <p className="text-[13px] text-zinc-500">Generating…</p>
        </div>
      )}

      {/* State 3: Approved / done */}
      {state.status === 'done' && (
        <div>
          <div className="flex items-center gap-2 mb-4 text-[13px] text-green-600 font-medium">
            <span className="w-[18px] h-[18px] rounded-full bg-green-500 flex items-center
                             justify-center text-white text-[11px]">✓</span>
            Approved
          </div>
          <ResponseCard content={state.llmResponse!} />
        </div>
      )}

      {/* State 4: Has result — actions available */}
      {state.status === 'pending' && (state.llmResponse || state.error) && (
        <div className="flex flex-col gap-5">

          {/* Error message */}
          {state.error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-[6px]">
              <p className="text-sm text-red-600">{state.error}</p>
              <button
                onClick={onRetry}
                className="mt-2 text-[13px] text-red-600 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Response — conversation thread or single response */}
          {state.llmResponse && (
            state.conversation.length > 1
              ? <ConversationThread messages={state.conversation} />
              : <ResponseCard content={state.llmResponse} />
          )}

          {/* Follow-up input */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <textarea
                value={followUp}
                onChange={e => onFollowUpChange(e.target.value)}
                placeholder="Refine this output… e.g. make it shorter, change the tone"
                rows={2}
                className="flex-1 px-3 py-2 border border-zinc-200 rounded-[6px] text-sm
                           placeholder:text-zinc-400 resize-none focus:outline-none
                           focus:border-indigo-500"
              />
              <button
                onClick={onSendFollowUp}
                disabled={!followUp.trim()}
                className="px-4 py-2 bg-zinc-100 text-zinc-700 text-sm rounded-[6px]
                           border border-zinc-200 hover:bg-zinc-200 disabled:opacity-40
                           disabled:cursor-not-allowed transition-colors self-end"
              >
                Send
              </button>
            </div>
          </div>

          {/* Primary actions */}
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200
                         rounded-[6px] hover:bg-zinc-50 transition-colors"
            >
              ↺ Start fresh
            </button>
            <button
              onClick={onApprove}
              className="px-5 py-2 bg-indigo-500 text-white text-sm font-medium
                         rounded-[6px] hover:bg-indigo-600 transition-colors"
            >
              ✓ Approve
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

function ResponseCard({ content }: { content: string }) {
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-[6px] p-5">
      <pre className="text-sm text-zinc-800 whitespace-pre-wrap font-sans leading-relaxed">
        {content}
      </pre>
    </div>
  )
}

function ConversationThread({ messages }: { messages: Array<{ role: string; content: string }> }) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((m, i) => (
        <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
          {m.role === 'user' ? (
            <div className="max-w-[80%] bg-indigo-50 border border-indigo-100
                            rounded-[6px] px-4 py-2.5 text-sm text-indigo-800">
              {m.content}
            </div>
          ) : (
            <ResponseCard content={m.content} />
          )}
        </div>
      ))}
    </div>
  )
}
```

---

**Output:** LLMStepPanel with all 4 sub-states, follow-up thread, retry, approve.

**Next step:** [04e-external-step-panel.md](04e-external-step-panel.md) — ExternalStepPanel
