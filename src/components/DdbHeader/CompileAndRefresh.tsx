import { Button } from 'antd'

import { ReloadOutlined } from '@ant-design/icons'


import { t } from '@i18n'

import { model } from '@model'


export function CompileAndRefresh () {
    return <Button
        size='small'
        className='compile-and-refresh'
        icon={<ReloadOutlined /> } 
        onClick={async () => { await model.recompile_and_refresh() } }
    >
        {t('编译并刷新 (r)')}
    </Button>
}
