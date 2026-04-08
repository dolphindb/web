import { Router, type Router as ExpressRouter, type Request, type Response } from 'express'
import { createWorkspace, getWorkspace, updateWorkspaceState, deleteWorkspace, getAllWorkspaces } from '../db.js'
import { getRequiredDdbAuth } from '../middleware/ddb-auth.js'

const router: ExpressRouter = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const items = await getAllWorkspaces(auth)
    res.json({ workspaces: items })
  } catch (error) {
    console.error('Failed to get workspaces:', error)
    res.status(500).json({ error: String(error) })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const { name } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: '工作区名称不能为空' })
      return
    }

    const id = await createWorkspace(auth, req.body)
    res.json({ id })
  } catch (error: any) {
    console.error('Failed to create workspace:', error)
    if (error.message && error.message.includes('already exists')) {
      res.status(400).json({ error: '工作区名称已存在' })
      return
    }
    res.status(500).json({ error: String(error) })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const item = await getWorkspace(auth, req.params.id as string)
    if (!item) {
      res.status(404).json({ error: 'Workspace not found' })
      return
    }
    res.json(item)
  } catch (error) {
    console.error('Failed to get workspace:', error)
    res.status(500).json({ error: String(error) })
  }
})

router.put('/:id/state', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const { current_state } = req.body
    await updateWorkspaceState(auth, req.params.id as string, current_state)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update workspace state:', error)
    res.status(500).json({ error: String(error) })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    await deleteWorkspace(auth, req.params.id as string)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete workspace:', error)
    res.status(500).json({ error: String(error) })
  }
})

export default router
