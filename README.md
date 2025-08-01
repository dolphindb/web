# DolphinDB Web

<p align='center'>
     <img src='./src/icons/ddb.svg' alt='DolphinDB Web' width='256'>
</p>

<p align='center'>
     <a href='https://github.com/dolphindb/api-javascript' target='_blank'>
         <img alt='vscode extension installs' src='https://img.shields.io/npm/v/dolphindb?color=brightgreen&label=api-javascript&style=flat-square' />
     </a>
</p>

## English | [中文](./README.zh.md)

### DolphinDB database web management interface
![](./demo/demo.en.png)

<!-- #### Online Version
The latest build of the web has been deployed to a CDN . You can connect the opened web interface to any remote or local DolphinDB server by setting the hostname and port parameters in the URL, for example:
http://cdn.dolphindb.cn/web/index.html?view=shell&hostname=115.239.209.123&port=8892

(If a blank page is displayed after opening, you need to manually click the address bar and change the url to a link starting with http://)
 -->
<!-- #### Offline Local Deployment (no need to restart the server, hot replacement is possible)
```shell
# cd the directory where the dolphindb executable is located
cd /path/to/dolphindb-dir/

# backup existing web folder (or delete: rm -rf ./web/)
mv ./web/ ./web.2023.01.01/

# Use curl or other tools to download the latest zip archive
curl -O https://cdn.dolphindb.cn/assets/web.latest.zip

# Unzip the zip package
unzip ./web.latest.zip

# Confirm the update is successful
ls -lhF ./web/

# If it is a cluster, synchronize to other machines through rsync to ensure that the timestamp (mtime) is consistent, otherwise the http cache will not take effect
rsync -av --delete ./web/ root@192.168.1.204:/path/to/dolphindb-dir/web/
``` -->

Use a browser to access `ip:port` of DolphinDB server to use

If you need to deploy to a subpath through nginx (not recommended, one more forwarding will reduce performance), you can refer to [./nginx.conf](./nginx.conf)

### Development

Open the link below and install the latest version of node.js and browser on your machine.
- windows: https://nodejs.org/en/download/prebuilt-installer/current
- linux: https://github.com/nodesource/distributions?tab=readme-ov-file#debian-and-ubuntu-based-distributions

```shell
# Install pnpm package manager
npm install -g pnpm

git clone https://github.com/dolphindb/web.git

cd web

# Recommended configuration registry for domestic network
pnpm config set registry https://registry.npmmirror.com

# Install project dependencies
pnpm install

# Refer to scripts in package.json
# Development
pnpm run dev

# Scan entries
pnpm run scan
# Manually complete untranslated entries
# Run the scan again to update the dictionary file dict.json
pnpm run scan

# Format code and automatically fix code errors
pnpm run fix

# Build
pnpm run build

# The generated files are in the web directory
```
