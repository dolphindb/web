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
            
            return <Obj 
                ddb={model.ddb} 
                ctx='embed' 
                options={options} 
                ExportCsv={ExportCsv} 
                {...type === 'object' ? { obj: data } : { objref: data }}
            />
        })()
    }</div>
}
