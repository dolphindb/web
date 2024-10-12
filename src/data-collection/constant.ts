import type { FormItemProps } from 'antd'

import { t } from '@i18n/index.js'

import { Protocol } from './type.ts'

/** windows 端不支持 kafka 插件 */
export const protocols =  [Protocol.MQTT, Protocol.KAFKA]

export const PROTOCOL_MAP = {
    [Protocol.MQTT]: 'MQTT',
    [Protocol.KAFKA]: 'Kafka'
}

export const kafka_params_doc_link = 'https://github.com/confluentinc/librdkafka/blob/master/CONFIGURATION.md' as const


export const template_code =
    '    def mqttTemplate(outTableName,args,topic,msg){\n' +
    '        /*\n' +
    '            outTableName 为数据存储表名\n' +
    '            args 为自定义参数（可任意自定义）\n' +
    '            topic 为订阅mqtt数据的topic名称\n' +
    '            msg 为接收到的消息\n' +
    '        */\n' +
    '    }\n' +
    '            \n' +
    '     def kafkaTemplate(args,msg,key,topic){\n' +
    '        /*\n' +
    '            args 为自定义参数（可任意自定义）\n' +
    '            topic 为订阅kafka数据的topic名称\n' +
    '            msg 为接收到的消息\n' +
    '            key 为接收到的消息所对应的key值\n' +
    '            @return 需要为一个表\n' +
    '        */\n' +
    '    }\n'

export const NAME_RULES: FormItemProps['rules'] = [
    { required: true, message: t('请输入名称') },
    { max: 50, message: t('名称不能超过 50 个字符') },
    {
        validator: async (_rule, value) => {
            if (!!value && value?.includes(' ')) 
                return Promise.reject(t('名称不能包含空格'))
            return Promise.resolve()
        }
    }
]
