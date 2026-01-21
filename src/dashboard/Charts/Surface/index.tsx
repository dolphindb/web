import { Collapse, Form, Input } from 'antd'
import { useEffect, useState } from 'react'

import { t } from '@i18n'
import { model } from '@model'
import type { GraphComponentProps } from '@/dashboard/graphs.ts'
import { TitleFields } from '@/dashboard/ChartFormFields/components/Title.tsx'
import { Surface, axises, get_plotlyjs, type SurfaceOptions } from '@components/Surface.tsx'



export function DashboardSurface ({ widget, data_source }: GraphComponentProps) {
    let [options, set_options] = useState<SurfaceOptions>({ })
    
    useEffect(() => {
        set_options({
            ... widget.config,
            ... model.shf ? { font: 'MyFont' } : { }
        })
    }, [widget.config])
    
    return <Surface
        // data_source.data 是 { data: number[][], row_labels: string[], col_labels: string[] }
        data={(data_source.data as any)?.data}
        options={options}
        plotlyjs={get_plotlyjs(model.assets_root)} />
}


export function SurfaceConfig () {
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
