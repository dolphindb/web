import { t } from "@i18n/index.ts"
import { Form, Input, InputNumber, Select, Table, TimePicker } from "antd"
import dayjs from "dayjs"
import { useMemo } from "react"

const inspectionFrequencyOptions = [
    {
        label: '每日',
        value: 'daily',
    },
    {
        label: '每周',
        value: 'weekly',
    },
    {
        label: '每月',
        value: 'monthly',
    },
]

export function InspectionForm () {
    const cols = useMemo(() => [ 
        {
            title: t('名称'),
            dataIndex: 'key',
            key: 'key',
        },
        {
            title: t('描述'),
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: t('巡检节点'),
            dataIndex: 'subbmiter',
            key: 'subbmiter',
        },
        {
            title: t('脚本内容'),
            dataIndex: 'subbmiter',
            key: 'subbmiter',
        },
    ], [ ])
    
    
    return <div >
        <h3>{t('指标列表')}</h3>
        <Table rowSelection={{ type: 'checkbox' }} dataSource={[ ]} columns={cols} />
        
        <h3>{t('巡检周期')}</h3>
        <Form layout="inline">
            <Form.Item label={t('巡检频率')} name='frequency'>
                <Select options={inspectionFrequencyOptions} defaultValue={inspectionFrequencyOptions[0].value}/>
            </Form.Item>
            
            <Form.Item 
                label={t('巡检开始日期')} 
                dependencies={['frequency']} 
                shouldUpdate={(prevValues, curValues) => prevValues.frequency !== curValues.frequency}>
                {
                    ({getFieldValue })=>{
                        const frequency = getFieldValue('frequency')
                        return <Form.Item name='date'>
                                <InputNumber 
                                    addonBefore={t('第')} 
                                    addonAfter={t('天')} 
                                    defaultValue={1} 
                                    max={frequency === 'monthly' ? dayjs().daysInMonth() : frequency === 'weekly' ? 7 : 1} 
                                    min={1}/> 
                        </Form.Item>
                    }
                }
            </Form.Item>
            
            <Form.Item label={t('巡检时间')}  name='time'>
                <TimePicker />
            </Form.Item>
        </Form>
        
        <h3>{t('巡检计划描述')}</h3>
        <Input/>
    </div>
}


