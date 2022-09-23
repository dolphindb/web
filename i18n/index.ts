import { I18N } from 'xshell/i18n/index.js'

import _dict from './dict.json'

export const __dict = {
    startTime:'开始时间',
    endTime: '结束时间',
    errorMsg: '错误信息',
    jobId:'作业id',
    rootJobId: '根作业id',
    jobDesc: '作业描述',
    desc: '描述',
    jobType: '作业类型',
    priority: '优先级',
    parallelism: '并行化',
    node: '节点',
    userId: '用户Id',
    userID: '用户Id',   
    receiveTime: '收到时间',
    receivedTime: '收到时间',
    
    sessionId: '会话id',
    remoteIP: '远程ip',
    
    remotePort: '远程端口',
    
    totalTasks: '总任务',
    
    finishedTasks: '已完成任务',
    
    runningTask: '正在运行的任务',
    
    // --- computed (getRecentJobs),
    status: '状态',
    theme: '主题',
    
    // --- computed (getConsoleJobs),
    progress: '进度',
    
    startDate: '开始日期',
    endDate: '结束日期',
    frequency:'频率',
    scheduleTime:'计划时间',
    days:'天数',
    actions:'操作',
    firstTaskStartTime:'首个任务开始时间',
    latestTaskStartTime:'最后任务开始时间',
    queue:'队列'
}

export const new_dict = {..._dict, ...(()=>{
    let result = {}
    for(const key in __dict){
        result[__dict[key]] = {
            "en": key
        }
    }
    return result
})()}


const i18n = new I18N(new_dict)

const { t, Trans, language } = i18n

export { i18n, t, Trans, language }
