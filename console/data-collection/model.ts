import { Model } from 'react-object-model'

import { model } from '../model.js'

import { request } from './utils.js'
import code from './dolphindb-scripts/script.dos'
import installMqttCode from './dolphindb-scripts/mqttInstallAndLoad.dos'

export class DcpModel extends Model<DcpModel> {
    func_inited: boolean = false
    
    database_inited: 'unknow' | 'inited' | 'not_inited' = 'unknow'
    
    async init () {
        await model.ddb.eval(installMqttCode)
        this.set({ func_inited: true })
        const { value: is_inited } = await model.ddb.eval('existsDatabase("dfs://dataAcquisition")')
        console.log(typeof is_inited, 'is_inited')
        this.set({ database_inited: is_inited ? 'inited' : 'not_inited' } )        
    }
    
    async init_database () {
        await model.ddb.eval(code)
        await request('dcp_init')
        this.set({ database_inited: 'inited' })
    }
    
}

export const dcp_model = new DcpModel()
