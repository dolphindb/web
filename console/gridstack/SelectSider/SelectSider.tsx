export function SelectSider ({
    graph_items
}) {
    return <>
        <div className='dashboard-select-sider'>
            {graph_items.map((item, i) => {
                return <div key={item.id} className='dashboard-graph-item grid-stack-item'>{item.name}</div>
            })}
        </div>
    </>
}
