import { useState } from 'react'
import { Checkbox, Collapse, Typography } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

import { t } from '@i18n'

import type { IWorkspaceStep } from '@/agent/workspace.ts'


const { Text } = Typography


function TodoStatus ({ checked, running }: { checked: boolean, running: boolean }) {
    return <span className='ai-todo-status'>
        {running
            ? <LoadingOutlined spin className='ai-todo-running' aria-label={t('正在执行')} />
            : <Checkbox checked={checked} disabled />}
    </span>
}


export function TodoList ({ steps }: { steps: IWorkspaceStep[] }) {
    const [expanded, set_expanded] = useState(false)
    const active_steps = steps.filter(step => step.active)
    if (!active_steps.length)
        return null
        
    const current_step = active_steps.find(step => !step.checked) || active_steps[active_steps.length - 1]
    
    return <Collapse
        ghost
        size='small'
        className='ai-todo-list'
        onChange={keys => { set_expanded(keys.includes('steps')) }}
        items={[{
            key: 'steps',
            label: <span className={`ai-todo-summary${expanded ? ' expanded' : ''}`}>
                <Text strong style={{ fontSize: 13 }}>{t('步骤')}</Text>
                {!expanded && <span className='ai-todo-item'>
                    <TodoStatus checked={current_step.checked} running={!current_step.checked} />
                    <Text delete={current_step.checked} type={current_step.checked ? 'secondary' : undefined}>
                        {current_step.step_index + 1}. {current_step.content}
                    </Text>
                </span>}
                <Text className='ai-todo-count' type='secondary' style={{ fontSize: 12 }}>
                    {active_steps.filter(step => step.checked).length}/{active_steps.length}
                </Text>
            </span>,
            children: <div className='ai-todo-items'>
                {active_steps.map(step =>
                    <span className='ai-todo-item' key={step.id}>
                        <TodoStatus checked={step.checked} running={step.id === current_step.id && !step.checked} />
                        <Text delete={step.checked} type={step.checked ? 'secondary' : undefined}>
                            {step.step_index + 1}. {step.content}
                        </Text>
                    </span>
                )}
            </div>,
        }]}
    />
}
