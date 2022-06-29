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

### console: DolphinDB 数据库 Web 管理界面
![](./console/demo.png)

### cloud: DolphinDB K8S 云平台 Web 管理界面
![](./cloud/demo.png)

### 构建及开发方法
```shell
git clone https://github.com/dolphindb/web.git

cd web

npm i --force

# 1. 构建 console
npm run build
# 完成后产物在 web 文件夹中

# 2. 构建 cloud
npm run build.cloud
# 完成后产物在 web.cloud 文件夹中

# 3. 开发
npm run dev

# 4. 扫描词条
npm run scan
```
