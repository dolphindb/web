import { Button, Empty, Input, Popconfirm, Select, Space, Switch, Table, Typography } from 'antd'

import { t } from '@i18n'
import type { IMemoryEntry } from '@/agent/model/types.ts'
import { ellipsis_text, format_browser_time } from '@/agent/dolphinx/common.tsx'
import { memory_kind_options } from './types.ts'


const { Text } = Typography


export function PersonalMemoryView ({
    selected_agent_id,
    memory_enabled,
    settings_loading,
    memory_total,
    forget_loading,
    loading,
    sort_by,
    memory_kind,
    query,
    items,
    detail_loading_id,
    on_toggle_enabled,
    on_open_forget,
    on_refresh,
    on_open_create,
    on_change_sort,
    on_change_kind,
    on_change_query,
    on_open_detail,
    on_open_edit,
    on_delete,
}: {
    selected_agent_id: string
    memory_enabled: boolean
    settings_loading: boolean
    memory_total: number
    forget_loading: boolean
    loading: boolean
    sort_by: 'RECENCY' | 'IMPORTANCE' | 'TEXT_SEARCH' | 'RANKED'
    memory_kind: IMemoryEntry['memoryKind'] | ''
    query: string
    items: IMemoryEntry[]
    detail_loading_id: string
    on_toggle_enabled: (enabled: boolean) => Promise<void>
    on_open_forget: () => void
    on_refresh: (next_sort_by?: any) => void
    on_open_create: () => void
    on_change_sort: (sort_by: any) => void
    on_change_kind: (kind: any) => void
    on_change_query: (query: string) => void
    on_open_detail: (item: IMemoryEntry) => void
    on_open_edit: (item: IMemoryEntry) => void
    on_delete: (item: IMemoryEntry) => Promise<void>
}) {
    const has_memory_query = Boolean(query.trim())
    
    return <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Space wrap>
                <Switch className='ai-settings-switch-medium' checked={memory_enabled} loading={settings_loading} disabled={!selected_agent_id} onChange={on_toggle_enabled} />
                <span>{t('启用个人记忆')}</span>
            </Space>
            <Space wrap>
                <Text type='secondary'>{t('共 {{count}} 条', { count: memory_total })}</Text>
                <Button loading={forget_loading} onClick={on_open_forget}>{t('忘记')}</Button>
                <Button loading={loading} onClick={() => { on_refresh() }}>{t('刷新')}</Button>
                <Button type='primary' onClick={on_open_create}>{t('新增记忆')}</Button>
            </Space>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <Space wrap>
                <Select
                    style={{ width: 130 }}
                    value={sort_by}
                    onChange={on_change_sort}
                    options={[
                        { value: 'RANKED', label: t('综合排序') },
                        { value: 'RECENCY', label: t('最近更新') },
                        { value: 'IMPORTANCE', label: t('重要度') },
                        ...has_memory_query ? [{ value: 'TEXT_SEARCH', label: t('文本相关度') }] : [ ],
                    ]}
                />
                <Select
                    allowClear
                    style={{ width: 140 }}
                    value={memory_kind || undefined}
                    onChange={on_change_kind}
                    placeholder={t('主分类')}
                    options={memory_kind_options}
                />
            </Space>
            <Input.Search
                style={{ width: 240 }}
                value={query}
                onChange={event => { on_change_query(event.target.value) }}
                onSearch={() => {
                    const next_sort_by = query.trim() ? 'TEXT_SEARCH' : sort_by === 'TEXT_SEARCH' ? 'RANKED' : sort_by
                    on_change_sort(next_sort_by)
                }}
                placeholder={t('搜索记忆')}
                enterButton={t('搜索')}
                loading={loading}
            />
        </div>
        <Table
            size='small'
            rowKey='memoryId'
            loading={loading}
            dataSource={items}
            pagination={false}
            tableLayout='fixed'
            scroll={{ x: 1020 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('暂无记忆')} /> }}
            columns={[
                {
                    title: t('主分类'),
                    dataIndex: 'memoryKind',
                    width: 120,
                    render: (value: IMemoryEntry['memoryKind']) => memory_kind_options.find(option => option.value === value)?.label || value,
                },
                {
                    title: t('标题'),
                    dataIndex: 'title',
                    width: 160,
                    render: ellipsis_text,
                },
                {
                    title: t('重要度'),
                    dataIndex: 'importance',
                    width: 90,
                },
                {
                    title: t('来源'),
                    dataIndex: 'source',
                    width: 100,
                    render: ellipsis_text,
                },
                {
                    title: t('更新时间'),
                    dataIndex: 'updateTime',
                    width: 160,
                    render: format_browser_time,
                },
                {
                    title: t('内容'),
                    dataIndex: 'content',
                    render: ellipsis_text,
                },
                {
                    title: t('操作'),
                    width: 230,
                    render: (_: unknown, item: IMemoryEntry) => <Space size={4} style={{ whiteSpace: 'nowrap' }}>
                        <Button size='small' loading={detail_loading_id === item.memoryId} onClick={() => { on_open_detail(item) }}>{t('详情')}</Button>
                        <Button size='small' onClick={() => { on_open_edit(item) }}>{t('编辑')}</Button>
                        <Popconfirm title={t('确定删除这条记忆？')} okButtonProps={{ danger: true }} onConfirm={() => on_delete(item)}>
                            <Button danger size='small'>{t('删除')}</Button>
                        </Popconfirm>
                    </Space>,
                },
            ]}
        />
    </>
}
