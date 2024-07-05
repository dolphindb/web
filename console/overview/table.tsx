import { Table, type TableColumnsType } from 'antd'

import { CheckCircleOutlined, MinusCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'

import { NodeType, model, type DdbNode } from '../model.js'

import { t } from '../../i18n/index.js'

import { generateNodeLink } from './utils.js'

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

const is_agent_node = (node: DdbNode) => node.mode === NodeType.agent

const columns: TableColumnsType<DdbNode> = [
  {
    title: t('节点类型'),
    dataIndex: 'mode',
    render: (mode: number) => node_mode_lables[Number(mode)]
  },
  {
    title: t('节点别名'),
    dataIndex: 'name',
    render: (name: string, node: DdbNode) => <a target='_blank' href={ generateNodeLink(node.host, node.port)}>{name}</a>
  },
  {
    title: t('是否 Leader'),
    dataIndex: 'isLeader',
    render: (isLeader: boolean) => isLeader !== null && isLeader.toString()
  },
  {
    title: t('状态'),
    dataIndex: 'state',
    render: state => node_state_icons[Number(state)]
  },
  {
    title: t('最大连接'),
    dataIndex: 'connectionNum',
    sorter: (a, b) => Number(a.connectionNum - b.connectionNum)
  },
  {
    title: t('内存已用'),
    dataIndex: 'memoryUsed',
    render: (memoryUsed: bigint) => Number(memoryUsed).to_fsize_str(),
    sorter: (a, b) => Number(a.memoryUsed - b.memoryUsed)
  },
  {
    title: t('内存已分配'),
    dataIndex: 'memoryAlloc',
    render: (memoryAlloc: bigint) => Number(memoryAlloc).to_fsize_str(),
    sorter: (a, b) => Number(a.memoryAlloc - b.memoryAlloc)
  },
  {
    title: t('CPU 占用率'),
    dataIndex: 'cpuUsage',
    render: (cpuUsage: number) => cpuUsage.toFixed(2) + '%',
    sorter: (a, b) => a.cpuUsage - b.cpuUsage
  },
  {
    title: t('CPU 平均负载'),
    dataIndex: 'avgLoad',
    sorter: (a, b) => a.avgLoad - b.avgLoad
  },
  {
    title: t('运行作业'),
    dataIndex: 'runningJobs',
    sorter: (a, b) => a.runningJobs - b.runningJobs
  },
  {
    title: t('排队作业'),
    dataIndex: 'queuedJobs',
    sorter: (a, b) => a.queuedJobs - b.queuedJobs
  },
  {
    title: t('运行任务'),
    dataIndex: 'runningTasks',
    sorter: (a, b) => a.runningTasks - b.runningTasks
  },
  {
    title: t('排队任务'),
    dataIndex: 'queuedTasks',
    sorter: (a, b) => a.queuedTasks - b.queuedTasks
  },
  {
    title: t('作业负载'),
    dataIndex: 'jobLoad',
    sorter: (a, b) => a.jobLoad - b.jobLoad
  },
  {
    title: t('磁盘总容量'),
    dataIndex: 'diskCapacity',
    render: (diskCapacity: bigint) => Number(diskCapacity).to_fsize_str(),
    sorter: (a, b) => Number(a.diskCapacity - b.diskCapacity)
  },
  {
    title: t('磁盘剩余容量'),
    dataIndex: 'diskFreeSpace',
    render: (diskFreeSpace: bigint) => Number(diskFreeSpace).to_fsize_str(),
    sorter: (a, b) => Number(a.diskFreeSpace - b.diskFreeSpace)
  },
  {
    title: t('磁盘可用空间占比'),
    dataIndex: 'diskFreeSpaceRatio',
    render: (diskFreeSpaceRatio: number) => (diskFreeSpaceRatio * 100).toFixed(2) + '%',
    sorter: (a, b) => a.diskFreeSpaceRatio - b.diskFreeSpaceRatio
  },
  {
    title: t('磁盘写速率'),
    dataIndex: 'diskWriteRate',
    render: (diskWriteRate: bigint) => Number(diskWriteRate).to_fsize_str() + '/s',
    sorter: (a, b) => Number(a.diskWriteRate - b.diskWriteRate)
  },
  {
    title: t('磁盘读速率'),
    dataIndex: 'diskReadRate',
    render: (diskReadRate: bigint) => Number(diskReadRate).to_fsize_str() + '/s',
    sorter: (a, b) => Number(a.diskReadRate - b.diskReadRate)
  },
  {
    title: t('前一分钟写磁盘量'),
    dataIndex: 'lastMinuteWriteVolume',
    render: (lastMinuteWriteVolume: bigint) => Number(lastMinuteWriteVolume).to_fsize_str(),
    sorter: (a, b) => Number(a.lastMinuteWriteVolume - b.lastMinuteWriteVolume)
  },
  {
    title: t('前一分钟读磁盘量'),
    dataIndex: 'lastMinuteReadVolume',
    render: (lastMinuteReadVolume: bigint) => Number(lastMinuteReadVolume).to_fsize_str(),
    sorter: (a, b) => Number(a.lastMinuteReadVolume - b.lastMinuteReadVolume)
  },
  {
    title: t('worker 线程总数'),
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
    title: t('最大连接'),
    dataIndex: 'maxConnections',
    sorter: (a, b) => a.maxConnections - b.maxConnections
  },
  {
    title: t('节点内存空间上限'),
    dataIndex: 'maxMemSize',
    render: (maxMemSize: bigint) => Number(maxMemSize).to_fsize_str(),
    sorter: (a, b) => Number(a.maxMemSize - b.maxMemSize)
  },
  {
    title: t('网络发送速率'),
    dataIndex: 'networkSendRate',
    render: (networkSendRate: bigint) => Number(networkSendRate).to_fsize_str() + '/s',
    sorter: (a, b) => Number(a.networkSendRate - b.networkSendRate)
  },
  {
    title: t('网络接收速率'),
    dataIndex: 'networkRecvRate',
    render: (networkRecvRate: bigint) => Number(networkRecvRate).to_fsize_str() + '/s',
    sorter: (a, b) => Number(a.networkRecvRate - b.networkRecvRate)
  },
  {
    title: t('前一分钟发送字节数'),
    dataIndex: 'lastMinuteNetworkSend',
    render: (lastMinuteNetworkSend: bigint) => Number(lastMinuteNetworkSend).to_fsize_str(),
    sorter: (a, b) => Number(a.lastMinuteNetworkSend - b.lastMinuteNetworkSend)
  },
  {
    title:  t('前一分钟接收字节数'),
    dataIndex: 'lastMinuteNetworkRecv',
    render: (lastMinuteNetworkRecv: bigint) => Number(lastMinuteNetworkRecv).to_fsize_str(),
    sorter: (a, b) => Number(a.lastMinuteNetworkRecv - b.lastMinuteNetworkRecv)
  },
  {
    title: t('前一批消息延时'),
    dataIndex: 'lastMsgLatency',
    render: (lastMsgLatency: bigint) => Number(lastMsgLatency).toFixed(2) + 'ms',
    sorter: (a, b) => Number(a.lastMsgLatency - b.lastMsgLatency)
  },
  {
    title: t('所有消息平均延时'),
    dataIndex: 'cumMsgLatency',
    render: (cumMsgLatency: bigint) => Number(cumMsgLatency).toFixed(2) + 'ms',
    sorter: (a, b) => Number(a.cumMsgLatency - b.cumMsgLatency)
  },
]


export function OverviewTable ({
  selectedNodeNames,
  setSelectedNodeNames,
}: {
  selectedNodeNames: string[]
  setSelectedNodeNames: (names: string[]) => void
}) {
      
  const { nodes } = model.use(['nodes'])   
  
  return <div className='overview-table'>
      <Table
        rowSelection={{
          selectedRowKeys: selectedNodeNames,
          onChange (_, nodes) {
            setSelectedNodeNames(nodes.map(node => node.name))
          }, 
          getCheckboxProps (record) {
            return {
              disabled: record.mode === NodeType.controller || record.mode === NodeType.agent
            }
          },
        }}
        // agent node 只展示前两列
        columns={columns.map((col, idx) => idx < 2 ? col : { ...col,  render: (text, node: DdbNode, idx) => is_agent_node(node)  ? null : col.render ? col.render(text, node, idx) : text } )}
        dataSource={nodes.map(node => ({ ...node, key: node.name }))}
        pagination={false}
        scroll={{
          x: '100%'
        }}
      />
    </div>
}
