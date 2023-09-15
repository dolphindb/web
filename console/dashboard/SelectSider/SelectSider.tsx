import { useState } from 'react'
import { DoubleLeftOutlined, DoubleRightOutlined, RiseOutlined } from '@ant-design/icons'

import { GraphTypeName } from '../graph-types.js'


export function SelectSider ({ hidden }: { hidden: boolean }) {
    const [folding, set_folding] = useState(false)
    
    return <div className={`dashboard-select-sider ${folding ? 'dashboard-select-sider-folding' : ''} ${hidden ? '' : 'hidden'}`}>
        <div className='dashboard-graph-items'>
            {Object.entries(GraphTypeName).map(([key, value]) =>
                <div key={key} className='dashboard-graph-item grid-stack-item' data-type={key}>
                    <RiseOutlined className='dashboard-graph-item-icon'/> {folding ? '' : value}
                </div>
            )}
        </div>
        <div className='select-folder' onClick={() => { set_folding(!folding) }}>{
            folding ? <DoubleRightOutlined /> : <DoubleLeftOutlined />
        }</div>
    </div>
}
