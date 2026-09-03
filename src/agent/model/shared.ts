import { Model } from 'react-object-model'
import { DDB, DdbConnectionError, type DdbEvalOptions } from 'dolphindb/browser.js'

import { t } from '@i18n'
import { model } from '@model'

import type { ISelectableLlmInfo } from './types.ts'


/** 连接已自动恢复，但中断前脚本是否完整执行未知，本次工具流程必须停止。 */
export class DdbConnectionRecoveredError extends Error {
    override name = 'DdbConnectionRecoveredError'
}


export class ChatSharedModel extends Model<ChatSharedModel> {
    selectable_llms_by_agent_id: Record<string, ISelectableLlmInfo[]> = { }
    
    /** AI 专属 DolphinDB 独立连接，AI 系统所有会话共用 */
    ddb: DDB | null = null
    
    /** AI 系统启动时保存的 User Ticket，用于断线重连（无需找主连接重新申请） */
    ddb_ticket = ''
    
    p_reconnect: Promise<DDB> | null = null
    
    is_ddb_connected () {
        return Boolean(this.ddb?.connected || model.ddb?.connected)
    }
    
    /** 确保获取并返回 AI 专属的 DolphinDB 连接 */
    async ensure_ddb (): Promise<DDB> {
        if (this.ddb?.connected)
            return this.ddb
        
        if (!this.ddb_ticket) {
            const ticket = model.ddb?.ticket || await model.get_ticket()
            this.ddb_ticket = ticket || ''
        }
        
        return this.reconnect_ddb()
    }
    
    /** 使用保存的 ticket 独立重建连接（不调用 model.ddb 重新申请 ticket） */
    async reconnect_ddb (): Promise<DDB> {
        if (this.p_reconnect)
            return this.p_reconnect
        
        const p = (async () => {
            if (this.ddb) {
                try {
                    this.ddb.disconnect()
                } catch { }
                this.ddb = null
            }
            
            try {
                const ddb = new DDB(model.ddb.url, {
                    ticket: this.ddb_ticket,
                    autologin: true,
                    sql: model.sql,
                    verbose: model.verbose,
                })
                await ddb.connect()
                this.ddb = ddb
                return ddb
            } catch (error) {
                this.ddb = null
                model.modal.warning({
                    title: t('DolphinDB 连接已断开'),
                    content: t('DolphinDB 连接已断开，请刷新页面。'),
                    okText: t('立即刷新'),
                    onOk: () => {
                        location.reload()
                    },
                })
                throw new DdbConnectionError(t('DolphinDB 连接已断开，重连失败。') + ` (${error instanceof Error ? error.message : String(error)})`)
            } finally {
                this.p_reconnect = null
            }
        })()
        
        this.p_reconnect = p
        return p
    }
    
    /** 断开 AI 专属 DolphinDB 连接 */
    disconnect_ddb () {
        if (this.ddb) {
            try {
                this.ddb.disconnect()
            } catch { }
            this.ddb = null
        }
        this.ddb_ticket = ''
    }
    
    /** 执行 DolphinDB 脚本；连接中断时仅恢复连接，不自动重跑状态未知的脚本。 */
    async eval_ddb (script: string, options?: DdbEvalOptions): Promise<any> {
        let ddb: DDB
        try {
            ddb = await this.ensure_ddb()
        } catch (error) {
            throw error instanceof DdbConnectionError
                ? error
                : new DdbConnectionError(error instanceof Error ? error.message : String(error))
        }
        
        try {
            return await ddb.eval(script, options)
        } catch (error) {
            if (error instanceof DdbConnectionError || !ddb.connected) {
                await this.reconnect_ddb()
                throw new DdbConnectionRecoveredError(error instanceof Error ? error.message : String(error))
            }
            throw error
        }
    }
}


export const chat_shared_model = new ChatSharedModel()



