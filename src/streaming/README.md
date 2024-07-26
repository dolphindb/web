# 组件文档

## 组件的公用方法

- **useConnectDDB**
    
    
    自定义钩子，用来连接DDB数据库，配置参数：url(可选)，username，password，table；回调参数：onSuccess（可选）连接成功的回调，onError（可选）连接失败的回调。
    
- **handleMessage2Data**
    
    用于处理数据格式，将StreamingData数据格式转化为js对象。
    
- **onReceivedStreamingData**
    
    每次数据流推数据之后，调用此函数，用来保存数据。
    
- **filterData**
    
    对于非时间切片组件而言的特有方法，用于过滤特定时间内的数据
    

## 组件介绍

组件的公共传参

**props：**

- url?：期望连接的ws url
- table：表名
- username：用户名
- password：密码
- onError?：出错的回调函数

### StreamingError出错遮罩层组件

一个遮罩层组件，当图像组件出现错误时，将覆盖图形组件，并展示错误信息。

**props：**

- error：错误对象

接受一个如下类型error对象

```jsx
erroe: {
	appear: boolean // 是否出现错误
	msg：string // 错误信息
}
```

### StreamingHeatMap热力图组件

有一个初始最小高度，超过此高度能够自适应外部容器。


**props：**

- properties：期望展示的属性名，对应的数据必须是数字类型
- max?：最大值，若不传，则会自动计算当前数据中的最大值
- min?：同上
- sort?：排序方式，默认不排序，ASC / DESC
- column?：一行展示的列数，默认为3

**state：**

- data：存放数据截面
- error：错误对象

### StreamingLine折线图组件

用来展示特定时间间隔之间的数据

两种模式，尺寸自适应，宽或高固定（传入width或height）


**props：**

- time_variable：时间变量
- properties：期望展示的属性值
- duration：期望展示多长时间内的数据，例如10s内等
- height?：默认高度自适应，传入则固定高度
- width?：同上

**state：**

- pres_data：当前的数据对象
- drawing：是否处于绘制状态
- error：错误对象

**memo：**

- options：基于table, time_variable, properties, pres_data动态计算当前的options配置，并更新视图信息。

**ref：**

- chart：图表实例
- container：图表容器

### StreamingSection表格组件

目前不支持自适应高度，宽度可以自适应。


**props：**

- properties：期望展示的keys
- column?：每行列数，默认是3
- layout?：布局模式，默认是horizontal

### StreamingSortBar排序柱状图组件


**props：**

- properties：期望展示的keys
- sort?：排序方式
- animationDuration?：排序动画过渡时间
- height?
- width?

### StreamingKLine蜡烛图组件


和折线图很像，只是传参不同

**props：**

- time_variable：时间变量
- duration：期望展示X 毫秒内的数据
- opening_price_variable：描述开盘价的变量名
- closing_price_variable：描述收盘价的变量名
- maximum_price_variable：描述最高价的变量名
- minmum_price_variable：描述最低价的变量名
- height?：不传则自适应外部容器
- width?

### ScatterConfigType散点图组件


有三个维度来描述数据：

1. 点的x，y坐标
2. 点的尺寸（可选）
3. 点的颜色（可选）

**props：**

- x_variable：x维度变量名
- y_variable：y维度变量名
- x_type?：x轴数据类型（时间戳、数值、字符）默认是字符串
- y_type?：y轴数据类型（数值、字符串）默认是字符串
- size_variable?：描述散点尺寸的变量名称
- color_variable?：描述散点颜色深浅的变量名称
- height?
- width?