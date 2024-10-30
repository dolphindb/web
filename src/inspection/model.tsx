import { Model } from 'react-object-model'

import type { DdbErrorMessage } from 'dolphindb/browser'

import {  model } from '@/model.ts'

import { config } from '@/config/model.ts'

import type { Metric, MetricParam, Plan, PlanDetail, PlanReport, PlanReportDetailMetric, PlanReportDetailNode } from './type.ts'

import define_script from './index.dos'
import create_metrics_script from './init.dos'

class InspectionModel extends Model<InspectionModel> {
    
    inited = false
    
    current_report: PlanReport | null = null
    
    current_plan: Plan | null = null
    
    metrics: Map<string, Metric> = new Map()
    
    email_config: { can_config: boolean, error_msg: string } = { can_config: true, error_msg: '' }
    
    async init () {
        await model.ddb.execute(
            define_script,
        )
        await config.load_configs()
         // 若无指标，创建指标后再拉取
        if (!(await this.check_inited())) 
            await model.ddb.execute(create_metrics_script)
        
        const metrics_obj = await inspection.get_metrics()
        this.set({ metrics: new Map(metrics_obj.map(m => {
            let params = new Map<string, MetricParam>()
            let params_arr = JSON.parse(m.params)
            if (Array.isArray(params_arr)) 
                params_arr.map(param => {
                    params.set(param.name, param)
                })
            return [ m.name, { ...m, params } ]
        })) })
        this.set({ email_config: await inspection.can_configure_email() })
        this.set({ inited: true })
    }
    
    async check_inited (): Promise<boolean> {
        return (model.ddb.execute('existsDatabase("dfs://ddb_internal_auto_inspection")'))
    }
    
    async get_plans (enabled: boolean, page: number, limit: number, searchKey: string, planId: string = null): Promise<{ records: Plan[], total: number }> {
        const [plans_obj, total] = await model.ddb.execute(`getPlans(${planId},${enabled},${page},${limit},"${searchKey}")`)
        return { records: plans_obj.data, total }
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
        const [reports, total] = await model.ddb.execute(`getReports(${planId},${reportId ? `"${reportId}"` : null},${startTime},${endTime},${success},${page},${limit},"${searchKey}","${orderBy}",${ascOrder})`)
        // const [reports, total] = (await model.ddb.invoke('getReports', [planId, reportId, startTime, endTime, success, new DdbInt(page), new DdbInt(limit), searchKey, orderBy, ascOrder])).data
        return { records: reports.data, total }
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
    
    async can_configure_email (): Promise<{ can_config: boolean, error_msg: string }> {
        let can_config = true
        let error_msg = ''
        try {
            can_config = (await model.ddb.call('canConfigureEmail')).data()
        } catch (error) {
            can_config = false
            error_msg = error.message
        }
        console.log('{ can_config, error_msg }', { can_config, error_msg })
        return { can_config, error_msg }
    }
    
}

export let inspection = new InspectionModel()
