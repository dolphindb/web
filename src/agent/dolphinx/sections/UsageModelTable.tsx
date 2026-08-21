import { Table } from 'antd'

import { t } from '@i18n'

import type { ILlmModelUsage, ILlmUsageStats } from '@/agent/model/types.ts'


function get_model_usage (usage?: ILlmUsageStats) {
    if (usage?.models?.length)
        return usage.models
    return Object.entries(usage?.tokensByModel || { }).map(([model, totalTokens]) => ({ model, totalTokens }))
}


export function has_model_usage (usage?: ILlmUsageStats) {
    return get_model_usage(usage).length > 0
}


export function format_remaining_tokens (value?: number) {
    if (value === -1)
        return t('不限制')
    return value ?? '-'
}


export function UsageModelTable ({
    usage,
    remaining_tokens_by_model,
}: {
    usage?: ILlmUsageStats
    remaining_tokens_by_model?: Record<string, number>
}) {
    return <Table<ILlmModelUsage>
        className='ai-usage-model-table'
        size='small'
        rowKey='model'
        pagination={false}
        dataSource={get_model_usage(usage)}
        columns={[
            { title: t('模型'), dataIndex: 'model', ellipsis: true },
            { title: t('请求次数'), dataIndex: 'requestCount', render: value => value ?? '-' },
            { title: t('输入 Token'), dataIndex: 'promptTokens', render: value => value ?? '-' },
            { title: t('输出 Token'), dataIndex: 'completionTokens', render: value => value ?? '-' },
            { title: t('总 Token'), dataIndex: 'totalTokens', render: value => value ?? 0 },
            {
                title: t('剩余 Token'),
                dataIndex: 'model',
                render: model => format_remaining_tokens(remaining_tokens_by_model?.[model]),
            },
        ]}
    />
}
