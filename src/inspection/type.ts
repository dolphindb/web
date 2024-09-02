import type { Dayjs } from 'dayjs'

export interface Metric {
    name: string
    group: number
    desc: string
    version: string
    createTime: string
    updateTime: string
    nodes: string
}

export interface MetricsWithNodes {
    name: string
    checked: boolean
    nodes: string[]
}


export interface PlanParams { 
    id: string
    metrics: string[]
    nodes: Array<string[] | null>
    params: string[]
    frequency: string
    days: number[]
    scheduleTime: Dayjs | string
    desc: string 
    runNow?: boolean
}
