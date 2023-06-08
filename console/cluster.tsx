import './cluster.sass'

import { default as React, useState } from 'react'

import { Button, Modal, Tooltip } from 'antd'
import { CaretRightOutlined, ReloadOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons'

import { t } from '../i18n/index.js'

import { NodeType, model } from './model.js'

export function Cluster () {
    const { node_type } = model.use(['node_type'])
    
    return <>
        <div className='actions'>
            <div className='operations'>
                <Tooltip title={t('刷新信息')}>
                    <Button icon={<ReloadOutlined />} />
                </Tooltip>
                
                <Tooltip title={t('启动节点')}>
                    <Button icon={<CaretRightOutlined />} />
                </Tooltip>
                
                <Tooltip title={t('停止节点')}>
                    <Button icon={<StopOutlined />} />
                </Tooltip>
            </div>
            
            { node_type === NodeType.controller &&  <div className='configs'>
                <ButtonIframeModal 
                    className='nodes-modal'
                    button_text={t('集群节点配置')}
                    iframe_src='./dialogs/nodesSetup.html'
                />
                
                <ButtonIframeModal 
                    className='controller-modal'
                    button_text={t('控制节点配置')}
                    iframe_src='./dialogs/controllerConfig.html'
                />
                
                <ButtonIframeModal 
                    className='datanode-modal'
                    button_text={t('数据节点配置')}
                    iframe_src='./dialogs/datanodeConfig.html'
                />
            </div> }
        </div>
    </>
}


function ButtonIframeModal ({
    button_text,
    className,
    iframe_src
}: {
    button_text: string
    className: string
    iframe_src: string
}) {
    const [visible, set_visible] = useState(false)
    
    return <>
        <Button icon={<SettingOutlined />} onClick={() => { set_visible(true) }}>{button_text}</Button>
        
        <Modal
            className={className}
            open={visible}
            onCancel={() => { set_visible(false) }}
            width='80%'
        >
            <iframe className='iframe' src={iframe_src} />
        </Modal>
    </>
}


function NodeCard () {
    
}
