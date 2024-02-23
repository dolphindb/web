import { useState } from 'react'
import { BarChartOutlined, BarsOutlined, BoxPlotOutlined, DoubleLeftOutlined, DoubleRightOutlined, FileTextOutlined, FundOutlined, HeatMapOutlined, LineChartOutlined, PieChartOutlined, TableOutlined, CodeOutlined, CompassOutlined, FunctionOutlined, DotChartOutlined,  RadarChartOutlined, WindowsOutlined, GoldOutlined } from '@ant-design/icons'

import { WidgetType } from './model.js'
import { t } from '../../i18n/index.js'

import timeSeriesSvg from '../icons/timeSeries.icon.svg'
import Icon from '@ant-design/icons/lib/components/Icon.js'



const icons = {
    [WidgetType.BAR]: <BarChartOutlined className='icon'/>,
    [WidgetType.LINE]: <LineChartOutlined className='icon'/>,
    [WidgetType.PIE]: <PieChartOutlined  className='icon'/>,
    [WidgetType.OHLC]: <BoxPlotOutlined className='icon'/>,
    [WidgetType.ORDER]: <HeatMapOutlined className='icon'/>,
    [WidgetType.TABLE]: <TableOutlined className='icon'/>,
    [WidgetType.TEXT]: <FileTextOutlined className='icon' />,
    [WidgetType.MIX]: <FundOutlined className='icon' />,
    [WidgetType.DESCRIPTIONS]: <BarsOutlined className='icon'/>,
    [WidgetType.EDITOR]: <CodeOutlined className='icon' />,
    [WidgetType.GAUGE]: <CompassOutlined className='icon' />,
    [WidgetType.RADAR]: <RadarChartOutlined className='icon' />,
    [WidgetType.VARIABLE]: <FunctionOutlined className='icon'/>,
    [WidgetType.SCATTER]: <DotChartOutlined className='icon' />,
    [WidgetType.HEATMAP]: <WindowsOutlined className='icon' />,
    [WidgetType.COMPOSITE_GRAPH]: <GoldOutlined className='icon' />,
    [WidgetType.TIME_SERIES]: <Icon component={timeSeriesSvg} className='icon'/>
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
                    title={t(value)}
                >
                    {icons[value]}
                    <span className='name'>{collapsed ? '' : t(value)}</span>
                </div>)}
        </div>
        <div className='collapser' onClick={() => { set_collapsed(!collapsed) }}>{
            collapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />
        }</div>
    </div>
}
