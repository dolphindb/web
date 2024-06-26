import './index.scss'

import { useCallback, useEffect, useState } from 'react'
import { Empty, Spin } from 'antd'
import cn from 'classnames'

import { CEPEngineList } from './components/CEPEngineList.js'
import { CEPEngineDetail } from './components/CEPEngineDetail.js'

import type { ICEPEngineDetail, CEPEngineItem } from './type.js'
import { get_cep_engine_detail, get_cep_engine_list } from './api.js'

export function CEPComputing () { 
    // 当前选中的引擎名称
    const [current, set_current] = useState<ICEPEngineDetail>()
    const [engine_list, set_engine_list] = useState<CEPEngineItem[]>([ ])
    const [loading, set_loading] = useState(true)
    
    
    const on_select = useCallback(async (name: string) => {
        const detail = await get_cep_engine_detail(name)
        set_current(detail)
    }, [ ])
    
    // 获取 cep 引擎列表及当前选中的引擎详情，初始时展示第一个 cep 引擎的详情
    const get_cep_engines = useCallback(async () => {
        const list = await get_cep_engine_list()
        set_engine_list(list)
        if (list.length) {
            const detail = await get_cep_engine_detail(current?.engineStat?.name ?? list?.[0]?.name)
            set_current(detail)
        }
        set_loading(false)
    }, [current])
    
    useEffect(() => { 
        // 获取引擎列表
        get_cep_engines()
    }, [ ])
    
    return <Spin spinning={loading}>
        {
            engine_list.length === 0
                ? <Empty className='cep-engine-empty' image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                : <div className='cep-computing-wrapper'> 
                    {/* 仅有一个引擎的时候直接展示该引擎的信息，不需要展示列表 */}
                    {engine_list.length > 1 && <CEPEngineList
                        on_select={on_select}
                        current={current}
                        data={engine_list}
                        on_refresh={get_cep_engines}
                    />}
                    <CEPEngineDetail
                        className={cn({ 'cep-engine-detail-single': engine_list.length === 1 })}
                        engine={current}
                        on_refresh={get_cep_engines}
                    />
                </div>
        }
    </Spin>
}
