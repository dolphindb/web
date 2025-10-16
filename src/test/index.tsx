import './index.sass'

import { useEffect } from 'react'

import { Button } from 'antd'

import { DDB } from 'dolphindb/browser.js'

import { model } from '@model'

import { StreamingTable } from '@/obj.tsx'



export function Test () {
    const { ddb: { url, username, password } } = model
    
    useEffect(() => {
        
    }, [ ])
    
    return <>
        <div className='title'>测试模块</div>
        
        <Button onClick={async () => {
            model.ddb.execute(
                'n=20000\n' +
                'colNames = `time`sym`qty`price\n' +
                'colTypes = [TIME,SYMBOL,INT,DOUBLE]\n' +
                'try {\n' +
                '    enableTableShareAndPersistence(table=streamTable(n:0, colNames, colTypes), tableName="trades_stream", asynWrite=false, cacheSize=n)\n' +
                '} catch (error) { }\n' +
                'go\n' +
                
                'do {\n' +
                '    sleep(5000)\n' +
                '    n=5\n' +
                '    time =take(now().time(),n)\n' +
                '    sym =take(`a`b`c,n)\n' +
                '    qty =take([6000,1000,100,1000],n)\n' +
                '    price=rand(10.,n)\n' +
                '    tb=table(time,sym,qty,price)\n' +
                '    objByName("trades_stream").append!(tb)\n' +
                '} while (true)\n'
            )
            
            let sddb = new DDB(model.ddb.url, {
                autologin: true,
                streaming: {
                    table: 'trades_stream',
                    
                    filters: {
                        expression: 'qty < 10'
                    },
                    
                    // 流数据处理回调, message 的类型是 StreamingMessage
                    handler (message) {
                        console.log('接收到的流表:', message.data.data)
                    }
                }
            })
            
            sddb.connect()
        }}>开始测试流表 filter 收到表</Button>
        
        <div className='obj-result themed page'>
            <StreamingTable
                ctx='page'
                url={url}
                username={username}
                password={password}
                on_error={error => {
                    model.show_error({ error })
                }}
            />
            {/* <StreamingTest /> */}
        </div>
    </>
}
