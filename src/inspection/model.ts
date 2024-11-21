import { Model } from 'react-object-model'

import { DdbFunction, DdbFunctionType, DdbInt, DdbVoid } from 'dolphindb/browser'

import { model } from '@/model.ts'

import { config } from '@/config/model.ts'

import define_script from '@/inspection/scripts/index.dos'


import create_metrics_script from '@/inspection/scripts/init.dos'
import { EmailConfigMessages } from '@/inspection/constants.ts'

import type { Metric, MetricParam, Plan, PlanDetail, PlanReport, PlanReportDetailMetric, PlanReportDetailNode } from './type.ts'

class InspectionModel extends Model<InspectionModel> {
    inited = false
    
    defined = false
    
    // null 代表未从 server 获取到 table_created，此时需要处于 loading
    table_created: boolean | null = null
    
    metrics: Map<string, Metric> = new Map()
    
    email_config: { can_config: boolean, error_msg: string } = { can_config: true, error_msg: '' }
    
    // 定义函数
    async define () {
        await model.ddb.execute(define_script)
        this.set({ defined: true })
    }
    
    // 拉邮件配置，拉指标
    async init () {
        await config.load_configs()
        const metrics_obj = await this.get_metrics()
        this.set({
            metrics: new Map(metrics_obj.map(m => {
                let params = new Map<string, MetricParam>()
                let params_arr = JSON.parse(m.params)
                if (Array.isArray(params_arr)) 
                    params_arr.map(param => {
                        params.set(param.name, param)
                    })
                return [ m.name, { ...m, params } ]
            }))
        })
        await this.can_configure_email()
        this.set({ inited: true })
    }
    
    // 创表
    async create_table () {
        // 创表依赖 define
        await this.define()
        // 若无指标，创建指标后再拉取
        await model.ddb.execute(create_metrics_script)
        this.set({ table_created: true })
    }
    
    // 检查表是否已创建
    async check_table_created () {
        this.set({ table_created: await model.ddb.invoke('existsDatabase', ['dfs://autoInspection']) })
    }
    
    async get_plans (enabled: boolean, page: number, limit: number, searchKey: string, planId: string = null): Promise<{ records: Plan[], total: number }> {
        const [plans_obj, total] = await model.ddb.invoke('getPlans', [
            planId ? planId : new DdbVoid(),
            enabled,
            new DdbInt(page),
            new DdbInt(limit),
            searchKey
        ])
        return { records: plans_obj.data, total }
    }
    async get_plan (planId: string): Promise<Plan>  {
        return (await model.ddb.invoke('getPlans', [planId]))[0].data[0]
    }
    
    async cancel_running_plan (reportId: string) {
        await model.ddb.invoke('cancelRunningPlan', [reportId])
    }
    
    async delete_plans (ids: string[]) {
        await model.ddb.invoke('deletePlan', [ ids ])
    }
    
    async create_plan (plan: Omit<Plan, 'id' | 'lastReportId'>) {
        await model.ddb.invoke('createPlan', Object.values(plan))
    }
    
    async update_plan (plan: Omit<Plan, 'enabled' | 'name' | 'lastReportId'>) {
        await model.ddb.invoke('updatePlan', Object.values(plan))
    }
    
    async run_plan (planId: string) {
        await model.ddb.invoke('runPlan', [planId])
    }
    
    async enable_plan (planId: string) {
        await model.ddb.invoke('enablePlan', [planId])
    }
    
    async disable_plan (planId: string) {
        await model.ddb.invoke('disablePlan', [planId])
    }
    
    async get_plan_detail (planId: string): Promise<PlanDetail[]> {
        return (await model.ddb.invoke('getPlanDetails', [planId])).data
    }
    
    async get_reports (planId: string = null, reportId: string = null, startTime: string = null, endTime: string = null, success: number = null, page: number = 1, limit: number = 5, searchKey: string = '', orderBy: string = 'receivedTime', ascOrder: number = 0): Promise<{ records: PlanReport[], total: number }> {
        const [reports, total] = await model.ddb.invoke('getReports', [
            planId ? planId : new DdbVoid(), 
            reportId ? reportId : new DdbVoid(), 
            startTime ? startTime : new DdbVoid(), 
            endTime ? endTime : new DdbVoid(), 
            success ? success : new DdbVoid(), 
            new DdbInt(page), 
            new DdbInt(limit), 
            searchKey, 
            orderBy, 
            new DdbInt(ascOrder)
        ])
        return { records: reports.data, total }
    }
    
    async get_report (reportId: string): Promise<PlanReport>  {
        return (await model.ddb.invoke('getReports', [new DdbVoid(), reportId]))[0].data[0]
    }
    
    async delete_reprorts (ids: string[]) {
        await model.ddb.invoke('deleteReports', [ ids ])
    }
    
    
    async get_report_detail_metrics (reportId: string): Promise<PlanReportDetailMetric[]> {
        return (await model.ddb.invoke('getReportDetailsOfMetrics', [reportId])).data
    }
    
    async get_report_detail_nodes (reportId: string): Promise<PlanReportDetailNode[]> {
        return (await model.ddb.invoke('getReportDetailsOfNodes', [reportId])).data
    }
    
    async get_metrics (): Promise<Array<Omit<Metric, 'params'> & { params: string }>> {
        return (await model.ddb.invoke('getMetrics', [ ])).data
    }
    
    async can_configure_email () {
        const { errCode, errMsg } = await model.ddb.invoke('canConfigureEmail', [ ])
        this.set({
            email_config: {
                can_config: errCode === 0,
                error_msg: `${EmailConfigMessages[errCode]}\n${errMsg}`
            }
        })
    }
    
    async get_logs (reportId: string, node: string) {
        return model.ddb.invoke('rpc', [node, new DdbFunction('getJobMessage', DdbFunctionType.SystemFunc), reportId], { node })
    }
}

export let inspection = new InspectionModel()
