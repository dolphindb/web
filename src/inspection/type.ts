import type { Dayjs } from 'dayjs'

export interface Metric {
    name: string
    displayName: string
    group: number
    desc: string
    version: number | null
    createTime: string
    updateTime: string
    nodes: string
    script: string
    params: Map<string, MetricParam>
}

export interface MetricParam {
    name: string
    type: 'TIMESTAMP' | 'SYMBOL'
    options?: string[]
}

export interface MetricsWithStatus extends Metric {
    checked: boolean
    selected_nodes: string[]
    selected_params: object | null | string
}


export interface PlanDetail {
    planId: string
    metricName: string
    metricVersion: number | null
    nodes: string
    params: string
}

export interface Plan { 
    id: string
    name: string
    metrics: string[]
    versions: (number | null)[]
    nodes: Array<string[] | ''>
    params?: object
    frequency: string
    days: number[] | string
    scheduleTime: Array<Dayjs | string>
    desc: string 
    runNow?: boolean
    enabled: boolean
    enabledNode: string
    alertEnabled?: boolean
    alertRecipient?: string[] | string
    lastReportId: string
}

export interface PlanReport {
    id: string
    name: string
    planId: string
    desc: string
    user: string
    startTime: string
    endTime: string
    enabledNode: string
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
    jobId: string
    metricName: string
    metricVersion: string
    node: string
    startTime: string
    endTime: string
    runningTime: number
    success: boolean
    detail: string
    extraDetail?: string
    suggestion: string
}
