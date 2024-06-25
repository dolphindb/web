import { DdbForm } from 'dolphindb/browser.js'

import { Obj } from '../obj.js'

import { model } from '../model.js'

import { ExportCsv } from '../components/ExportCsv.js'

import { shell } from './model.js'


export function DataView () {
    const { result } = shell.use(['result'])
    const { options } = model.use(['options'])
    
    return <div className='dataview obj-result themed embed'>{
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
                <Obj obj={data} ddb={model.ddb} ctx='embed' options={options} export_csv={ExportCsv}/>
            :
                <Obj objref={data} ddb={model.ddb} ctx='embed' options={options} export_csv={ExportCsv}/>
        })()
    }</div>
}
