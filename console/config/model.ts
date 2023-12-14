import { Model } from 'react-object-model'
import { model } from '../model.js'
class ConfigModel extends Model<ConfigModel> {
    async load_controller_configs () {
        return model.ddb.call('loadClusterNodesConfigs', [ ], { urgent: true })
    }
}

export let config = new ConfigModel()
