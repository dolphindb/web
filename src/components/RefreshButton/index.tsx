import { Button, type ButtonProps } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { t } from '@i18n'

export function RefreshButton (props: ButtonProps) {
    return <Button {...props} icon={<ReloadOutlined />}>
        {t('刷新')}
    </Button>
}
