import { t } from '@i18n'

import type { ILlmUsageStats } from '@/agent/model/types.ts'


export function get_model_usage (usage?: ILlmUsageStats) {
    if (usage?.models?.length)
        return usage.models
    return Object.entries(usage?.tokensByModel || { }).map(([model, totalTokens]) => ({ model, totalTokens }))
}


export function format_remaining_tokens (value?: number) {
    if (value === -1)
        return t('不限制')
    return value ?? '-'
}
