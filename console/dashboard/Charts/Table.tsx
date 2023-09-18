import { Table, TableProps } from 'antd'
import {  BasicFormFields }  from '../ChartFormFields/BasicFormFields.js'
import { AxisFormFields } from '../ChartFormFields/BasicChartFields.js'



interface IProps extends TableProps<any> { 
    
}

const DBTable = (props: IProps) => { 
    const { dataSource = [ ], ...otherProps } = props
    
    return <Table {...otherProps}  />
}

export const DBTableConfigForm = (props: { col_names: string[] }) => { 
    const { col_names = [ ] } = props
    
    return <>
        <BasicFormFields />
        <AxisFormFields col_names={col_names} />
    </>
}

export default DBTable


