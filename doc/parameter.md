# 参数格式
parameters Json format：
* Vector:
```sh
{"name":"employer","DF":"vector","DT":"Double","value":[1,2,3,4,5,6,7,8]}   
```
* Set:
```sh
{"name":"employer","DF":"set","DT":"Double","value":[1,2,3]} 
```
* Dictionary: 
```sh
{"name":"employer","DF":"dictionary","DT":"Double","value":
[{"name":"employer","DF":"vector","DT":"Double","value":[1,2,3,4,5,6,7,8]},
{"name":"employer","DF":"vector","DT":"Double","value":[1,2,3,4,5,6,7,8]}]}
```
* Table
```sh
{"name":"employer","DF":"table", DT":"Double","value":
[{"name":"employer","DF":"vector","DT":"Double","value":[1,2,3,4,5,6,7,8]},
{"name":"employer","DF":"vector","DT":"Double","value":[1,2,3,4,5,6,7,8]}]}
```
* Matrix:
```sh
{"name":"employer","DF":"matrix",	"DT":"Double","value":  \
[
 {"name":"data","  DF":"vector","DT":"string","value":[1,2,3,4,5,6,7,8]},\
 {"name":"row","   DF":"scalar","DT":"Int","value":4},\
 {"name":"col","   DF":"scalar","DT":"Int","value":2} ]}
{"name":"rowlable","DF":"vector","DT":"string","value":[1,2,3,4]},\
 {"name":"collable","DF":"vector","DT":"string","value":[1,2]},\
]
```
* Scalar:
```sh
{"name":"employer","DF":"scalar","DT":"Int"," value":"100"}
```
