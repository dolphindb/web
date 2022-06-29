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


### Cloud: DolphinDB K8S cloud platform web management interface
![](./cloud/demo.png)

#### Instructions
https://github.com/dolphindb/Tutorials_EN/blob/master/k8s_deployment.md


### Build and Development
```shell
git clone https://github.com/dolphindb/web.git

cd web

npm i --force

# 1. Build the console
npm run build
# The finished product is in the web folder

# 2. Build the cloud
npm run build.cloud
# The finished product is in the web.cloud folder

# 3. Development
npm run dev

# 4. Scan entry
npm run scan
````
