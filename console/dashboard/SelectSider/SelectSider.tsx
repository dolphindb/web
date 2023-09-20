import { useState } from 'react'
import { BarChartOutlined, BoxPlotOutlined, DoubleLeftOutlined, DoubleRightOutlined, FileTextOutlined, LineChartOutlined, RiseOutlined, TableOutlined } from '@ant-design/icons'

import { WidgetType } from '../model.js'

import './index.scss'



const ICON_MAP = {
    [WidgetType.BAR]: <BarChartOutlined className='siderbar-icon'/>,
    [WidgetType.LINE]: <LineChartOutlined className='siderbar-icon'/>,
    [WidgetType.OHLC]: <BoxPlotOutlined className='siderbar-icon'/>,
    [WidgetType.TABLE]: <TableOutlined className='siderbar-icon'/>,
    [WidgetType.TEXT]: <FileTextOutlined className='siderbar-icon'/>
}


export function SelectSider ({ hidden }: { hidden: boolean }) {
    const [folding, set_folding] = useState(false)
    
    
    
    return <div className={`dashboard-select-sider ${folding ? 'dashboard-select-sider-folding' : ''} ${hidden ? '' : 'hidden'}`}>
        <div className='dashboard-graph-items'>
            {Object.entries(WidgetType).map(([key, value]) => { 
                return <div
                    key={key}
                    className='dashboard-graph-item grid-stack-item'
                    data-type={key}
                    gs-w={2}
                    gs-h={3}
                >
                    {ICON_MAP[value]}
                    <span className='siderbar-text'>{folding ? '' : value}</span>
                </div>
            }
                
            )}
        </div>
        <div className='select-folder' onClick={() => { set_folding(!folding) }}>{
            folding ? <DoubleRightOutlined /> : <DoubleLeftOutlined />
        }</div>
    </div>
}
