import { t } from '@i18n'
import type { IMemoryEntry } from '@/agent/model.ts'


export type MemoryViewType = 'user_personal' | 'public_memory'

export const memory_kind_options: Array<{ value: IMemoryEntry['memoryKind'], label: string }> = [
    { value: 'default', label: t('默认') },
    { value: 'preference', label: t('偏好') },
    { value: 'fact', label: t('事实') },
    { value: 'procedure', label: t('流程') },
    { value: 'failure_shield', label: t('失败防护') },
]
