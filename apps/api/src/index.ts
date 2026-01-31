import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { agentsRouter } from './routes/agents';
import { usersRouter } from './routes/users';
import { socialRouter } from './routes/social';
import { reviewsRouter } from './routes/reviews';
import { pairingRouter } from './routes/pairing';
import { authRouter } from './routes/auth';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: ['https://clawdnet.xyz', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
}));

// Health check
app.get('/', (c) => c.json({
  name: 'CLAWDNET API',
  version: '0.1.0',
  status: 'online',
  docs: 'https://clawdnet.xyz/docs',
}));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.route('/agents', agentsRouter);
app.route('/users', usersRouter);
app.route('/social', socialRouter);
app.route('/reviews', reviewsRouter);
app.route('/pairing', pairingRouter);
app.route('/auth', authRouter);

// 404 handler
app.notFound((c) => c.json({
  error: {
    code: 'not_found',
    message: 'Endpoint not found',
  }
}, 404));

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: {
      code: 'internal_error',
      message: err.message || 'An unexpected error occurred',
    }
  }, 500);
});

const port = parseInt(process.env.PORT || '3001');

console.log(`🚀 CLAWDNET API running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
