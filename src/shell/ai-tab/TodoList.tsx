import { Checkbox, Collapse, Typography } from 'antd'

import { t } from '@i18n'

import type { IWorkspaceStep } from '@/chat/workspace.ts'


const { Text } = Typography


export function TodoList ({ steps }: { steps: IWorkspaceStep[] }) {
    const active_steps = steps.filter(step => step.active)
    if (!active_steps.length)
        return null
        
    const current_step = active_steps.find(step => !step.checked) || active_steps[active_steps.length - 1]
    
    return <Collapse
        ghost
        size='small'
        className='ai-todo-list'
        items={[{
            key: 'steps',
            label: <span className='ai-todo-summary'>
                <Text strong style={{ fontSize: 13 }}>{t('步骤')}</Text>
                <Checkbox checked={current_step.checked} disabled>
                    <Text delete={current_step.checked} type={current_step.checked ? 'secondary' : undefined}>
                        {current_step.step_index + 1}. {current_step.content}
                    </Text>
                </Checkbox>
                <Text type='secondary' style={{ fontSize: 12 }}>
                    {active_steps.filter(step => step.checked).length}/{active_steps.length}
                </Text>
            </span>,
            children: <div className='ai-todo-items'>
                {active_steps.map(step =>
                    <Checkbox key={step.id} checked={step.checked} disabled>
                        <Text delete={step.checked} type={step.checked ? 'secondary' : undefined}>
                            {step.step_index + 1}. {step.content}
                        </Text>
                    </Checkbox>
                )}
            </div>,
        }]}
    />
}
