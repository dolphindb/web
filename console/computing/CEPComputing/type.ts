import type { DdbForm, DdbType } from 'dolphindb/browser.js'

export interface CEPEngineItem { 
    /** 引擎名称 */
    name: string
    /** 创建引擎的用户名 */
    user: string
    /** 引擎状态 */
    status: string
    /** 最新一条错误信息 */
    lastErrorMessage: string
    /** 是否使用系统时间 */
    useSystemTime: boolean
    /** 当前子引擎数量（可视为线程数） */
    numOfSubEngine: number
    /** 队列深度 */
    queueDepth: number
    /** 目前从外收到的event数量 */
    eventsReceived: number
    /** 目前向外发送的event数量 */
    eventsEmitted: number
    /** 目前在向外发送的event队列中的event数量 */
    eventsOnOutputQueue: number
}


export interface DataViewEngineItem { 
    /** 名称 */
    name: string
    /** 创建的用户 */
    user: string
    /** 状态 */
    status: string
    /** 最新一条错误信息 */
    lastErrMsg: string
    /** 字符串 keyColumns 名称，如有多个，以空格隔开 */
    keyColumns: string
    /** 输出表名称 */
    outputTableName: string
    /** 是否使用系统时间 */
    useSystemTime: boolean
    /** duration格式字符串，向outputTable输出间隔时间，未指定则为空 */
    throttle: number
    /** 目前表中的items数量，即表的行数 */
    numItems: number
    /** 目前内存使用量 */
    memoryUsed: number
}


export interface SubEngineItem { 
    /** 子引擎名称 */
    subEngineName: string
    /** 当前输入队列中待处理的 event 数量 */
    eventsOnInputQueue: number
    /** 当前事件监听数量 */
    listeners: number
    /** 当前计时器监听数量 */
    timers: number
    /** 内部 Routed 过的 event 数量 */
    eventsRouted: number
    /** 内部 sent 过的 event 数量 */
    eventsSent: number
    /** 从外部收到过的 event 数量 */
    eventsReceived: number
    /** 已经处理的 event 数量 */
    eventsConsumed: number
    /** 最新收到的一条 event 时间 */
    lastEventTime: string
    /** 最新一条错误信息 */
    lastErrMsg: string
}

export interface ServerEventItem { 
    /** 事件类型 */
    eventType: string
    /** 事件所需的字段名，多个字段用逗号分隔 */
    eventField: string
    /** 事件所需字段名对应的类型，多个用逗号分隔 */
    fieldType: string
    /** 事件所包含的字段对应的数据类型 ID */
    fieldTypeId: DdbType[]
    /** 事件所包含的字段对应的数据形式ID ID */
    fieldFormId: DdbForm[]
}
interface EventItem {
    /** 事件类型 */
    eventType: string
    /** 事件所需的字段名 */
    eventField: string[]
    /** 事件所需字段名对应的类型 */
    eventValuesTypeStringList: string[]
    /** 事件所包含的字段对应的数据类型 ID */
    eventValuesTypeIntList: DdbType[]
}

export interface ICEPEngineDetail { 
    /** 引擎信息 */
    engineStat: CEPEngineItem
    /** 数据视图信息 */
    dataViewEngines: DataViewEngineItem[]
    /** 事件信息 */
    eventSchema: EventItem[]
    /** 子引擎信息 */
    subEngineStat: SubEngineItem[]
}

export interface IServerEngineDetail { 
    /** 引擎信息 */
    engineStat: CEPEngineItem
    /** 数据视图信息 */
    dataViewEngines: DataViewEngineItem[]
    /** 事件信息 */
    eventSchema: ServerEventItem[]
    /** 子引擎信息 */
    subEngineStat: SubEngineItem[]
}

export enum EngineDetailPage { 
    INFO,
    DATAVIEW
}
