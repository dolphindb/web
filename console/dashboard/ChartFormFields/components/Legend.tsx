import { Form, Input, InputNumber, Select, Space } from 'antd'
import { BoolRadioGroup } from '../../../components/BoolRadioGroup/index.js'
import { t } from '../../../../i18n/index.js'
import { StringColorPicker } from '../../../components/StringColorPicker/index.js'

export function LegendFields () { 
    return <>
        <Form.Item label={t('是否展示')} name='with_legend' initialValue>
            <BoolRadioGroup />
        </Form.Item>
        <Form.Item label={t('布局')} name={['legend', 'orient']}>
            <Select options={[{ label: t('横向布局'), value: 'horizontal' }, { label: t('纵向布局'), value: 'vertical' }] } />
        </Form.Item>
        <Form.Item
            name={['legend', 'type']}
            label={t('图例类型')}
            tooltip={t('当图例数量较多时可以使用滚动布局') }
        >
            <Select
                options={[
                    { label: t('普通图例'), value: 'plain' },
                    { label: t('滚动图例'), value: 'scroll' }
                ]} />
        </Form.Item>
        <Form.Item
            label={t('位置')}
            tooltip={<>
                {t('下方四个输入框可依次输入离容器上侧、下侧、左侧、右侧的距离，以下是对填入值的说明：')}
                <br />
                <ul>
                    <li>{t('具体像素值，如 20；')}</li>
                    <li>{t('相对于容器宽高百分比，如 20%；')}</li>
                    <li>{t('可以设置为 left、center、right，组件会根据相应的位置自动对齐。')}</li>
                </ul>
            </>}
        >
            <Space>
                <Form.Item name={['legend', 'top']} initialValue={null}>
                    <Input placeholder={t('上侧距离')} />
                </Form.Item>
                <Form.Item name={['legend', 'bottom']} initialValue={null}>
                    <Input placeholder={t('下侧距离')} />
                </Form.Item>
            </Space>
            <Space>
                <Form.Item name={['legend', 'left']} initialValue='center'>
                    <Input placeholder={t('左侧距离')}/>
                </Form.Item>
                <Form.Item name={['legend', 'right']} initialValue={null}>
                    <Input placeholder={t('右侧距离')}/>
                </Form.Item>
            </Space>
        </Form.Item>
        <Form.Item name={['legend', 'itemGap']} label={t('图例间隔')}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        <Form.Item name={['legend', 'textStyle', 'fontSize']} label={t('字号')}>
            <InputNumber addonAfter='px' />
        </Form.Item>
        <Form.Item name={['legend', 'itemHeight']} label={t('标记大小')} initialValue={14}>
            <InputNumber addonAfter='px'/>
        </Form.Item>
        <Form.Item label={t('文字颜色')} name={['legend', 'textStyle', 'color']} initialValue='#fff'>
            <StringColorPicker />
        </Form.Item>
    </>
}
