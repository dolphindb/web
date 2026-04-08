import { Router, type Router as ExpressRouter, type Request, type Response } from 'express'
import { createStep, getStepsByChatId, updateStepStatus, deleteStep } from '../db.js'
import { getRequiredDdbAuth } from '../middleware/ddb-auth.js'

const router: ExpressRouter = Router()

router.get('/chat/:chatId', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const items = await getStepsByChatId(auth, req.params.chatId as string)
    res.json(items)
  } catch (error) {
    console.error('Failed to get steps:', error)
    res.status(500).json({ error: String(error) })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const id = await createStep(auth, req.body)
    res.json({ id })
  } catch (error) {
    console.error('Failed to create step:', error)
    res.status(500).json({ error: String(error) })
  }
})

router.put('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    const { checked, active } = req.body
    await updateStepStatus(auth, req.params.id as string, checked, active)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update step status:', error)
    res.status(500).json({ error: String(error) })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = getRequiredDdbAuth(req)
    await deleteStep(auth, req.params.id as string)
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete step:', error)
    res.status(500).json({ error: String(error) })
  }
})

export default router
