import { type DdbObj, type DdbValue } from 'dolphindb/browser.js'

import { Obj, type DdbObjRef } from '@/obj.tsx'

import { model } from '@model'

import { ExportCsv } from '@components/ExportCsv.tsx'
import { get_plotlyjs } from '@components/Surface.tsx'
import { LineageGraph } from '@/lineage/index.tsx'

import { shell } from './model.ts'


export function DataView () {
    const { result } = shell.use(['result'])
    const { options, product_name } = model.use(['options', 'product_name'])
    
    return <div className='dataview obj-result themed embed'>{
        (() => {
            if (!result)
                return
            
            const { type } = result
            
            if (type === 'lineage')
                return <LineageGraph />
            
            const { data } = result
            
            return <Obj
                ddb={model.ddb}
                ctx='embed'
                options={options}
                ExportCsv={ExportCsv}
                product_name={product_name}
                plotlyjs={get_plotlyjs(model.assets_root)}
                {...type === 'object' ?
                    { obj: data as DdbObj<DdbValue> }
                :
                    { objref: data as DdbObjRef<DdbValue> }}
            />
        })()
    }</div>
}
