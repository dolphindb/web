import './index.sass'

import { default as React, useEffect } from 'react'

import { Resizable } from 're-resizable'

import { delay } from 'xshell/utils.browser.js'


import { model } from '../model.js'
import { shell } from './model.js'

import { Editor } from './Editor.js'
import { Terminal } from './Terminal.js'
import { DataView } from './DataView.js'
import { Databases } from './Databases.js'
import { Variables } from './Variables.js'


export function Shell () {
    const { options } = model.use(['options'])
    
    useEffect(() => {
        shell.options = options
        shell.update_vars()
    }, [options])
    
    useEffect(() => {
        (async () => {
            try {
                await shell.load_dbs()
            } catch (error) {
                model.show_error({ error })
                throw error
            }
        })()
    }, [ ])
    
    return <>
        {/* 左侧三个面板 */}
        <Resizable
            className='left-panels'
            defaultSize={{ height: '100%', width: '13%' }}
            enable={{ top: false, right: true, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
            onResizeStop={async () => {
                await delay(200)
                shell.fit_addon?.fit()
            }}
        >
            <Databases />
            
            <div className='treeview-resizable-split2'>
                <div className='treeview-resizable-split21'>
                    <Variables shared={false} />
                </div>
                
                <Resizable
                    className='treeview-resizable-split22'
                    enable={{
                        top: true,
                        right: false,
                        bottom: false,
                        left: false,
                        topRight: false,
                        bottomRight: false,
                        bottomLeft: false,
                        topLeft: false
                    }}
                    defaultSize={{ height: '100px', width: '100%' }}
                    minHeight='22px'
                    handleStyles={{ bottom: { height: 20, bottom: -10 } }}
                    handleClasses={{ bottom: 'resizable-handle' }}
                >
                    <Variables shared />
                </Resizable>
            </div>
        </Resizable>
        
        
        {/* 右侧编辑器、终端 */}
        <div className='content'>
            <Resizable
                className='top'
                defaultSize={{ height: '63%', width: '100%' }}
                enable={{ top: false, right: false, bottom: true, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
                onResizeStop={async () => {
                    await delay(200)
                    shell.fit_addon?.fit()
                }}
            >
                <Resizable
                    className='editor-resizable'
                    enable={{ top: false, right: true, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
                    defaultSize={{ height: '100%', width: '75%' }}
                    handleStyles={{ bottom: { height: 6, bottom: -3 } }}
                    handleClasses={{ bottom: 'resizable-handle' }}
                    onResizeStop={async () => {
                        await delay(200)
                        shell.fit_addon?.fit()
                    }}
                >
                    <Editor />
                </Resizable>
                
                <Terminal />
            </Resizable>
            
            <DataView />
        </div>
    </>
}

