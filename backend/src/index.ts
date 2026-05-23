import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { generateRoute } from './routes/generate';
import { projectRoute } from './routes/project';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*', // Allow Vercel or any other frontend to connect
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'manim-video-api',
    version: '1.0.0',
    llm: {
      provider: 'openrouter',
      model: process.env.OPENROUTER_MODEL || 'openrouter/owl-alpha',
      configured: true,
    },
  });
});

// Routes
app.route('/generate', generateRoute);
app.route('/project', projectRoute);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server Error:', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// For Node.js server
export default app;

// Start server when run directly
const startServer = async () => {
  const { serve } = await import('@hono/node-server');
  serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0', // Ensure it binds to all interfaces for Railway
  });
  
  console.log(`\n🚀 Manim Studio Backend`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📡 API Server: http://0.0.0.0:${port}`);
  console.log(`🤖 LLM Provider: OpenRouter API`);
  console.log(`📊 Model: ${process.env.OPENROUTER_MODEL || 'openrouter/owl-alpha'}`);
  console.log(`🔑 API Key: ${process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_api_key_here' ? '✅ Configured' : '❌ Missing (.env)'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
};

startServer().catch(console.error);
