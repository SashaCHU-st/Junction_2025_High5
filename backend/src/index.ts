import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PORT } from '@schema/env.js';
import { menuRoutes } from '@routes/menu.js';
import { orderRoutes } from '@routes/orders.js';

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

async function start() {
  try {
    // Register CORS plugin to allow frontend requests
    await fastify.register(cors, {
      origin: [
        'http://localhost:8081',           // Expo web
        /^http:\/\/192\.168\.\d+\.\d+:8081$/, // Local network
        /^exp:\/\/192\.168\.\d+\.\d+:\d+$/,   // Expo app
      ],
      credentials: true,
    });

    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // Register routes
    await fastify.register(menuRoutes);
    await fastify.register(orderRoutes);

    // Start server
    await fastify.listen({
      port: PORT,
      host: '0.0.0.0'  // Listen on all network interfaces
    });

    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 API endpoints:`);
    console.log(`   GET  /health`);
    console.log(`   GET  /api/menu`);
    console.log(`   GET  /api/menu/:id`);
    console.log(`   POST /api/orders`);
    console.log(`   GET  /api/orders`);
    console.log(`   GET  /api/orders/:id`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
