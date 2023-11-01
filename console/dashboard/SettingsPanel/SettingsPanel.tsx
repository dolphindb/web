import './index.scss'

import { useMemo } from 'react'

import { Alert } from 'antd'

import cn from 'classnames'


import { t } from '../../../i18n/index.js'

import { GraphSetting } from './GraphSetting.js'
import { WidgetTypeWithoutDatasource, dashboard } from '../model.js'


export function SettingsPanel (props: { hidden: boolean }) {
    const { hidden } = props    
    const { widget } = dashboard.use(['widget'])
    
    const setting = useMemo(() => { 
        if (!widget)
            return <Alert showIcon message={t('请先选中您需要更改配置的图表')} type='warning' />
        else if (!widget.source_id && !WidgetTypeWithoutDatasource.includes(widget.type))
            return <Alert showIcon message={t('请为您的图表配置数据源')} type='warning' />
        else
            return <GraphSetting />
    }, [widget])
    
    return <div className={cn('dashboard-settings-panel', { hidden })}>
        { setting }
    </div>
}
