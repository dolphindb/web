import { Model } from 'react-object-model'

import { type DdbObj } from 'dolphindb/browser.js'

import { model } from '@model'
import { urgent } from '@utils'
import { t } from '@i18n'

import script from './index.dos'


class ComputingModel extends Model<ComputingModel> {
    inited = false
    
    persistence_dir = ''
    
    streaming_stat: Record<string, DdbObj>
    
    engine_stat: Record<string, DdbObj>
    
    persistent_table_stat: DdbObj
    
    shared_table_stat: DdbObj
    
    
    async init () {
        let { ddb } = model
        
        await ddb.execute(script, urgent)
        
        this.set({
            inited: true,
            persistence_dir: await ddb.invoke<string>('getConfig', ['persistenceDir'], urgent)
        })
    }
    
    
    /** 处理流计算引擎状态，给每一个引擎添加 engineType 字段，合并所有类型的引擎 */
    async get_streaming_stat (orca = false) {
        this.set({
            streaming_stat: (
                await model.ddb.call('get_streaming_stat', [orca], urgent)
            ).to_dict()
        })
    }
    
    
    async get_engine_stat (orca = false) {
        this.set({
            engine_stat: (
                await model.ddb.call('get_engine_stat', [orca], urgent)
            ).to_dict()
        })
    }
    
    
    async get_streaming_table_stat () {
        let { ddb } = model
        
        this.set({
            ... this.persistence_dir ? {
                persistent_table_stat: await ddb.call('get_persistence_stat', undefined, urgent)
            } : { },
            
            shared_table_stat: await ddb.call('get_shared_table_stat', undefined, urgent)
        })
    }
}

export let computing = new ComputingModel()


export const leading_cols = {
    subWorkers: {
        workerId: t('线程 ID'),
        topic: t('订阅主题'),
        queueDepth: t('队列深度'),
        queueDepthLimit: t('队列深度上限'),
        lastErrMsg: t('最近处理失败的错误信息'),
        lastFailedTimestamp: t('最近处理失败的时刻'),
        failedMsgCount: t('失败消息总数'),
        processedMsgCount: t('已处理消息数'),
        lastMsgId: t('最近处理消息 ID'),
        lastFailedMsgId: t('最近处理失败的消息 ID')
    },
    pubConns: {
        client: t('订阅节点'),
        queueDepthLimit: t('发布队列深度上限'),
        queueDepth: t('发布队列深度'),
        tables: t('表名')
    },
    persistenceMeta: {
        tablename: t('表名'),
        loaded: t('加载到内存'),
        columns: t('列数'),
        memoryUsed: t('内存大小'),
        totalSize: t('总行数'),
        sizeInMemory: t('内存中行数'),
        memoryOffset: t('内存中偏移量'),
        sizeOnDisk: t('磁盘中行数'),
        diskOffset: t('磁盘中偏移量'),
        asynWrite: t('是否异步持久化'),
        retentionMinutes: t('保留时间（分钟）'),
        compress: t('是否压缩'),
        persistenceDir: t('持久化路径'),
        hashValue: t('持久化线程'),
        raftGroup: t('Raft 组'),
        lastLogSeqNum: t('Raft 日志序号')
    },
    persistWorkers: {
        workerId: t('线程 ID'),
        queueDepthLimit: t('持久化消息队列深度上限'),
        queueDepth: t('持久化消息队列深度'),
        tables: t('持久化表名')
    },
    sharedStreamingTableStat: {
        TableName: t('表名'),
        rows: t('行数'),
        columns: t('列数'),
        Columns: t('列数'),
        memoryUsed: t('内存大小'),
        MemoryUsed: t('内存大小')
    },
    engine: {
        name: t('引擎名'),
        engineType: t('引擎类型'),
        lastErrMsg: t('最近错误信息'),
        memoryUsed: t('内存'),
        numGroups: t('分组数'),
        numRows: t('行数（单表）'),
        leftTableNumRows: t('行数（左表）'),
        rightTableNumRows: t('行数（右表）'),
        garbageSize: t('内存清理阈值'),
        numMetrics: t('指标数量'),
        metrics: t('指标源码'),
        user: t('用户'),
        status: t('状态')
    }
}

const snapshots = {
    snapshotDir: t('快照目录'),
    snapshotInterval: t('快照间隔'),
    snapshotMsgId: t('快照 ID'),
    snapshotTimestamp: t('快照时间戳')
}


export const expanded_cols = {
    subWorkers: {
        batchSize: t('批次大小'),
        throttle: t('等待间隔'),
        filter: t('过滤列'),
        msgAsTable: t('消息是否为表'),
        hash: t('订阅 hash 值'),
        persistOffset: t('开启订阅偏移持久化'),
        timeTrigger: t('强制按时间间隔触发'),
        handlerNeedMsgId: t('包含消息 ID'),
        raftGroup: t('高可用组')
    },
    engine: {
        TimeSeriesEngine: {
            windowTime: t('窗口长度'),
            step: t('步长'),
            useSystemTime: t('是否使用系统时间'),
            ...snapshots
        },
        CrossSectionalEngine: {
            triggeringPattern: t('触发方式'),
            triggeringInterval: t('触发间隔')
        },
        AnomalyDetectionEngine: snapshots,
        ReactiveStreamEngine: snapshots,
        SessionWindowEngine: {
            sessionGap: t('时间间隔'),
            useSystemTime: t('是否使用系统时间'),
            ...snapshots
        },
        DailyTimeSeriesEngine: {
            windowTime: t('窗口长度'),
            step: t('步长'),
            useSystemTime: t('是否使用系统时间'),
            ...snapshots
        },
        AsofJoinEngine: {
            useSystemTime: t('是否使用系统时间'),
            delayedTime: t('等待时间间隔')
        },
        DualOwnershipReactiveStreamEngine: snapshots,
        StreamFilter: {
            filters: t('过滤条件')
        }
    }
}

export const engine_table_column_names = {
    lastCheckpointId: t('最后检查点 ID'),
    messageWaitToProcess: t('待处理消息'),
    numRowsCounter: t('行计数'),
    ... Object.fromEntries(
        [
            Object.values(leading_cols)
                .map(obj => Object.entries(obj)),
            Object.values(expanded_cols.engine)
                .map(obj => Object.entries(obj))
        ].flat(2))
}

