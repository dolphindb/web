import { useEffect, useState } from 'react'

import { t } from '@i18n/index.js'

import { config } from './model.js'

import { model } from '@/model.js'


import './index.sass'

export function ComputeGroupConfig () {

    const { nodes_configs } = config.use(['nodes_configs'])
    const { nodes, node_type, logined } = model.use(['nodes', 'node_type', 'logined'])
    const [current_compute_group, set_current_compute_group] = useState<string>('')
    
    const compute_groups = new Map()
    nodes.forEach(config => {
        if (config.computeGroup)
            if (!compute_groups.has(config.computeGroup))
                compute_groups.set(config.computeGroup, 1)
            else
                compute_groups.set(config.computeGroup, compute_groups.get(config.computeGroup) + 1)
                
    })
    
    const groups = Array.from(compute_groups.keys()) as unknown as string[]
    
    useEffect(() => {
        if (groups.length > 0 && current_compute_group === '')
            set_current_compute_group(groups[0])
            
    }, [JSON.stringify(groups)])
    
    const select_items = groups.map(group => {
        const count = compute_groups.get(group)
        return <div
            key={group}
            className={`select-item ${current_compute_group === group ? 'active' : ''}`}
            onClick={() => { set_current_compute_group(group) }}
        >
            <div className='title'>
                {group}
            </div>
            {count} {t('个节点')}
        </div>
    })
    
    
    return <div className='config compute-group'>
        <div className='select' >
            {select_items}
        </div>
    </div>
}
