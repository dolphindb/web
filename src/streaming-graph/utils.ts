import type { StreamGraphInfo, StreamGraphMeta } from './types.ts'

export function parse_stream_graph_meta (rawData: any): StreamGraphMeta {
    return {
        ...rawData,
        checkpointConfig: JSON.parse(rawData.checkpointConfig),
        tasks: JSON.parse(rawData.tasks)
    }
}

export function parse_stream_graph_info (rawData: any): StreamGraphInfo {
    return {
        ...rawData,
        graph: JSON.parse(rawData.graph),
        meta: JSON.parse(rawData.meta)
    }
}
