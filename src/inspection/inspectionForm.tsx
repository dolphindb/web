import { t } from "@i18n/index.ts"
import { Table } from "antd"
import { useMemo } from "react"

export function InspectionForm () {
    const cols = useMemo(() => [ 
        {
            title: '名称',
            dataIndex: 'key',
            key: 'key',
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: '巡检节点',
            dataIndex: 'subbmiter',
            key: 'subbmiter',
        },
    ], [ ])
    
    
    return <div >
        <h3>{t('指标列表')}</h3>
        <Table rowSelection={{ type: 'checkbox' }} dataSource={[ ]} columns={cols} />
    </div>
}
