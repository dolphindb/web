import { Space, Typography } from 'antd'

import { t } from '@i18n'
import type { IMemoryStats } from '@/agent/model.ts'


const { Text } = Typography


export function MemoryStatsBar ({
    memory_stats,
    stats_loading,
}: {
    memory_stats: IMemoryStats | null
    stats_loading: boolean
}) {
    const stats_items = [
        [t('总数'), memory_stats?.totalCount],
        [t('个人记忆'), memory_stats?.userPersonalCount],
        [t('活跃'), memory_stats?.activeCount],
        [t('已删除'), memory_stats?.deletedCount],
        [t('平均重要度'), memory_stats?.avgImportance?.toFixed(2)],
    ]
    return <div style={{ marginBottom: 12 }}>
        <Space size={24} wrap>
            {stats_items.map(([label, value]) => <span key={label}>
                <Text type='secondary'>{label}</Text>
                <Text strong style={{ marginLeft: 6 }}>{stats_loading ? '-' : value ?? '-'}</Text>
            </span>)}
        </Space>
    </div>
}
