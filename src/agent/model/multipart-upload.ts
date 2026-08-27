import { sha256 as compute_sha256 } from 'js-sha256'


export async function prepare_file_upload (file: Blob) {
    const buffer = await file.arrayBuffer()
    return { buffer, sha256: compute_sha256(buffer) }
}


export async function upload_file_parts (
    buffer: ArrayBuffer,
    part_size: number,
    part_count: number,
    put_part: (part_no: number, part: ArrayBuffer, sha256: string) => Promise<unknown>,
    on_progress?: (percent: number) => void
) {
    for (let part_no = 0;  part_no < part_count;  part_no++) {
        const part = buffer.slice(part_no * part_size, Math.min((part_no + 1) * part_size, buffer.byteLength))
        await put_part(part_no, part, compute_sha256(part))
        on_progress?.(Math.round(((part_no + 1) / part_count) * 100))
    }
}
