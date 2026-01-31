import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.json({
  name: 'CLAWDNET API',
  version: '0.1.0',
  status: 'online',
  test: 'simple version',
}));

app.get('/health', (c) => c.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  env: {
    NODE_ENV: process.env.NODE_ENV,
    hasDbUrl: !!process.env.DATABASE_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
  }
}));

export default app;