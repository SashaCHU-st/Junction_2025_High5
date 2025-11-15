import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { voiceRoutes } from './routes/voice';

const fastify = Fastify({
  logger: true
});

// Register CORS
fastify.register(cors, {
  origin: true, // Allow all origins for development
  credentials: true
});

// Register routes
fastify.register(voiceRoutes);

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`
🎙️  HealthyBuddy Backend Server Running!

📡 API: http://localhost:${port}
🏥 Health: http://localhost:${port}/health
🎯 Voice API: http://localhost:${port}/api/voice/process

Ready to help elderly users find friends! 👵👴
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
