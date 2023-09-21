import { AppstoreOutlined } from '@ant-design/icons'
import { Alert, Tabs, TabsProps } from 'antd'
import { useMemo } from 'react'

import { t } from '../../../i18n/index.js'
import classNames from 'classnames'

import { GraphSetting } from './GraphSetting.js'
import { dashboard } from '../model.js'


interface IProps {
    hidden: boolean
}


export function SettingsPanel (props: IProps) {
    const { hidden } = props    
    const { widget } = dashboard.use(['widget'])
    
    const tab_items = useMemo<TabsProps['items']>(() => {
        const ChartSetting = () => { 
            if (!widget)
                return <Alert showIcon message={t('请先选中您需要更改配置的图表')} type='warning' />
            else if (!widget.source_id)
                return <Alert showIcon message={t('请为您的图表配置数据源')} type='warning' />
            else
                return <GraphSetting />
        }
        
        return [
            // {
            //     label: <><MailOutlined />{t('画布')}</>,
            //     key: 'canvas',
            //     children: <CanvasSetting />,
            //     forceRender: true,
            // },
            {
                label: <><AppstoreOutlined />{t('图表')}</>,
                key: 'graph',
                children: ChartSetting(),
                forceRender: true
            },
        ]
        
     }, [ widget, widget?.source_id ])
    
    return <div className={classNames('dashboard-settings-panel', { hidden })}>
            <Tabs className='dashboard-config-tabs' items={tab_items} />
        </div>
}
