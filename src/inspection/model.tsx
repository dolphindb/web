import { Model } from 'react-object-model'

import {  model } from '@/model.ts'

import type { Metric, Plan, PlanDetail, PlanReport, PlanReportDetailMetric, PlanReportDetailNode } from './type.ts'

import init_script from './index.dos'
import demo_script from './demo.dos'

class InspectionModel extends Model<InspectionModel> {
    
    inited = false
    
    current_report: PlanReport | null = null
    
    metrics: Map<string, Metric> = new Map()
    
    async init () {
        await model.ddb.execute(
            init_script,
        )
        await model.ddb.execute(demo_script)
        const metrics_obj = await inspection.get_metrics()
        this.set({ metrics: new Map(metrics_obj.map(m => [ m.name, m ])) })
        this.set({ inited: true })
    }
    
    
    async get_plans (): Promise<Plan[]> {
        return (await model.ddb.invoke('autoInspection::getPlans', [ ])).data
    }
    
    async delete_plans (ids: string[]) {
        await model.ddb.invoke('autoInspection::deletePlan', [ ids ])
    }
    
    async create_plan (plan: Omit<Plan, 'id' | 'enabled'>) {
        await model.ddb.invoke('autoInspection::createPlan', Object.values(plan))
    }
    
    async update_plan (plan: Omit<Plan, 'enabled'>) {
        await model.ddb.invoke('autoInspection::updatePlan', Object.values(plan))
    }
    
    async run_plan (planId: string) {
        await model.ddb.invoke('autoInspection::runPlan', [planId])
    }
    
    async enable_plan (planId: string) {
        await model.ddb.invoke('autoInspection::enablePlan', [planId])
    }
    
    async disable_plan (planId: string) {
        await model.ddb.invoke('autoInspection::disablePlan', [planId])
    }
    
    async get_plan_detail (planId: string): Promise<PlanDetail[]> {
        return (await model.ddb.invoke('autoInspection::getPlanDetails', [planId])).data
    }
    
    async get_reports (dates: string[], reportId: string = null): Promise<PlanReport[]> {
        return (await model.ddb.invoke('autoInspection::getReports', [null, reportId, ...dates ]) ).data
    }
    
    async get_report_detail_metrics (reportId: string): Promise<PlanReportDetailMetric[]> {
        return (await model.ddb.invoke('autoInspection::getReportDetailsOfMetrics', [reportId])).data
    }
    
    async get_report_detail_nodes (reportId: string): Promise<PlanReportDetailNode[]> {
        return (await model.ddb.invoke('autoInspection::getReportDetailsOfNodes', [reportId])).data
    }
    
    async get_metrics (): Promise<Metric[]> {
        return (await model.ddb.invoke('autoInspection::getMetrics', [ ])).data
    }
    
}

export let inspection = new InspectionModel()
