import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Order types
interface OrderItem {
  id: number;
  title: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  items: OrderItem[];
  total: number;
  customerName?: string;
  customerEmail?: string;
  createdAt: Date;
}

// Temporary in-memory orders storage
// TODO: Replace with database
const orders: Order[] = [];
let orderIdCounter = 1;

export async function orderRoutes(fastify: FastifyInstance) {
  // POST /api/orders - Create a new order
  fastify.post('/api/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const orderData = request.body as Partial<Order>;

      // Create new order
      const newOrder: Order = {
        id: orderIdCounter++,
        items: orderData.items || [],
        total: orderData.total || 0,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        createdAt: new Date(),
      };

      orders.push(newOrder);

      return reply.status(201).send(newOrder);
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: 'Failed to create order' });
    }
  });

  // GET /api/orders - Get all orders
  fastify.get('/api/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return orders;
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch orders' });
    }
  });

  // GET /api/orders/:id - Get single order
  fastify.get('/api/orders/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      const order = orders.find(order => order.id === id);

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      return order;
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch order' });
    }
  });
}
