import './index.scss'
import { CEPEngineList } from "./CEPEngineList.js";
import { useCallback, useState } from 'react';
import { CEPEngineDetail } from './CEPEngineDetail.js';

export function CEPComputing() { 
    
    // 当前选中的引擎名称
    const [current, set_current] = useState<string>()
    
    const on_select = useCallback((name: string) => { 
        set_current(name)
    },[])
    
    return <div className='cep-computing-wrapper'> 
        <CEPEngineList on_select={on_select} current={current} />
        <CEPEngineDetail engine={current} />
    </div>
}