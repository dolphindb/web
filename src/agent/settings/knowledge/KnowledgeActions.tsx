import { Button, Popconfirm, Space } from 'antd'
import { DeleteOutlined, SettingOutlined, SyncOutlined, ThunderboltOutlined } from '@ant-design/icons'

import { t } from '@i18n'
import type { IKnowledgeBaseInfo } from '@/agent/model/types.ts'


export function KnowledgeActions ({
    kb,
    deleting,
    on_test,
    on_settings,
    on_rebuild,
    on_delete,
}: {
    kb: IKnowledgeBaseInfo
    deleting: boolean
    on_test: () => void
    on_settings: () => void
    on_rebuild: () => void
    on_delete: () => void
}) {
    return <Space size={4}>
        <Button
            size='small'
            icon={<ThunderboltOutlined />}
            disabled={kb.status !== 'ACTIVE'}
            onClick={on_test}
        >
            {t('检索测试')}
        </Button>
        <Button
            size='small'
            icon={<SettingOutlined />}
            onClick={on_settings}
        >
            {t('设置')}
        </Button>
        <Button
            size='small'
            icon={<SyncOutlined />}
            disabled={kb.status !== 'ACTIVE'}
            onClick={on_rebuild}
        >
            {t('重建索引')}
        </Button>
        <Popconfirm
            title={t('确定删除此知识库？')}
            description={t('删除后将发起后台清理任务，不可恢复。')}
            onConfirm={on_delete}
            okButtonProps={{ danger: true }}
        >
            <Button
                size='small'
                danger
                icon={<DeleteOutlined />}
                loading={deleting}
            >
                {t('删除')}
            </Button>
        </Popconfirm>
    </Space>
}
