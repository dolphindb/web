import { MailOutlined, AppstoreOutlined } from '@ant-design/icons'
import { Alert, Tabs, TabsProps } from 'antd'
import { useMemo } from 'react'
import { CanvasSetting } from './CanvasSetting.js'
import { WidgetOption } from '../storage/widget_node.js'

import { t } from '../../../i18n/index.js'
import classNames from 'classnames'

import { GraphSetting } from './GraphSetting.js'


interface IProps {
    hidden: boolean
    widget: WidgetOption | null
    update_widget_config: (id: string, config: any) => void
}


export function SettingsPanel (props: IProps) {
    const { hidden, widget, update_widget_config } = props    
    
    const tab_items = useMemo<TabsProps['items']>(() => [
        {
            label: <><MailOutlined />{t('画布')}</>,
            key: 'canvas',
            children: <CanvasSetting />
        },
        {
            label: <><AppstoreOutlined />{t('图表')}</>,
            key: 'graph',
            children: widget ?
                <GraphSetting update_widget_config={update_widget_config} widget={widget} /> :
                <Alert showIcon message={t('请先选中您需要更改配置的图表')} type='warning' />
        },
    ], [update_widget_config, widget])
    
    return <div className={classNames('dashboard-settings-panel', { hidden })}>
            <Tabs className='dashboard-config-tabs' items={tab_items} />
        </div>
}
