import dayjs from 'dayjs'

export function parse_minute (minute_str: string) {
    const [hour, minute] = minute_str.slice(0, -1).split(':')
    return dayjs().hour(Number(hour)).minute(Number(minute)).second(0).millisecond(0)
}
