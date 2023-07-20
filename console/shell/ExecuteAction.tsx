import { Popconfirm } from 'antd'
import { CaretRightOutlined, LoadingOutlined } from '@ant-design/icons'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'

import { shell } from './model.js'

export function ExecuteAction () {
    const { executing, show_executing } = shell.use(['executing', 'show_executing'])
    
    return <Popconfirm
        title={t('是否取消执行中的作业？')}
        okText={t('取消作业')}
        cancelText={t('不要取消')}
        onConfirm={async () => {
            try {
                await model.ddb.cancel()
            }
            catch (error) {
                model.show_error({ error })
                throw error
            }
        }}
        disabled={!executing}
    >
        <span
            className='action execute'
            title={executing ? t('点击可以取消当前执行中的作业') : t('执行选中代码或全部代码')}
            onClick={async () => !executing && shell.execute_('all')}
        >
            {executing && show_executing ? <LoadingOutlined /> : <CaretRightOutlined />}
            <span className='text'>{executing && show_executing ? t('执行中') : t('执行')}</span>
        </span>
    </Popconfirm>
}
