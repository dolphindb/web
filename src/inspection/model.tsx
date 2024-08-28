import { Model } from 'react-object-model'

import {  model } from '@/model.ts'

class InspectionModel extends Model<InspectionModel> {
    inited = false
    
    async init () {
        await model.ddb.execute(
            'clearCachedModules()\n' +
            'use autoInspection'
        )
        this.set({ inited: true })
    }
    
    
    async get_plans () {
        return (await model.ddb.invoke('autoInspection::getPlans', [ ])).data
    }
    
    async get_reports () {
        return (await model.ddb.invoke('autoInspection::getReports', [ ])).data
    }
    
    async get_metrics () {
        return (await model.ddb.invoke('autoInspection::getMetrics', [ ])).data
    }
    
}

export let inspection = new InspectionModel()
