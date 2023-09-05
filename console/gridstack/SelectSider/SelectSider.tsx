import { useState } from 'react'
import { GraphTypeName } from '../graph-types.js'
import { DoubleLeftOutlined, DoubleRightOutlined, RiseOutlined } from '@ant-design/icons'

export function SelectSider ({ hidden }: { hidden: boolean }) {
    const [folding, set_folding] = useState(false)
    return <>
        <div className={`dashboard-select-sider ${folding ? 'dashboard-select-sider-folding' : ''} ${hidden ? '' : 'hidden'}`}>
            <div className='dashboard-graph-items'>
                {Object.entries(GraphTypeName).map((graph, i) => {
                    return <div key={graph[0]} className='dashboard-graph-item grid-stack-item' data-type={graph[0]}>
                        <RiseOutlined className='dashboard-graph-item-icon'/> {folding ? '' : graph[1]}
                    </div>
                })}
            </div>
            <div className='select-folder' onClick={() => set_folding(!folding)}>{folding ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}</div>
        </div>
    </>
}
