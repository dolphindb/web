import 'katex/dist/katex.min.css'

import katex from 'katex'
import { marked } from 'marked'
import marked_katex from 'marked-katex-extension'

import { t } from '@i18n'


const STANDARD_MATH_RULE = /^(?:\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\])/

marked.use(
    { breaks: true, gfm: true },
    marked_katex({ nonStandard: true, throwOnError: false }),
    {
        extensions: [{
            name: 'standard_math',
            level: 'inline',
            start: source => /\\[\[(]/.exec(source)?.index,
            tokenizer (source) {
                const match = STANDARD_MATH_RULE.exec(source)
                if (!match)
                    return
                return {
                    type: 'standard_math',
                    raw: match[0],
                    text: match[1] ?? match[2],
                    display_mode: match[2] !== undefined,
                }
            },
            renderer: token => katex.renderToString(token.text, {
                displayMode: token.display_mode,
                throwOnError: false,
            }),
        }],
    }
)


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
