import { Model } from 'react-object-model'

import type * as monacoapi from 'monaco-editor/esm/vs/editor/editor.api.js'
import { DdbForm, DdbObj, DdbValue } from 'dolphindb/browser.js'

import { Monaco } from '../shell/Editor/index.js'
import { model } from '../model.js'
import { t } from '../../i18n/index.js'


type Result = { type: 'object', data: DdbObj<DdbValue> } | null
class ShellModel extends Model<ShellModel> {
    monaco: Monaco
    
    editor: monacoapi.editor.IStandaloneCodeEditor
    
    result: Result
    
    executing = false
    
    async eval (code = this.editor.getValue()) {        
        this.set({ executing: true })
        
        try {
            let ddbobj = await model.ddb.eval(
                code.replaceAll('\r\n', '\n')
            )
            if (model.verbose)
                console.log('=>', ddbobj.toString())
            
            if (
                ddbobj.form === DdbForm.chart ||
                ddbobj.form === DdbForm.dict ||
                ddbobj.form === DdbForm.matrix ||
                ddbobj.form === DdbForm.set ||
                ddbobj.form === DdbForm.table ||
                ddbobj.form === DdbForm.vector ||
                ddbobj.form === DdbForm.scalar
            )
                this.set({
                    result: {
                        type: 'object',
                        data: ddbobj.form === DdbForm.scalar ? null : ddbobj
                    },
                })
                
        } catch (error) {
            this.set({
                result: null,
            })
            throw error
        } finally {
            this.set({ executing: false })
        }
    }
    
    async execute (): Promise<{ 
        type: 'success' | 'error' 
        result: string | Result
    }> {
        if (shell.executing)
            model.message.warning(t('当前连接正在执行作业，请等待'))
        else 
            try {
                await this.eval()
                return {
                    type: 'success',
                    result: this.result
                }
            } catch (error) {
                return {
                    type: 'error',
                    result: error.message
                }
            }
    }
}

export let shell = window.shell = new ShellModel()
