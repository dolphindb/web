# DolphinDB Web

<p align='center'>
    <img src='./console/ddb.svg' alt='DolphinDB Web' width='256'>
</p>

<p align='center'>
    <a href='https://github.com/dolphindb/api-javascript' target='_blank'>
        <img alt='vscode extension installs' src='https://img.shields.io/npm/v/dolphindb?color=brightgreen&label=api-javascript&style=flat-square' />
    </a>
</p>

## [English](./README.md) | 中文

### Console: DolphinDB 数据库 Web 管理界面
![](./console/demo.png)

#### 使用方法
用浏览器访问 DolphinDB server 的 `IP:端口` 即可使用

如需更新 web 界面，在右边的 releases 中 (https://github.com/dolphindb/web/releases) 下载最新的 web.xxxx.xx.xx.xx.zip 压缩包，用压缩包中的 web 文件夹直接替换 DolphinDB server 安装目录中的 web 文件夹即可，可以热替换，不需要重启服务器，替换后刷新网页即可。

如果需要通过 nginx 部署到子路径下（不建议，多转发一次会降低性能），可以参考 [./nginx.conf](./nginx.conf)


### Cloud: DolphinDB K8S 云平台 Web 管理界面
![](./cloud/demo.png)

#### 使用方法
https://github.com/dolphindb/Tutorials_CN/blob/master/%E5%AE%89%E8%A3%85%E5%92%8C%E9%83%A8%E7%BD%B2/k8s_deployment.md


### 构建及开发方法
```shell
# 安装最新版的 nodejs
# https://nodejs.org/en/download/current/

git clone https://github.com/dolphindb/web.git

cd web

npm install --force

# 参考 package.json 中的 scripts

# 构建 console
npm run build
# 完成后产物在 web 文件夹中

# 构建 cloud
npm run build.cloud
# 完成后产物在 web.cloud 文件夹中

# 开发
npm run dev

# 扫描词条
npm run scan
# 手动补全未翻译词条
# 再次运行扫描以更新词典文件 dict.json
npm run scan
```

#### CI 构建
```shell
# 安装项目依赖
npm ci --include=dev

# 构建 console 项目
npm run build

# 构建结束后 ./web/ 文件夹中的所有文件作为 dolphindb server 目录中的 web/
rsync -av --delete ./web/ jenkins@192.168.1.204:/hdd/ftp/origin/console/

# 构建 cloud 项目
npm run build.cloud

# 构建结束后 ./web.cloud/ 文件夹中的所有文件作为产物
rsync -av --delete ./web.cloud/ jenkins@192.168.1.204:/hdd/ftp/origin/cloud/
```
