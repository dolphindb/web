import { UndoOutlined } from '@ant-design/icons'
import { t } from '@i18n/index.ts'
import { Button, type ButtonProps } from 'antd'

export function RefreshButton (props: ButtonProps) {
    return <Button {...props} icon={<UndoOutlined />}>
        {t('刷新')}
    </Button>
}
