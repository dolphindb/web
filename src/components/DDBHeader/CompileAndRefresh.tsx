import { Button } from 'antd'

import { ReloadOutlined } from '@ant-design/icons'


import { t } from '@i18n/index.ts'

import { model } from '@/model.js'


export function CompileAndRefresh () {
    return <Button
        size='small'
        className='compile-and-refresh'
        icon={<ReloadOutlined /> } 
        onClick={async () => { await model.recompile_and_refresh() } }
    >
        {t('编译并刷新')}
    </Button>
}
