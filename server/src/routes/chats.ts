import { Router, type Router as ExpressRouter } from 'express';
import * as crypto from 'crypto';
import { BackgroundAgent } from '../BackgroundAgent.js';
import {
  insertChat,
  insertMessage,
  getMessages,
  getUsername,
  getAllChats,
  getDefaultProviderAndModel,
  updateChatModel,
  updateChatTitle,
  deleteChat,
} from '../db.js';
import { getInitialSystemPrompt } from '../prompt.js';
import { parseDdbAuthorization } from '../lib/ddb-auth.js';

const router: ExpressRouter = Router();
const agent = BackgroundAgent.getInstance();

router.post('/', async (req, res) => {
  try {
    const auth = parseDdbAuthorization(req.headers.authorization);
    const username = await getUsername(auth);
    
    const defaultModel = await getDefaultProviderAndModel(auth);
    const providerId = defaultModel?.providerId || '';
    const modelId = defaultModel?.modelId || '';
    
    const { workspaceId } = req.body;
    if (!workspaceId) {
      res.status(400).json({ error: 'workspaceId is required' });
      return;
    }

    const chatId = crypto.randomUUID();
    const newChat = {
      chatId,
      workspaceId,
      username,
      title: req.body.title || `新会话`,
      providerId,
      modelId,
      agentId: 'agent-1',
      authHeader: req.headers.authorization || '',
    };
    
    // Write to DB
    await insertChat(auth, newChat);

    // Insert the first hidden system instruction for this chat
    await insertMessage(auth, {
      chatId,
      username: 'system',
      role: 'system',
      messageType: 'system',
      content: await getInitialSystemPrompt(auth),
      msgIndex: 0,
    });
    
    // Start the background agent task for this chat
    agent.startTask({
      ...newChat,
      auth, // Provide extracted auth object to the task
    });

    res.json({
      ok: true,
      chat: newChat,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const auth = parseDdbAuthorization(req.headers.authorization);
    const chats = await getAllChats(auth);
    res.json({
      ok: true,
      chats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:chatId/messages', async (req, res) => {
  try {
    const auth = parseDdbAuthorization(req.headers.authorization);
    const messages = await getMessages(auth, req.params.chatId);
    res.json({
      ok: true,
      messages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:chatId', async (req, res) => {
  try {
    const auth = parseDdbAuthorization(req.headers.authorization);
    const { providerId, modelId } = req.body;
    if (!providerId || !modelId) {
      res.status(400).json({ error: 'providerId and modelId are required' });
      return;
    }
    await updateChatModel(auth, req.params.chatId, providerId, modelId);
    
    // Update the task context in background agent
    agent.updateTaskModel(req.params.chatId, providerId, modelId);
    
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:chatId/title', async (req, res) => {
  try {
    const auth = parseDdbAuthorization(req.headers.authorization);
    const { chatId } = req.params;
    const rawTitle = typeof req.body?.title === 'string' ? req.body.title : '';
    const title = rawTitle.trim();

    if (!chatId) {
      res.status(400).json({ error: 'chatId is required' });
      return;
    }

    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    if (title.length > 40) {
      res.status(400).json({ error: 'title is too long (max 40 chars)' });
      return;
    }

    await updateChatTitle(auth, chatId, title);
    agent.updateTaskTitle(chatId, title);
    agent.emitChatUpdated({
      chatId,
      title,
    });

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:chatId', async (req, res) => {
  try {
    const auth = parseDdbAuthorization(req.headers.authorization);
    const { chatId } = req.params;

    if (!chatId) {
      res.status(400).json({ error: 'chatId is required' });
      return;
    }

    await deleteChat(auth, chatId);
    agent.endTask(chatId);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
