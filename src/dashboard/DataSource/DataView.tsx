import { Obj } from '../../obj.js'

import { model } from '../../model.js'
import { dashboard as dashboard_model } from '../model.js'


export function DataView () {
    const { result } = dashboard_model.use(['result'])
    const { options } = model.use(['options'])
    
    return <div className='dataview obj-result embed'>{
        result ? <Obj obj={result.data} ddb={model.ddb} ctx='dashboard' options={options} /> : null
    }</div>
}
