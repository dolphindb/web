import { t } from '@i18n/index.ts'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)

// 生成 OAuth 认证的 URL
export async function get_gitlab_auth_url (root_url: string, client_id: string, redirect_uri: string): Promise<string> {
    const codeVerifier = generateCodeVerifier()
    localStorage.setItem('git-code-verifier', codeVerifier)
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const authUrl = `${root_url}/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=api&code_challenge=${codeChallenge}&code_challenge_method=S256`
    return authUrl
}

// 使用 SHA256 生成 code_challenge
async function generateCodeChallenge (codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    return crypto.subtle.digest('SHA-256', data)
        .then(hash => {
            const hashArray = new Uint8Array(hash)
            return base64UrlEncode(hashArray)
        })
}

// 生成 code_verifier，随机字符串
function generateCodeVerifier (): string {
    const array = new Uint8Array(43)
    window.crypto.getRandomValues(array)
    return base64UrlEncode(array)
}

function base64UrlEncode (array: Uint8Array): string {
    let base64 = btoa(String.fromCharCode.apply(null, array))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function get_github_auth_url (client_id: string, redirect_url: string): string {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_url)}&scope=repo`
    return authUrl
}

export function format_friendly_date (isoString: string): string {
    if (!isoString)
        throw new Error('Invalid date string.')
    const date = dayjs(isoString)
    
    // 检查是否是有效日期
    if (!date.isValid())
        throw new Error('Invalid date format.')
    if (date.isSame(dayjs(), 'day'))
        return t('今天 {{time}}', { time: date.format('HH:mm') })
        
        
    if (date.isSame(dayjs().subtract(1, 'day'), 'day'))
        // 昨天 
        return t('昨天 {{time}}', { time: date.format('HH:mm') })
        
        
    if (date.isAfter(dayjs().subtract(7, 'day'))) {
        // 最近7天内
        const relative = date.fromNow()
        return t('{{relativeTime}}', { relativeTime: relative })
    }
    
    // 更久以前
    return t('{{date}} {{time}}', {
        date: date.format('YYYY/MM/DD'),
        time: date.format('HH:mm'),
    })
}
