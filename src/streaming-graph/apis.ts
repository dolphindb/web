import { model } from '@/model.ts'

import { parseStreamGraphInfo, parseStreamGraphMeta } from './utils.ts'

import { type StreamGraphMeta, type StreamGraphInfo } from './types.ts'

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
