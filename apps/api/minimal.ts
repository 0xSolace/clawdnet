import { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req

  if (url === '/health') {
    return res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      method,
      url
    })
  }

  return res.status(200).json({
    name: 'CLAWDNET API',
    version: '0.1.0',
    status: 'online',
    method,
    url
  })
}