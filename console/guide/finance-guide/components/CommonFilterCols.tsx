import './index.scss'
import { type ITableInfo } from '../type'
import { Button, Form, InputNumber, Select, Tooltip } from 'antd'
import { DeleteOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { useCallback, useMemo } from 'react'

interface IProps { 
    schema: ITableInfo['schema']
}

export function CommonFilterCols (props: IProps) {
    const { schema = [ ] } = props
    
    const form = Form.useFormInstance()
    
    const timeCol = Form.useWatch('timeCol', form)
    const partitionCols = Form.useWatch('partitionCols', form) ?? [ ]
    
    const filter_col_options = useMemo(() => {
        const time_col = timeCol || partitionCols?.filter(Boolean)?.find(item => ['DATE', 'DATETIME', 'TIMESTAMP'].includes(schema?.find(col => col?.colName === item?.colName)?.dataType))?.colName
        return schema
            .filter(item => !['DOUBLE', 'LONG', 'SHORT', 'DECIMAL', 'FLOAT', 'DATETIME'].includes(item?.dataType) && item?.colName !== time_col)
            .map(item => ({ label: item?.colName, value: item?.colName }))
    }, [schema, timeCol, partitionCols])
    
    const validator = useCallback(async () => { 
        const filterCols = form.getFieldValue('filterCols') ?? [ ]
        const name_list = filterCols.filter(item => !!item?.colName).map(item => item.colName)
        if (new Set(name_list).size !== name_list.length)  
            return Promise.reject('已配置该常用筛选列，请修改')
    }, [ ])
    
    
    
    return <div className='common-filter-cols-wrapper'>
        <h4>常用筛选列 <Tooltip title='经常用于查询时筛选数据的列，不能是除 INT 外的数值类型，最多只可选两列'><QuestionCircleOutlined /></Tooltip></h4>
        <Form.List
            name='filterCols'
            initialValue={[{ }]}
        >
            {(fields, { remove, add }) => <>
                {fields.map(field => <div key={field.name} className='common-filter-col'>
                    <Form.Item
                        name={[field.name, 'colName']}
                        label='列名'
                        rules={[
                            { required: true, message: '请选择列名' },
                            { validator }
                        ]}>
                        <Select options={filter_col_options} placeholder='请选择列名'/>
                    </Form.Item>
                    <Form.Item name={[field.name, 'uniqueNum']} label='唯一值数量' rules={[{ required: true, message: '请输入唯一值数量' }]}>
                        <InputNumber placeholder='请输入唯一值数量'/>
                    </Form.Item>
                    {fields.length > 1 && <DeleteOutlined onClick={() => { remove(field.name) }} className='delete-icon'/> }
                </div>)}
                { fields.length < 2 && <Button block type='dashed' onClick={() => { add() }} icon={<PlusCircleOutlined />}>增加筛选列</Button> }
            </>}
        </Form.List>
        
    </div>
}
