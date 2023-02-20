# DolphinDB Web

<p align='center'>
     <img src='./console/ddb.svg' alt='DolphinDB Web' width='256'>
</p>

<p align='center'>
     <a href='https://github.com/dolphindb/api-javascript' target='_blank'>
         <img alt='vscode extension installs' src='https://img.shields.io/npm/v/dolphindb?color=brightgreen&label=api-javascript&style=flat-square' />
     </a>
</p>

## English | [中文](./README.zh.md)

### Console: DolphinDB database web management interface
![](./console/demo.png)

#### Instructions
Use a browser to access the `IP:port` of the DolphinDB server to use

To update the web interface, download the latest web.xxxx.xx.xx.xx.zip archive in the releases on the right (https://github.com/dolphindb/web/releases), and use the web files in the archive The folder can directly replace the web folder in the DolphinDB server installation directory. It can be hot-replaced without restarting the server, and the webpage can be refreshed after the replacement.

If you need to deploy to a subpath through nginx (not recommended, one more forwarding will reduce performance), you can refer to [./nginx.conf](./nginx.conf)

### Cloud: DolphinDB K8S cloud platform web management interface
![](./cloud/demo.png)

#### Instructions
https://github.com/dolphindb/Tutorials_EN/blob/master/k8s_deployment.md


### Build and Development
```shell
# Install the latest version of nodejs
# https://nodejs.org/en/download/current/

# Install the pnpm package manager
corepack enable
corepack prepare pnpm@latest --activate

git clone https://github.com/dolphindb/web.git

cd web

pnpm install --force

# Refer to scripts in package.json

# build console
pnpm run build
# After completion the product is in the web folder

# build cloud
pnpm run build.cloud
# After completion, the product is in the web.cloud folder

# development
pnpm run dev

# scan entries
pnpm run scan
# Manually complete untranslated entries
# Run the scan again to update the dictionary file dict.json
pnpm run scan
```

#### CI builds
```shell
# Install the pnpm package manager
corepack enable
corepack prepare pnpm@latest --activate

# Install project dependencies
pnpm ci --include=dev

# Build the console project
pnpm run build

# After the build is complete, all files in the ./web/ folder are used as web/ in the dolphindb server directory
rsync -av --delete ./web/ jenkins@192.168.1.204:/hdd/ftp/origin/console/

# build cloud project
pnpm run build.cloud

# After the build finishes, all files in the ./web.cloud/ folder are used as artifacts
rsync -av --delete ./web.cloud/ jenkins@192.168.1.204:/hdd/ftp/origin/cloud/
```
