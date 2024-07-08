export function download_file (name: string, url: string) {
    
    // 创建一个隐藏的 <a> 元素
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = name
    
    // 将 <a> 元素添加到 DOM 中
    document.body.appendChild(a)
    
    // 触发下载
    a.click()
    
    // 下载完成后移除 <a> 元素和 URL 对象
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
