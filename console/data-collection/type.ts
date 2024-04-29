export interface Connection {
    // 连接 id
    id: number
    // 连接名称
    name: string
    // 协议
    protocol: string
    // 服务器地址
    host: string
    // 端口
    port: number
    // 用户名
    username: string
    // 密码
    password: string
}


export interface Subscribe {
    // 订阅 id
    id: number
    // 主题
    topic: string
    // 名称
    name: string
    // 点位解析模板 id
    handlerId: string
    // 是一个整数，省略时默认是 20480，用于指定接收缓冲区大小。
    recvbufSize: number
    // 状态 0 未连接 1 连接
    status: 0 | 1
    templateParams: string
}


export interface ParserTemplate {
    handler: string
    id: number
    name: string
    comment?: string
    createTime: string
    updateTime?: string
    protocol: string
}


export interface ListData<T> {
    items: T[]
    number: number
}
