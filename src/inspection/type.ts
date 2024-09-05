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

export interface PlanReport {
    id: string
    planId: string
    desc: string
    user: string
    startTime: string
    endTime: string
    success: boolean
}


export interface PlanReportDetailMetric {
    reportId: string
    metricName: string
    metricVersion: string
    desc: string
    nodes: string
    startTime: string
    endTime: string
    runingTime: number
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
    runingTime: number
    success: boolean
    detail: string
    suggestion: string
}
