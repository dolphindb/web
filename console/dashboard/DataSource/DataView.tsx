import { DdbForm } from 'dolphindb/browser.js'

import { Obj } from '../../obj.js'

import { model } from '../../model.js'
import { dashboard as dashboard_model } from '../model.js'


export function DataView () {
    const { result } = dashboard_model.use(['result'])
    const { options } = model.use(['options'])
    
    return <div className='dataview result embed'>{
        (() => {
            if (!result)
                return
            
            const { data } = result
            
            if (
                data.form === DdbForm.scalar || 
                data.form === DdbForm.pair
            )
                return
            
            return <Obj obj={data} ddb={model.ddb} ctx='dashboard' options={options} />
        })()
    }</div>
}
