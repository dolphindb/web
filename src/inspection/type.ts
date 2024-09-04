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


export interface PlanDetail {
    planId: string
    metricName: string
    nodes: string
    params: string
}

export interface Plan { 
    id: string
    metrics: string[]
    nodes: Array<string[] | null>
    params: string[]
    frequency: string
    days: number[] | string
    scheduleTime: Dayjs | string
    desc: string 
    runNow?: boolean
}
