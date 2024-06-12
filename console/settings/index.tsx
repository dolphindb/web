import './index.sass'

import { SettingOutlined } from '@ant-design/icons'

import { delay } from 'xshell/utils.browser.js'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'

import { Card } from './Card.js'


export function Settings () {
    const { admin, dev, test } = model.use(['admin', 'dev', 'test'])
    
    return admin && (dev || test) && <div className='module-settings'>
        <div className='title'>{t('可选模块')}</div>
        
        <Card 
            module_key='test'
            icon={<SettingOutlined className='label-icon' />}
            label='测试模块'
            description='测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述'
            activate_prompt='测试模块安装提示'
            deactivate_prompt='测试模块卸载提示'
            on_activate={async () => { 
                await delay(1000)
                console.log('测试模块加载成功') 
            }}
            on_deactivate={() => { console.log('测试模块卸载成功') }}
        />
        
        <Card 
            module_key='finance-tools'
            icon={<SettingOutlined className='label-icon' />}
            label='金融建库建表工具'
            description='金融建库建表工具描述'
            activate_prompt='金融建库建表工具加载提示'
            deactivate_prompt='金融建库建表工具卸载提示'
            on_activate={() => { console.log('金融建库建表工具加载成功') }}
            on_deactivate={() => { console.log('金融建库建表工具卸载成功') }}
        />
        
        <Card
            module_key='iot-tools'
            icon={<SettingOutlined className='label-icon' />}
            label='物联网建库建表工具'
            description='金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述'
            activate_prompt='物联网建库建表工具安装提示'
            deactivate_prompt='物联网建库建表工具卸载提示'
            on_activate={() => { console.log('物联网建库建表工具加载成功') }}
            on_deactivate={() => { console.log('物联网建库建表工具卸载成功') }}
        />
    </div>
}
