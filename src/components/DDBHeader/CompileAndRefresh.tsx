import { Button, FloatButton, Tooltip } from 'antd'

import { ReloadOutlined } from '@ant-design/icons'


import { t } from '@i18n/index.ts'

import { model } from '@/model.js'


export function CompileAndRefresh () {
    return <Tooltip title={t('编译并刷新 (r)')}>
        <FloatButton
            icon={<ReloadOutlined /> } 
            onClick={async () => { await model.recompile_and_refresh() } }
         />
    </Tooltip>
}
