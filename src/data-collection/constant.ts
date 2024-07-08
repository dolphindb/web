import { Protocol } from './type.js'

export const protocols = [Protocol.MQTT, Protocol.KAFKA]

export const kafka_params_doc_link = 'https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md'


export const template_code = `
    def mqttTemplate(outTableName,args,topic,msg){
        /*
            outTableName 为数据存储表名
            args 为自定义参数（可任意自定义）
            topic 为订阅mqtt数据的topic名称
            msg 为接收到的消息
        */
    }
            
     def kafkaTemplate(args,msg,key,topic){
        /*
            args 为自定义参数（可任意自定义）
            topic 为订阅kafka数据的topic名称
            msg 为接收到的消息
            key 为接收到的消息所对应的key值
            @return 需要为一个表
        */
    }
`
