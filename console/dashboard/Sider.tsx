import { useState } from 'react'
import { BarChartOutlined, BarsOutlined, BoxPlotOutlined, DoubleLeftOutlined, DoubleRightOutlined, FileTextOutlined, FundOutlined, LineChartOutlined, PieChartOutlined, TableOutlined } from '@ant-design/icons'

import { WidgetType } from './model.js'


const icons = {
    [WidgetType.BAR]: <BarChartOutlined className='sider-icon'/>,
    [WidgetType.LINE]: <LineChartOutlined className='sider-icon'/>,
    [WidgetType.PIE]: <PieChartOutlined  className='sider-icon'/>,
    [WidgetType.OHLC]: <BoxPlotOutlined className='sider-icon'/>,
    [WidgetType.TABLE]: <TableOutlined className='sider-icon'/>,
    [WidgetType.TEXT]: <FileTextOutlined className='sider-icon' />,
    [WidgetType.MIX]: <FundOutlined className='sider-icon' />,
    [WidgetType.DESCRIPTIONS]: <BarsOutlined className='sider-icon'/>
}


export function Sider ({ visible }: { visible: boolean }) {
    const [collapsed, set_collapsed] = useState(false)
    
    return <div className={`sider ${collapsed ? 'collapsed' : ''} ${visible ? '' : 'hidden'}`}>
        <div className='graph-items'>
            {Object.entries(WidgetType).map(([key, value]) =>
                <div
                    key={key}
                    className='dashboard-graph-item grid-stack-item'
                    data-type={key}
                    gs-w={2}
                    gs-h={3}
                >
                    {icons[value]}
                    <span className='sider-text'>{collapsed ? '' : value}</span>
                </div>)}
        </div>
        <div className='collapser' onClick={() => { set_collapsed(!collapsed) }}>{
            collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />
        }</div>
    </div>
}
