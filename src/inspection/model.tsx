import { Model } from 'react-object-model'

import {  model } from '@/model.ts'

import { config } from '@/config/model.ts'

import type { Metric, MetricParam, Plan, PlanDetail, PlanReport, PlanReportDetailMetric, PlanReportDetailNode } from './type.ts'

import init_script from './index.dos'
// import demo_script from './init.dos'

class InspectionModel extends Model<InspectionModel> {
    
    inited = false
    
    current_report: PlanReport | null = null
    
    current_plan: Plan | null = null
    
    metrics: Map<string, Metric> = new Map()
    
    async init () {
        await model.ddb.execute(
            init_script,
        )
        await config.load_configs()
        // await model.ddb.execute(demo_script)
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
    
    
    async get_plans (): Promise<Plan[]> {
        return (await model.ddb.invoke('getPlans', [ ])).data
    }
    
    async delete_plans (ids: string[]) {
        await model.ddb.invoke('deletePlan', [ ids ])
    }
    
    async create_plan (plan: Omit<Plan, 'id'>) {
        await model.ddb.invoke('createPlan', Object.values(plan))
    }
    
    async update_plan (plan: Omit<Plan, 'enabled' | 'name'>) {
        console.log('plan', plan)
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
    
    async get_reports (dates: string[], reportId: string = null): Promise<PlanReport[]> {
        return (await model.ddb.invoke('getReports', [null, reportId, ...dates ]) ).data
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
