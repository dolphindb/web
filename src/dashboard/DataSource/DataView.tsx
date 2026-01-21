import { Obj } from '@/obj.tsx'

import { model } from '@model'
import { dashboard } from '@/dashboard/model.ts'


export function DataView () {
    const { result } = dashboard.use(['result'])
    const { options, product_name } = model.use(['options', 'product_name'])
    
    return <div className='dataview obj-result embed'>{
        Boolean(result) && <Obj
            obj={result.data}
            ddb={model.ddb}
            ctx='dashboard'
            options={options}
            product_name={product_name}
            assets_root={model.assets_root}
            font={model.shf ? 'MyFont' : undefined}
        />
    }</div>
}
