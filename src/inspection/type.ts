import type { Dayjs } from 'dayjs'

export interface Metric {
    name: string
    displayName: string
    group: number
    desc: string
    version: string
    createTime: string
    updateTime: string
    nodes: string
    script: string
    params: Map<string, MetricParam>
}

export interface MetricParam { name: string, type: 'TIMESTAMP' | 'SYMBOL', options?: string[] }

export interface MetricsWithStatus extends Metric {
    checked: boolean
    selected_nodes: string[]
    selected_params: object | null
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
    params?: object
    frequency: string
    days: number[] | string
    scheduleTime: Array<Dayjs | string>
    desc: string 
    runNow?: boolean
    enabled: boolean
    alertEnabled?: boolean
    alertRecipient?: string[] | string
    lastReportId: string
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
    metricParams?: string
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
