import { DdbChartType, DdbForm, type DdbChartValue, type DdbObj, type DdbValue } from 'dolphindb/browser.js'

import { Obj, type DdbObjRef } from '@/obj.tsx'

import { model } from '@model'

import { ExportCsv } from '@components/ExportCsv.tsx'
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
            
            // local
            if (data.form === DdbForm.chart) {
                let v = (data as DdbObj).value as DdbChartValue
                v.type = DdbChartType.surface
            }
            
            return <Obj
                ddb={model.ddb}
                ctx='embed'
                options={options}
                ExportCsv={ExportCsv}
                product_name={product_name}
                assets_root={model.assets_root}
                font={model.shf ? 'MyFont' : undefined}
                dark={false}
                {...type === 'object' ?
                    { obj: data as DdbObj<DdbValue> }
                :
                    { objref: data as DdbObjRef<DdbValue> }}
            />
        })()
    }</div>
}
