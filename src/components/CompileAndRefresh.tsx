import { Button } from 'antd'

import { ReloadOutlined } from '@ant-design/icons'


import { t } from '../../i18n/index.js'

import { model } from '../model.js'


export function CompileAndRefresh () {
    return <Button
        className='refresh-button' size='small' icon={<ReloadOutlined /> } 
        onClick={async () => { await model.recompile_and_refresh() } }
    >{t('编译并刷新 (r)')}</Button>
}
