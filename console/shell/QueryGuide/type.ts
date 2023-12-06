export enum QueryGuideType { 
    QUERY_GUIDE,
    SQL
}


export interface IColumn { 
    name: string
    data_type: string
}


export type Query = Array<{
    // 列
    col: string
    // 数据类型
    dataType?: string
    // 运算符
    opt: number
    // 对比值，时间用string
    value: number | string
}>

export interface IQueryInfos { 
    // 库名
    dbName: string
    // 表名
    tbName: string
    // 查询列
    queryCols: Array<string>
    // 分区列查询条件
    partitionColQuerys: Query
    // 查询条件块
    querys: Array<Query>
}
