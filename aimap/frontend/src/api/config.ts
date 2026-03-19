import { apiFetch } from './client'

export interface ImageModelsConfig {
  openai: boolean
  gemini: boolean
}

export async function getImageModelsConfig(): Promise<ImageModelsConfig> {
  const { data, status } = await apiFetch<ImageModelsConfig>('config/image-models')
  if (status === 200 && data) return data
  return { openai: true, gemini: true }
}
