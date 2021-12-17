# 依赖最新版本的 Node.js (v17.2.0)  https://github.com/nodesource/distributions/blob/master/README.md

npm ci && npm run build

# 构建结束后 ./web/ 文件夹中的所有文件作为 dolphindb server 目录中的 web/
# rsync -av --delete ./web/ jenkins@192.168.1.204:/hdd/ftp/origin/console/
