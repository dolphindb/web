# executeCode

在节点上运行DolphinDB脚本,返回标准格式的Json


* Request Json

```sh
{
    "sessionID":"0",
    "functionName":"executeCode",
    "parameters":
    [
        {"name":"script","DF":"scalar","DT":"string","value":"idkfg=take(`ABC`XYZ, 100).sort!();"}
    ],
    "startIndex":0,
    "pageSize":20
}
```

* Response Json

```sh
{
    "sessionID": "65519587",
    "resultCode": "0", // 0:OK -1:error
    "msg": "",
    "object": [
        {
            "name": "",
            "DF": "table",
            "value": [
                {
                    "name": "name",
                    "DF": "vector",
                    "DT": "string",
                    "size": "0",
                    "value": []
                },
                {
                    "name": "type",
                    "DF": "vector",
                    "DT": "symbol",
                    "size": "0",
                    "value": []
                },
                {
                    "name": "form",
                    "DF": "vector",
                    "DT": "symbol",
                    "size": "0",
                    "value": []
                },
                {
                    "name": "rows",
                    "DF": "vector",
                    "DT": "int",
                    "size": "0",
                    "value": []
                },
                {
                    "name": "columns",
                    "DF": "vector",
                    "DT": "int",
                    "size": "0",
                    "value": []
                },
                {
                    "name": "bytes",
                    "DF": "vector",
                    "DT": "long",
                    "size": "0",
                    "value": []
                },
                {
                    "name": "shared",
                    "DF": "vector",
                    "DT": "bool",
                    "size": "0",
                    "value": []
                }
            ]
        }
    ]
}
```
