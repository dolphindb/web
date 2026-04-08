type EndpointInfo = {
  endpoint: string
  wsUrl: string
}

type DdbAuth = EndpointInfo & {
  ticket: string
}

const normalizeEndpoint = (input: string): EndpointInfo => {
  const raw = input.trim()
  if (!raw) {
    throw new Error('缺少服务地址。')
  }

  const withProtocol = /^[a-z]+:\/\//i.test(raw) ? raw : `ws://${raw}`
  const parsed = new URL(withProtocol)

  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new Error('服务地址协议必须是 ws 或 wss。')
  }

  if (!parsed.host) {
    throw new Error('服务地址无效。')
  }

  return {
    endpoint: parsed.host,
    wsUrl: `${parsed.protocol}//${parsed.host}`,
  }
}

const parseDdbAuthorization = (authorization?: string): DdbAuth => {
  const raw = (authorization || '').trim()
  if (!raw) {
    throw new Error('缺少 Authorization 请求头。')
  }

  const auth = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw
  const separatorIndex = auth.lastIndexOf('@')
  if (separatorIndex <= 0 || separatorIndex >= auth.length - 1) {
    throw new Error('Authorization 格式必须为：ticket@url')
  }

  const ticket = auth.slice(0, separatorIndex).trim()
  const urlPart = auth.slice(separatorIndex + 1).trim()

  if (!ticket || !urlPart) {
    throw new Error('Authorization 格式必须为：ticket@url')
  }

  const endpointInfo = normalizeEndpoint(urlPart)
  return {
    ticket,
    ...endpointInfo,
  }
}

export type {
  EndpointInfo,
  DdbAuth,
}

export {
  normalizeEndpoint,
  parseDdbAuthorization,
}
