import './index.sass'

import { useEffect, useRef, useState } from 'react'
import { Button, Checkbox, Empty, Input, Modal, Result, Table, Typography, Upload, type UploadFile } from 'antd'
import { ReloadOutlined, default as Icon, InboxOutlined } from '@ant-design/icons'
import { noop } from 'xshell/utils.browser.js'

import { use_modal, type ModalController } from 'react-object-model/hooks.js'
import { join_elements } from 'react-object-model/utils.js'

import { DdbBlob, DdbVectorString } from 'dolphindb/browser.js'

import { t } from '@i18n/index.js'

import { model, NodeType } from '@/model.js'

import script from './index.dos'
import SvgUpgrade from './upgrade.icon.svg'
import zip_png from './zip.png'



const { Text, Link } = Typography


export function Plugins () {
    const [refresher, set_refresher] = useState({ })
    
    const [plugins, set_plugins] = useState<Plugin[]>([ ])
    const [query, set_query] = useState('')
    
    let installer = use_modal()
    
    
    useEffect(() => {
        (async () => {
            set_plugins(
                await list_plugins(query)
            )
        })()
    }, [refresher, query])
    
    return <>
        <div className='actions'>
            <Button
                className='install'
                type='primary'
                icon={<Icon component={SvgUpgrade} />}
                onClick={installer.open}
            >{t('安装或更新插件')}</Button>
            
            <InstallModal installer={installer} />
            
            <Button
                className='refresh'
                icon={<ReloadOutlined/>}
                onClick={() => {
                    set_refresher({ })
                }}
            >{t('刷新')}</Button>
            
            <Input.Search className='search' placeholder={t('输入关键字后按回车可搜索插件')} onSearch={ value => { set_query(value) }} />
        </div>
        
        <Table
            dataSource={plugins}
            rowKey='id'
            pagination={false}
            // size='small'
            columns={[
                {
                    title: '插件 ID',
                    dataIndex: 'id',
                    width: 200,
                },
                {
                    title: '集群已安装的最低版本', 
                    width: 400,
                    render: (_, { least_version }) => {
                        const match = least_version.startsWith(
                            model.version.split('.').slice(0, 3).join('.')  // 去掉 patch 部分
                        )
                        
                        return <Text type={ match ? undefined : 'danger'}>{least_version}{ !match && ' (与数据库版本不一致，无法加载)' }</Text>
                    }
                },
                {
                    title: '已部署节点',
                    render: (_, { nodes, least_version }, j) => {
                        let all_match = true
                        
                        const elements = nodes.map(({ node, version }, index) => {
                            // local
                            // if (index === 0 && j % 2 === 0)
                            //     version = '2.00.12.1'
                            
                            const match = version === least_version
                            if (!match)
                                all_match = false
                            
                            return match
                                ? node
                                : <Text key={node} className='danger-node' type={ match ? undefined : 'danger'}>
                                    {node} ({version})
                                </Text>
                        })
                        
                        return <>
                            { join_elements(elements, <span>{', '}</span>) }
                            { !all_match && <Text type='danger'> (不同节点插件版本不一致，需要同步)</Text> }
                        </>
                    }
                }
            ]}
        />
    </>
}


function InstallModal ({ installer }: { installer: ModalController }) {
    let [file, set_file] = useState<UploadFile>()
    let [status, set_status] = useState<'preparing' | 'uploading'>('preparing')
    
    const default_nodes = model.nodes.filter(({ mode }) => mode !== NodeType.agent)
        .map(({ name }) => name)
    
    let rnodes = useRef(default_nodes)
    
    
    return <Modal
        title={t('安装或更新插件')}
        className='plugins-install-modal'
        open={installer.visible}
        onCancel={installer.close}
        okText={t('安装或更新')}
        width='80%'
        onOk={async () => {
            set_status('uploading')
            
            await define_script()
            
            try {
                await model.ddb.call('install_plugin', [
                    new DdbVectorString(rnodes.current),
                    new DdbBlob(await file.originFileObj.arrayBuffer())
                ])
            } finally {
                set_status('preparing')
            }
            
            installer.close()
        }}
        
        okButtonProps={{
            disabled: !file
        }}
    >
        <Upload.Dragger
            showUploadList={false}
            customRequest={noop}
            accept='.zip'
            onChange={({ file }) => {
                set_file(file)
            }}
        >
            <Result
                className='result'
                icon={<InboxOutlined />}
                title='拖拽文件到这里，或点击后弹框选择文件'
            />
        </Upload.Dragger>
        
        <Table<UploadFile>
            className='files' 
            size='middle'
            sticky
            pagination={false}
            
            dataSource={file ? [file] : [ ] as UploadFile[]}
            rowKey='uid'
            
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='暂无文件' />,  }}
            
            columns={[
                {
                    className: 'fp',
                    key: 'fp',
                    title: '待上传文件',
                    render: (_, { originFileObj: { name: fp } }) => <>
                        <img className='zip-icon' src={zip_png} />
                        <span className='text'>{fp}</span>
                    </>
                },
                {
                    className: 'size',
                    key: 'size',
                    title: '大小',
                    align: 'right',
                    width: 130,
                    render: (_, { size }) => size.to_fsize_str()
                },
                {
                    className: 'actions',
                    key: 'actions',
                    title: '操作',
                    width: 80,
                    render: () =>
                        status === 'preparing' && <Link onClick={() => {
                            set_file(null)
                        }}>删除</Link>
                }
            ]}
        />
        
        <div className='nodes'>
            <span className='title'>{t('部署节点:')}</span>
            
            <Checkbox.Group
                options={default_nodes}
                defaultValue={rnodes.current}
                onChange={nodes => { rnodes.current = nodes }}
            />
        </div>
    </Modal>
}


interface Plugin {
    id: string
    least_version: string
    nodes: { node: string, version: string }[]
}


let script_defined = false


async function define_script () {
    if (!script_defined) {
        await model.ddb.execute(script)
        script_defined = true
    }
}


async function list_plugins (query = '') {
    await define_script()
    
    const plugins = (await model.ddb.invoke<Plugin[]>('list_plugins'))
        .filter(({ id, least_version, nodes }) => 
            id.includes(query) || 
            least_version.includes(query) || 
            nodes.map(({ node }) => node)
                .find(node => node.includes(query))
        )
    
    console.log('插件:', plugins)
    
    return plugins
}
