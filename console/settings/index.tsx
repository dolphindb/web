import './index.sass'

import Icon from '@ant-design/icons/lib/components/Icon.js'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'


import SvgFinance from '../guide/icons/finance.icon.svg'
import SvgIot from '../guide/icons/iot.icon.svg'

import { Card } from './Card.js'

const icon_style = { fontSize: '20px' }

export function Settings () {
    const { admin } = model.use(['admin'])
    
    return admin && <div className='module-settings'>
        <div className='title'>{t('可选模块')}</div>
        <Card 
            module_key='finance-guide'
            icon={<Icon className='label-icon' component={SvgFinance} style={icon_style}/>}
            label={t('金融库表向导')}
            description={t('此工具专为金融用户设计。用户通过此工具无需设计分区方案或编写复杂的 SQL 语句，只需输入库表名称、列名等基本信息，并通过列表选择参数，即可快速生成建库建表脚本，进而完成库表创建。')}
            activate_prompt={t('您确定要启用此功能吗')}
            deactivate_prompt={t('您确定要禁用此功能吗')}
            on_activate={() => { console.log('金融库表向导启用成功') }}
            on_deactivate={() => { console.log('金融库表向导停用成功') }}
        />
        
        <Card
            module_key='iot-guide'
            icon={<Icon className='label-icon' component={SvgIot} style={icon_style}/>}
            label={t('物联网库表向导')}
            description={t('此工具专为物联网用户设计。用户通过此工具无需设计分区方案或编写复杂的 SQL 语句，只需输入库表名称、列名等基本信息，并通过列表选择参数，即可快速生成建库建表脚本，进而完成库表创建。')}
            activate_prompt={t('您确定要启用此功能吗')}
            deactivate_prompt={t('您确定要禁用此功能吗')}
            on_activate={() => { console.log('物联网库表向导启用成功') }}
            on_deactivate={() => { console.log('物联网库表向导停用成功') }}
        />
    </div>
}
