export type AIModelTokenPricing = {
  name: string
  inputUsdPer1M: number
  cachedInputUsdPer1M: number | null
  outputUsdPer1M: number
}

export const AI_MODELS: Record<string, AIModelTokenPricing> = {
  'gpt-5.2': {
    name: 'gpt-5.2',
    inputUsdPer1M: 1.75,
    cachedInputUsdPer1M: 0.175,
    outputUsdPer1M: 14,
  },
  'gpt-5.2-pro': {
    name: 'gpt-5.2-pro',
    inputUsdPer1M: 21,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 168,
  },
  'gpt-5.1': {
    name: 'gpt-5.1',
    inputUsdPer1M: 1.25,
    cachedInputUsdPer1M: 0.125,
    outputUsdPer1M: 10,
  },
  'gpt-5': {
    name: 'gpt-5',
    inputUsdPer1M: 1.25,
    cachedInputUsdPer1M: 0.125,
    outputUsdPer1M: 10,
  },
  'gpt-5-mini': {
    name: 'gpt-5-mini',
    inputUsdPer1M: 0.25,
    cachedInputUsdPer1M: 0.025,
    outputUsdPer1M: 2,
  },
  'gpt-5-nano': {
    name: 'gpt-5-nano',
    inputUsdPer1M: 0.05,
    cachedInputUsdPer1M: 0.005,
    outputUsdPer1M: 0.4,
  },
  'gpt-5-pro': {
    name: 'gpt-5-pro',
    inputUsdPer1M: 15,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 120,
  },
  'gpt-5.4': {
    name: 'gpt-5.4',
    inputUsdPer1M: 2.5,
    cachedInputUsdPer1M: 0.25,
    outputUsdPer1M: 15,
  },
  'gpt-5.4-mini': {
    name: 'gpt-5.4-mini',
    inputUsdPer1M: 0.75,
    cachedInputUsdPer1M: 0.075,
    outputUsdPer1M: 4.5,
  },
  'gpt-5.4-nano': {
    name: 'gpt-5.4-nano',
    inputUsdPer1M: 0.2,
    cachedInputUsdPer1M: 0.02,
    outputUsdPer1M: 1.25,
  },
  'gpt-5.4-pro': {
    name: 'gpt-5.4-pro',
    inputUsdPer1M: 30,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 180,
  },
  'gpt-4.1': {
    name: 'gpt-4.1',
    inputUsdPer1M: 2,
    cachedInputUsdPer1M: 0.5,
    outputUsdPer1M: 8,
  },
  'gpt-4.1-mini': {
    name: 'gpt-4.1-mini',
    inputUsdPer1M: 0.4,
    cachedInputUsdPer1M: 0.1,
    outputUsdPer1M: 1.6,
  },
  'gpt-4.1-nano': {
    name: 'gpt-4.1-nano',
    inputUsdPer1M: 0.1,
    cachedInputUsdPer1M: 0.025,
    outputUsdPer1M: 0.4,
  },
  'gpt-4o': {
    name: 'gpt-4o',
    inputUsdPer1M: 2.5,
    cachedInputUsdPer1M: 1.25,
    outputUsdPer1M: 10,
  },
  'gpt-4o-mini': {
    name: 'gpt-4o-mini',
    inputUsdPer1M: 0.15,
    cachedInputUsdPer1M: 0.075,
    outputUsdPer1M: 0.6,
  },
  'o4-mini': {
    name: 'o4-mini',
    inputUsdPer1M: 1.1,
    cachedInputUsdPer1M: 0.275,
    outputUsdPer1M: 4.4,
  },
  o3: {
    name: 'o3',
    inputUsdPer1M: 2,
    cachedInputUsdPer1M: 0.5,
    outputUsdPer1M: 8,
  },
  'o3-mini': {
    name: 'o3-mini',
    inputUsdPer1M: 1.1,
    cachedInputUsdPer1M: 0.55,
    outputUsdPer1M: 4.4,
  },
  'o3-pro': {
    name: 'o3-pro',
    inputUsdPer1M: 20,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 80,
  },
  o1: {
    name: 'o1',
    inputUsdPer1M: 15,
    cachedInputUsdPer1M: 7.5,
    outputUsdPer1M: 60,
  },
  'o1-mini': {
    name: 'o1-mini',
    inputUsdPer1M: 1.1,
    cachedInputUsdPer1M: 0.55,
    outputUsdPer1M: 4.4,
  },
  'o1-pro': {
    name: 'o1-pro',
    inputUsdPer1M: 150,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 600,
  },
  'gpt-4o-2024-05-13': {
    name: 'gpt-4o-2024-05-13',
    inputUsdPer1M: 5,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 15,
  },
  'gpt-4-turbo-2024-04-09': {
    name: 'gpt-4-turbo-2024-04-09',
    inputUsdPer1M: 10,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 30,
  },
  'gpt-4-0125-preview': {
    name: 'gpt-4-0125-preview',
    inputUsdPer1M: 10,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 30,
  },
  'gpt-4-1106-preview': {
    name: 'gpt-4-1106-preview',
    inputUsdPer1M: 10,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 30,
  },
  'gpt-4-1106-vision-preview': {
    name: 'gpt-4-1106-vision-preview',
    inputUsdPer1M: 10,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 30,
  },
  'gpt-4-0613': {
    name: 'gpt-4-0613',
    inputUsdPer1M: 30,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 60,
  },
  'gpt-4-0314': {
    name: 'gpt-4-0314',
    inputUsdPer1M: 30,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 60,
  },
  'gpt-4-32k': {
    name: 'gpt-4-32k',
    inputUsdPer1M: 60,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 120,
  },
  'gpt-3.5-turbo': {
    name: 'gpt-3.5-turbo',
    inputUsdPer1M: 0.5,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 1.5,
  },
  'gpt-3.5-turbo-0125': {
    name: 'gpt-3.5-turbo-0125',
    inputUsdPer1M: 0.5,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 1.5,
  },
  'gpt-3.5-turbo-1106': {
    name: 'gpt-3.5-turbo-1106',
    inputUsdPer1M: 1,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 2,
  },
  'gpt-3.5-turbo-0613': {
    name: 'gpt-3.5-turbo-0613',
    inputUsdPer1M: 1.5,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 2,
  },
  'gpt-3.5-0301': {
    name: 'gpt-3.5-0301',
    inputUsdPer1M: 1.5,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 2,
  },
  'gpt-3.5-turbo-instruct': {
    name: 'gpt-3.5-turbo-instruct',
    inputUsdPer1M: 1.5,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 2,
  },
  'gpt-3.5-turbo-16k-0613': {
    name: 'gpt-3.5-turbo-16k-0613',
    inputUsdPer1M: 3,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 4,
  },
  'davinci-002': {
    name: 'davinci-002',
    inputUsdPer1M: 2,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 2,
  },
  'babbage-002': {
    name: 'babbage-002',
    inputUsdPer1M: 0.4,
    cachedInputUsdPer1M: null,
    outputUsdPer1M: 0.4,
  },
}
