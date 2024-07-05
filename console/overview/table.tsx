import { Table, type TableColumnsType } from 'antd'

import { CheckCircleOutlined, MinusCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'

import { NodeType, model, type DdbNode } from '../model.js'

const node_state_icons = [
    <MinusCircleOutlined style={{ color: 'red' }}/>, 
    <CheckCircleOutlined style={{ color: 'green' }}/>, 
    <PauseCircleOutlined style={{ color: 'yellow' }}/>
]

const node_mode_lables = [
  'Datanode',
  'Agent',
  'Controller',
  'Singlenode',
  'Computenode'
]

const columns: TableColumnsType<DdbNode> = [
  {
    title: 'Mode',
    dataIndex: 'mode',
    render: (mode: number) => node_mode_lables[Number(mode)]
  },
  {
    title: 'Name',
    dataIndex: 'name',
  },
  {
    title: 'IsLeader',
    dataIndex: 'isLeader',
    render: (isLeader: boolean) => isLeader !== null && isLeader.toString()
  },
  {
    title: 'State',
    dataIndex: 'state',
    render: state => node_state_icons[Number(state)]
  },
  {
    title: 'Conns',
    dataIndex: 'connectionNum',
    sorter: (a, b) => Number(a.connectionNum - b.connectionNum)
  },
  {
    title: 'MemoryUsed',
    dataIndex: 'memoryUsed',
    render: (memoryUsed: bigint) => Number(memoryUsed).to_fsize_str(),
    sorter: (a, b) => Number(a.memoryUsed - b.memoryUsed)
  },
  {
    title: 'MemoryAlloc',
    dataIndex: 'memoryAlloc',
    render: (memoryAlloc: bigint) => Number(memoryAlloc).to_fsize_str(),
    sorter: (a, b) => Number(a.memoryAlloc - b.memoryAlloc)
  },
  {
    title: 'CpuUsage',
    dataIndex: 'cpuUsage',
    render: (cpuUsage: number) => cpuUsage.toFixed(2) + '%',
    sorter: (a, b) => a.cpuUsage - b.cpuUsage
  },
  {
    title: 'AvgLoad',
    dataIndex: 'avgLoad',
    sorter: (a, b) => a.avgLoad - b.avgLoad
  },
  {
    title: 'MedQT10',
    dataIndex: 'medLast10QueryTime',
    render: (medLast10QueryTime: bigint) => medLast10QueryTime + 'ms',
    sorter: (a, b) => Number(a.medLast10QueryTime - b.medLast10QueryTime)
  },
  {
    title: 'MaxQT10',
    dataIndex: 'maxLast10QueryTime',
    render: (maxLast10QueryTime: bigint) => maxLast10QueryTime + 'ms',
    sorter: (a, b) => Number(a.maxLast10QueryTime - b.maxLast10QueryTime)
  },
  {
    title: 'MedQT100',
    dataIndex: 'medLast100QueryTime',
    render: (medLast100QueryTime: bigint) => medLast100QueryTime + 'ms',
    sorter: (a, b) => Number(a.medLast100QueryTime - b.medLast100QueryTime)
  },
  {
    title: 'MaxQT100',
    dataIndex: 'maxLast100QueryTime',
    render: (maxLast100QueryTime: bigint) => maxLast100QueryTime + 'ms',
    sorter: (a, b) => Number(a.maxLast100QueryTime - b.maxLast100QueryTime)
  },
  {
    title: 'MaxRunningQT',
    dataIndex: 'maxRunningQueryTime',
    render: (maxRunningQueryTime: bigint) => maxRunningQueryTime + 'ms',
    sorter: (a, b) => Number(a.maxRunningQueryTime - b.maxRunningQueryTime)
  },
  {
    title: 'RunningJobs',
    dataIndex: 'runningJobs',
    sorter: (a, b) => a.runningJobs - b.runningJobs
  },
  {
    title: 'QueuedJobs',
    dataIndex: 'queuedJobs',
    sorter: (a, b) => a.queuedJobs - b.queuedJobs
  },
  {
    title: 'RunningTasks',
    dataIndex: 'runningTasks',
    sorter: (a, b) => a.runningTasks - b.runningTasks
  },
  {
    title: 'QueuedTasks',
    dataIndex: 'queuedTasks',
    sorter: (a, b) => a.queuedTasks - b.queuedTasks
  },
  {
    title: 'JobLoad',
    dataIndex: 'jobLoad',
    sorter: (a, b) => a.jobLoad - b.jobLoad
  },
  {
    title: 'DiskCapacity',
    dataIndex: 'diskCapacity',
    render: (diskCapacity: bigint) => Number(diskCapacity).to_fsize_str(),
    sorter: (a, b) => Number(a.diskCapacity - b.diskCapacity)
  },
  {
    title: 'DiskFreeSpace',
    dataIndex: 'diskFreeSpace',
    render: (diskFreeSpace: bigint) => Number(diskFreeSpace).to_fsize_str(),
    sorter: (a, b) => Number(a.diskFreeSpace - b.diskFreeSpace)
  },
  {
    title: 'DiskFreeSpaceRatio',
    dataIndex: 'diskFreeSpaceRatio',
    render: (diskFreeSpaceRatio: number) => (diskFreeSpaceRatio * 100).toFixed(2) + '%',
    sorter: (a, b) => a.diskFreeSpaceRatio - b.diskFreeSpaceRatio
  },
  {
    title: 'DiskWriteRate',
    dataIndex: 'diskWriteRate',
    render: (diskWriteRate: bigint) => Number(diskWriteRate).to_fsize_str() + '/s',
    sorter: (a, b) => Number(a.diskWriteRate - b.diskWriteRate)
  },
  {
    title: 'DiskReadRate',
    dataIndex: 'diskReadRate',
    render: (diskReadRate: bigint) => Number(diskReadRate).to_fsize_str() + '/s',
    sorter: (a, b) => Number(a.diskReadRate - b.diskReadRate)
  },
  {
    title: 'LastMinuteWriteVolume',
    dataIndex: 'lastMinuteWriteVolume',
    render: (lastMinuteWriteVolume: bigint) => Number(lastMinuteWriteVolume).to_fsize_str(),
    sorter: (a, b) => Number(a.lastMinuteWriteVolume - b.lastMinuteWriteVolume)
  },
  {
    title: 'LastMinuteReadVolume',
    dataIndex: 'lastMinuteReadVolume',
    render: (lastMinuteReadVolume: bigint) => Number(lastMinuteReadVolume).to_fsize_str(),
    sorter: (a, b) => Number(a.lastMinuteReadVolume - b.lastMinuteReadVolume)
  },
  {
    title: 'WorkerNum',
    dataIndex: 'workerNum',
    sorter: (a, b) => a.workerNum - b.workerNum
  },
  // 貌似废弃了
  // {
  //   title: 'ExecutorNum',
  //   dataIndex: 'executorNum',
  //   sorter: (a, b) => Number(a.executorNum - b.executorNum)
  // },
  {
    title: 'MaxConnections',
    dataIndex: 'maxConnections',
    sorter: (a, b) => a.maxConnections - b.maxConnections
  },
  {
    title: 'MaxMemSize',
    dataIndex: 'maxMemSize',
    render: (maxMemSize: bigint) => Number(maxMemSize).to_fsize_str(),
    sorter: (a, b) => Number(a.maxMemSize - b.maxMemSize)
  },
  {
    title: 'NetworkSendRate',
    dataIndex: 'networkSendRate',
    render: (networkSendRate: bigint) => Number(networkSendRate).to_fsize_str() + '/s',
    sorter: (a, b) => Number(a.networkSendRate - b.networkSendRate)
  },
  {
    title: 'NetworkRecvRate',
    dataIndex: 'networkRecvRate',
    render: (networkRecvRate: bigint) => Number(networkRecvRate).to_fsize_str() + '/s',
    sorter: (a, b) => Number(a.networkRecvRate - b.networkRecvRate)
  },
  {
    title: 'LastMinuteNetworkSend',
    dataIndex: 'lastMinuteNetworkSend',
    render: (lastMinuteNetworkSend: bigint) => Number(lastMinuteNetworkSend).to_fsize_str(),
    sorter: (a, b) => Number(a.lastMinuteNetworkSend - b.lastMinuteNetworkSend)
  },
  {
    title: 'LastMinuteNetworkRecv',
    dataIndex: 'lastMinuteNetworkRecv',
    render: (lastMinuteNetworkRecv: bigint) => Number(lastMinuteNetworkRecv).to_fsize_str(),
    sorter: (a, b) => Number(a.lastMinuteNetworkRecv - b.lastMinuteNetworkRecv)
  },
  {
    title: 'LastMsgLatency',
    dataIndex: 'lastMsgLatency',
    render: (lastMsgLatency: bigint) => Number(lastMsgLatency).toFixed(2) + 'ms',
    sorter: (a, b) => Number(a.lastMsgLatency - b.lastMsgLatency)
  },
  {
    title: 'CumMsgLatency',
    dataIndex: 'cumMsgLatency',
    render: (cumMsgLatency: bigint) => Number(cumMsgLatency).toFixed(2) + 'ms',
    sorter: (a, b) => Number(a.cumMsgLatency - b.cumMsgLatency)
  },
]


export function OverviewTable () {
      
  const { nodes } = model.use(['nodes'])   
  
  return <div className='overview-table'>
      <Table
        rowSelection={{ 
        
        }}
        columns={columns}
        dataSource={nodes}
        pagination={false}
      />
    </div>
}
