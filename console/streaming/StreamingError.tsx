import { ErrorType } from './types.js'
import './index.sass'

export default function StreamingError ({ error }: { error: ErrorType }) {
    if (error.appear) 
        return <div className='streaming_error'>{error.msg}</div>
    
    return null
}
