import dayjs from 'dayjs'
import { QueryForm } from './QueryForm.js'

interface IProps { 
    database: string
    table: string
}

export function QueryGuide (props: IProps) { 
    return <QueryForm {...props} />
    
}
