import { Model } from 'react-object-model'

import { model } from '../model.js'

import finance_guide_code from './finance.dos'
import iot_guide_code from './iot.dos'


export class CreateGuide extends Model<CreateGuide> { 
    
    iot_guide_code_defined = false
    
    finance_guide_code_defined = false
    
    async define_iot_guide () { 
        if (this.iot_guide_code_defined)
            return 
        await model.ddb.eval(iot_guide_code)
        this.set({ iot_guide_code_defined: true })
    }
    
    
    async define_finance_guide () {
        if (this.finance_guide_code_defined)
            return
        await model.ddb.eval(finance_guide_code)
        this.set({ finance_guide_code_defined: true })
    }
}


export let create_guide = new CreateGuide()
