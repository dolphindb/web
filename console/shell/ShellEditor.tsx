import { default as React, useEffect, useState } from 'react'

import { Modal, Popconfirm, Select, Space, Switch } from 'antd'

import { default as _Icon, CaretRightOutlined } from '@ant-design/icons'
const Icon: typeof _Icon.default = _Icon as any

import { t } from '../../i18n/index.js'

import { model, storage_keys } from '../model.js'
import { shell } from './model.js'

import { Editor, type monacoapi } from './Editor/index.js'

import SvgArrowDown from '../components/icons/arrow.down.icon.svg'

export function ShellEditor () {
    const { executing } = shell.use(['executing'])
    
    const [minimap, set_minimap] = useState(() => 
        localStorage.getItem(storage_keys.minimap) === '1'
    )
    
    const [enter_completion, set_enter_completion] = useState(() => 
        localStorage.getItem(storage_keys.enter_completion) === '1'
    )
    
    const [sql_standrd, set_sql_standrd] = useState(() => localStorage.getItem(storage_keys.sql) || 'DolphinDB')
    
    const [is_modal_open, set_is_modal_open] = useState(false)
    const [temp_data, set_temp_data] = useState('') 
    
    // 标签页关闭前自动保存代码
    useEffect(() => {
        function beforeunload (event: BeforeUnloadEvent) {
            shell.save()
            // event.returnValue = ''
        }
        
        window.addEventListener('beforeunload', beforeunload)
        
        return () => {
            window.removeEventListener('beforeunload', beforeunload)
        }
    }, [ ])
    
    
    return <div className='shell-editor'>
        <Modal 
            title='提示' 
            open={is_modal_open} 
            onOk={() => {
                set_sql_standrd(temp_data)
                localStorage.setItem(storage_keys.sql, temp_data)
                set_is_modal_open(false)
                location.reload()
            }} 
            onCancel={() => { set_is_modal_open(false) }}>
                
            <p>切换 SQL Standard 后，当前页面将会刷新，且内存变量会清空</p>
        </Modal>
        <div className='toolbar'>
            <div className='actions'>
                <span className='action execute' title={t('执行选中代码或全部代码')} onClick={() => { shell.execute('all') }}>
                    <CaretRightOutlined />
                    <span className='text'>{t('执行')}</span>
                </span>
            </div>
            
            <div className='settings'>
                <span className='setting' title={t('控制是否显示缩略图')}>
                    <span className='text'>{t('代码地图:')}</span>
                    <Switch
                        checked={minimap}
                        size='small'
                        onChange={ checked => {
                            set_minimap(checked)
                            localStorage.setItem(storage_keys.minimap, checked ? '1' : '0')
                        }} />
                </span>
                
                <span className='setting' title={t('控制除了 Tab 键以外，Enter 键是否同样可以接受建议。这能减少“插入新行”和“接受建议”命令之间的歧义。')}>
                    <span className='text'>{t('回车补全:')}</span>
                    <Switch
                        checked={enter_completion}
                        size='small'
                        onChange={ checked => {
                            set_enter_completion(checked)
                            localStorage.setItem(storage_keys.enter_completion, checked ? '1' : '0')
                        }} />
                </span>
                
                <span className='setting' title={t('设置当前代码执行的 SQL 标准。')}>
                    <span className='text'>{t('SQL 标准:')}</span>
                    <Select
                        value={ sql_standrd }
                        size='small'
                        style={{ height: 19 }}
                        suffixIcon={<Icon className='arrow-down' component={SvgArrowDown} />}
                        onSelect={ value => {
                            set_temp_data(value) 
                            set_is_modal_open(true)
                        }}
                        options={[
                            { value: 'DolphinDB' },
                            { value: 'Oracle' },
                            { value: 'MySQL' },
                        ]}
                    />
                </span>
            </div>
            
            <div className='padding' />
            
            <div className='statuses'>{
                executing ?
                    <Popconfirm
                        title={t('是否取消执行中的作业？')}
                        okText={t('取消作业')}
                        cancelText={t('不要取消')}
                        onConfirm={async () => { await model.ddb.cancel() }}
                    >
                        <span className='status executing'>{t('执行中')}</span>
                    </Popconfirm>
                :
                    <span className='status idle'>{t('空闲中')}</span>
            }</div>
        </div>
        
        <Editor
            minimap={minimap}
            
            enter_completion={enter_completion}
            
            on_mount={(editor, monaco) => {
                editor.setValue(localStorage.getItem(storage_keys.code) || '')
                
                editor.addAction({
                    id: 'dolphindb.execute',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE
                    ],
                    
                    label: t('DolphinDB: 执行当前行代码'),
                    
                    run () {
                        shell.execute('line')
                    }
                })
                
                editor.addAction({
                    id: 'dolphindb.execute_all',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE
                    ],
                    
                    label: t('DolphinDB: 执行代码'),
                    
                    run () {
                        shell.execute('all')
                    }
                })
                
                editor.addAction({
                    id: 'dolphindb.save',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
                    ],
                    
                    label: t('DolphinDB: 保存代码'),
                    
                    run () {
                        shell.save()
                    },
                })
                
                editor.addAction({
                    id: 'duplicate_line',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD
                    ],
                    
                    label: t('向下复制行'),
                    
                    async run (editor: monacoapi.editor.IStandaloneCodeEditor) {
                        await editor.getAction('editor.action.copyLinesDownAction').run()
                    }
                })
                
                editor.addAction({
                    id: 'delete_lines',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY
                    ],
                    
                    label: t('删除行'),
                    
                    async run (editor: monacoapi.editor.IStandaloneCodeEditor) {
                        await editor.getAction('editor.action.deleteLines').run()
                    }
                })
                
                
                shell.set({ editor, monaco })
            }}
            
            on_change={(value, event) => {
                shell.save_debounced(value)
            }}
        />
    </div>
}
