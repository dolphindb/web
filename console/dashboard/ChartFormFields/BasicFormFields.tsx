import './index.scss'

import { Collapse, type CollapseProps, Form, InputNumber, Select } from 'antd'
import { get } from 'lodash'

import { t } from '../../../i18n/index.js'
import { useMemo } from 'react'
import { BoolRadioGroup } from '../../components/BoolRadioGroup/index.js'
import { variables } from '../Variable/variable.js'
import { convert_list_to_options } from '../utils.js'

import { TitleFields } from './components/Title.js'
import { LegendFields } from './components/Legend.js'
import { TooltipFields } from './components/Tooltip.js'
import { SplitLineFields } from './components/SplitLine.js'
import { DataZoomFields } from './components/DataZoom.js'
import { WrapperFields } from './components/Wrapper.js'
import { ChartField } from './type.js'
import { WidgetChartType, dashboard } from '../model.js'
import { FormDependencies } from '../../components/formily/FormDependcies/index.js'
import { DDB_TYPE_MAP } from '../../constants/ddb-type-maps.js'

import { TIME_TYPES } from '../Charts/CompositeGraph/constant.js'


export function VariableSetting () { 
    const { variable_infos } = variables.use(['variable_infos'])
   
    return <div className='axis-wrapper'>
        <Form.Item name='variable_ids' label={t('关联变量')}>
            <Select mode='multiple' options={variable_infos.map(({ name, id }) => ({
                label: name,
                value: id
            }))} />
        </Form.Item>
            
        <Form.Item  name='variable_cols' label={t('每行变量数')} initialValue={3}>
            <Select options={convert_list_to_options([1, 2, 3, 4, 6, 8, 12])} allowClear />
        </Form.Item>
        <Form.Item name='with_search_btn' label={t('查询按钮')} initialValue={false} tooltip={t('不展示查询按钮的情况，表单更新即会进行查询，在变量设置较多的情况下，建议使用查询按钮，点击之后再运行数据源代码')}>
            <BoolRadioGroup />
        </Form.Item>
    </div>
}


export function PaddingSetting () { 
    return <>
        <Form.Item name={['padding', 'top']} label={t('上内边距')} initialValue={12}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        
        <Form.Item name={['padding', 'bottom']} label={t('下内边距')} initialValue={12}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        <Form.Item name={['padding', 'left']} label={t('左内边距')} initialValue={12}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        
        <Form.Item name={['padding', 'right']} label={t('右内边距')} initialValue={12}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
    </>
}

export function BasicFormFields (props: { type?: 'chart' | 'table' | 'description', chart_fields?: ChartField[] }) { 
    const { widget } = dashboard.use(['widget'])
    
    const { type, chart_fields = [ChartField.LEGEND, ChartField.DATA_ZOOM, ChartField.SPLIT_LINE, ChartField.TOOLTIP] } = props
    
    const form = Form.useFormInstance()
    
    const FormFields = useMemo(() => {
        return  <div className='axis-wrapper'>
            <TitleFields />
            <WrapperFields />
            {type === 'chart' && <Form.Item name='animation' label={t('是否开启动画')} initialValue>
                <BoolRadioGroup />
            </Form.Item>}
            
            {widget.type === WidgetChartType.COMPOSITE_GRAPH && <>
                <Form.Item
                    name='automatic_mode'
                    label={t('自动画图模式')}
                    initialValue={false}
                    tooltip={t('自动画图模式会自动查找各数据源选定类型的列（默认为时间类型）作为 X 轴，各数据源数值列作为数据列，在数据列配置区域可对特定数据列进行个性化配置')}
                >
                    <BoolRadioGroup />
                </Form.Item>
                
                <FormDependencies dependencies={['automatic_mode']}>
                    {value => { 
                        const automatic_mode = get(value, ['automatic_mode'])
                        const options = Object.entries(DDB_TYPE_MAP).map(([k, v]) => ({
                            label: v,
                            value: Number(k)
                        }))
                        return automatic_mode
                            ? <Form.Item label={t('X 轴类型')} name='x_col_types'>
                                <Select
                                    mode='multiple'
                                    showSearch
                                    options={options}
                                    placeholder={t('请选择类型')}
                                    filterOption={(val, option) => val ? option.label.toLowerCase().includes(val.toLowerCase()) : true}
                                />
                            </Form.Item>
                            : null
                    } }
                </FormDependencies>
            
            </>}
            
            
            
            
            {type === 'table' && <>
                <Form.Item initialValue={false} name='bordered' label={t('展示边框')}>
                    <BoolRadioGroup />
                </Form.Item>
                <Form.Item initialValue name='need_select_cols' label={t('展示列选择')}>
                    <BoolRadioGroup />
                </Form.Item>
                <Form.Item name='is_reverse' label={t('倒序展示')} tooltip={t('流数据开启此功能可将最新的数据插入到表格头部')} initialValue={false}>
                    <BoolRadioGroup />
                </Form.Item>
            </>}
        </div>
    }, [type])
    
    const chart_items = useMemo < CollapseProps['items']>(() => [
        {
            key: ChartField.LEGEND,
            label: t('图例'),
            children: <LegendFields />,
            forceRender: true,
        },
        {
            key: ChartField.TOOLTIP,
            label: t('气泡提示'),
            children: <TooltipFields />,
            forceRender: true,
        },
        {
            key: ChartField.SPLIT_LINE,
            label: t('网格线'),
            children: <SplitLineFields />,
            forceRender: true,
        },
        {
            key: ChartField.DATA_ZOOM,
            label: t('缩略轴'),
            children: <DataZoomFields />,
            forceRender: true,
        }
    ].filter(item => chart_fields.includes(item.key)), [ chart_fields ])
    
    
    return <Collapse items={[
        {
            key: 'basic',
            label: t('基本属性'),
            children: FormFields,
            forceRender: true
        },
        {
            key: 'variable',
            label: t('变量设置'),
            children: <VariableSetting />, 
            forceRender: true
        },
        ...(type === 'chart' ? chart_items : [ ])
    ]} />
}




