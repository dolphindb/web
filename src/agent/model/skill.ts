import { t } from '@i18n'
import type { ChatModel } from '@/agent/model.ts'

import type { ISkillBinding, ISkillFileContent, ISkillFileInfo, ISkillInfo } from './types.ts'
import { get_enabled, get_status, get_status_name } from './helpers.ts'

interface ISkillListParams {
    category?: string
    enabled?: boolean
    common?: boolean
    isCommon?: boolean
    offset?: number
    limit?: number
}

interface ISkillListResult {
    items: ISkillInfo[]
    offset: number
    limit: number
    size: number
}

export class ChatSkillModel {
    constructor (private chat: ChatModel) { }
    _map_skill (s: any): ISkillInfo {
        return {
            skillId: s.skillId,
            name: s.name || s.skillName,
            description: s.description,
            enabled: get_enabled(s),
            status: get_status(s),
            statusName: get_status_name(s),
            category: s.category,
            displayName: s.displayName,
            version: s.version,
            license: s.license,
            compatibility: s.compatibility,
            argumentHint: s.argumentHint,
            disableModelInvocation: s.disableModelInvocation,
            userInvocable: s.userInvocable,
            hasInstruction: s.hasInstruction,
            contentRevision: s.contentRevision,
            contentHash: s.contentHash,
            isCommon: s.isCommon,
            ownerUserId: s.ownerUserId,
            metadata: s.metadata,
            schemaVersion: s.schemaVersion,
            extra: s.extra,
            createTime: s.createTime,
            updateTime: s.updateTime,
        }
    }
    
    async load_skill_page (params: ISkillListParams = { }): Promise<ISkillListResult> {
        const search = new URLSearchParams()
        for (const [key, value] of Object.entries(params))
            if (value !== undefined)
                search.set(key, String(value))
        const query = search.toString()
        const result = await this.chat.agent.api_fetch(`/skill/list${query ? `?${query}` : ''}`)
        return {
            items: (result.items || [ ]).map((s: any) => this.chat.skill._map_skill(s)),
            offset: result.offset ?? params.offset ?? 0,
            limit: result.limit ?? params.limit ?? 50,
            size: result.size ?? 0,
        }
    }
    
    async load_skills (): Promise<ISkillInfo[]> {
        try {
            const result = await this.chat.agent.api_fetch('/skill/list')
            return (result.items || [ ]).map((s: any) => this.chat.skill._map_skill(s))
        } catch {
            return [ ]
        }
    }
    async get_skill (skill_id: string): Promise<ISkillInfo> {
        return this.chat.skill._map_skill(await this.chat.agent.api_fetch(`/skill/${encodeURIComponent(skill_id)}`))
    }
    async get_skill_by_name (skill_name: string): Promise<ISkillInfo> {
        return this.chat.skill._map_skill(await this.chat.agent.api_fetch(`/skill/byName/${encodeURIComponent(skill_name)}`))
    }
    async update_skill (skill_id: string, file?: File, overrides?: Record<string, unknown>): Promise<ISkillInfo> {
        const body: Record<string, any> = { }
        if (file) {
            const buffer = await file.arrayBuffer()
            body.packageBase64 = btoa(
                new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            )
        }
        if (overrides && Object.keys(overrides).length > 0)
            body.overrides = overrides
        return this.chat.skill._map_skill(await this.chat.agent.api_fetch(`/skill/${encodeURIComponent(skill_id)}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        }))
    }
    async load_skill_instruction (skill_id: string): Promise<any> {
        return this.chat.agent.api_fetch(`/skill/${encodeURIComponent(skill_id)}/instruction`)
    }
    async load_skill_files (skill_id: string): Promise<{ skillId: string, items: ISkillFileInfo[], size: number }> {
        const result = await this.chat.agent.api_fetch(`/skill/${encodeURIComponent(skill_id)}/files/list`)
        if (!Array.isArray(result.items))
            console.error('Invalid skill files response:', result)
        return { ...result, items: Array.isArray(result.items) ? result.items : [ ] }
    }
    async get_skill_file (skill_id: string, file_path: string): Promise<ISkillFileContent> {
        return this.chat.agent.api_fetch(`/skill/${encodeURIComponent(skill_id)}/files/get?filePath=${encodeURIComponent(file_path)}`)
    }
    async batch_get_skill_files (skill_id: string, file_paths: string[]): Promise<{ items: ISkillFileContent[], size: number }> {
        const result = await this.chat.agent.api_fetch(`/skill/${encodeURIComponent(skill_id)}/files/batchGet`, {
            method: 'POST',
            body: JSON.stringify({ filePaths: file_paths }),
        })
        return { ...result, items: result.items || [ ] }
    }
    async load_skill_catalog (agent_id: string): Promise<any> {
        return this.chat.agent.api_fetch(`/skill/${encodeURIComponent(agent_id)}/catalog`)
    }
    async load_skill_context (agent_id: string, active_skill_names: string[] = [ ]): Promise<any> {
        return this.chat.agent.api_fetch(`/skill/${encodeURIComponent(agent_id)}/context`, {
            method: 'POST',
            body: JSON.stringify({ activeSkillNames: active_skill_names }),
        })
    }
    async deny_user_skill (skill_id: string, user_id: string): Promise<any> {
        return this.chat.agent.api_fetch('/skill/user/deny', {
            method: 'POST',
            body: JSON.stringify({ skillId: skill_id, userId: user_id }),
        })
    }
    async allow_user_skill (skill_id: string, user_id: string): Promise<any> {
        return this.chat.agent.api_fetch('/skill/user/allow', {
            method: 'POST',
            body: JSON.stringify({ skillId: skill_id, userId: user_id }),
        })
    }
    async load_denied_user_skills (user_id: string): Promise<{ userId: string, skillIds: string[], size: number }> {
        const result = await this.chat.agent.api_fetch(`/skill/user/${encodeURIComponent(user_id)}/denied`)
        return { ...result, skillIds: result.skillIds || [ ] }
    }
    async load_skill_bindings (agent_id?: string): Promise<ISkillBinding[]> {
        const id = agent_id || this.chat.agent_id
        try {
            if (!id)
                return [ ]
            const result = await this.chat.agent.api_fetch(`/skill/${id}/bindings`)
            return (result.items || [ ]).map((b: any) => ({
                skillId: b.skillId,
                agentId: b.agentId,
                enabled: (b.available ?? b.enabled) !== false,
                available: b.available ?? b.enabled,
                source: b.source,
                subjectType: b.subjectType,
                subjectId: b.subjectId,
                descOverride: b.descOverride,
                createTime: b.createTime,
                updateTime: b.updateTime,
                skill: b.skill ? this.chat.skill._map_skill(b.skill) : undefined,
            }))
        } catch {
            return [ ]
        }
    }
    async load_bound_skills (): Promise<ISkillInfo[]> {
        try {
            if (!this.chat.agent_id)
                return [ ]
            const bindings = await this.chat.skill.load_skill_bindings(this.chat.agent_id)
            return bindings
                .filter(b => b.enabled && b.available !== false && b.skill)
                .map(b => {
                    const s = b.skill!
                    return {
                        skillId: b.skillId || s.skillId,
                        name: s.name || (s as any).skillName,
                        description: b.descOverride ?? s.description,
                        enabled: s.enabled,
                        status: get_status(s),
                        statusName: get_status_name(s),
                        category: s.category,
                        displayName: s.displayName,
                        version: s.version,
                        license: s.license,
                        compatibility: s.compatibility,
                        argumentHint: s.argumentHint,
                        disableModelInvocation: s.disableModelInvocation,
                        userInvocable: s.userInvocable,
                        hasInstruction: s.hasInstruction,
                        contentRevision: s.contentRevision,
                        contentHash: s.contentHash,
                        isCommon: s.isCommon,
                        ownerUserId: s.ownerUserId,
                        metadata: s.metadata,
                        schemaVersion: s.schemaVersion,
                        extra: s.extra,
                        createTime: s.createTime,
                        updateTime: s.updateTime,
                    }
                })
        } catch {
            return [ ]
        }
    }
    async bind_skill (skill_id: string, agent_id?: string): Promise<void> {
        await this.chat.agent.api_fetch('/skill/bind', {
            method: 'POST',
            body: JSON.stringify({
                agentId: agent_id || this.chat.agent_id,
                skillId: skill_id,
            }),
        })
    }
    async unbind_skill (skill_id: string, agent_id?: string): Promise<void> {
        await this.chat.agent.api_fetch('/skill/unbind', {
            method: 'POST',
            body: JSON.stringify({
                agentId: agent_id || this.chat.agent_id,
                skillId: skill_id,
            }),
        })
    }
    async toggle_skill_binding (skill_id: string, enabled: boolean, agent_id = this.chat.agent_id): Promise<void> {
        if (!agent_id)
            throw new Error(t('请先选择 Agent'))
        if (enabled)
            await this.chat.skill.bind_skill(skill_id, agent_id)
        else
            await this.chat.skill.unbind_skill(skill_id, agent_id)
    }
    async register_skill (file: File, overrides?: Record<string, unknown>): Promise<ISkillInfo> {
        const buffer = await file.arrayBuffer()
        const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        
        const body: Record<string, any> = { packageBase64: base64 }
        if (overrides && Object.keys(overrides).length > 0)
            body.overrides = overrides
            
        const result = await this.chat.agent.api_fetch('/skill/register', {
            method: 'POST',
            body: JSON.stringify(body),
        })
        return this.chat.skill._map_skill({
            ...result,
            skillId: result.skillId || result.skill_id || result.id,
        })
    }
    async delete_skill (skill_id: string): Promise<void> {
        await this.chat.agent.api_fetch(`/skill/${encodeURIComponent(skill_id)}`, { method: 'DELETE' })
    }
    async set_skill_enabled (skill_id: string, enabled: boolean): Promise<void> {
        await this.chat.skill.update_skill(skill_id, undefined, { enabled })
    }
}
