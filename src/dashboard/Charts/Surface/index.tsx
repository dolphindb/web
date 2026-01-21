import { Collapse, Form, Input } from 'antd'
import { useRef } from 'react'

import { t } from '@i18n'
import { model } from '@model'
import type { GraphComponentProps, GraphConfigProps } from '@/dashboard/graphs.ts'
import { TitleFields } from '@/dashboard/ChartFormFields/components/Title.tsx'
import { Surface, axises, type SurfaceOptions } from '@components/Surface.tsx'


export function DashboardSurface ({ widget: { config = { } as SurfaceOptions }, data_source }: GraphComponentProps) {
    let rconfig = useRef<SurfaceOptions>({ } as SurfaceOptions)
    let roptions = useRef<SurfaceOptions>({ } as SurfaceOptions)
    
    // widget.config 更新后，重新计算 options，不用 useState 避免无效渲染
    // widget.config 未更新时，复用之前计算的 roptions，保证传递给 Surface 的 options 引用不变
    if (config !== rconfig.current) {
        roptions.current = {
            dark: true,
            ... config,
            ... model.shf ? { font: 'MyFont' } : { }
        }
        
        rconfig.current = config as SurfaceOptions
    }
    
    return <Surface
        // data_source.data 是 { data: number[][], row_labels: string[], col_labels: string[] }
        data={(data_source.data as any)?.data}
        options={roptions.current}
        assets_root={model.assets_root} />
}


export function SurfaceConfig (props: GraphConfigProps) {
    return <Collapse
        items={[
            {
                key: 'basic',
                label: t('基本属性'),
                forceRender: true,
                children: <div className='axis-wrapper'>
                    <TitleFields />
                    {axises.map(a =>
                        <AxisNameField axis={a} key={a} />)}
                </div>
            }
        ]}
    />
}


function AxisNameField ({ axis }: { axis: 'x' | 'y' | 'z' }) {
    return <Form.Item name={`${axis}axis`} label={t('{{axis}} 轴名称', { axis })}>
        <Input />
    </Form.Item>
}
