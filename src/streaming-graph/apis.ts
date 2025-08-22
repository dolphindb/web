import { DdbFunction, DdbFunctionType } from 'dolphindb/browser'

import { model } from '@model'

import type { StreamGraphMeta, CheckpointJobInfo, CheckpointSubjobInfo } from './model.ts'

export async function get_stream_graph_meta_list (): Promise<StreamGraphMeta[]> {
    return (await model.ddb.invoke('getStreamGraphMeta'))
        .map(item => parse_stream_graph_meta(item))
}

export async function get_stream_graph_meta (name: string): Promise<StreamGraphMeta> {
    return parse_stream_graph_meta(
        (await model.ddb.invoke('getStreamGraphMeta', [name]))
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


export async function get_stream_engine_stat (name: string): Promise<{ columns: string[], data: any[] }> {
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


function parse_stream_graph_meta (rawData: any): StreamGraphMeta {
    return {
        ...rawData,
        checkpointConfig: JSON.parse(rawData.checkpointConfig),
        tasks: JSON.parse(rawData.tasks)
    }
}

