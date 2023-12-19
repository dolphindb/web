import { DdbVectorString } from 'dolphindb/browser.js'
import { Model } from 'react-object-model'
import { model } from '../model.js'
class ConfigModel extends Model<ConfigModel> {
    async load_controller_configs () {
        return model.ddb.call('loadControllerConfigs', [ ], { urgent: true })
    }
    
    async save_controller_configs (configs: string[]) {
        return model.ddb.call('saveControllerConfigs', [new DdbVectorString(configs)], { urgent: true })
    }
}

export let config = new ConfigModel()
