import { marked } from 'marked'

import { t } from '@i18n'


marked.setOptions({ breaks: true, gfm: true })


export function render_markdown (content: string): string {
    try {
        return (marked.parse(content) as string).replace(
            /<pre><code(.*?)>([\s\S]*?)<\/code><\/pre>/g,
            `<pre class="ai-code-block"><button class="ai-code-copy" type="button">${t('复制')}</button><code$1>$2</code></pre>`
        )
    } catch {
        return content
    }
}
