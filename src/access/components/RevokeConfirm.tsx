import { Typography, Popconfirm } from  'antd'

import { t } from '@i18n/index.js'

export function RevokeConfirm ({ on_confirm }: { on_confirm: () => Promise<void> }) {
    return <Popconfirm
            title={t('撤销权限')}
            description={t('确认撤销该权限吗？')}
            onConfirm={on_confirm}
        >
            <Typography.Link type='danger'>
                {t('撤销')}
            </Typography.Link>
        </Popconfirm>
}
