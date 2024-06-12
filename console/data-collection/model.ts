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
        await model.ddb.eval(code)
        this.set({ func_inited: true })
        
        const { status } = await request<{ status: 0 | 1 }>('dcp_exitsDataAcquisition')
        this.set({ database_inited: status === 1 ? 'inited' : 'not_inited' } )        
    }
    
    async init_database () {
        await request('dcp_init')
        this.set({ database_inited: 'inited' })
    }
    
}

export const dcp_model = new DcpModel()
