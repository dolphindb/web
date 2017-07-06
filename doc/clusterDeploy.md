# DolphinDB 集群部署指南

* ## 文件部署

    > 下载并解压到本地如 C:\DolphinDB

1. ### controller 集群控制器部署

    * 集群控制器的作用是:
    1. 提供集群管理的管理界面
    1. 收集各节点及agent的心跳，提供各节点状态的观测

    * 集群控制器的部署注意点:

        默认部署端口是: 8848，若与其他软件端口冲突，需要修改 start_controller.bat 文件,localSite 参数后面的端口自行修改
    
    * 集群控制器配置文件
    + dolphindb.cfg
    ```sh
    #DolphinDB Configuration File

    #Specify the port number for DolphinDB server
    #port=8848

    #Specify the maximum memory allocated to DolphinDB in Gigabytes e.g. 6.8
    #when it is set to 0, the DB server will automatically determine the max memory size.
    #maxMemSize=0

    #Specify the maximum connections allowed to connect to the server
    #maxConnections=64

    #Specify the threading pool size for parallel computing
    #poolSize=5

    #Specify whether to enable multiple threading
    #poolThread=true

    #Specify the maximum remote connections (to other DolphinDB servers)
    #The default value for maxRemoteConnections is  number_of_cores X (number_of_sites - 1), e.g. 4 cores X(3 sites -1)=8
    #maxRemoteConnections=2

    #Specify the maximum connections per remote site
    #The default value for maxConnectionPerSite is number of cores
    #maxConnectionPerSite=2

    #localExecutors corresponds to your CPU cores; without specification, 
    #it will automatically determin the number of cores should be used by the server; 
    #if you'd like to change the default behavior, please uncomment below statement and make your changes

    #localExecutors=3 

    ```

    agent.cfg  分布式节点及代理清单
    ```sh
    site,mode,memory,workerNum,executorNum
    localhost:8501:rh8501,agent,15,3,3
    localhost:8504:rh8504,,15,3,3
    localhost:8505:rh8505,,15,3,3
    localhost:8510:rh8510,,15,3,3
    localhost:8511:rh8511,,15,3,3
    localhost:8512:rh8512,,15,3,3
    localhost:8513:rh8513,,15,3,3
    localhost:8514:rh8514,,15,3,3
    localhost:8515:rh8515,,15,3,3
    localhost:8516:rh8516,,15,3,3
    localhost:8517:rh8517,,15,3,3
    localhost:8518:rh8518,,15,3,3
    localhost:8519:rh8519,,15,3,3
    localhost:8520:rh8520,,15,3,3
    localhost:8521:rh8521,,15,3,3
    localhost:8522:rh8522,,15,3,3
    localhost:8523:rh8523,,15,3,3
    localhost:8524:rh8524,,15,3,3
    localhost:8525:rh8525,,15,3,3
    localhost:8526:rh8526,,15,3,3
    localhost:8527:rh8527,,15,3,3
    localhost:8528:rh8528,,15,3,3
    localhost:8529:rh8529,,15,3,3
    localhost:8530:rh8530,,15,3,3
    localhost:8531:rh8531,,15,3,3
    localhost:8532:rh8532,,15,3,3
    localhost:8533:rh8533,,15,3,3
    localhost:8534:rh8534,,15,3,3
    localhost:8535:rh8535,,15,3,3
    localhost:8536:rh8536,,15,3,3
    localhost:8537:rh8537,,15,3,3
    ```
    * 集群控制器启动
    ```sh
    DolphinDB -mode controller -localSite localhost:8848 -nodeFile agent.cfg
    ```
    * 访问集群控制管理界面

2. ### agent 节点代理
    * 节点代理的作用是:
    1. 作为controller的命令向节点转发
    1. 为controller提供本地启停节点的权限
    * 节点代理的部署要点：
    1. 代理只能管理本物理机内的节点启动和停止
    

3. ### dataNode 节点部署

* ## 配置

* ## 启动
    * 集群控制器的方式
    1. 执行start_controller.bat
    1. 通过浏览器访问 http://localhost:8848/default.html
* ## 测试
