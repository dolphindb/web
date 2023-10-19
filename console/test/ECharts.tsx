import * as echarts from 'echarts'

import { useRef, useEffect } from 'react'


export function ECharts () {
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
    
    return <div ref={rdiv} style={{ height: 400 }} />
}
