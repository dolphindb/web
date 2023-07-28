import './dashboard.sass'

import { useRef, useEffect } from 'react'

import * as echarts from 'echarts'

// import { model } from './model.js'

// import { StreamingTable } from './obj.js'
// import { StreamingTest } from './streaming/StreamingTest.js'


export function DashBoard () {
    const rdiv = useRef<HTMLDivElement>()
    
    useEffect(() => {
        let chart = echarts.init(rdiv.current)
        
        chart.setOption({
            title: {
                text: 'ECharts 入门示例'
            },
            tooltip: { },
            xAxis: {
                data: ['衬衫', '羊毛衫', '雪纺衫', '裤子', '高跟鞋', '袜子']
            },
            yAxis: { },
            series: [
                {
                    name: '销量',
                    type: 'bar',
                    data: [5, 20, 36, 10, 10, 20]
                }
            ]
        })
        
        return () => {
            
        }
    }, [ ])
    
    return <div className='result page'>
        {/* <StreamingTable url={model.ddb.url} table='prices' ctx='page' /> */}
        {/* <StreamingTest /> */}
        <div ref={rdiv} style={{ height: 400 }} />
    </div>
}
