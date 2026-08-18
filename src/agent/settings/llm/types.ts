import { message } from 'antd'

import { t } from '@i18n'


export const ADAPTER_TYPE_OPTIONS = [
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'openai-compatible', label: 'OpenAI Compatible' },
    { value: 'anthropic', label: 'Anthropic' },
]


export const EMBEDDING_METRIC_OPTIONS = [
    { value: 'euclidean', label: 'Euclidean' },
    { value: 'cosine', label: 'Cosine' },
]


export const DEFAULT_PROVIDER_FORM = {
    name: '',
    adapterType: 'deepseek',
    baseUrl: '',
    apiKey: '',
}


export const DEFAULT_CONFIG_FORM = {
    name: '',
    model: '',
    capability: 'chat' as 'chat' | 'embedding',
    requestPath: '/v1/chat/completions',
    contextWindow: undefined as number | undefined,
    defaultParams: '',
    embeddingDimension: 1536,
    embeddingMetric: 'euclidean' as 'euclidean' | 'cosine',
    embeddingNormalize: false,
    maxImageBytes: 0,
    maxInputFiles: 4,
    maxConcurrency: undefined as number | undefined,
    rateLimitRPM: undefined as number | undefined,
    timeoutMs: undefined as number | undefined,
    retryConfig: '',
    nativeToolCall: true,
    custom: { } as Record<string, unknown>,
}


export type ProviderFormData = typeof DEFAULT_PROVIDER_FORM
export type ConfigFormData = typeof DEFAULT_CONFIG_FORM


export function parse_json_field (value: string, field_label: string): Record<string, unknown> | undefined {
    if (!value.trim())
        return undefined
    try {
        return JSON.parse(value)
    } catch {
        message.error(t('{{field}} JSON 格式错误', { field: field_label }))
        throw new Error('invalid json')
    }
}


export function supports_native_tool_call (custom?: Record<string, unknown>) {
    return custom?.tool_call !== false
}


export function optional_positive_number (value: unknown) {
    const num = Number(value)
    return Number.isFinite(num) && num > 0 ? num : undefined
}


export function optional_nonnegative_number (value: unknown) {
    if (value === null || value === undefined || value === '')
        return undefined
    const num = Number(value)
    return Number.isFinite(num) && num >= 0 ? num : undefined
}
