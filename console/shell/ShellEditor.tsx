import { useEffect, useState } from 'react'

import { Popconfirm, Switch } from 'antd'

import { CaretRightOutlined, LoadingOutlined } from '@ant-design/icons'

import { delay } from 'xshell/utils.browser.js'
import { t } from '../../i18n/index.js'

import { model, storage_keys } from '../model.js'
import { shell } from './model.js'

import { Editor, type monacoapi } from './Editor/index.js'

export function ShellEditor () {
    const { executing } = shell.use(['executing'])
    
    const [minimap, set_minimap] = useState(() => 
        localStorage.getItem(storage_keys.minimap) === '1'
    )
    
    const [enter_completion, set_enter_completion] = useState(() => 
        localStorage.getItem(storage_keys.enter_completion) === '1'
    )
    
    
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
    
    const [showExecuting, setShowExecuting] = useState(false)
    
    // 延迟切换执行中状态
    // useEffect(() => {
    //     if (shell.executing) {
    //         delay(500)
    //         setShowExecuting(true)
    //     }
    //     else
    //         setShowExecuting(false)
    // }, [shell.executing])
      
    return <div className='shell-editor'>
        <div className='toolbar'>
            <div className='actions'>
                {shell.executing && showExecuting ? 
                <Popconfirm
                    title={t('是否取消执行中的作业？')}
                    okText={t('取消作业')}
                    cancelText={t('不要取消')}
                    onConfirm={async () => { await model.ddb.cancel() }}
                >
                    <span className='action execute'>
                        <LoadingOutlined />
                        <span className='text'>{t('执行中')}</span>
                    </span>
                </Popconfirm>
                :
                <span className='action execute' title={t('执行选中代码或全部代码')} 
                    onClick={async () => { 
                        if (!shell.executing) {
                            let executeFlag = false
                            shell.execute('all').then(() => { setShowExecuting(false); executeFlag = true })
                            await delay(500)
                            setShowExecuting(true)
                        } }} 
                >
                    <CaretRightOutlined />
                    <span className='text'>{t('执行')}</span>
                </span> 
                }
            </div>
            
            <div className='settings'>
                <span className='setting' title={t('控制是否显示缩略图')}>
                    <span className='text'>{t('代码地图')}</span>
                    <Switch
                        checked={minimap}
                        size='small'
                        onChange={ checked => {
                            set_minimap(checked)
                            localStorage.setItem(storage_keys.minimap, checked ? '1' : '0')
                        }} />
                </span>
                
                <span className='setting' title={t('控制除了 Tab 键以外，Enter 键是否同样可以接受建议。这能减少“插入新行”和“接受建议”命令之间的歧义。')}>
                    <span className='text'>{t('回车补全')}</span>
                    <Switch
                        checked={enter_completion}
                        size='small'
                        onChange={ checked => {
                            set_enter_completion(checked)
                            localStorage.setItem(storage_keys.enter_completion, checked ? '1' : '0')
                        }} />
                </span>
            </div>
            
            <div className='padding' />
            
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
                        shell.executing ?
                            model.message.warning(t('当前连接正在执行作业，请等待'))
                        :
                            (async () => { 
                                let executeFlag = false
                                shell.execute('line').then(() => { setShowExecuting(false); executeFlag = true })
                                await delay(500)
                                if ( !executeFlag )
                                    setShowExecuting(true)
                            })()
                        
                    }
                })
                
                editor.addAction({
                    id: 'dolphindb.execute_all',
                    
                    keybindings: [
                        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE
                    ],
                    
                    label: t('DolphinDB: 执行代码'),
                    
                    run () {
                        shell.executing ?
                            model.message.warning(t('当前连接正在执行作业，请等待'))
                        :
                            (async () => { 
                                let executeFlag = false
                                shell.execute('line').then(() => { setShowExecuting(false); executeFlag = true })
                                await delay(500)
                                if ( !executeFlag )
                                    setShowExecuting(true)
                            })()
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
