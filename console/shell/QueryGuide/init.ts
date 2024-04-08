import { model } from '../../model.js'

import code from './guide.dos'


export async function init_dbms_query_guide () { 
    await model.ddb.eval(code)
}
