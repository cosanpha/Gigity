/**
 * Migrations for older project shapes:
 * - 11 → 10: Kling external (old step 9) merged into step 8 clip URLs.
 * - 10 → 9: character image external (old step 6) merged into step 5.
 */
export type SerializableStep = {
  stepNumber: number
  conversation: Array<{ role: string; content: string }>
  llmResponse: string | null
  outputAssetUrl: string | null
  sunoTaskId: string | null
  sunoSelectedTrackIndex: number | null
  status: 'pending' | 'generating' | 'done'
  completedAt: string | Date | null
}

export function migrateLegacyElevenSteps(
  steps: SerializableStep[] | undefined
): { steps: SerializableStep[]; migrated: boolean } {
  if (!steps || steps.length !== 11) {
    return { steps: steps ?? [], migrated: false }
  }

  const old8 = steps[7]
  const old9 = steps[8]
  const out8 = old8.outputAssetUrl?.trim()
  const out9 = old9.outputAssetUrl?.trim()
  const mergedOut = out8
    ? old8.outputAssetUrl
    : out9
      ? old9.outputAssetUrl
      : old8.outputAssetUrl

  const new8: SerializableStep = {
    ...old8,
    stepNumber: 8,
    outputAssetUrl: mergedOut ?? null,
  }

  return {
    steps: [
      ...steps.slice(0, 7),
      new8,
      { ...steps[9], stepNumber: 9 },
      { ...steps[10], stepNumber: 10 },
    ],
    migrated: true,
  }
}

export function migrateLegacyTenSteps(
  steps: SerializableStep[] | undefined
): { steps: SerializableStep[]; migrated: boolean } {
  if (!steps || steps.length !== 10) {
    return { steps: steps ?? [], migrated: false }
  }

  const old5 = steps[4]
  const old6 = steps[5]

  let mergedStatus: SerializableStep['status'] = 'pending'
  let completedAt: string | Date | null = null
  if (old5.status === 'done' && old6.status === 'done') {
    mergedStatus = 'done'
    completedAt = old6.completedAt ?? old5.completedAt
  } else if (old5.status === 'generating') {
    mergedStatus = 'generating'
  } else if (old5.status === 'done' && old6.status !== 'done') {
    mergedStatus = 'pending'
    completedAt = null
  } else {
    mergedStatus = old5.status
  }

  const mergedOut =
    old6.outputAssetUrl?.trim() ? old6.outputAssetUrl : old5.outputAssetUrl

  const merged5: SerializableStep = {
    ...old5,
    stepNumber: 5,
    outputAssetUrl: mergedOut?.trim() ? mergedOut : null,
    status: mergedStatus,
    completedAt,
  }

  return {
    migrated: true,
    steps: [
      ...steps.slice(0, 4),
      merged5,
      { ...steps[6], stepNumber: 6 },
      { ...steps[7], stepNumber: 7 },
      { ...steps[8], stepNumber: 8 },
      { ...steps[9], stepNumber: 9 },
    ],
  }
}
