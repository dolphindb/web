import { Model } from 'react-object-model'

import {  model } from '@/model.ts'

import type { Metric, Plan, PlanDetail, PlanReport, PlanReportDetail } from './type.ts'

class InspectionModel extends Model<InspectionModel> {
    inited = false
    
    metrics: Map<string, Metric> = new Map()
    
    async init () {
        await model.ddb.execute(
            'clearCachedModules()\n' +
            'use autoInspection'
        )
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
    
    async create_plan (plan: Plan) {
        await model.ddb.invoke('autoInspection::createPlan', Object.values(plan))
    }
    
    async update_plan (plan: Plan) {
        await model.ddb.invoke('autoInspection::updatePlan', Object.values(plan))
    }
    
    async get_plan_detail (planId: string): Promise<PlanDetail[]> {
        return (await model.ddb.invoke('autoInspection::getPlanDetails', [planId])).data
    }
    
    async get_reports (): Promise<PlanReport[]> {
        return (await model.ddb.invoke('autoInspection::getReports', [ ])).data
    }
    
    async get_report_detail (reportId: string): Promise<PlanReportDetail[]> {
        return (await model.ddb.invoke('autoInspection::getReportDetails', [reportId])).data
    }
    
    async get_metrics (): Promise<Metric[]> {
        return (await model.ddb.invoke('autoInspection::getMetrics', [ ])).data
    }
    
}

export let inspection = new InspectionModel()
