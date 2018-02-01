function DatanodeConfig() {
	var ruleNumber = 0;
	var controller = "http://" + window.location.host;
	var scriptExecutor = new CodeExecutor(controller);
	var ruleData = [];
	var configs = [
		{ name: 'batchJobDir', value: '', default: '<HomeDir>/batchJobs' },
		{ name: 'console', value: [0, 1], default: '0' },
		{ name: 'home', value: '', default: '' },
		{ name: 'jobLogFile', value: '', default: 'nodeAlias_job.log' },
		{ name: 'localExecutor', value: 'int', default: 'CPU core number - 1' },
		{ name: 'logFile', value: '', default: 'DolphinDB.log' },
		{ name: 'maxBatchJobWorker', value: 'int', default: '= workerNum' },
		{ name: 'maxConnections', value: 'int', default: '' },
        { name: 'maxConnectionPerSite', value: 'int', default: '' },
        { name: 'maxDynamicWorker', value: 'int', default: '= workerNum' },
        { name: 'maxMemSize', value: 'int', default: '' },
        { name: 'perfMonitoring', value: [0, 1], default: 1 },
        { name: 'regularArrayMemoryLimit', value: 'int', default: 512 },
        { name: 'run', value: '', default: '' },
        { name: 'script', value: '', default: 'dolphindb.dos' },
        { name: 'tcpNoDelay', value: [0, 1], default: '0' },
        { name: 'webRoot', value: '', default: '' },
        { name: 'webWorkerNum', value: 'int', default: '2' },
        { name: 'workerNum', value: 'int', default: '4' },
		{ name: 'allowVolumeCreation', value: [0, 1], default: '1' },
		{ name: 'volumes', value: '', default: '' },
		{ name: 'maxPubConnections', value: 'int', default: '' },
		{ name: 'maxSubConnections', value: 'int', default: '' },
		{ name: 'subExecutors', value: 'int', default: '0' },
		{ name: 'subPort', value: 'int', default: '' }
	]

	function loadRules() {
		ruleNumber = 0;
		for (var i = 0, len = ruleData.length; i < len; i++)
			ruleData[i].elem.remove();
		ruleData = [];

		scriptExecutor.run('loadClusterNodesConfigs()', function(res) {
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
					}
					else if (datanodeConf.length === 2) {
						var datanode = datanodeConf[0];
						var ruleTypeText = datanodeConf[1]; 
					}
					else {
						var datanode = '';
						var ruleTypeText = datanodeConf[0];
					}

					for (var j = 0, clen = configs.length; j < clen; j++) {
						if (configs[j].name == ruleTypeText) {
							addRule(datanode, j, config[1]);
							break;
						}
					}
				}
			}
		})
	}

	function addRule(datanode, ruleType, ruleValue) {
		$('#text-dn-config-rule-saved').attr('style', 'display: none;');
		var ruleId = ruleNumber++;
		var newRule = $('<div />', {
			class: 'form-group',
			id: 'datanode-config-' + ruleId
		});

		var datanodeWrap = $('<div />', { class: 'col-xs-4 col-md-4 col-lg-4' });
		var datanodeInput = $('<input />', {
			type: 'text',
			class: 'form-control datanode-pattern',
			id: 'datanode-config-datanode-' + ruleId,
			name: 'datanode-config-datanode-' + ruleId,
			placeholder: 'e.g. dn1 or dn% or empty'
		});
		if (datanode)
			datanodeInput.val(datanode)
		datanodeInput.appendTo(datanodeWrap);
		datanodeWrap.appendTo(newRule);

		var ruleTypeWrap = $('<div />', { class: 'col-xs-3 col-md-3 col-lg-3' });
		var ruleTypeSelect = $('<select />', { class: 'form-control config-type' });
		$('<option value selected disabled>Configuration parameter</option>').appendTo(ruleTypeSelect);
		for (var i = 0, len = configs.length; i < len; i++) {
			$('<option />', {
				value: i,
				text: configs[i].name
			}).appendTo(ruleTypeSelect);
		}
		if (typeof ruleType !== 'undefined')
			ruleTypeSelect.val(ruleType)
		ruleTypeSelect.appendTo(ruleTypeWrap);
		ruleTypeWrap.appendTo(newRule);

		var ruleValueWrap = $('<div />', { class: 'col-xs-4 col-md-4 col-lg-4' });
		var ruleValueContent;

		function setRuleValue(ruleType, ruleValue) {
			$('#text-dn-config-rule-saved').attr('style', 'display: none;');
			$('#rule-value-content-' + ruleId).remove();
			var selected = typeof ruleType !== 'undefined' ? ruleType : $(this).val();
			var value = configs[selected].value;
			if (Array.isArray(value)) {
				ruleValueContent = $('<select />', {
					class: 'form-control rule-value-content',
					id: 'rule-value-content-' + ruleId
				});
				for (var i = 0, len = value.length; i < len; i++) {
					$('<option />', {
						value: value[i],
						text: value[i]
					}).appendTo(ruleValueContent);
				}
                ruleValueContent.val(configs[selected].default);
			}
			else if (value === 'int') {
				ruleValueContent = $('<input />', {
					class: 'form-control rule-value-content',
					id: 'rule-value-content-' + ruleId,
					type: 'number',
					min: '0',
					placeholder: configs[selected].default
				})
			}
			else if (value === '') {
				ruleValueContent = $('<input />', {
					class: 'form-control rule-value-content',
					id: 'rule-value-content-' + ruleId,
					type: 'text',
					placeholder: configs[selected].default
				})
			}
			if (ruleValue)
				ruleValueContent.val(ruleValue)
			ruleValueContent.appendTo(ruleValueWrap);
			ruleValueWrap.appendTo(newRule);
		}
		ruleTypeSelect.change(function() { setRuleValue.bind(this)(); });
		if (typeof ruleType !== 'undefined')
			setRuleValue(ruleType, ruleValue);

		var btnRemove = $('<button type="button" class="btn btn-default"><span class="glyphicon glyphicon-minus"></span></button>').appendTo(newRule);
		btnRemove.click(function() {
			$('#text-dn-config-rule-saved').attr('style', 'display: none;');
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
			var ruleLine = '"';
			if (datanodePattern !== '')
				ruleLine += datanodePattern + '.'
			if (configIndex !== null && configValue !== '')
				ruleLine += configs[configIndex].name + '=' + configValue + '"';
			else
				continue;
			ruleLines.push(ruleLine)
		}
		script += ruleLines.join(',');
		script += '])';
		script = encodeURIComponent(script);
		
		scriptExecutor.run(script, function(res) {
			if (res.resultCode === '0') {
				$('#text-dn-config-rule-saved').attr('style', '');
			}
		})
	}

	$('#btn-add-dn-config-rule').click(function() { addRule(); });
	$('#btn-save-dn-config-rule').click(saveRules);
	loadRules();
	refreshMe = loadRules;
}

function ControllerConfig() {
	var ruleNumber = 0;
	var controller = "http://" + window.location.host;
	var scriptExecutor = new CodeExecutor(controller);
	var ruleData = [];
	var configs = [
        { name: 'mode', value: ['controller'], default: 'controller' },
        { name: 'localSite', value: '', default: '' },
		{ name: 'clusterConfig', value: '', default: 'cluster.cfg' },
		{ name: 'clusterUser', value: '', default: '' },
		{ name: 'clusterPwd', value: '', default: '' },
		{ name: 'nodesFile', value: '', default: 'nodes.cfg' },
		{ name: 'dfsMetaDir', value: '', default: '' },
		{ name: 'dfsReplicationFactor', value: 'int', default: '1' },
		{ name: 'dfsReplicaReliabilityLevel', value: [0, 1], default: '0' },
		{ name: 'dfsRecoveryWaitTime', value: 'int', default: '30000' },
		{ name: 'enableDFS', value: [0, 1], default: '1' }
	]

	function loadRules() {
		ruleNumber = 0;
		for (var i = 0, len = ruleData.length; i < len; i++)
			ruleData[i].elem.remove();
		ruleData = [];

		scriptExecutor.run('loadControllerConfigs()', function(res) {
			if (res.resultCode === '0') {
				var confs = res.object[0].value;
				for (var i = 0, len = confs.length; i < len; i++) {
					var config = confs[i].split('=');
					if (config.length !== 2) {
						console.log('Unknown datanode config: ' + confs[i])
						continue;
					}
					var ruleTypeText = config[0];

					for (var j = 0, clen = configs.length; j < clen; j++) {
						if (configs[j].name == ruleTypeText) {
							addRule(j, config[1]);
							break;
						}
					}
				}
			}
		})
	}

	function addRule(ruleType, ruleValue) {
		$('#text-cnt-config-rule-saved').attr('style', 'display: none;');
		var ruleId = ruleNumber++;
		var newRule = $('<div />', {
			class: 'form-group',
			id: 'controller-config-' + ruleId
		});

		var ruleTypeWrap = $('<div />', { class: 'col-xs-5 col-md-5 col-lg-5' });
		var ruleTypeSelect = $('<select />', { class: 'form-control config-type' });
		$('<option value selected disabled>Choose a configuration parameter</option>').appendTo(ruleTypeSelect);
		for (var i = 0, len = configs.length; i < len; i++) {
			$('<option />', {
				value: i,
				text: configs[i].name
			}).appendTo(ruleTypeSelect);
		}
		if (typeof ruleType !== 'undefined')
			ruleTypeSelect.val(ruleType)
		ruleTypeSelect.appendTo(ruleTypeWrap);
		ruleTypeWrap.appendTo(newRule);

		var ruleValueWrap = $('<div />', { class: 'col-xs-6 col-md-6 col-lg-6' });
		var ruleValueContent;

		function setRuleValue(ruleType, ruleValue) {
			$('#text-cnt-config-rule-saved').attr('style', 'display: none;');
			$('#rule-value-content-' + ruleId).remove();
			var selected = typeof ruleType !== 'undefined' ? ruleType : $(this).val();
			var value = configs[selected].value;
			if (Array.isArray(value)) {
				ruleValueContent = $('<select />', {
					class: 'form-control rule-value-content',
					id: 'rule-value-content-' + ruleId
				});
				for (var i = 0, len = value.length; i < len; i++) {
					$('<option />', {
						value: value[i],
						text: value[i]
					}).appendTo(ruleValueContent);
				}
                ruleValueContent.val(configs[selected].default);
			}
			else if (value === 'int') {
				ruleValueContent = $('<input />', {
					class: 'form-control rule-value-content',
					id: 'rule-value-content-' + ruleId,
					type: 'number',
					min: '0',
					placeholder: configs[selected].default
				})
			}
			else if (value === '') {
				ruleValueContent = $('<input />', {
					class: 'form-control rule-value-content',
					id: 'rule-value-content-' + ruleId,
					type: 'text',
					placeholder: configs[selected].default
				})
			}
			if (ruleValue)
				ruleValueContent.val(ruleValue)
			ruleValueContent.appendTo(ruleValueWrap);
			ruleValueWrap.appendTo(newRule);
		}
		ruleTypeSelect.change(function() { setRuleValue.bind(this)(); });
		if (typeof ruleType !== 'undefined')
			setRuleValue(ruleType, ruleValue);

		var btnRemove = $('<button type="button" class="btn btn-default"><span class="glyphicon glyphicon-minus"></span></button>').appendTo(newRule);
		btnRemove.click(function() {
			$('#text-cnt-config-rule-saved').attr('style', 'display: none;');
			$('#controller-config-' + ruleId).remove();
			ruleData[ruleId].deleted = true;
		});

		ruleData.push({ elem: newRule, deleted: false })
		newRule.appendTo($('#cnt-config-rule-list'))
	}

	function saveRules() {
		var script = "saveControllerConfigs([";
		var ruleLines = [];
		for (var i = 0, len = ruleData.length; i < len; i++) {
			var rule = ruleData[i];
			if (rule.deleted)
				continue;
			var ruleElem = rule.elem;
			var configIndex = ruleElem.find('.config-type').val();
			var configValue = ruleElem.find('.rule-value-content').val();
			var ruleLine = '"';
			if (configIndex !== null && configValue !== '')
				ruleLine += configs[configIndex].name + '=' + configValue + '"';
			else
				continue;
			ruleLines.push(ruleLine)
		}
		script += ruleLines.join(',');
		script += '])';
		script = encodeURIComponent(script);

		scriptExecutor.run(script, function(res) {
			if (res.resultCode === '0') {
				$('#text-cnt-config-rule-saved').attr('style', '');
			}
		})
	}

	$('#btn-add-cnt-config-rule').click(function() { addRule(); });
	$('#btn-save-cnt-config-rule').click(saveRules);
	loadRules();
	refreshMe = loadRules;
}

function DatanodeManagement() {
	var datanodeNum = 0;
    var controller = "http://" + window.location.host;
    var scriptExecutor = new CodeExecutor(controller);
	var datanodes = [];

	function initDatanodes() {
		datanodeNum = 0;
		for (var i = 0, len = datanodes.length; i < len; i++)
			datanodes[i].elem.remove();
		datanodes = [];
	}

	function addDatanodes() {
		$('#text-datanodes-saved').attr('style', 'display: none;');
		var datanodeId = datanodeNum++;

		var datanodeLine = $('<div />', {
			class: 'form-group',
			id: 'datanode-line-' + datanodeId
		});

		var agentWrap = $('<div />', { class: 'col-xs-3 col-md-3 col-lg-3' });
		var agentInput = $('<input />', {
			class: 'form-control agent-host',
			type: 'text',
			placeholder: 'Agent Host'
		});
		agentInput.appendTo(agentWrap);
		agentWrap.appendTo(datanodeLine);

		var dnnumWrap = $('<div />', { class: 'col-xs-3 col-md-3 col-lg-3' });
		var dnnumInput = $('<input />', {
			class: 'form-control dnnum',
			type: 'number',
			placeholder: 'Datanode Number',
			min: '0'
		});
		dnnumInput.appendTo(dnnumWrap);
		dnnumWrap.appendTo(datanodeLine);

		var dnprefixWrap = $('<div />', { class: 'col-xs-3 col-md-3 col-lg-3' });
		var dnprefixInput = $('<input />', {
			class: 'form-control dnprefix',
			type: 'text',
			placeholder: 'Datanode Prefix'
		});
		dnprefixInput.appendTo(dnprefixWrap);
		dnprefixWrap.appendTo(datanodeLine);

		var portWrap = $('<div />', { class: 'col-xs-2 col-md-2 col-lg-2' });
		var portInput = $('<input />', {
			class: 'form-control start-port',
			type: 'number',
			placeholder: 'Start port',
			min: '0'
		});
		portInput.appendTo(portWrap);
		portWrap.appendTo(datanodeLine);

		var btnRemove = $('<button type="button" class="btn btn-default"><span class="glyphicon glyphicon-minus"></span></button>').appendTo(datanodeLine);
		btnRemove.click(function() {
			$('#text-datanodes-saved').attr('style', 'display: none;');
			$('#datanode-line-' + datanodeId).remove();
			datanodes[datanodeId].deleted = true;
		});

		datanodes.push({ elem: datanodeLine, deleted: false });
		datanodeLine.appendTo($('#datanodes-list'));
	}

	function saveDatanodes() {
		var script = "saveClusterNodes([";
		var datanodeLines = [];
		for (var i = 0, len = datanodes.length; i < len; i++) {
			var datanodeRule = datanodes[i];
			if (datanodeRule.deleted)
				continue;
			var datanodeElem = datanodeRule.elem;
			var agentHost = datanodeElem.find('.agent-host').val();
			var dnnum = datanodeElem.find('.dnnum').val();
			var dnprefix = datanodeElem.find('.dnprefix').val();
			var startPort = datanodeElem.find('.start-port').val();

			if (agentHost !== null && dnnum !== null && dnprefix !== null && startPort !== null) {
				for (var j = 0; j < dnnum; j++) {
					var datanodeLine = '"' + agentHost + ':' + (parseInt(startPort, 10) + j) + ':' + dnprefix + j + ',"';
					datanodeLines.push(datanodeLine);
				}
			}
		}
		script += datanodeLines.join(',');
		script += '])';
		script = encodeURIComponent(script);

		scriptExecutor.run(script, function(res) {
		 	if (res.resultCode === '0') {
		 		$('#text-cnt-config-rule-saved').attr('style', '');
		 	}
		})
	}

	$('#btn-add-datanodes').click(addDatanodes);
	$('#btn-save-datanodes').click(saveDatanodes);
	refreshMe = initDatanodes;
}