import { useSize } from 'ahooks'
import type { EChartsInstance } from 'echarts-for-react'
import { useEffect, useRef } from 'react'

export function useChart ( option) {
    const ref = useRef(null)
    
    const size = useSize(ref.current?.ele)
    
    let instance: EChartsInstance
    
    // 设置 notMerge 为 true 会导致报错，详见 WEB-887。
    // 设置 notMerge 为 false 会导致删减数据环（列）失败，因为此时 echarts 使用普通合并。需设置 replaceMerge 让 echarts 使用 替换合并。
    // echarts-for-react 不支持直接设置 replaceMerge，需手动设置。
    useEffect(() => {
        if (!instance)
            instance = ref.current?.getEchartsInstance()
        
        instance?.setOption(option, {
            replaceMerge: ['series'],
        })
    }, [ref, option])
    
    // WEB-920
    // 初始化的时候，有概率会出现图表 canvas 高度为 0 无法展示的情况，是因为父元素的宽高非直接写死，所以需要在宽高改变时调用 resize
    // https://github.com/hustcc/echarts-for-react/issues/193 
    useEffect(() => {
        if (!instance)
            instance = ref.current?.getEchartsInstance()
        
        instance?.resize?.()
    }, [size])
    
    return ref
}
