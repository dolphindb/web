import type { Dayjs } from 'dayjs'

export interface Metric {
    name: string
    params: any[] | null
    displayName: string
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
    name: string
    metrics: string[]
    nodes: Array<string[] | ''>
    params:  Array<string[] | ''>
    frequency: string
    days: number[] | string
    scheduleTime: Dayjs | string
    desc: string 
    runNow?: boolean
    enabled: boolean
}

export interface PlanReport {
    id: string
    planId: string
    desc: string
    user: string
    startTime: string
    endTime: string
    runningTime: bigint
    success: boolean
    failedNum: number
    totalNum: number
}


export interface PlanReportDetailMetric {
    reportId: string
    metricName: string
    displayName: string
    metricVersion: string
    desc: string
    group: string
    nodes: string
    startTime: string
    endTime: string
    runningTime: bigint
    success: boolean
    detail_nodes: PlanReportDetailNode[]
}


export interface PlanReportDetailNode {
    reportId: string
    metricName: string
    metricVersion: string
    node: string
    startTime: string
    endTime: string
    runningTime: number
    success: boolean
    detail: string
    suggestion: string
}
