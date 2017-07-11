# 参数格式
parameters Json format：
* Vector:
```sh
{"name":"employer","form":"vector","type":"Double","value":[1,2,3,4,5,6,7,8]} 
```
* Set:
```sh
{"name":"employer","form":"set","type":"Double","value":[1,2,3]} 
```
* Dictionary: 
```sh
{"name":"employer","form":"dictionary","type":"Double","value":
[{"name":"employer","form":"vector","type":"Double","value":[1,2,3,4,5,6,7,8]},
{"name":"employer","form":"vector","type":"Double","value":[1,2,3,4,5,6,7,8]}]}
```
* Table
```sh
{"name":"employer","form":"table", "type":"Double","value":
[{"name":"employer","form":"vector","type":"Double","value":[1,2,3,4,5,6,7,8]},
{"name":"employer","form":"vector","type":"Double","value":[1,2,3,4,5,6,7,8]}]}
```
* Matrix:
```sh
{"name":"employer","form":"matrix",	"type":"Double","value":\
[
 {"name":"data","form":"vector","type":"string","value":[1,2,3,4,5,6,7,8]},\
 {"name":"row"," form":"scalar","type":"Int","value":4},\
 {"name":"col"," form":"scalar","type":"Int","value":2} ]}
{"name":"rowlable","form":"vector","type":"string","value":[1,2,3,4]},\
 {"name":"collable","form":"vector","type":"string","value":[1,2]},\
]
```
* Scalar:
```sh
{"name":"employer","form":"scalar","type":"Int"," value":"100"}
```
