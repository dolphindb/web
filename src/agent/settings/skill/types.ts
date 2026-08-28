import type { TreeDataNode } from 'antd'

import { language, t } from '@i18n'
import type { ISkillInfo } from '@/agent/model/types.ts'


export const DEFAULT_OVERRIDES = {
    name: '',
    displayName: '',
    description: '',
    category: '',
    version: '',
}

export type SkillOverrides = typeof DEFAULT_OVERRIDES



export function skill_description (skill: ISkillInfo) {
    const description = skill.description ? t(skill.description) : t('无描述')
    return language === 'en' && /[\u3400-\u9fff]/.test(description)
        ? `DolphinDB ${skill.name.replace(/^dolphindb-/, '').replaceAll('-', ' ')} skill.`
        : description
}


export function decode_skill_file (content: string, encoding?: string) {
    if (encoding !== 'base64')
        return content
    try {
        const bytes = Uint8Array.from(atob(content), char => char.charCodeAt(0))
        return new TextDecoder().decode(bytes)
    } catch {
        return content
    }
}


export function build_skill_file_tree (paths: string[]) {
    type FileTreeNode = TreeDataNode & { children?: FileTreeNode[] }
    
    const roots: FileTreeNode[] = [ ]
    const node_map = new Map<string, FileTreeNode>()
    for (const file_path of paths) {
        const parts = file_path.split(/[\\/]/).filter(Boolean)
        let current_path = ''
        let siblings = roots
        parts.forEach((part, index) => {
            const is_leaf = index === parts.length - 1
            current_path = current_path ? `${current_path}/${part}` : part
            let node = node_map.get(current_path)
            if (!node) {
                node = {
                    key: current_path,
                    title: part,
                    isLeaf: is_leaf,
                    selectable: is_leaf,
                    children: is_leaf ? undefined : [ ],
                }
                node_map.set(current_path, node)
                siblings.push(node)
            }
            if (!is_leaf) {
                node.isLeaf = false
                node.selectable = false
                node.children ||= [ ]
                siblings = node.children
            }
        })
    }
    return roots
}
