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

### This project contains
- console: DolphinDB database web management interface
- cloud: DolphinDB K8S cloud platform web management interface

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
