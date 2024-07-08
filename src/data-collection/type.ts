export interface Connection {
    // 连接 id
    id: string
    // 连接名称
    name: string
    // 协议
    protocol: Protocol
    // 服务器地址
    host: string
    // 端口
    port: number
    // 用户名
    username: string
    // 密码
    password: string
}


export interface ServerSubscribe {
    // 订阅 id
    id: string
    // 主题
    topic: string
    // 名称
    name: string
    // 点位解析模板 id
    handlerId: string
    // mqtt 有 是一个整数，省略时默认是 20480，用于指定接收缓冲区大小。
    recvbufSize?: number
    // 状态 0 未连接 1 连接
    status: 0 | 1
    templateParams: string
    // kafka 参数
    partition?: number
    offset?: number            
    consumerCfg?: string
}


export interface KeyValueItem {
    key: string
    value: string
}
export interface ISubscribe extends Omit<ServerSubscribe, 'templateParams' | 'consumerCfg'> {
    templateParams: Array<KeyValueItem>
    consumerCfg: Array<KeyValueItem>
}

export interface  ConnectionDetail {
    connectInfo: Connection
    subscribes: ISubscribe[]
    total: number
}
export interface ServerParserTemplate {
    handler: string
    id: string
    name: string
    comment?: string
    createTime: string
    updateTime?: string
    protocol: string
    templateParams: string
}

export interface IParserTemplate extends Omit<ServerParserTemplate, 'templateParams'> {
    templateParams: Array<KeyValueItem>
}


export interface ListData<T> {
    items: T[]
    total: number
}


export enum Protocol {
    KAFKA = 'kafka',
    MQTT = 'mqtt'
}
