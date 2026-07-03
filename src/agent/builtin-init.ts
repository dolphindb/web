import type { IBuiltinInitResult } from './model.ts'


export type BuiltinInitAction = 'none' | 'initialize' | 'upgrade' | 'partial' | 'invalid'


export function get_builtin_init_action (status: IBuiltinInitResult | null | undefined): BuiltinInitAction {
    if (status?.state === 'NOT_RUN')
        return 'initialize'
    if (status?.state === 'STALE')
        return 'upgrade'
    if (status?.state === 'PARTIAL')
        return 'partial'
    if (status?.state === 'INVALID')
        return 'invalid'
    return 'none'
}


export function needs_builtin_init_action (status: IBuiltinInitResult | null | undefined) {
    return get_builtin_init_action(status) !== 'none'
}
