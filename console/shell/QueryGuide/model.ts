import { Model } from 'react-object-model'
import { type IQueryInfos } from './type.js'
import { model } from '../../model.js'
import query_guide_code from './guide.dos'

export class GuideQueryModel extends Model<GuideQueryModel> { 
    code: string
    query_values: IQueryInfos
    
    query_guide_defined = false
    
    async define_query_guide () { 
        if (this.query_guide_defined)
            return 
        await model.ddb.eval(query_guide_code)
        this.set({ query_guide_defined: true })
    }
}


export let guide_query_model = new GuideQueryModel()
