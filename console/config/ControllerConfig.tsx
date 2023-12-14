import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { EditableProTable, type ProColumns } from '@ant-design/pro-components'
import { Button, Input, Table, type TableColumnType } from 'antd'
import { useEffect, useMemo, useState } from 'react'

import { t } from '../../i18n/index.js'
import { model } from '../model.js'
import { config } from './model.js'

type DataSourceType = {
    id: string
    name: string
    value: string
}

export function ControllerConfig () {
    // const [configs, set_configs] = useState<string[]>(['lanCluster=0', 'maxPubConnections=64', 'logLevel=DEBUG', 'maxPartitionNumPerQuery=100000000', 'chunkCacheEngineMemSize=4', 'maxMemSize=24', 'newValuePartitionPolicy=add', 'workerNum=4', 'localExecutors=3', 'memoryReleaseRate=10', 'remoteExecutors=5', 'updateCidVersionsKeepTime=60', 'streamingHAMode=raft', 'streamingRaftGroups=11:P1_node1:P2_node1:P3_node1,12:P1_node2:P2_node2:P3_node2', 'streamingHAPreVote=false', 'persistenceDir=/home/yzou/Desktop/DolphinDB/server200_HA/persistence/<ALIAS>', 'P1_node1.subPort=20101', 'P1_node2.subPort=20102', 'P1_node3.subPort=20103', 'P2_node1.subPort=20201', 'P2_node2.subPort=20202', 'P3_node1.subPort=20301', 'P3_node2.subPort=20302', 'P1_node4.subPort=20105', 'TSDBCacheEngineSize=6', 'OLAPCacheEngineSize=6', 'dataSync=1', 'enableChunkGranularityConfig=true', 'regularArrayMemoryLimit=512', 'maxLogSize=2048', 'enableCoreDump=1', 'dfsMetaDir=/home/yzou/Desktop/DolphinDB/server200_HA', 'dfsRebalanceConcurrency=5', 'dfsChunkNodeHeartBeatTimeout=1', 'clusterReplicationSlaveNum=2', 'strictPermissionMode=false', 'moduleDir=/home/yzou/Desktop/DolphinDB/server200_HA/modules', 'preloadModules=example::tt', 'clusterReplicationExecutionUsername=admin', 'clusterReplicationExecutionUsername=admin', 'P9_node8.maxLogSize=1024'])
    const configs = ['lanCluster=0', 'maxPubConnections=64', 'logLevel=DEBUG', 'maxPartitionNumPerQuery=100000000', 'chunkCacheEngineMemSize=4', 'maxMemSize=24', 'newValuePartitionPolicy=add', 'workerNum=4', 'localExecutors=3', 'memoryReleaseRate=10', 'remoteExecutors=5', 'updateCidVersionsKeepTime=60', 'streamingHAMode=raft', 'streamingRaftGroups=11:P1_node1:P2_node1:P3_node1,12:P1_node2:P2_node2:P3_node2', 'streamingHAPreVote=false', 'persistenceDir=/home/yzou/Desktop/DolphinDB/server200_HA/persistence/<ALIAS>', 'P1_node1.subPort=20101', 'P1_node2.subPort=20102', 'P1_node3.subPort=20103', 'P2_node1.subPort=20201', 'P2_node2.subPort=20202', 'P3_node1.subPort=20301', 'P3_node2.subPort=20302', 'P1_node4.subPort=20105', 'TSDBCacheEngineSize=6', 'OLAPCacheEngineSize=6', 'dataSync=1', 'enableChunkGranularityConfig=true', 'regularArrayMemoryLimit=512', 'maxLogSize=2048', 'enableCoreDump=1', 'dfsMetaDir=/home/yzou/Desktop/DolphinDB/server200_HA', 'dfsRebalanceConcurrency=5', 'dfsChunkNodeHeartBeatTimeout=1', 'clusterReplicationSlaveNum=2', 'strictPermissionMode=false', 'moduleDir=/home/yzou/Desktop/DolphinDB/server200_HA/modules', 'preloadModules=example::tt', 'clusterReplicationExecutionUsername=admin', 'clusterReplicationExecutionUsername=admin', 'P9_node8.maxLogSize=1024']
    // useEffect(() => {
    //     model.execute(async () => {
    //         const { value } = await config.load_controller_configs()
    //         set_configs(value as [])
    //     })
    // }, [ ])
    
    // console.log('configs', configs)
    const cols: ProColumns<DataSourceType>[] = useMemo(() => ([
        {
            title: t('Name'),
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: t('Value'),
            dataIndex: 'value',
            key: 'value',
        },
        {
            title: t('Actions'),
            dataIndex: 'actions',
            key: 'actions',
            width: 200
        },
    ]), [ ])
    return <EditableProTable 
                columns={cols}
                value={configs.map(cfg => {
                    const [name, value] = cfg.split('=')
                    return {
                        id: cfg,
                        name,
                        value
                    }
                })}
            />
                
}
