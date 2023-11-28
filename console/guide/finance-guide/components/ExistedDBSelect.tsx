import { Select } from 'antd'
import { type SelectProps } from 'antd/lib'
import { useCallback, useEffect, useState } from 'react'
import { model } from '../../../model.js'

export function ExistDBSelect (props: SelectProps) {
    
    const [options, set_options] = useState([ ])
    
    const get_dbs = useCallback(async () => { 
        const { value } = await model.ddb.eval('getClusterDFSDatabases()') as { value: string[] }
        set_options(value.map(item => ({ label: item.slice(6), value: item.slice(6) })))
    }, [ ])
    
    useEffect(() => { 
        get_dbs()
    }, [ ])
    
    
    return <Select placeholder='请选择现有库' {...props} options={options}/>
}
