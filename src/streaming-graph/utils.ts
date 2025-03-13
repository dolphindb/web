import type { StreamGraphInfo, StreamGraphMeta } from './types.ts'

export function parseStreamGraphMeta (rawData: any): StreamGraphMeta {
    return {
      ...rawData,
      checkpointConfig: JSON.parse(rawData.checkpointConfig),
      tasks: JSON.parse(rawData.tasks)
    }
  }
  
export function parseStreamGraphInfo (rawData: any): StreamGraphInfo {
    return {
      ...rawData,
      graph: JSON.parse(rawData.graph)
    }
  }
