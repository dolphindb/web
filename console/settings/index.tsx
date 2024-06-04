import './index.sass'

import { SettingOutlined } from '@ant-design/icons'

import Icon from '@ant-design/icons/lib/components/Icon.js'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'


import SvgFinance from '../access/icons/finance.icon.svg'
import SvgIot from '../access/icons/iot.icon.svg'

import { Card } from './Card.js'

const icon_style = { fontSize: '20px' }

export function Settings () {
    const { admin } = model.use(['admin'])
    
    return admin && <div className='module-settings'>
        <div className='title'>{t('可选模块')}</div>
        <Card 
            module_key='finance-guide'
            icon={<Icon className='label-icon' component={SvgFinance} style={icon_style}/>}
            label={t('金融库表创建引导')}
            description='金融建库建表工具描述'
            activate_prompt='金融建库建表工具加载提示'
            deactivate_prompt='金融建库建表工具卸载提示'
            on_activate={() => { console.log('金融库表创建引导启用成功') }}
            on_deactivate={() => { console.log('金融库表创建引导停用成功') }}
        />
        
        <Card
            module_key='iot-guide'
            icon={<Icon className='label-icon' component={SvgIot} style={icon_style}/>}
            label={t('物联网库表创建引导')}
            description='金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述'
            activate_prompt='物联网建库建表工具安装提示'
            deactivate_prompt='物联网建库建表工具卸载提示'
            on_activate={() => { console.log('物联网库表创建引导启用成功') }}
            on_deactivate={() => { console.log('物联网库表创建引导停用成功') }}
        />
    </div>
}
