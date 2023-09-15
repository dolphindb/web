import { Table, TableProps } from 'antd'
import { useMemo } from 'react'
import {  BasicFormFields }  from '../ChartFormFields/BasicFormFields.js'
import { AxisFormFields } from '../ChartFormFields/BasicChartFields.js'



interface IProps extends TableProps<any> { 
    
}

const DBTable = (props: IProps) => { 
    const { dataSource = [ ], ...otherProps } = props
    
    return <Table {...otherProps}  />
}

export const DBTableConfigForm = () => { 
    return <>
        <BasicFormFields />
        <AxisFormFields col_names={[ 'col_name' ]} />
    </>
}

export default DBTable


