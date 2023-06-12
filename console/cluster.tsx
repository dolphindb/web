import './cluster.sass'

import { default as React, useState } from 'react'

import { Button, Modal, Tooltip } from 'antd'
import { CaretRightOutlined, ReloadOutlined, SettingOutlined, StopOutlined } from '@ant-design/icons'

import { t } from '../i18n/index.js'

import { NodeType, model } from './model.js'

export function Cluster () {
    const { node_type, cdn } = model.use(['node_type', 'cdn'])
    
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
            
            { !cdn && node_type === NodeType.controller &&  <div className='configs'>
                <ButtonIframeModal 
                    class_name='nodes-modal'
                    button_text={t('集群节点配置')}
                    iframe_src='./dialogs/nodesSetup.html'
                />
                
                <ButtonIframeModal 
                    class_name='controller-modal'
                    button_text={t('控制节点配置')}
                    iframe_src='./dialogs/controllerConfig.html'
                />
                
                <ButtonIframeModal 
                    class_name='datanode-modal'
                    button_text={t('数据节点配置')}
                    iframe_src='./dialogs/datanodeConfig.html'
                />
            </div> }
        </div>
    </>
}


function ButtonIframeModal ({
    button_text,
    class_name,
    iframe_src
}: {
    button_text: string
    class_name: string
    iframe_src: string
}) {
    const { visible, open, close } = use_modal()
    
    return <>
        <Button icon={<SettingOutlined />} onClick={open}>{button_text}</Button>
        
        <Modal
            className={class_name}
            open={visible}
            onCancel={close}
            width='80%'
            footer={null}
        >
            <iframe src={iframe_src} />
        </Modal>
    </>
}


function NodeCard () {
    
}


function use_modal () {
    const [visible, set_visible] = useState(false)
    
    return {
        visible,
        
        open () {
            set_visible(true)
        },
        
        close () {
            set_visible(false)
        }
    }
}

