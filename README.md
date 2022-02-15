## 如何获取最新的 web 文件夹
1. 访问: http://192.168.1.200:8080/job/dolphindb_web/  (用户名: intern 密码: DolphinDB@3)
2. 点击左边的: Build with Parameters
3. 选择 `master` 分支，点击下面的开始构建，构建后产物会通过 `rsync -av --delete ./web/ jenkins@192.168.1.204:/hdd/ftp/origin/console/` 上传到 ftp
4. 等构建完成后，访问 ftp://192.168.1.204/hdd/ftp/origin/console/ (用户名: ftpuser 密码: DolphinDB123) 整个文件夹的内容作为 server 压缩包中的 web 文件夹

## 开发流程参考 package.json 中的 scripts
```sh
# 安装最新版 Node.js
npm install

# 运行 compile 命令，生成 server.js 和 build.js 并监听修改
npm run compile

# 启动 dev 
npm run server
```

## 国际化 (i18n)
```sh
npm run scan
```

## License Server
见 https://dolphindb1.atlassian.net/wiki/spaces/dev/pages/355008609/License+Server


## 构建 Web Console 流程
```sh
# 依赖最新版本的 Node.js (v17)  https://github.com/nodesource/distributions/blob/master/README.md

# 安装项目依赖 && 构建项目
npm ci --include=dev && npm run build

# 构建结束后 ./web/ 文件夹中的所有文件作为 dolphindb server 目录中的 web/
# rsync -av --delete ./web/ jenkins@192.168.1.204:/hdd/ftp/origin/console/
```

## 构建 K8S Cloud 流程
```sh
# 依赖最新版本的 Node.js (v17)  https://github.com/nodesource/distributions/blob/master/README.md

# 安装项目依赖 && 构建项目
npm ci --include=dev && npm run build.cloud

# 结束后产物在 ./web.cloud/
```
