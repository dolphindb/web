import './index.scss'
import { Form, Steps } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { type BasicInfoFormValues, type SecondStepInfo } from '../type.js'
import { BasicInfoFields } from '../components/BasicInfoFields.js'
import { SecondStep } from './SecondStep.js'
import { CodeViewStep } from '../components/CodeViewStep.js'



export function SimpleVersion () {
    const [current_step, set_current_step] = useState(0)
    const [second_step_info, set_second_step_info] = useState<SecondStepInfo>({ otherSortKeys: { show: true } })
    const [code, set_code] = useState('xxx')
    
    const [basic_info, set_basic_info] = useState<BasicInfoFormValues>()
    
    
    
    const back = useCallback(() => { 
        set_current_step(current_step - 1)
    }, [current_step])
    
    const go = useCallback((values: BasicInfoFormValues) => { 
        set_current_step(current_step + 1)
        set_basic_info(values)
    }, [current_step])
    
    const views = useMemo(() => {
        console.log(second_step_info, 'second_step_info')
        const steps = [
            {
            
                title: '第一步',
                children: <BasicInfoFields
                    values={basic_info}
                    to_next_step={go}
                    set_second_step_info={set_second_step_info}
                />
            },
            {
            
                title: '第二步',
                children: <SecondStep
                    go_back={back}
                    max={second_step_info.otherSortKeys.max}
                    basic_info={basic_info}
                    set_code={set_code}
                />
            },
            {
            
                title: '脚本预览',
                children: <CodeViewStep code={code} back={back} />
            }
        ]
        
        if (second_step_info.otherSortKeys.show)  
            return steps
        else
            return [steps[0], steps[2]]
       
    }, [current_step, second_step_info.otherSortKeys.show, basic_info])
    
    
    return <div className='simple-version-wrapper'>
        <Steps current={current_step} className='guide-step' size='small' items={views}/>
        {views[current_step].children}
    </div>
    
}
