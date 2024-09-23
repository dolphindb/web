import { useEffect, useState, type MouseEvent } from 'react'

import { Switch } from 'antd'
import { DoubleLeftOutlined, DoubleRightOutlined } from '@ant-design/icons'

import { t } from '@i18n/index.js'

import { model, storage_keys } from '@/model.ts'

import { Editor, type monacoapi } from '@/components/Editor/index.tsx'

import { shell } from './model.ts'

import { SelectSqlModal } from './SelectSqlModal.tsx'
import { ExecuteAction } from './ExecuteAction.tsx'


export function ShellEditor ({ collapser }) {
    const [minimap, set_minimap] = useState(() => 
        localStorage.getItem(storage_keys.minimap) === '1'
    )
    
    const [enter_completion, set_enter_completion] = useState(() => 
        localStorage.getItem(storage_keys.enter_completion) === '1'
    )
    
    const [collapsed, set_collapsed] = useState(false)
    
    const { tabs } = shell.use(['tabs'])
    
    // 标签页关闭前自动保存代码
    useEffect(() => {
        function beforeunload (event: BeforeUnloadEvent) {
            shell.save()
            // event.returnValue = ''
        }
        
        window.addEventListener('beforeunload', beforeunload)
        
        const keys: string[] = [ ]
        for (let i = 0;  i < localStorage.length;  i++) 
            keys.push(localStorage.key(i))
        
        const tab_keys = keys.filter(key => key.startsWith(`${storage_keys.code}.`)).map(key => key.slice(`${storage_keys.code}.`.length))
        shell.init_tabs(tab_keys)
        
        return () => {
            window.removeEventListener('beforeunload', beforeunload)
        }
    }, [ ])
    
    function get_tab_views () {
        
        function close_tab (ev: MouseEvent<HTMLSpanElement>, tab: string) {
            ev.stopPropagation()
            const index = tabs.indexOf(tab)
            const new_tabs = tabs.filter(t => t !== tab)
            if (new_tabs.length === 0) 
                shell.switch_tab('')
               else if (index === 0)
                   shell.switch_tab(new_tabs[0])
               else
                   shell.switch_tab(new_tabs[index - 1])
            
            shell.set({ tabs: new_tabs })
            shell.remove_tab(tab)
        }
        
        const tab_views = tabs.map(tab => {
            return <div key={tab} onClick={() => { shell.switch_tab(tab) }}>
                {tab}
                <span onClick={ev => { close_tab(ev, tab) }}>x</span>
            </div>
        })
        
        return <>
            <div key='default' onClick={() => { shell.switch_tab('') }}>
                {t('默认标签')}
            </div>
            {tab_views}
            <div className='add-tab' onClick={() => { shell.add_tab() }}>{t('添加标签页')}</div>
        </>
    }
    
    const tab_views = get_tab_views()
    
    return <div className='shell-editor'>
        <div className='tabs'>
            {tab_views}
        </div>
        <div className='toolbar'>
            <div className='actions'>
                <ExecuteAction />
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
                
                <SelectSqlModal/>
            </div>
            
            <div className='padding' />
            
            <div
                className='collapse-btn'
                onClick={() => {
                    set_collapsed(!collapsed)
                    collapser(collapsed)
                }}
            >
                {
                    collapsed ?
                        <DoubleLeftOutlined />
                    :
                        <span>
                            {t('隐藏终端') + ' '}
                            <DoubleRightOutlined />
                        </span>
                }
            </div>
        </div>
        
        <Editor
            minimap={minimap}
            
            enter_completion={enter_completion}
            
            on_mount={(editor, monaco) => {
                editor.setValue(localStorage.getItem(storage_keys.code) || '')
                
                
                async function execute (selection: 'line' | 'all') {
                    if (shell.executing)
                        model.message.warning(t('当前连接正在执行作业，请等待'))
                    else
                        try {
                            await shell.execute_(selection)
                        } catch (error) {
                            // 忽略用户执行脚本的错误
                        }
                }
                
                
                editor.addAction({
                    id: 'dolphindb.execute',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE
                    ],
                    
                    label: t('DolphinDB: 执行当前行代码'),
                    
                    async run () {
                        await execute('line')
                    }
                })
                
                editor.addAction({
                    id: 'dolphindb.execute_all',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE
                    ],
                    
                    label: t('DolphinDB: 执行代码'),
                    
                    async run () {
                        await execute('all')
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
