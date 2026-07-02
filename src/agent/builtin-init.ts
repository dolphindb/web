import type { IBuiltinInitResult } from './model.ts'


export type BuiltinInitAction = 'none' | 'initialize' | 'upgrade'


export function get_builtin_init_action (status: IBuiltinInitResult | null | undefined): BuiltinInitAction {
    if (!status)
        return 'none'
    if (status.upgradeAvailable === true || status.state === 'STALE' || status.state === 'PARTIAL')
        return 'upgrade'
    if (status.initialized === true || status.state === 'READY')
        return 'none'
    return 'initialize'
}


export function needs_builtin_init_action (status: IBuiltinInitResult | null | undefined) {
    return get_builtin_init_action(status) !== 'none'
}
