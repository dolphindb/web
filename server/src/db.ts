import * as crypto from 'crypto';
import { ddbConnectionPool } from './lib/ddb-connection-pool.js';
import { IMessage } from './types.js';
import type { DdbAuth } from './lib/ddb-auth.js';

export type ChatTaskSeed = {
  chatId: string;
  workspaceId: string;
  username: string;
  title: string;
  providerId: string;
  modelId: string;
  agentId: string;
  authHeader: string;
  createTime?: number | Date;
  updateTime?: number | Date;
};

// Helper to escape strings for DolphinDB script
function escapeString(str: string) {
  if (!str) return '""';
  // Escape backslashes first, then double quotes
  return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function tableResultToRows(result: any): any[] {
  if (!result) return [];

  if (Array.isArray(result)) {
    return result;
  }

  if (result.data && Array.isArray(result.data)) {
    return result.data;
  }

  if (typeof result === 'object') {
    const cols = Object.keys(result);
    if (cols.length > 0 && Array.isArray(result[cols[0]])) {
      const rowCount = result[cols[0]].length;
      const rows: any[] = [];
      for (let i = 0; i < rowCount; i++) {
        const row: any = {};
        for (const col of cols) {
          row[col] = result[col][i];
        }
        rows.push(row);
      }
      return rows;
    }
  }

  return [];
}

export async function getUsername(auth: DdbAuth): Promise<string> {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const result = await lease.ddb.execute('getCurrentSessionAndUser()[1]');
    return typeof result === 'string' ? result : String(result);
  } catch (e) {
    console.error('Failed to get username:', e);
    return 'guest';
  } finally {
    await lease.release();
  }
}

export async function insertChat(auth: DdbAuth, chat: any) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      append!(loadTable("dfs://chat_dolphindb", "chats"), table(
        [uuid(${escapeString(chat.chatId)})] as chatId,
        [uuid(${escapeString(chat.workspaceId)})] as workspaceId,
        [${escapeString(chat.username)}] as username,
        [${escapeString(chat.title)}] as title,
        [${escapeString(chat.providerId || '')}] as providerId,
        [${escapeString(chat.modelId || '')}] as modelId,
        [${escapeString(chat.agentId || '')}] as agentId,
        [${escapeString(chat.authHeader || '')}] as authHeader,
        [now()] as createTime,
        [now()] as updateTime,
        [false] as isDeleted
      ))
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function insertMessage(auth: DdbAuth, msg: IMessage) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const msgId = msg.msgId || crypto.randomUUID();
    const script = `
      append!(loadTable("dfs://chat_dolphindb", "messages"), table(
        [uuid(${escapeString(msgId)})] as msgId,
        [uuid(${escapeString(msg.chatId || '')})] as chatId,
        [${escapeString(msg.username || 'system')}] as username,
        [now()] as createTime,
        [now()] as updateTime,
        [${escapeString(msg.role)}] as role,
        [${escapeString(msg.messageType || 'text')}] as messageType,
        [blob(${escapeString(msg.content || '')})] as content,
        [blob(${escapeString(msg.reasoning_content || '')})] as reasoning_content,
        [blob(${escapeString(msg.content_object || '')})] as content_object,
        [${msg.msgIndex || 0}] as msgIndex
      ))
    `;
    await lease.ddb.execute(script);
    return msgId;
  } finally {
    await lease.release();
  }
}

export async function getAllChats(auth: DdbAuth): Promise<any[]> {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      select * from loadTable("dfs://chat_dolphindb", "chats")
      where isDeleted = false
      order by updateTime desc
    `;
    const result: any = await lease.ddb.execute(script);
    const rows = tableResultToRows(result);

    return rows.map(row => ({
      chatId: row.chatId,
      workspaceId: row.workspaceId,
      username: row.username,
      title: row.title,
      providerId: row.providerId,
      modelId: row.modelId,
      agentId: row.agentId,
      createTime: row.createTime,
      updateTime: row.updateTime,
    }));
  } finally {
    await lease.release();
  }
}

export async function getChatTaskSeedById(auth: DdbAuth, chatId: string): Promise<ChatTaskSeed | null> {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      select top 1
        chatId,
        workspaceId,
        username,
        title,
        providerId,
        modelId,
        agentId,
        authHeader,
        createTime,
        updateTime
      from loadTable("dfs://chat_dolphindb", "chats")
      where chatId = uuid(${escapeString(chatId)}) and isDeleted = false
    `;
    const result: any = await lease.ddb.execute(script);
    const rows = tableResultToRows(result);
    if (!rows.length) {
      return null;
    }

    const row = rows[0];
    return {
      chatId: row.chatId,
      workspaceId: row.workspaceId,
      username: row.username,
      title: row.title,
      providerId: row.providerId,
      modelId: row.modelId,
      agentId: row.agentId,
      authHeader: row.authHeader,
      createTime: row.createTime,
      updateTime: row.updateTime,
    };
  } finally {
    await lease.release();
  }
}

export async function getMessages(auth: DdbAuth, chatId: string): Promise<IMessage[]> {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      select * from loadTable("dfs://chat_dolphindb", "messages")
      where chatId = uuid(${escapeString(chatId)})
      order by createTime
    `;
    const result: any = await lease.ddb.execute(script);
    const rows = tableResultToRows(result);

    return rows.map(row => ({
      msgId: row.msgId,
      chatId: row.chatId,
      username: row.username,
      createTime: row.createTime,
      updateTime: row.updateTime,
      role: row.role,
      messageType: row.messageType,
      content: row.content,
      reasoning_content: row.reasoning_content,
      content_object: row.content_object,
      msgIndex: row.msgIndex
    }));
  } finally {
    await lease.release();
  }
}

export async function updateChatModel(auth: DdbAuth, chatId: string, providerId: string, modelId: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "chats") 
      set providerId = ${escapeString(providerId)}, modelId = ${escapeString(modelId)}, updateTime = now() 
      where chatId = uuid(${escapeString(chatId)})
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function updateChatTitle(auth: DdbAuth, chatId: string, title: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "chats")
      set title = ${escapeString(title)}, updateTime = now()
      where chatId = uuid(${escapeString(chatId)}) and isDeleted = false
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function deleteChat(auth: DdbAuth, chatId: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "chats") 
      set isDeleted = true, updateTime = now() 
      where chatId = uuid(${escapeString(chatId)});
      
      delete from loadTable("dfs://chat_dolphindb", "messages")
      where chatId = uuid(${escapeString(chatId)});
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function getDefaultProviderAndModel(auth: DdbAuth): Promise<{ providerId: string, modelId: string } | null> {
  const lease = await ddbConnectionPool.get(auth);
  try {
    // First try: find a model explicitly marked as default
    const defaultScript = `
      select top 1
        string(providerId) as providerId,
        string(modelId) as modelId
      from loadTable("dfs://chat_dolphindb", "ai_models")
      where isDefault = true and isEnabled = true
    `;
    const defaultResult: any = await lease.ddb.execute(defaultScript, { table: 'full' });
    const defaultRows = defaultResult?.data;
    if (Array.isArray(defaultRows) && defaultRows.length > 0) {
      const pId = String(defaultRows[0].providerId || '').trim();
      const mId = String(defaultRows[0].modelId || '').trim();
      if (pId && mId) return { providerId: pId, modelId: mId };
    }

    // Fallback: pick the first enabled provider's defaultModelId
    const providerScript = `
      select top 1
        string(providerId) as providerId,
        defaultModelId
      from loadTable("dfs://chat_dolphindb", "ai_providers")
      where isEnabled = true
      order by updateTime desc
    `;
    const providerResult: any = await lease.ddb.execute(providerScript, { table: 'full' });
    const providerRows = providerResult?.data;
    if (Array.isArray(providerRows) && providerRows.length > 0) {
      const pId = String(providerRows[0].providerId || '').trim();
      const mId = String(providerRows[0].defaultModelId || '').trim();
      if (pId) return { providerId: pId, modelId: mId };
    }

    return null;
  } catch (e) {
    console.error('Failed to get default provider and model:', e);
    return null;
  } finally {
    await lease.release();
  }
}

// ------------------------------------------------------------------
// Workspace Functions
// ------------------------------------------------------------------

export async function createWorkspace(auth: DdbAuth, workspace: any) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const name = workspace.name || 'Untitled';
    // Check if a workspace with the same name already exists and is not deleted
    const checkScript = `
      select top 1 id from loadTable("dfs://chat_dolphindb", "workspaces")
      where name = ${escapeString(name)} and isDeleted = false
    `;
    const checkResult: any = await lease.ddb.execute(checkScript);
    const existingRows = tableResultToRows(checkResult);
    
    if (existingRows.length > 0) {
      return existingRows[0].id;
    }

    const id = workspace.id || crypto.randomUUID();
    const script = `
      append!(loadTable("dfs://chat_dolphindb", "workspaces"), table(
        [uuid(${escapeString(id)})] as id,
        [${escapeString(name)}] as name,
        [blob(${escapeString(workspace.current_state || '')})] as current_state,
        [now()] as createTime,
        [now()] as updateTime,
        [false] as isDeleted
      ))
    `;
    await lease.ddb.execute(script);
    return id;
  } finally {
    await lease.release();
  }
}

export async function getWorkspace(auth: DdbAuth, id: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      select top 1 * from loadTable("dfs://chat_dolphindb", "workspaces")
      where id = uuid(${escapeString(id)}) and isDeleted = false
      order by updateTime desc
    `;
    const result: any = await lease.ddb.execute(script);
    const rows = tableResultToRows(result);
    if (!rows.length) return null;
    
    const workspace = rows[0];
    // BLOB is returned as a byte array, need to convert to string
    if (workspace.current_state && typeof workspace.current_state === 'object' && Array.isArray(workspace.current_state)) {
       try {
         workspace.current_state = new TextDecoder().decode(new Uint8Array(workspace.current_state));
       } catch (e) {
         console.error('Failed to decode workspace current_state blob:', e);
         workspace.current_state = String(workspace.current_state);
       }
    } else if (workspace.current_state instanceof Uint8Array) {
       workspace.current_state = new TextDecoder().decode(workspace.current_state);
    }
    return workspace;
  } finally {
    await lease.release();
  }
}

export async function updateWorkspaceState(auth: DdbAuth, id: string, currentState: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "workspaces")
      set current_state = blob(${escapeString(currentState)}), updateTime = now()
      where id = uuid(${escapeString(id)}) and isDeleted = false
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function deleteWorkspace(auth: DdbAuth, id: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "workspaces")
      set isDeleted = true, updateTime = now()
      where id = uuid(${escapeString(id)});
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function getAllWorkspaces(auth: DdbAuth) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      select * from loadTable("dfs://chat_dolphindb", "workspaces")
      where isDeleted = false
      order by updateTime desc
    `;
    const result: any = await lease.ddb.execute(script);
    return tableResultToRows(result);
  } finally {
    await lease.release();
  }
}

// ------------------------------------------------------------------
// Step Functions
// ------------------------------------------------------------------

export async function createStepBatch(auth: DdbAuth, chatId: string, contents: string[]) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    if (contents.length === 0) return [];
    
    let appendParts = [];
    const ids = [];
    for (let i = 0; i < contents.length; i++) {
      const id = crypto.randomUUID();
      ids.push(id);
      appendParts.push(`[uuid(${escapeString(id)})], [uuid(${escapeString(chatId)})], [${i}], [${escapeString(contents[i] || '')}], [false], [true], [now()], [now()], [false]`);
    }

    // Deactivate existing ones first
    await updateStepsDeactivateAll(auth, chatId);

    // Build batch insert query. A bit hacky to append multiple, we can loop.
    for (let i = 0; i < contents.length; i++) {
      const script = `
        append!(loadTable("dfs://chat_dolphindb", "steps"), table(
          [uuid(${escapeString(ids[i])})] as id,
          [uuid(${escapeString(chatId)})] as chatId,
          [${i}] as stepIndex,
          [${escapeString(contents[i] || '')}] as content,
          [false] as checked,
          [true] as active,
          [now()] as createTime,
          [now()] as updateTime,
          [false] as isDeleted
        ))
      `;
      await lease.ddb.execute(script);
    }
    return ids;
  } finally {
    await lease.release();
  }
}

export async function updateStepsDeactivateAll(auth: DdbAuth, chatId: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "steps")
      set active = false, updateTime = now()
      where chatId = uuid(${escapeString(chatId)}) and active = true and isDeleted = false
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function updateStepsCompleteAll(auth: DdbAuth, chatId: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "steps")
      set checked = true, updateTime = now()
      where chatId = uuid(${escapeString(chatId)}) and active = true and isDeleted = false
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function createStep(auth: DdbAuth, step: any) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const id = step.id || crypto.randomUUID();
    const script = `
      append!(loadTable("dfs://chat_dolphindb", "steps"), table(
        [uuid(${escapeString(id)})] as id,
        [uuid(${escapeString(step.chatId)})] as chatId,
        [${step.stepIndex || 0}] as stepIndex,
        [${escapeString(step.content || '')}] as content,
        [${!!step.checked}] as checked,
        [${!!step.active}] as active,
        [now()] as createTime,
        [now()] as updateTime,
        [false] as isDeleted
      ))
    `;
    await lease.ddb.execute(script);
    return id;
  } finally {
    await lease.release();
  }
}

export async function getStepsByChatId(auth: DdbAuth, chatId: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      select * from loadTable("dfs://chat_dolphindb", "steps")
      where chatId = uuid(${escapeString(chatId)}) and isDeleted = false
      order by stepIndex asc, createTime asc
    `;
    const result: any = await lease.ddb.execute(script);
    return tableResultToRows(result);
  } finally {
    await lease.release();
  }
}

export async function updateStepStatus(auth: DdbAuth, id: string, checked: boolean, active: boolean) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "steps")
      set checked = ${checked}, active = ${active}, updateTime = now()
      where id = uuid(${escapeString(id)}) and isDeleted = false
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function setStepStatusByIndex(auth: DdbAuth, chatId: string, stepIndex: number, checked: boolean) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "steps")
      set checked = ${checked}, updateTime = now()
      where chatId = uuid(${escapeString(chatId)}) and stepIndex = ${stepIndex} and active = true and isDeleted = false
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function deleteStep(auth: DdbAuth, id: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "steps")
      set isDeleted = true, updateTime = now()
      where id = uuid(${escapeString(id)});
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

// ------------------------------------------------------------------
// VFS (Virtual File System) Functions
// ------------------------------------------------------------------

export async function createFile(auth: DdbAuth, file: any) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const id = file.id || crypto.randomUUID();
    const script = `
      append!(loadTable("dfs://chat_dolphindb", "vfs"), table(
        [uuid(${escapeString(id)})] as id,
        [uuid(${escapeString(file.workspaceId)})] as workspaceId,
        [${escapeString(file.path)}] as path,
        [blob(${escapeString(file.content || '')})] as content,
        [now()] as createTime,
        [now()] as updateTime,
        [false] as isDeleted
      ))
    `;
    await lease.ddb.execute(script);
    return id;
  } finally {
    await lease.release();
  }
}

export async function getFile(auth: DdbAuth, workspaceId: string, path: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      select top 1 * from loadTable("dfs://chat_dolphindb", "vfs")
      where workspaceId = uuid(${escapeString(workspaceId)}) and path = ${escapeString(path)} and isDeleted = false
      order by updateTime desc
    `;
    const result: any = await lease.ddb.execute(script);
    const rows = tableResultToRows(result);
    return rows.length ? rows[0] : null;
  } finally {
    await lease.release();
  }
}

export async function updateFileContent(auth: DdbAuth, id: string, content: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "vfs")
      set content = blob(${escapeString(content)}), updateTime = now()
      where id = uuid(${escapeString(id)}) and isDeleted = false
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function deleteFile(auth: DdbAuth, id: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      update loadTable("dfs://chat_dolphindb", "vfs")
      set isDeleted = true, updateTime = now()
      where id = uuid(${escapeString(id)});
    `;
    await lease.ddb.execute(script);
  } finally {
    await lease.release();
  }
}

export async function listFilesByWorkspace(auth: DdbAuth, workspaceId: string) {
  const lease = await ddbConnectionPool.get(auth);
  try {
    const script = `
      select id, workspaceId, path, createTime, updateTime from loadTable("dfs://chat_dolphindb", "vfs")
      where workspaceId = uuid(${escapeString(workspaceId)}) and isDeleted = false
      order by path asc
    `;
    const result: any = await lease.ddb.execute(script);
    return tableResultToRows(result);
  } finally {
    await lease.release();
  }
}
