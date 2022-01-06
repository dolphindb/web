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

## 构建流程参见 ./build.sh
