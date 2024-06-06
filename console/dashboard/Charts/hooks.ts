import { useEffect, useRef } from 'react'

export function useMerge (option) {
    const chart_ref = useRef(null)
    
    // 设置 notMerge 为 true 会导致报错，详见 WEB-887。
    // 设置 notMerge 为 false 会导致删减数据环（列）失败，因为此时 echarts 使用普通合并。需设置 replaceMerge 让 echarts 使用 替换合并。
    // echarts-for-react 不支持直接设置 replaceMerge，需手动设置。
    useEffect(() => {
        chart_ref.current?.getEchartsInstance()?.setOption(option, {
            replaceMerge: ['series'],
        })
    }, [chart_ref, option])
    
    return chart_ref
}
