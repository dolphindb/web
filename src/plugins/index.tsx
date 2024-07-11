import './index.sass'

import { useEffect, useState } from 'react'
import { Button, Table } from 'antd'

import { model } from '@/model.js'

import script from './index.dos'


export function Plugins () {
    const [plugins, set_plugins] = useState()
    
    useEffect(() => {
        (async () => {
            const plugins = await list_plugins()
            console.log('plugins:', plugins)
            set_plugins(plugins)
        })()
    }, [ ])
    
    return <Table
        dataSource={plugins}
        columns={[]}
    />
}


let script_defined = false

async function list_plugins () {
    if (!script_defined) {
        await model.ddb.execute(script)
        script_defined = true
    }
    
    return model.ddb.invoke('list_plugins')
}
