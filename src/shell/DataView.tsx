import { DdbForm } from 'dolphindb/browser.js'

import { Obj } from '@/obj.tsx'

import { model } from '@model'

import { ExportCsv } from '@components/ExportCsv.tsx'

import { shell } from './model.ts'


export function DataView () {
    const { result } = shell.use(['result'])
    const { options, product_name } = model.use(['options', 'product_name'])
    
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
                product_name={product_name}
            />
        })()
    }</div>
}
