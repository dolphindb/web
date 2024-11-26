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
    
    async get_plans (enabled: boolean, page: number, limit: number, search_key: string, plan_id: string = null): Promise<{ records: Plan[], total: number }> {
        const [plans_obj, total] = await model.ddb.invoke('getPlans', [
            plan_id ? plan_id : new DdbVoid(),
            enabled,
            new DdbInt(page),
            new DdbInt(limit),
            search_key
        ])
        return { records: plans_obj.data, total }
    }
    async get_plan (plan_id: string): Promise<Plan>  {
        return (await model.ddb.invoke('getPlans', [plan_id]))[0].data[0]
    }
    
    async cancel_running_plan (report_id: string) {
        await model.ddb.invoke('cancelRunningPlan', [report_id])
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
    
    async run_plan (plan_id: string) {
        await model.ddb.invoke('runPlan', [plan_id])
    }
    
    async enable_plan (plan_id: string) {
        await model.ddb.invoke('enablePlan', [plan_id])
    }
    
    async disable_plan (plan_id: string) {
        await model.ddb.invoke('disablePlan', [plan_id])
    }
    
    async get_plan_detail (plan_id: string): Promise<PlanDetail[]> {
        return (await model.ddb.invoke('getPlanDetails', [plan_id])).data
    }
    
    async get_reports (plan_id: string = null, report_id: string = null, start_time: string = null, end_time: string = null, success: number = null, page: number = 1, limit: number = 5, search_key: string = '', order_by: string = 'receivedTime', asc_order: number = 0): Promise<{ records: PlanReport[], total: number }> {
        const [reports, total] = await model.ddb.invoke('getReports', [
            plan_id ? plan_id : new DdbVoid(), 
            report_id ? report_id : new DdbVoid(), 
            start_time ? start_time : new DdbVoid(), 
            end_time ? end_time : new DdbVoid(), 
            success ? success : new DdbVoid(), 
            new DdbInt(page), 
            new DdbInt(limit), 
            search_key, 
            order_by, 
            new DdbInt(asc_order)
        ])
        return { records: reports.data, total }
    }
    
    async get_report (report_id: string): Promise<PlanReport>  {
        return (await model.ddb.invoke('getReports', [new DdbVoid(), report_id]))[0].data[0]
    }
    
    async delete_reprorts (ids: string[]) {
        await model.ddb.invoke('deleteReports', [ids])
    }
    
    
    async get_report_detail_metrics (report_id: string): Promise<PlanReportDetailMetric[]> {
        return (await model.ddb.invoke('getReportDetailsOfMetrics', [report_id])).data
    }
    
    async get_report_detail_nodes (report_id: string): Promise<PlanReportDetailNode[]> {
        return (await model.ddb.invoke('getReportDetailsOfNodes', [report_id])).data
    }
    
    async get_metrics (): Promise<Array<Omit<Metric, 'params'> & { params: string }>> {
        return (await model.ddb.invoke('getMetrics')).data
    }
    
    async can_configure_email () {
        const { errCode, errMsg } = await model.ddb.invoke('canConfigureEmail')
        this.set({
            email_config: {
                can_config: errCode === 0,
                error_msg: `${EmailConfigMessages[errCode]}\n${errMsg}`
            }
        })
    }
    
    async get_logs (report_id: string, node: string) {
        return model.ddb.invoke('rpc', [node, new DdbFunction('getJobMessage', DdbFunctionType.SystemFunc), report_id], { node })
    }
}

export let inspection = new InspectionModel()