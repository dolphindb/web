import { DdbFunction, DdbFunctionType } from 'dolphindb/browser'

import { model } from '@model'

import { parse_stream_graph_info, parse_stream_graph_meta } from './utils.ts'

import type { StreamGraphMeta, StreamGraphInfo, CheckpointJobInfo, CheckpointSubjobInfo, TaskSubWorkerStat } from './types.ts'

export async function get_stream_graph_meta_list (): Promise<StreamGraphMeta[]> {
    return (await model.ddb.invoke('getStreamGraphMeta'))
        .map(item => parse_stream_graph_meta(item))
}

export async function get_stream_graph_meta (name: string): Promise<StreamGraphMeta> {
    return parse_stream_graph_meta(
        (await model.ddb.invoke('getStreamGraphMeta', [name]))
            [0])
}

export async function get_stream_graph_info (name: string): Promise<StreamGraphInfo> {
    return parse_stream_graph_info(
        (await model.ddb.invoke('getStreamGraphInfo', [name]))
            [0])
}


export async function get_checkpoint_config (name: string): Promise<any> {
    return model.ddb.invoke('getOrcaCheckpointConfig', [name])
}

export async function get_checkpoint_job_info (name: string): Promise<CheckpointJobInfo[]> {
    return model.ddb.invoke('getOrcaCheckpointJobInfo', [name])
}

export async function get_checkpoint_subjob_info (name: string): Promise<CheckpointSubjobInfo[]> {
    return model.ddb.invoke('getOrcaCheckpointSubjobInfo', [name])
}

export async function def_get_task_sub_worker_stat (): Promise<void> {
    await model.ddb.execute(
        'def getTaskSubWorkerStat (name) {\n' +
        '    getStat = def (): getStreamingStat().subWorkers\n' +
        '    stat = pnodeRun(getStat, getDataNodes())\n' +
        '    sub = getOrcaStreamTaskSubscriptionMeta(name)\n' +
        '    return select * from sub, stat where strFind(stat.topic, sub.tableName + "/" + sub.actionName) != -1 order by taskId\n' +
        '}\n'
    )
}

export async function get_task_sub_worker_stat (name: string): Promise<TaskSubWorkerStat[]> {
    return model.ddb.invoke('getTaskSubWorkerStat', [name])
}

export async function get_steam_engine_stat (name: string): Promise<{ columns: string[], data: any[] }> {
    return model.ddb.invoke(
        'useOrcaStreamEngine',
        [
            name,
            new DdbFunction('getStreamEngineStateTable', DdbFunctionType.SystemFunc)
        ],
        { table: 'full' })
}


export async function drop_stream_graph (name: string): Promise<any[]> {
    return model.ddb.invoke('dropStreamGraph', [name])
}
