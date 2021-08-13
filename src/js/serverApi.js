function DatanodeConfig() {
    var ruleNumber = 0;
    var controller = GetFullUrl(window.location.host);
    var scriptExecutor = new CodeExecutor(controller);
    var ruleData = [];

    var UNKNOWN_INDEX = 4;
    var configs = [
        // {
        //     configCategory: 'Home',
        //     configs: [
        //         //{ name: 'batchJobDir', value: '', default: '<HomeDir>/batchJobs' },
        //         //{ name: 'console', value: [0, 1], default: '0' },
        //         { name: 'home', value: '', default: '', tip: 'The DolphinDB home directory, where the configuration file, the license file, the log file and other related files are located.' },
        //     ]
        // },
        {
            configCategory: 'Log',
            configs: [
                { name: 'jobLogFile', value: '', default: 'nodeAlias_job.log', tip: 'The path and name of the job log file that contains descriptive information of all the queries that have been executed for each node. It must be a csv file. The default folder for the job log file is the log folder. The default name of the job log file is nodeAlias_job.log.' },
                { name: 'logFile', value: '', default: 'DolphinDBlog', tip: 'The path and name of the log file'},
                { name: 'logLevel', value: '', default: 'INFO', tip: 'The retention hierarchy of log files.'},
                { name: 'redoLogPurgeInterval', value: 'int', default: '30', tip: ' The time interval (s) for deleting redo logs.'},
                { name: 'redoLogPurgeLimit', value: 'int', default: '4000', tip: 'The maximum amount of disk space (MB) used by redo logs.'},
                { name: 'maxLogSize', value: [100, 1024], default: '1024', tip: 'When the log file reaches a specified level (MB), the log file will be archived.'},
                { name: 'redoLogDir', value: '', default: '', tip: 'The directory of redo logs.'}
            ]
        },
        {
            configCategory: 'System',
            configs: [
                { name: 'localExecutors', value: 'int', default: 'CPU core number - 1', tip: 'The number of local executors.The default value is the number of cores of the CPU - 1.' },
                { name: 'maxBatchJobWorker', value: 'int', default: '= workerNum', tip: 'The maximum number of workers to process batch jobs. The default value is the value of workerNum.' },
                { name: 'maxConnections', value: 'int', default: '64', tip: 'The maximum number of connections.' },
                { name: 'maxConnectionPerSite', value: 'int', default: '= number of CPU cores', tip: 'The maximum number of remote connections per node.' },
                { name: 'maxDynamicWorker', value: 'int', default: '= workerNum', tip: 'The maximum number of dynamic workers. The default value is the value of workerNum.' },
                { name: 'maxMemSize', value: 'int', default: '', tip: 'The maximum memory (in terms of Gigabytes) allocated to DolphinDB. If set to 0, it means no limits on memory usage.' },
                { name: 'perfMonitoring', value: [0, 1], default: 1, tip: 'Enable performance monitoring. The default value is false for a stand alone DolphinDB application. The default value is true on a DolphinDB cluster management web interface.' },
                { name: 'regularArrayMemoryLimit', value: [256, 512], default: 512, tip: 'The limit on the memory size (MB) of a regular array. This number must be a power of 2. The default value is 512.' },
                { name: 'webWorkerNum', value: 'int', default: '1', tip: 'The size of the worker pool to process http requests. The default value is 1.' },
                { name: 'workerNum', value: 'int', default: '= number of CPU cores', tip: 'The size of worker pool for regular interactive jobs. The default value is the number of cores of the CPU.' },
                { name: 'publicName', value: '', default: '= ', tip: '' },
                { name: 'lanCluster', value: 'int', default: '= 0', tip: '' },
                { name: 'maxPartitionNumPerQuery', value: 'int', default: '= 65536', tip: '' },
                { name: 'newValuePartitionPolicy', value: ['add', 'skip', 'fail'], default: '= skip', tip: '' },
                { name: 'logLevel', value: ['DEBUG', 'INFO', 'WARNING', 'ERROR'], default: '= INFO', tip: '' },
                { name: 'redoLogPurgeInterval', value: '', default: '= 10', tip: '' },
                { name: 'redoLogPurgeLimit', value: '', default: '= 4000', tip: '' },
                { name: 'maxLogSize', value: '', default: '= 1024', tip: '' },
                { name: 'chunkCacheEngineMemSize', value: 'int', default: '0', tip: 'The volume (GB) of cache engine.'},
                { name: 'memoryReleaseRate', value: 'float', default: '5', tip: 'The rate at which unused memory is released to the operating system is a floating-point number between 0 and 10.'},
                { name: 'warningMemSize', value: '', default: '', tip: 'When the memory usage exceeds warningmemsize (in GB), the system will automatically clean up the cache of some databases to avoid OOM exceptions.'},
                { name: 'enableHTTPS', value: [0, 1], default: 1, tip: 'Enable HTTPS security protocol.'},
                { name: 'localSite', value: '', default: '', tip: 'The LAN information of the node in the format of host:port:alias.'},
                { name: 'tcpNoDelay', value: [0, 1], default: 1, tip: 'Start TCP_NODELAY socket option.'},
                { name: 'console', value: [0,1], default: 1, tip: 'Indicates whether to start the dolphin DB command line window.'},
                { name: 'config', value: '', default: 'dolphindb.cfg', tip: 'The profile of node.'},
                { name: 'home', value: '', default: 'C:DolphinDBserver', tip: 'The home directory of dolphin dB and the location of configuration files, license files, log files and other related files.'},
                { name: 'mode', value: '', default: 'single', tip: 'The mode of the node. Single represents stand-alone mode, datanode represents data node, controller represents control node and agent represents agent node.'},
                { name: 'moduleDir', value: '', default: 'modules', tip: 'Module directory of node.'},
                { name: 'pluginDir', value: '', default: 'plugins', tip: 'Plug directory of node.'},
                { name: 'preloadModules', value: '', default: '', tip: 'Modules or plug-ins loaded automatically after system startup.'},
                { name: 'init', value: '', default: 'dolphindb.dos', tip: 'This file is executed at system startup.'},
                { name: 'startup', value: '', default: 'startup.dos', tip: 'This file is executed after system startup.'},
                { name: 'run', value: '', default: 'dailyJobs.dos', tip: 'The file is executed after the system executes the file specified by the startup parameter.'},
                { name: 'tzdb', value: '', default: 'C:DolphinDBservertzdb', tip: 'The directory of time zone database.'},
                { name: 'webRoot', value: '', default: 'C:DolphinDBserverweb', tip: 'The directory of the web server.'},
                { name: 'webLoginRequired', value: [0,1], default: 0, tip: 'Whether you must sign in before you can use the Web Cluster Manager.'},
                { name: 'useHardLink', value: [0, 1], default: 1, tip: 'Whether to use the function of file system hardlink.'},
            ]
        },
        {
            configCategory: 'Storage',
            configs: [
                { name: 'allowVolumeCreation', value: [0, 1], default: '1', tip: 'Whether to automatically create the storage locations in the distributed file system if the parameter volumes is not specified. The default value is 1.' },
                { name: 'volumes', value: '', default: '', tip: 'The folder where data chunks are saved in the distributed file system on a data node.' },
                { name: 'diskIOConcurrencyLevel', value: 'int', default: '1', tip: 'Indicating how many threads can read from/write to disks concurrently.' },
                { name: 'batchJobDir', value: '', default: '', tip: 'The folder directory of bulk job logs and results.'},
                { name: 'chunkMetaDir', value: '', default:'', tip: 'The directory of metadata.'},
                { name: 'dataSync', value: [0,1], default:'0', tip: 'Indicates whether a data-forced brushing policy is adopted. The default value is 0, which means that it is up to the operating system to decide when to swipe the disk.'}
            ]
        },
        {
            configCategory: 'Streaming',
            configs: [
                { name: 'maxPubConnections', value: 'int', default: '', tip: 'The maximum number of socket connections the publisher can establish for message publishing. This parameter must be specified for this node to serve as a publisher.' },
                { name: 'maxSubConnections', value: 'int', default: '', tip: 'The maximum number of subscription connections the server can receive.' },
                { name: 'subExecutors', value: 'int', default: '0', tip: 'The number of message processing threads in a subscriber. The default value is 0, which means the thread that conducts message parsing also processes messages.' },
                { name: 'subPort', value: 'int', default: '', tip: 'The port number that the subscription thread is listening on. This paramter must be specified for this node to serve as a subscriber.' },
                { name: 'maxMsgNumPerBlock', value: 'int', default: '1024', tip: 'The maximum number of messages in a message block when a server publishes or combines messages.' },
                { name: 'subExecutorPooling', value: [0, 1], default: 0, tip: 'Whether the streaming executor is in pooling mode.' },
                { name: 'persistenceDir', value: '', default: '', tip: 'The directory where a streaming table is persisted.' },
                { name: 'persistenceWorkerNum', value: 'int', default: '0', tip: 'The number of workers to persist streaming tables.' },
                { name: 'maxPersistenceQueueDepth', value: 'int', default: '10000000', tip: 'The limit of message numbers for each queue of persistence workers.' },
                { name: 'maxSubQueueDepth', value: 'int', default: '10000000', tip: 'The limit of message numbers for each queue of subscription executors.' },
                { name: 'maxPubQueueDepthPerSite', value: 'int', default: '10000000', tip: 'The limit of message numbers for publishing queue to each client site.' },
                { name: 'persistOffsetDir', value: '', default: '', tip: 'The save path that persists the consumer data offset at the subscription end.'}

            ]
        }
    ]

    function checkRuleExists(rule) {
        for (var j = 0; j < configs.length; j++) {
            var configCategory = configs[j].configs;
            for (var k = 0; k < configCategory.length; k++) {
                if (configCategory[k].name == rule) {
                    return;
                }
            }
        }
        if (configs[UNKNOWN_INDEX] === undefined)
            configs.push({ configCategory: 'Unknown', configs: [] })
        configs[UNKNOWN_INDEX].configs.push({ name: rule, value: '', default: '', tip: '' });
    }

    function loadRules() {
        ruleNumber = 0;
        for (var i = 0, len = ruleData.length; i < len; i++)
            ruleData[i].elem.remove();
        ruleData = [];

        scriptExecutor.run('loadClusterNodesConfigs()', function (res) {
            if (res.resultCode === '0') {
                var confs = res.object[0].value;
                for (var i = 0, len = confs.length; i < len; i++) {
                    var config = confs[i].split('=');
                    if (config.length !== 2) {
                        console.log('Unknown datanode config: ' + confs[i])
                        continue;
                    }
                    var datanodeConf = config[0].split('.');
                    if (datanodeConf.length > 2) {
                        console.log('Unknown datanode config: ' + confs[i])
                        continue;
                    } else if (datanodeConf.length === 2) {
                        var datanode = datanodeConf[0];
                        var ruleTypeText = datanodeConf[1];
                    } else {
                        var datanode = '';
                        var ruleTypeText = datanodeConf[0];
                    }

                    checkRuleExists(ruleTypeText);

                    for (var j = 0, jlen = configs.length; j < jlen; j++) {
                        var configCategory = configs[j].configs;
                        for (var k = 0, klen = configCategory.length; k < klen; k++) {
                            if (configCategory[k].name == ruleTypeText) {
                                addRule(datanode, j + ',' + k, config[1]);
                                break;
                            }
                        }
                    }
                }
            }
        })
    }

    function addRule(datanode, ruleType, ruleValue) {
        $('#text-dn-config-rule-saved').attr('style', 'display: none;');
        $('#btn-save-dn-config-rule').attr('disabled', false);
        var ruleId = ruleNumber++;
        var newRule = $('<div />', {
            class: 'form-group',
            id: 'datanode-config-' + ruleId
        });

        var datanodeWrap = $('<div />', { class: 'col-xs-4' });
        var datanodeInput = $('<input />', {
            type: 'text',
            class: 'form-control datanode-pattern',
            id: 'datanode-config-datanode-' + ruleId,
            name: 'datanode-config-datanode-' + ruleId,
            placeholder: 'e.g. dn1 or dn% or empty'
        });
        if (datanode)
            datanodeInput.val(datanode);
        datanodeInput.keyup(function () {
            $('#text-cnt-config-rule-saved').attr('style', 'display: none');
            $('#btn-save-dn-config-rule').attr('disabled', false);
        });
        datanodeInput.change(function () {
            $('#text-cnt-config-rule-saved').attr('style', 'display: none');
            $('#btn-save-dn-config-rule').attr('disabled', false);
        });
        datanodeInput.appendTo(datanodeWrap);
        datanodeWrap.appendTo(newRule);

        var ruleTypeWrap = $('<div />', { class: 'col-xs-3' });
        var ruleTypeSelect = $('<select />', { class: 'form-control config-type' });
        $('<option value selected disabled>Configuration parameter</option>').appendTo(ruleTypeSelect);
        for (var i = 0, len = configs.length; i < len; i++) {
            var optGroup = $('<optgroup />', { label: configs[i].configCategory });
            var configsInCatagory = configs[i].configs;

            for (var j = 0, jlen = configsInCatagory.length; j < jlen; j++) {
                $('<option />', {
                    value: i + ',' + j,
                    text: configsInCatagory[j].name,
                    title: configsInCatagory[j].tip
                }).appendTo(optGroup);
            }
            optGroup.appendTo(ruleTypeSelect);
        }
        if (typeof ruleType !== 'undefined')
            ruleTypeSelect.val(ruleType)
        ruleTypeSelect.appendTo(ruleTypeWrap);
        ruleTypeWrap.appendTo(newRule);

        var ruleValueWrap = $('<div />', { class: 'col-xs-4' });
        var ruleValueContent;

        function setRuleValue(ruleType, ruleValue) {
            $('#rule-value-content-' + ruleId).remove();
            var selected = typeof ruleType !== 'undefined' ? ruleType : $(this).val();
            selected = selected.split(',');
            var selectedConfig = configs[selected[0]].configs[selected[1]];
            var value = selectedConfig.value;
            if (Array.isArray(value)) {
                ruleValueContent = $('<select />', {
                    class: 'form-control rule-value-content',
                    id: 'rule-value-content-' + ruleId
                });
                for (var i = 0, len = value.length; i < len; i++) {
                    $('<option />', {
                        value: value[i],
                        text: value[i],
                        title: selectedConfig.tip
                    }).appendTo(ruleValueContent);
                }
                ruleValueContent.val(selectedConfig.default);
            } else if (value === 'int') {
                ruleValueContent = $('<input />', {
                    class: 'form-control rule-value-content',
                    id: 'rule-value-content-' + ruleId,
                    type: 'number',
                    min: '0',
                    placeholder: selectedConfig.default,
                    title: selectedConfig.tip
                })
            } else if (value === 'password') {
                ruleValueContent = $('<input />', {
                    class: 'form-control rule-value-content',
                    id: 'rule-value-content-' + ruleId,
                    type: 'password',
                    placeholder: selectedConfig.default,
                    title: selectedConfig.tip
                })
            } else if (value === '') {
                ruleValueContent = $('<input />', {
                    class: 'form-control rule-value-content',
                    id: 'rule-value-content-' + ruleId,
                    type: 'text',
                    placeholder: selectedConfig.default,
                    title: selectedConfig.tip
                })
            }
            if (ruleValue) {
                ruleValueContent.val(ruleValue);
            }
            ruleValueContent.change(function () {
                $('#text-cnt-config-rule-saved').attr('style', 'display: none');
                $('#btn-save-dn-config-rule').attr('disabled', false);
            });
            ruleValueContent.keyup(function () {
                $('#text-cnt-config-rule-saved').attr('style', 'display: none');
                $('#btn-save-dn-config-rule').attr('disabled', false);
            })
            ruleValueContent.appendTo(ruleValueWrap);
            ruleValueWrap.appendTo(newRule);
        }
        ruleTypeSelect.change(function () { setRuleValue.bind(this)(); });
        if (typeof ruleType !== 'undefined')
            setRuleValue(ruleType, ruleValue);

        var btnRemove = $('<button type="button" class="btn btn-default"><span class="glyphicon glyphicon-minus"></span></button>').appendTo(newRule);
        btnRemove.click(function () {
            $('#text-dn-config-rule-saved').attr('style', 'display: none;');
            $('#btn-save-dn-config-rule').attr('disabled', false);
            $('#datanode-config-' + ruleId).remove();
            ruleData[ruleId].deleted = true;
        })

        ruleData.push({ elem: newRule, deleted: false })
        newRule.appendTo($('#dn-config-rule-list'))
    }

    function saveRules() {
        var script = "saveClusterNodesConfigs([";
        var ruleLines = [];
        for (var i = 0, len = ruleData.length; i < len; i++) {
            var rule = ruleData[i];
            if (rule.deleted)
                continue;
            var ruleElem = rule.elem;
            var datanodePattern = ruleElem.find('.datanode-pattern').val();
            var configIndex = ruleElem.find('.config-type').val();
            var configValue = ruleElem.find('.rule-value-content').val();
            configIndex = configIndex.split(',');
            var selectedConfig = configs[configIndex[0]].configs[configIndex[1]];
            var ruleLine = '"';
            if (datanodePattern !== '')
                ruleLine += datanodePattern + '.'
            if (configIndex !== null && configValue !== '')
                ruleLine += selectedConfig.name + '=' + configValue + '"';
            else
                continue;
            ruleLines.push(ruleLine)
        }
        script += ruleLines.join(',');
        script += '])';
        script = encodeURIComponent(script);

        scriptExecutor.run(script, function (res) {
            if (res.resultCode === '0') {
                applyRules();
                $('#text-dn-config-rule-saved').attr('style', '');
                $('#btn-save-dn-config-rule').attr('disabled', true);
            } else {
                alert(res.msg);
            }
        })
    }

    function applyRules() {
        var script = "reloadClusterConfig()";
        scriptExecutor.run(script, function (res) {
            if (res.resultCode === '0') {
                //alert("Restart all datanodes to apply the new configration!");
            } else {
                alert(res.msg);
            }
        })
    }

    $('#dn-config-rule-list').change(function () {
        $('#text-dn-config-rule-saved').attr('style', 'display: none;');
    });
    $('#btn-add-dn-config-rule').click(function () { addRule(); });
    $('#btn-save-dn-config-rule').click(function () {
        saveRules();
    });
    loadRules();

    console.log("$(window).height()", $(window).height());
    $("#frmContent").height($(window).height() - 100);

    refreshMe = loadRules;
}

function ControllerConfig() {
    var ruleNumber = 0;
    var controller = GetFullUrl(window.location.host);
    var scriptExecutor = new CodeExecutor(controller);
    var ruleData = [];
    var configs = [
        { name: 'mode', value: ['controller'], default: 'controller', tip: 'Node mode. Possible modes are controller / agent / dataNode.', disabled: true },
        { name: 'localSite', value: '', default: '', tip: 'Specify host address, port number and alias of the local node.', disabled: true },
        { name: 'clusterConfig', value: '', default: 'cluster.cfg', tip: 'Specify the location for Nodes Config file.' },
        { name: 'nodesFile', value: '', default: 'cluster.nodes', tip: 'Specify the location for Nodes Setup file.' },
        { name: 'localExecutors', value: 'int', default: 'CPU core number - 1', tip: 'The number of local executors.The default value is the number of cores of the CPU - 1.' },
        { name: 'maxBatchJobWorker', value: 'int', default: '= workerNum', tip: 'The maximum number of workers to process batch jobs. The default value is the value of workerNum.' },
        { name: 'maxConnections', value: 'int', default: '64', tip: 'The maximum number of connections.' },
        { name: 'maxConnectionPerSite', value: 'int', default: '= number of CPU cores', tip: 'The maximum number of remote connections per node.' },
        { name: 'maxDynamicWorker', value: 'int', default: '= workerNum', tip: 'The maximum number of dynamic workers. The default value is the value of workerNum.' },
        { name: 'maxMemSize', value: 'int', default: '', tip: 'The maximum memory (in terms of Gigabytes) allocated to DolphinDB. If set to 0, it means no limits on memory usage.', required: true },
        { name: 'webWorkerNum', value: 'int', default: '1', tip: 'The size of the worker pool to process http requests. The default value is 1.' },
        { name: 'workerNum', value: 'int', default: '= number of CPU cores', tip: 'The size of worker pool for regular interactive jobs. The default value is the number of cores of the CPU.' },
        { name: 'dfsMetaDir', value: '', default: '= DolphinDB home directory', tip: 'Relative path of dfs Meta data store location' },
        { name: 'dfsMetaLogFilename', value: '', default: 'DFSMetaLog', tip: 'Edit log file of distributed file system metadata on controller node.'},
        { name: 'dfsReplicationFactor', value: 'int', default: '2', tip: 'The number of replicas for each table partition or file block (not including the original copy). The default value is 2.' },
        { name: 'dfsReplicaReliabilityLevel', text: ['Multiple Replications Per Node (value 0)', 'One Replication Per Node (value 1)'], value: [0, 1], default: '0', tip: 'Whether multiple replicas can reside on a node. 0: Yes; 1: No. The default value is 0.' },
        { name: 'dfsRecoveryWaitTime', value: 'int', default: '', tip: 'The time (in milliseconds) the controller waits after a table partition or file block goes offline before recovering it. The default value is 30000 (ms).' },
        { name: 'enableDFS', value: [0, 1], default: '1', tip: 'Enable the distributed file system. The default value is 1.' },
        { name: 'enableHTTPS', value: [0, 1], default: '0', tip: 'Enable the HTTPS Protocal for cluster manager. The default value is 0.' },
        { name: 'dataSync', value: [0, 1], default: '0', tip: 'Whether to enable data recovery after power outage. The default value is 0.' },
        { name: 'webLoginRequired',value: [false, true], default: 'false', tip: 'Whether a user must log in before using the web-based cluster manager. The default value is false.' },
        { name: 'PublicName', value: '', default: '', tip: 'Control node extranet IP or domain name.'},
        { name: 'datanodeRestartInterval', value: 'int', default: '', tip: ''},
        { name: 'dfsHAMode', value: '', default: '=Raft', tip: 'Whether multiple control nodes form a Raft group.'}
    ]

    function loadRules() {
        ruleNumber = 0;
        for (var i = 0, len = ruleData.length; i < len; i++)
            ruleData[i].elem.remove();
        ruleData = [];

        scriptExecutor.run('loadControllerConfigs()', function (res) {
            if (res.resultCode === '0') {
                var confs = res.object[0].value;
                for (var i = 0, len = configs.length; i < len; i++) {
                    for (var j = 0, jlen = confs.length; j < jlen; j++) {
                        var config = confs[j].split('=')
                        if (config.length !== 2) {
                            console.log('Unknown datanode config: ' + confs[i])
                            continue;
                        }
                        var ruleTypeText = config[0];
                        if (configs[i].name === ruleTypeText) {
                            addRule(i, config[1]);
                            break;
                        }
                    }
                    if (j === jlen)
                        addRule(i, '');
                }
            }
        })
    }

    function addRule(ruleType, ruleValue) {
        $('#text-cnt-config-rule-saved').attr('style', 'display: none;');
        var ruleId = ruleNumber++;
        var newRule = $('<div />', {
            class: 'form-group' + (configs[ruleType].required ? ' required' : ''),
            id: 'controller-config-' + ruleId
        });

        // var ruleTypeSelect = $('<select />', { class: 'form-control config-type' });
        // $('<option value selected disabled>Choose a configuration parameter</option>').appendTo(ruleTypeSelect);
        // for (var i = 0, len = configs.length; i < len; i++) {
        //     $('<option />', {
        //         value: i,
        //         text: configs[i].name,
        //         title: configs[i].tip
        //     }).appendTo(ruleTypeSelect);
        // }
        // if (typeof ruleType !== 'undefined')
        //     ruleTypeSelect.val(ruleType)
        // ruleTypeSelect.appendTo(ruleTypeWrap);
        ruleTypeLabel = $('<label />', {
            class: 'col-xs-3 control-label',
            text: configs[ruleType].name
        });
        ruleTypeLabel.appendTo(newRule);

        var ruleValueWrap = $('<div />', { class: 'col-xs-9' });
        var ruleValueContent;

        function setRuleValue(ruleType, ruleValue) {
            $('#rule-value-content-' + ruleId).remove();
            var selected = typeof ruleType !== 'undefined' ? ruleType : $(this).val();
            var value = configs[selected].value;
            var text = configs[selected].text;
            if (Array.isArray(value)) {
                ruleValueContent = $('<select />', {
                    class: 'form-control rule-value-content',
                    disabled: configs[selected].disabled ? true : false,
                    id: 'rule-value-content-' + ruleId
                });
                for (var i = 0, len = value.length; i < len; i++) {
                    $('<option />', {
                        value: value[i],
                        text: typeof text === 'undefined' ? value[i] : text[i],
                        title: configs[selected].tip
                    }).appendTo(ruleValueContent);
                }
                ruleValueContent.val(configs[selected].default);
            } else if (value === 'int') {
                ruleValueContent = $('<input />', {
                    class: 'form-control rule-value-content',
                    id: 'rule-value-content-' + ruleId,
                    type: 'number',
                    min: '0',
                    disabled: configs[selected].disabled ? true : false,
                    placeholder: configs[selected].default,
                    title: configs[selected].tip
                })
            } else if (value === 'password') {
                ruleValueContent = $('<input />', {
                    class: 'form-control rule-value-content',
                    id: 'rule-value-content-' + ruleId,
                    type: 'password',
                    disabled: configs[selected].disabled ? true : false,
                    placeholder: configs[selected].default,
                    title: configs[selected].tip
                })
            } else if (value === '') {
                ruleValueContent = $('<input />', {
                    class: 'form-control rule-value-content',
                    id: 'rule-value-content-' + ruleId,
                    type: 'text',
                    disabled: configs[selected].disabled ? true : false,
                    placeholder: configs[selected].default,
                    title: configs[selected].tip
                })
            }
            if (ruleValue)
                ruleValueContent.val(ruleValue)
            ruleValueContent.keyup(function () {
                $('#text-cnt-config-rule-saved').attr('style', 'display: none');
                $('#btn-save-cnt-config-rule').attr('disabled', false);
            });
            ruleValueContent.change(function () {
                $('#text-cnt-config-rule-saved').attr('style', 'display: none');
                $('#btn-save-cnt-config-rule').attr('disabled', false);
            });
            ruleValueContent.appendTo(ruleValueWrap);
            ruleValueWrap.appendTo(newRule);
        }
        //ruleTypeSelect.change(function() { setRuleValue.bind(this)(); });
        if (typeof ruleType !== 'undefined')
            setRuleValue(ruleType, ruleValue);

        // var btnRemove = $('<button type="button" class="btn btn-default"><span class="glyphicon glyphicon-minus"></span></button>').appendTo(newRule);
        // btnRemove.click(function() {
        //     $('#text-cnt-config-rule-saved').attr('style', 'display: none;');
        //     $('#controller-config-' + ruleId).remove();
        //     ruleData[ruleId].deleted = true;
        // });

        ruleData.push({ elem: newRule }); //, deleted: false })
        newRule.appendTo($('#cnt-config-rule-list'));
    }

    function saveRules() {
        var script = "saveControllerConfigs([";
        var ruleLines = [];
        for (var i = 0, len = ruleData.length; i < len; i++) {
            var rule = ruleData[i];
            // if (rule.deleted)
            //     continue;
            var ruleElem = rule.elem;
            var configValue = ruleElem.find('.rule-value-content').val();
            var ruleLine = '"';
            if (configs[i].required && configValue === '') {
                alert('Configuration "' + configs[i].name + '" is required.');
                return;
            }
            if (configValue !== '')
                ruleLine += configs[i].name + '=' + configValue + '"';
            else
                continue;
            ruleLines.push(ruleLine)
        }
        script += ruleLines.join(',');
        script += '])';
        script = encodeURIComponent(script);

        scriptExecutor.run(script, function (res) {
            if (res.resultCode === '0') {
                $('#text-cnt-config-rule-saved').attr('style', '');
                $('#btn-save-cnt-config-rule').attr('disabled', true);
            } else {
                alert(res.msg);
            }
        })
    }

    $('#cnt-config-rule-list').change(function (e) {
        $('#text-cnt-config-rule-saved').attr('style', 'display: none;');
    });
    //$('#btn-add-cnt-config-rule').click(function() { addRule(); });
    $('#btn-save-cnt-config-rule').click(function () {
        //if (confirm("This operation will rewrite your controller config file. Continue saving?"))
        saveRules();
    });
    $('#btn-close-cnt-config-rule').click(function () {
        var container = window.parent;
        container.closeDialog('controller-config');
    });
    loadRules();
    refreshMe = loadRules;
}

function NodesSetup() {
    var datanodeNum = 0;
    var controller = GetFullUrl(window.location.host);
    var scriptExecutor = new CodeExecutor(controller);
    var datanodes = [];
    var existingAgents = [];
    var existingDatanodes = [];
    var existingControllers = [];
    // new Computenodes
    var existingComputenodes = [];
    function loadDatanodes() {

        scriptExecutor.run("getClusterNodesCfg()", function (res) {
            existingAgents = [];
            existingDatanodes = [];
            existingControllers = [];
            existingComputenodes =[];
            if (res.resultCode === '0') {
                var nodes = res.object[0].value;
                for (var i = 0, len = nodes.length; i < len; i++) {
                    var site = nodes[i].split(",")[0];
                    var mode = nodes[i].split(",")[1];

                    if (mode.toLowerCase() === "agent")
                        existingAgents.push(site);
                    else if (mode.toLowerCase() === "datanode")
                        existingDatanodes.push(site);
                    else if (mode.toLowerCase() === "controller")
                        existingControllers.push(site);
                    else if (mode.toLowerCase()=== "computenode")
                        existingComputenodes.push(site);
                }
                genNodeTable();
                if (existingAgents.length > 0)
                    useExistingAgent(); // default 'new agent' not checked
                else {
                    var newAgentInput = $("#batch-add-new-agent");
                    newAgentInput.attr('checked', 'checked');
                    useNewAgent();
                }
            } else {
                alert(res.msg)
            }
        });
        datanodeNum = 0;
        for (var i = 0, len = datanodes.length; i < len; i++)
            datanodes[i].elem.remove();
        datanodes = [];

        $('#btn-save-datanodes').attr('disabled', false);
        $('#text-datanodes-saved').attr('style', 'display: none');
    }

    function genNodeTable() {
        var nodes = [];
        for (var i = 0, len = existingControllers.length; i < len; i++) {
            var datanodeDetails = existingControllers[i].split(':');
            if (datanodeDetails.length !== 3)
                continue;
            nodes.push({
                Host: datanodeDetails[0],
                Port: datanodeDetails[1],
                Alias: datanodeDetails[2],
                Mode: 'controller'
            })
        }
        for (var i = 0, len = existingAgents.length; i < len; i++) {
            var datanodeDetails = existingAgents[i].split(':');
            if (datanodeDetails.length !== 3)
                continue;
            nodes.push({
                Host: datanodeDetails[0],
                Port: datanodeDetails[1],
                Alias: datanodeDetails[2],
                Mode: 'agent'
            })
        }
        for (var i = 0, len = existingDatanodes.length; i < len; i++) {
            var datanodeDetails = existingDatanodes[i].split(':');
            if (datanodeDetails.length !== 3)
                continue;
            nodes.push({
                Host: datanodeDetails[0],
                Port: datanodeDetails[1],
                Alias: datanodeDetails[2],
                Mode: 'datanode'
            })
        }
        // new computenode
        for (var i = 0, len = existingComputenodes.length; i < len; i++) {
            var datanodeDetails = existingComputenodes[i].split(':');
            if (datanodeDetails.length !== 3)
                continue;
            nodes.push({
                Host: datanodeDetails[0],
                Port: datanodeDetails[1],
                Alias: datanodeDetails[2],
                Mode: 'computenode'
            })
        }

        $('#node-list').jsGrid({
            height: "540px",
            width: "100%",

            editing: true,
            inserting: true,
            sorting: true,
            paging: true,

            pageSize: 15,
            pageButtonCount: 5,

            confirmDeleting: false,

            data: nodes,
            rowClick: function (args) {
                return false;
            },
            fields: [
                { name: 'Host', type: 'text', align: "center" },
                { name: 'Port', type: 'number',align: "center" },
                { name: 'Alias', type: 'text', align: "center" },
                { name: 'Mode', type: 'select', items: [{ name: 'agent' }, { name: 'datanode' }, { name: 'controller' },{name: 'computenode'}], valueField: 'name', textField: 'name' },
                {
                    type: 'control',
                    itemTemplate: function (value, item) {
                        var $result = $([]);

                        if (item.Mode == "datanode" || item.Mode == "computenode") {
                            $result = $result.add(this._createEditButton(item));
                            $result = $result.add(this._createDeleteButton(item));
                        }

                        // if (item.Mode == "datanode") {
                        //     $result = $result.add(this._createDeleteButton(item));
                        // }

                        return $result;
                    }
                }
            ],

            insertTemplate: function () {
                var $insertControl = jsGrid.fields.select.prototype.insertTemplate.call(this);
                $insertControl.on('change', function () {
                    $('#text-datanodes-saved').attr('style', 'display: none');
                    $('#btn-save-datanodes').attr('disabled', false);
                });
                //return $insertControl;
            }
        });
    }

    function batchAddDatanodes() {
        var agentSite = $('#batch-add-agent-site').val();
        var numOfNodes = $('#batch-add-number-of-nodes').val();
        var datanodePrefix = $('#batch-add-datanode-prefix').val();
        var prefixStartNumber = $('#batch-add-prefix-start-num').val();
        var startingPort = $('#batch-add-starting-port').val();

        if (agentSite === null || agentSite.split(':').length !== 3) {
            alert('Invalid agent site');
            return;
        }
        var agentHostPortAlias = agentSite.split(':');
        var agentHost = agentHostPortAlias[0];
        var agentPort = parseInt(agentHostPortAlias[1], 10);
        var agentAlias = agentHostPortAlias[2];

        if ($('#batch-add-new-agent').is(':checked')) {
            for (var i = 0, len = existingAgents.length; i < len; i++) {
                var host = existingAgents[i].split(':')[0];
                if (agentHost === host) {
                    alert('Agent host already existed');
                    return;
                }
            }
        }

        if (isNaN(agentPort) || agentPort < 0) {
            alert('Invalid agent port');
            return;
        }

        numOfNodes = parseInt(numOfNodes, 10);
        if (isNaN(numOfNodes) || numOfNodes > 1000) {
            alert('Please input a valid number of datanodes');
            return;
        }

        if (datanodePrefix === null) {
            alert('Please input a valid datanode prefix');
            return;
        }

        prefixStartNumber = parseInt(prefixStartNumber, 10);
        if (isNaN(prefixStartNumber))
            prefixStartNumber = 1;

        startingPort = parseInt(startingPort, 10);
        if (isNaN(startingPort) || startingPort === null) {
            alert('Please input a valid starting port');
            return;
        }

        var nodeList = $('#node-list').jsGrid('option', 'data');
        if ($('#batch-add-new-agent').is(':checked')) {
            var agentLine = { Host: agentHost, Port: agentPort, Alias: agentAlias, Mode: 'agent' };
            existingAgents.push(agentSite);
            nodeList.push(agentLine);
        }
        for (var i = 0; i < numOfNodes; i++) {
            var datanodeLine = { Host: agentHost, Port: startingPort + i, Alias: datanodePrefix + (i + prefixStartNumber), Mode: 'datanode' };
            var datanodeSite = datanodeLine.Host + ':' + datanodeLine.Port + ':' + datanodeLine.Alias;
            existingDatanodes.push(datanodeSite)
            nodeList.push(datanodeLine);
        }
        $('#batch-add-agent-site').val(null);
        $('#batch-add-number-of-nodes').val(null);
        $('#batch-add-datanode-prefix').val(null);
        $('#batch-add-starting-port').val(null);
        $('#node-list').jsGrid('option', 'data', nodeList);
    }

    function saveDatanodes() {
        var script = "saveClusterNodes([";

        var nodeLines = [];
        var nodeList = $('#node-list').jsGrid("option", "data");
        console.log(nodeList);
        var ctlServer = new ControllerServer(controller);
        var currentNodes = new DolphinEntity(ctlServer.getClusterPerf()).toScalar()[11].value;
        console.log(currentNodes);
        for (var i = 0, len = nodeList.length; i < len; i++) {

            var node = nodeList[i];
            var host = node.Host;
            var port = node.Port;
            var alias = node.Alias;
            var mode = node.Mode;
            if (mode == "datanode") {
                if (currentNodes.indexOf(node.Alias) < 0) {
                    ctlServer.addNode(host, port, alias);
                   
                }
            }

            if (mode == "computenode") {
                if (currentNodes.indexOf(node.Alias) < 0) {
                    ctlServer.addComputeNode(host, port, alias);
                   
                }
            }
            
            if (host && port && alias && mode) {
                var nodeLine = '"' + host + ':' + port + ':' + alias + ',' + mode + '"';
                nodeLines.push(nodeLine)
            }

        }
        // console.log(nodeLines);
        script += nodeLines.join(',');
        script += '])';
        script = encodeURIComponent(script);
        console.log(script);
        scriptExecutor.run(script, function (res) {
            // console.log(res);
            if (res.resultCode === '0') {
                $('#text-datanodes-saved').attr('style', '');
                $('#btn-save-datanodes').attr('disabled', true);
            } else {
                alert(res.msg);
            }
        })
    }

    function useNewAgent() {
        var agentWrap = $('#batch-add-agent-wrap')
        agentWrap.empty();
        var agentContent = $('<input />', {
            class: 'form-control',
            id: 'batch-add-agent-site',
            type: 'text',
            placeholder: 'host:port:alias',
            title: 'e.g. localhost:8800:agent1'
        });
        agentContent.appendTo(agentWrap);
    }

    function useExistingAgent() {
        var agentWrap = $('#batch-add-agent-wrap')
        agentWrap.empty();
        var agentContent = $('<select />', {
            class: 'form-control agent-host',
            id: 'batch-add-agent-site'
        });
        $('<option value selected disabled>Choose an agent site</option>').appendTo(agentContent);
        for (var i = 0, len = existingAgents.length; i < len; i++) {
            $('<option />', {
                value: existingAgents[i],
                text: existingAgents[i]
            }).appendTo(agentContent);
        }
        agentContent.appendTo(agentWrap);
    }

    $('#batch-add-new-agent').change(function () {
        if (this.checked)
            useNewAgent();
        else
            useExistingAgent();
    });

    $('#batch-add-datanodes').change(function () {
        $('#text-datanodes-saved').attr('style', 'display: none;');
    })
    $('#btn-batch-add-datanodes').click(batchAddDatanodes);
    $('#btn-save-datanodes').click(function () {
        if (confirm("This operation will rewrite your cluster.nodes file. Continue saving?"))
            saveDatanodes();
    });

    $('#btn-close-datanodes').click(function () {
        var container = window.parent;
        container.closeDialog('nodes-setup');
    });
    loadDatanodes()
    refreshMe = loadDatanodes;
}