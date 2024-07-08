export interface IDatabaseInfo {
    isExist: 0 | 1
    name: string
    // 日新增数据量
    dailyTotalNum?: {
      // 自定义和分阶段，两者二选一
      custom?: number
      gap?: number
    }
    engine?: 'OLAP' | 'TSDB'
}

export interface ITableInfo {
    name: string
    schema: Array<{
       colName: string
       dataType: string
    }>
    // 时间列
    timeCol?: string
    // 标的列
    hashCol?: string
    partitionCols?: string[]
    filterCols: Array<{
       colName: string
       // 唯一值数量
       uniqueNum: number
    }>
 }

 
export interface IFinanceInfo { 
    database?: IDatabaseInfo
    table?: ITableInfo
    code?: string
}
