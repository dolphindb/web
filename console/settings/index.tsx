import { SettingOutlined } from '@ant-design/icons'

import { t } from '../../i18n/index.js'

import { model } from '../model.js'

import { Card } from './Card.js'
import './index.sass'

export function Settings () {
    const { admin } = model.use(['admin'])
    
    return admin && <div className='module-settings'>
        <div className='title'>{t('可选模块')}</div>
        <Card 
            module_key='test'
            label='测试模块'
            description='测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述测试模块描述'
            activate_prompt='测试模块安装提示'
            deactivate_prompt='测试模块卸载提示'
            activate_function={async () => { 
                await new Promise((resolve, reject) => {
                    console.log('异步加载函数测试')
                    resolve(1)
                })
                console.log('测试模块加载成功') 
            }}
            deactivate_function={() => { console.log('测试模块卸载成功') }}
        >
            <SettingOutlined  className='label-icon' />
        </Card>
        <Card 
            module_key='finance-tools'
            label='金融建库建表工具'
            description='金融建库建表工具描述'
            activate_prompt='金融建库建表工具加载提示'
            deactivate_prompt='金融建库建表工具卸载提示'
            activate_function={() => { console.log('金融建库建表工具加载成功') }}
            deactivate_function={() => { console.log('金融建库建表工具卸载成功') }}
        >
            <SettingOutlined  className='label-icon' />
        </Card>
        <Card 
            module_key='iot-tools'
            label='物联网建库建表工具'
            description='金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述金融建库建表工具描述'
            activate_prompt='物联网建库建表工具安装提示'
            deactivate_prompt='物联网建库建表工具卸载提示'
            activate_function={() => { console.log('物联网建库建表工具加载成功') }}
            deactivate_function={() => { console.log('物联网建库建表工具卸载成功') }}
        >
            <SettingOutlined  className='label-icon' />
        </Card>
    </div>
}
