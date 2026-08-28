import { Model } from 'react-object-model'
import { DDB, DdbConnectionError, type DdbEvalOptions } from 'dolphindb/browser.js'

import { t } from '@i18n'
import { model } from '@model'

import type { ISelectableLlmInfo } from './types.ts'


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
    
    /** 执行 DolphinDB 脚本，若连接异常则尝试使用 ticket 自动重连一次后重试 */
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
                try {
                    const new_ddb = await this.reconnect_ddb()
                    return await new_ddb.eval(script, options)
                } catch (reconnect_error) {
                    throw reconnect_error instanceof DdbConnectionError
                        ? reconnect_error
                        : new DdbConnectionError(reconnect_error instanceof Error ? reconnect_error.message : String(reconnect_error))
                }
            }
            throw error
        }
    }
}


export const chat_shared_model = new ChatSharedModel()


// 挂载测试函数到全局 window 上
if (typeof window !== 'undefined') {
    const global_window = window as any
    global_window.chat_shared_model = chat_shared_model
    
    /** 测试用：关闭当前 AI DDB WebSocket 连接（保留 Ticket），用于验证下次执行时的自动重连机制 */
    global_window.disconnect_ai_ddb = () => {
        if (chat_shared_model.ddb) {
            try {
                chat_shared_model.ddb.disconnect()
            } catch { }
            chat_shared_model.ddb = null
        }
        console.log('[Test] AI DolphinDB 连接已关闭（保留 Ticket: %s），下次调用将自动尝试重连。', chat_shared_model.ddb_ticket)
    }
    
    /** 测试用：彻底关闭 AI DDB 连接并损坏 Ticket，使重连必然失败，用于验证断线弹窗和 Agent Loop 强中断机制 */
    global_window.destroy_ai_ddb = () => {
        if (chat_shared_model.ddb) {
            try {
                chat_shared_model.ddb.disconnect()
            } catch { }
            chat_shared_model.ddb = null
        }
        chat_shared_model.ddb_ticket = 'INVALID_DESTROYED_TICKET_FOR_TEST'
        console.log('[Test] AI DolphinDB 连接已彻底关闭并损坏 Ticket，重连将失败，用于验证断线弹窗与 Agent Loop 强中断。')
    }
}
