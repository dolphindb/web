import { Radio, Spin } from "antd"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CEPEngineDetail, EngineDetailPage } from "./type.js"
import { t } from "../../../i18n/index.js"
import { get_cep_engine_detail } from "./api.js"

interface IProps { 
    engine: string
}


function EngineInfo({ info } : { info: CEPEngineDetail }) {
    return <div></div>
}

function DataView({ info } : { info: CEPEngineDetail }) { 
    return <div></div>
}

export function CEPEngineDetail(props: IProps) {
    const { engine } = props 
    const [page, set_page] = useState(EngineDetailPage.INFO) 
    const [engine_info, set_engine_info] = useState<CEPEngineDetail>()
    const [loading, set_loading] = useState(true)
    
    // const get_engine_info = useCallback(async () => { 
    //     const detail = await get_cep_engine_detail()
    //     // set_engine_info(detail)
    //     set_loading(false)
    // },[])
    
    // useEffect(() => { 
    //     get_engine_info()
    // },[])
    
    const view = useMemo(() => { 
        switch (page) { 
            case EngineDetailPage.DATAVIEW:
                return <DataView info={engine_info} />
            default:
                return <EngineInfo info={engine_info}/>
        }
    },[page, engine])
    
    return <div className="cep-engine-detail">
        <Radio.Group value={page} onChange={(e) => set_page(e.target.value)}>
            <Radio.Button value={EngineDetailPage.INFO}>{t('引擎信息')}</Radio.Button>
            <Radio.Button value={EngineDetailPage.DATAVIEW}>{t('数据视图')}</Radio.Button>
        </Radio.Group>
        {loading
            ? <Spin spinning={loading}><div className='spin-content'/></Spin>
            : view}
    </div>
}