import './index.scss'
import { CEPEngineList } from "./CEPEngineList.js";
import { useCallback, useEffect, useState } from 'react';
import { CEPEngineDetail } from './CEPEngineDetail.js';
import { CEPEngineItem } from './type';
import { Empty, Spin } from 'antd';

const item_list: CEPEngineItem[] = [{
    name: "CEP 引擎1",
    user: "admin",
    status: "string",
    lastErrMsg: "xxxxx",
    useSystemTime: true,
    numOfSubEngine: 1,
    queueDepth: 2,
    eventsReceived: 3,
    eventsEmitted: 3,
    eventsOnOutputQueue: 3
},
{
    name: "CEP 引擎2",
    user: "admin",
    status: "string",
    lastErrMsg: "xxxxx",
    useSystemTime: true,
    numOfSubEngine: 1,
    queueDepth: 2,
    eventsReceived: 3,
    eventsEmitted: 3,
    eventsOnOutputQueue: 3
},
{
    name: "CEP 引擎3",
    user: "admin",
    status: "string",
    lastErrMsg: "xxxxx",
    useSystemTime: true,
    numOfSubEngine: 1,
    queueDepth: 2,
    eventsReceived: 3,
    eventsEmitted: 3,
    eventsOnOutputQueue: 3
}]

export function CEPComputing() { 
    
    // 当前选中的引擎名称
    const [current, set_current] = useState<string>()
    const [engine_list, set_engine_list] = useState<CEPEngineItem[]>(item_list)
    const [loading, set_loading] = useState(false)
    
    const on_select = useCallback((name: string) => { 
        set_current(name)
    }, [])
    
    useEffect(() => { 
        // 获取引擎列表
    }, [])
    
    console.log(engine_list, 'engine_list')
    
    return <Spin spinning={loading}>
        {
            !engine_list.length
                ? <Empty className='cep-engine-empty' />
                : <div className='cep-computing-wrapper'> 
                    {/* 仅有一个引擎的时候直接展示该引擎的信息，不需要展示列表 */}
                    {(engine_list.length > 1) && <CEPEngineList on_select={on_select} current={current} data={engine_list} />}
                    <CEPEngineDetail engine={current} />
                </div>
        }
    </Spin>
}