import { Descriptions, Empty } from 'antd'

import { t } from '@i18n'

import { sgraph } from './model.ts'


export function Configuration () {
    const { info: { graph: { config } } } = sgraph.use(['info'])
    
    if (!config || !Object.keys(config).length)
        return <Empty description={t('没有配置数据')} />
    
    return <div className='streaming-config-container'>
        <Descriptions bordered size='small' column={1}>
            {Object.entries(config)
                .map(([key, value]) =>
                    <Descriptions.Item key={key} label={key}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </Descriptions.Item>)}
        </Descriptions>
    </div>
}
