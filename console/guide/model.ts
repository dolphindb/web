import { Model } from 'react-object-model'

import { model } from '../model.js'

import finance_guide_code from './finance.dos'
import iot_guide_code from './iot.dos'


export class CreateGuide extends Model<CreateGuide> { 
    
    inited = false
    /** 有部分共用的方法，需要两个文件都加载 */
    async define_func () {
        if (this.inited)
            return
        await model.ddb.eval(iot_guide_code)
        await model.ddb.eval(finance_guide_code)
        this.set({ inited: true })
    }
   
}


export let create_guide = new CreateGuide()
