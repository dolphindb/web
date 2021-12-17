# 依赖最新版本的 Node.js (v17.2.0)  https://github.com/nodesource/distributions/blob/master/README.md
# curl -fsSL https://deb.nodesource.com/setup_current.x | sudo -E bash -
# sudo apt-get install -y nodejs

npm ci && node ./build.js

# 构建结束后 ./build/ 文件夹中的所有文件作为 dolphindb server 目录中的 web/
