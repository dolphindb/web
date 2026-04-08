import { Router, type Router as ExpressRouter, type Request, type Response } from 'express'
import { createFile, getFile, updateFileContent, deleteFile, listFilesByWorkspace } from '../db.js'
import { getRequiredDdbAuth } from '../middleware/ddb-auth.js'

const router: ExpressRouter = Router()

router.get('/workspace/:workspaceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const items = await listFilesByWorkspace(auth, req.params.workspaceId as string)
    res.json(items)
  } catch (error) {
    console.error('Failed to list files:', error)
    res.status(500).json({ error: String(error) })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const id = await createFile(auth, req.body)
    res.json({ id })
  } catch (error) {
    console.error('Failed to create file:', error)
    res.status(500).json({ error: String(error) })
  }
})

router.get('/workspace/:workspaceId/file', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const path = req.query.path as string
    if (!path) {
      res.status(400).json({ error: 'Missing path query parameter' })
      return
    }
    const item = await getFile(auth, req.params.workspaceId as string, path)
    if (!item) {
      res.status(404).json({ error: 'File not found' })
      return
    }
    res.json(item)
  } catch (error) {
    console.error('Failed to get file:', error)
    res.status(500).json({ error: String(error) })
  }
})

router.put('/:id/content', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const { content } = req.body
    await updateFileContent(auth, req.params.id as string, content)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update file content:', error)
    res.status(500).json({ error: String(error) })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    await deleteFile(auth, req.params.id as string)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete file:', error)
    res.status(500).json({ error: String(error) })
  }
})

export default router
