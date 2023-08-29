import { GraphTypeName } from '../graph-types.js'

export function SelectSider () {
    return <>
        <div className='dashboard-select-sider'>
            {Object.entries(GraphTypeName).map((graph, i) => {
                return <div key={graph[0]} className='dashboard-graph-item grid-stack-item' data-type={graph[0]}>{graph[1]}</div>
            })}
        </div>
    </>
}
