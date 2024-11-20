import dayjs from 'dayjs'

export function parse_minute (minute_str: string) {
    const [hour, minute] = minute_str.slice(0, -1).split(':')
    return dayjs().set('hour', Number(hour)).set('minute', Number(minute))
}
