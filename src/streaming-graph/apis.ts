import exp from 'constants'

import { model } from '@/model.ts'

import { parseStreamGraphInfo, parseStreamGraphMeta } from './utils.ts'

import { type StreamGraphMeta, type StreamGraphInfo, type CheckpointJobInfo, type CheckpointSubjobInfo, type TaskSubWorkerStat } from './types.ts'

export async function getStreamGraphMetaList (): Promise<StreamGraphMeta[]> {
    let res = await model.ddb.invoke('getStreamGraphMeta', [ ])
    res = res.data.map(item => parseStreamGraphMeta(item))
    return res
}

export async function getStreamGraphMeta (name: string): Promise<StreamGraphMeta> {
    let res = await model.ddb.invoke('getStreamGraphMeta', [ name ])
    return parseStreamGraphMeta(res.data[0])
}

export async function getStreamGraphInfo (name: string): Promise<StreamGraphInfo> {
    let res = await model.ddb.invoke('getStreamGraphInfo', [ name ])
    return parseStreamGraphInfo(res.data[0])
}


export async function getCheckpointConfig (name: string): Promise<object> {
    return model.ddb.invoke('getCheckpointConfig', [ name ])
}

export async function getCheckpointJobInfo (name: string): Promise<CheckpointJobInfo[]> {
    const res = await model.ddb.invoke('getCheckpointJobInfo', [ name ])
    return res.data
}

export async function getCheckpointSubjobInfo (name: string): Promise<CheckpointSubjobInfo[]> {
    const res = await model.ddb.invoke('getCheckpointSubjobInfo', [ name ])
    return res.data
}

export async function defGetTaskSubWorkerStat (): Promise<void> {
    return model.ddb.execute(`def getTaskSubWorkerStat(name) {
        getStat = def (): getStreamingStat().subWorkers
        stat = getStat()
        sub = getStreamTaskSubscriptionMeta(name)
        return select * from sub, stat where strFind(stat.topic, sub.tableName + "/" + sub.actionName) != -1
    }`)
}

export async function getTaskSubWorkerStat (name: string): Promise<TaskSubWorkerStat[]> {
    await model.ddb.execute('use catalog demo')
    return (await model.ddb.invoke('getTaskSubWorkerStat', [ name ])).data
}
