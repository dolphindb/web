import { Typography } from 'antd'
import { type ParagraphProps } from 'antd/lib/typography/Paragraph.js'

import { model } from '../../model.js'
import { t } from '../../../i18n/index.js'


interface IProps extends Omit<ParagraphProps, 'ellipsis'> { 
    title: string
    content: string
    detail_text?: string
    max_line?: number
}


export function TableCellDetail (props: IProps) {
    const { title, 
            content, 
            detail_text = t('详细'), 
            max_line = 2, 
            ...otherProps } = props
    
    function detail () {
        model.modal.info({
            title,
            content,
            width: '80%'
        })
    }
    return <Typography.Paragraph
                {...otherProps}
                style={{ marginBottom: 0 }}
                ellipsis={{
                    rows: max_line,
                    expandable: true,
                    symbol: (
                        <span
                            onClick={event => {
                                event.stopPropagation()
                                detail()
                            }}
                        >
                            {detail_text}
                        </span>
                    )
                }}
        >
            {content}
        </Typography.Paragraph>
}
