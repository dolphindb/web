import type { StreamGraphInfo, StreamGraphMeta } from './types.ts'

export function parse_stream_graph_meta (rawData: any): StreamGraphMeta {
    return {
        ...rawData,
        checkpointConfig: JSON.parse(rawData.checkpointConfig),
        tasks: JSON.parse(rawData.tasks)
    }
}
