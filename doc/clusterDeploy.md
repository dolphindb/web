# DolphinDB 集群部署指南（windows)

* ## 文件部署

    > 下载并解压到本地如 C:\DolphinDB

* ## 规划集群
     作为一个集群管理员，首先需要规划好集群的规模和网络。
     DolphinDB的集群管理需要了解几个概念: controller,agent,dataNode。
    
    * controller ：
        + 提供WebServer的功能，展示集群管理的Web界面。提供各节点状态的观测,以及启动停止等管理功能
        + 收集各节点及agent的心跳
    * agent : 
        + agent 的作用是: 执行controller启停节点的命令
        + agent 部署注意点：
           1. agent 每台物理机只需要部署一个
           1. agent 只能管理本物理机内的节点启动和停止
    * dataNode :
        + DolphinDB的计算和存储节点，承担数据存储和查询计算的任务。

* ## 在做好集群规划后，需要将信息配置到 agent.cfg 文件
* agent.cfg  集群节点及代理清单
    ```sh
    site,mode,memory,workerNum,executorNum
    localhost:8501:rh8501,agent,15,3,3
    localhost:8504:rh8504,,15,3,3
    localhost:8505:rh8505,,15,3,3
    localhost:8510:rh8510,,15,3,3
    localhost:8511:rh8511,,15,3,3
    ...
    ```   
* ## controller 集群控制器启动
    ```sh
    DolphinDB -mode controller -localSite localhost:8848 -nodeFile agent.cfg
    ```
    * 访问集群控制管理界面
    用 chrome, firefox等浏览器访问 http://localhost:8848/default.html

* ## agent 启动
    ```sh
    DolphinDB -mode agent -localSite localhost:8501:rh8501 -port 8501 -controllerSite localhost:8848 -logFile agent8501.log
    ```
* ## dataNode 节点部署
    dataNode无需手工部署启动，只要在agent.cfg中配置的datanode信息，会在管理界面列出，通过管理界面可以控制启动和停止
