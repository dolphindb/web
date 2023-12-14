import './index.sass'

import { Tabs } from 'antd'
import { t } from '../../i18n/index.js'

import SvgControllerConfig from './icons/controller.config.icon.svg'
import SvgNodesManagement from './icons/nodes.management.icon.svg'
import SvgNodesConfig from './icons/nodes.config.icon.svg'
import { ControllerConfig } from './ControllerConfig.js'
import { useState } from 'react'

export function Config () {
    const [tab_key, set_tab_key] = useState('controller_config')
    return <Tabs
                type='card'
                key={tab_key}
                onChange={set_tab_key}
                items={[
                {
                    key: 'controller_config',
                    label: <div className='tab-header'>
                        <SvgControllerConfig/>
                        {t('控制节点配置')}
                    </div>,
                    children: <ControllerConfig/>
                    
                },
                {
                    key: 'nodes_management',
                    label: <div className='tab-header'>
                        <SvgNodesManagement/>
                        {t('集群节点管理')}
                    </div>
                },
                {
                    key: 'nodes_config',
                    label: <div className='tab-header'>
                        <SvgNodesConfig/>
                        {t('集群节点配置')}
                    </div>
                }
                ]}
        />
}

