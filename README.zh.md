# DolphinDB Web

<p align='center'>
    <img src='./src/ddb.svg' alt='DolphinDB Web' width='256'>
</p>

<p align='center'>
    <a href='https://github.com/dolphindb/api-javascript' target='_blank'>
        <img alt='vscode extension installs' src='https://img.shields.io/npm/v/dolphindb?color=brightgreen&label=api-javascript&style=flat-square' />
    </a>
</p>

## [English](./README.md) | 中文

### DolphinDB 数据库 Web 管理界面
![](./demo/demo.zh.png)

<!-- #### 在线版本
最新内部版本的 web 已经部署到 CDN 。可以通过设置 URL 中的 hostname 和 port 参数将打开的 web 界面连接到远程的或者本地的任何 DolphinDB 服务器，比如： 
http://cdn.dolphindb.cn/web/index.html?view=shell&language=zh&hostname=115.239.209.123&port=8892 

(如果打开后显示空白页，需要手动点击地址栏，将 url 改为 http:// 开头的链接) -->

<!-- #### 离线本地部署 (不用重启 server, 可以热替换)
```shell
# cd dolphindb 可执行文件所在的目录
cd /path/to/dolphindb-dir/

# 备份现有 web 文件夹 (或者直接删除: rm -rf ./web/)
mv ./web/ ./web.2023.01.01/

# 使用 curl 或其它工具下载最新的 zip 压缩包
curl -O https://cdn.dolphindb.cn/assets/web.latest.zip

# 解压 zip 包
unzip ./web.latest.zip

# 确认更新成功
ls -lhF ./web/

# 如果是集群，通过 rsync 同步到其他机器，保证时间戳 (mtime) 一致，否则 http 缓存不生效
rsync -av --delete ./web/ root@192.168.1.204:/path/to/dolphindb-dir/web/
``` -->

用浏览器访问 DolphinDB server 的 `ip:端口` 即可使用

如果需要通过 nginx 部署到子路径下（不建议，多转发一次会降低性能），可以参考 [./nginx.conf](./nginx.conf)


### 开发

打开下面的链接，在机器上安装最新版的 node.js 及浏览器。  
- windows: https://nodejs.org/en/download/prebuilt-installer/current
- linux: https://github.com/nodesource/distributions?tab=readme-ov-file#debian-and-ubuntu-based-distributions  

```shell
# 安装 pnpm 包管理器
npm install -g pnpm

git clone https://github.com/dolphindb/web.git

cd web

# 国内网络推荐配置 registry 
pnpm config set registry https://registry.npmmirror.com

# 安装项目依赖
pnpm install

# 参考 package.json 中的 scripts
# 开发
pnpm run dev

# 扫描词条
pnpm run scan
# 手动补全未翻译词条
# 再次运行扫描以更新词典文件 dict.json
pnpm run scan

# 格式化代码并自动修复代码错误
pnpm run fix

# 构建
pnpm run build

# 生成的文件在 web 目录下
```
