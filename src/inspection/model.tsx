import { Model } from 'react-object-model'

import { DdbInt } from 'dolphindb/browser'

import type { DdbVectorAny } from 'dolphindb'

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
    
    async init () {
        await model.ddb.execute(
            define_script,
        )
        await config.load_configs()
         // 若无指标，重新创建指标后再拉取
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
    
    async create_plan (plan: Omit<Plan, 'id' | 'lastReportld'>) {
        await model.ddb.invoke('createPlan', Object.values(plan))
    }
    
    async update_plan (plan: Omit<Plan, 'enabled' | 'name' | 'lastReportld'>) {
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
    
    async get_reports (planId: string = null, reportId: string = null, startTime: string = null, endTime: string = null,  page: number, limit: number, searchKey: string): Promise<{ records: PlanReport[], total: number }> {
        const [reports, total] = await model.ddb.execute(`getReports(${planId},${reportId},${startTime},${endTime},${page},${limit},"${searchKey}")`)
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
    
}

export let inspection = new InspectionModel()
