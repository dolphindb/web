export interface Connection {
    // 连接 id
    id: string
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
    // 数据包大小
    batchSize: number
    // 发送缓冲区大小
    sendbufSize: number
}


export interface Subscribe {
    // 订阅 id
    id: string
    // 主题
    topic: string
    // 名称
    name: string
    // 用于对订阅的消息按 CSV 或 JSON 格式进行解析，目前支持的函数由 createJsonParser 或 createCsvParser 创建。
    parser: 'csv' | 'json'
    // 点位解析模板 id
    handler: string
    // 是一个整数，省略时默认是 20480，用于指定接收缓冲区大小。
    recvbufSize: number
    // 状态 0 未连接 1 连接
    status: 0 | 1
}
