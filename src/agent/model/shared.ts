import { Model } from 'react-object-model'

import type { ISelectableLlmInfo } from './types.ts'


export class ChatSharedModel extends Model<ChatSharedModel> {
    selectable_llms_by_agent_id: Record<string, ISelectableLlmInfo[]> = { }
}


export const chat_shared_model = new ChatSharedModel()
