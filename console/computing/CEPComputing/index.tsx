import './index.scss'
import { CEPEngineList } from './CEPEngineList.js'
import { useCallback, useEffect, useState } from 'react'
import { CEPEngineDetail } from './CEPEngineDetail.js'
import { type ICEPEngineDetail, type CEPEngineItem } from './type'
import { Empty, Spin } from 'antd'
import { get_cep_engine_detail, get_cep_engine_list } from './api.js'
import cn from 'classnames'

export function CEPComputing () { 
    
    // 当前选中的引擎名称
    const [current, set_current] = useState<ICEPEngineDetail>()
    const [engine_list, set_engine_list] = useState<CEPEngineItem[]>([ ])
    const [loading, set_loading] = useState(true)
    
    const on_select = useCallback(async (name: string) => { 
        const detail = await get_cep_engine_detail(name)
        set_current(detail)
    }, [ ])
    
    const get_cep_engines = useCallback(async () => {
        const list = await get_cep_engine_list()
        set_engine_list(list)
        // 无当前选中则默认选中第一个，获取第一个引擎的信息
        const detail = await get_cep_engine_detail(current?.EngineStat?.name ?? list?.[0]?.name)
        set_current(detail)
        set_loading(false)
    }, [ current ])
    
    
    useEffect(() => { 
        // 获取引擎列表
        get_cep_engines()
    }, [ ])
    
    return <Spin spinning={loading}>
        {
            !engine_list.length
                ? <Empty className='cep-engine-empty' />
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
