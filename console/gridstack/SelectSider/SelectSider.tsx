export function SelectSider ({
    graph_items
}) {
    console.log(graph_items)
    
    return <>
        <div className='dashboard-select-sider'>
            {graph_items.map((item, i) => {
                return <div key={item.id} className='dashboard-graph-item'>{item.name}</div>
            })}
        </div>
    </>
}
