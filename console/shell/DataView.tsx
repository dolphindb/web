import { DdbForm } from 'dolphindb/browser.js'

import { Obj } from '../obj.js'

import { model } from '../model.js'
import { shell } from './model.js'
import { shell as dashboard_shell } from '../dashboard/model.js'


export function DataView ({ dashboard = false }) {
    const { result } = dashboard ?  dashboard_shell : shell.use(['result'])
    const { options } = model.use(['options'])
    
    return <div className='dataview result embed'>{
        (() => {
            if (!result)
                return
            
            const { type, data } = result
            
            if (
                data.form === DdbForm.scalar || 
                data.form === DdbForm.pair
            )
                return
            
            return type === 'object' ?
                <Obj obj={data} ddb={model.ddb} ctx={dashboard ? 'dashboard' : 'embed'} options={options} />
            :
                <Obj objref={data} ddb={model.ddb} ctx={dashboard ? 'dashboard' : 'embed'} options={options} />
        })()
    }</div>
}
