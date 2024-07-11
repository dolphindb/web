export function generate_node_link (hostname: string, port: string | number) {
    const current_params = new URLSearchParams(location.search)
    const is_query_params_mode = current_params.get('hostname') || current_params.get('port')
    
    if (is_query_params_mode) {
        current_params.set('hostname', hostname)
        current_params.set('port', port.toString())
    }
    
    return is_query_params_mode
        ? `${location.protocol}//${location.hostname}:${location.port}${location.pathname}?${current_params.toString()}`
        : `${location.protocol}//${hostname}:${port}`
}


export function ns2ms (num: number) {
    return num / 1_000_000
}
