export type TABLE_ACCESS = {
    name: string
    access?: object
    stat?: string
    schemas?: Array<TABLE_ACCESS & { tables: Array<TABLE_ACCESS> } >
    tables?: Array<TABLE_ACCESS>
}

export interface Access {
    key: string
    access: string
    name?: string
}

export interface AccessRule {
    access: string
    type: string
    obj: any[]
}

export type AccessMode = 'view' | 'manage'

export type AccessRole = 'user' | 'group'

export type AccessCategory = 'catalog' | 'database' | 'shared' | 'stream' | 'function_view' | 'script'

export interface DbRow { key: string, table_name: string, tables: TABLE_ACCESS[] }
