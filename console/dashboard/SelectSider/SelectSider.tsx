import './index.scss'

import { useState } from 'react'
import { BarChartOutlined, BarsOutlined, BoxPlotOutlined, DoubleLeftOutlined, DoubleRightOutlined, FileTextOutlined, FundOutlined, LineChartOutlined, RiseOutlined, TableOutlined } from '@ant-design/icons'

import { WidgetType } from '../model.js'


const icons = {
    [WidgetType.BAR]: <BarChartOutlined className='siderbar-icon'/>,
    [WidgetType.LINE]: <LineChartOutlined className='siderbar-icon'/>,
    [WidgetType.OHLC]: <BoxPlotOutlined className='siderbar-icon'/>,
    [WidgetType.TABLE]: <TableOutlined className='siderbar-icon'/>,
    [WidgetType.TEXT]: <FileTextOutlined className='siderbar-icon' />,
    [WidgetType.MIX]: <FundOutlined className='siderbar-icon' />,
    [WidgetType.DESCRIPTIONS]: <BarsOutlined className='siderbar-icon'/>
}


export function SelectSider ({ hidden }: { hidden: boolean }) {
    const [folding, set_folding] = useState(false)
    
    return <div className={`dashboard-select-sider ${folding ? 'dashboard-select-sider-folding' : ''} ${hidden ? '' : 'hidden'}`}>
        <div className='dashboard-graph-items'>
            {Object.entries(WidgetType).map(([key, value]) =>
                <div
                    key={key}
                    className='dashboard-graph-item grid-stack-item'
                    data-type={key}
                    gs-w={2}
                    gs-h={3}
                >
                    {icons[value]}
                    <span className='siderbar-text'>{folding ? '' : value}</span>
                </div>)}
        </div>
        <div className='select-folder' onClick={() => { set_folding(!folding) }}>{
            folding ? <DoubleRightOutlined /> : <DoubleLeftOutlined />
        }</div>
    </div>
}
