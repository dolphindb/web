import { Model } from 'react-object-model'

import {  model } from '@/model.ts'

import type { Metric, Plan } from './type.ts'

class InspectionModel extends Model<InspectionModel> {
    inited = false
    
    async init () {
        await model.ddb.execute(
            'clearCachedModules()\n' +
            'use autoInspection'
        )
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
    
    async get_reports () {
        return (await model.ddb.invoke('autoInspection::getReports', [ ])).data
    }
    
    async get_metrics (): Promise<Metric[]> {
        return (await model.ddb.invoke('autoInspection::getMetrics', [ ])).data
    }
    
}

export let inspection = new InspectionModel()
