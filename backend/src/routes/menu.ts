import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Menu item type
interface MenuItem {
  id: number;
  title: string;
  description: string;
  price: number;
  image?: string;
}

// Temporary in-memory menu data
// TODO: Replace with database queries
const menuItems: MenuItem[] = [
  {
    id: 1,
    title: 'Latte',
    description: 'Espresso with steamed milk and foam',
    price: 5.50,
    image: 'latte'
  },
  {
    id: 2,
    title: 'Espresso',
    description: 'Concentrated coffee',
    price: 3.50,
    image: 'espresso'
  },
  {
    id: 3,
    title: 'Americano',
    description: 'Espresso diluted with hot water',
    price: 4.00,
    image: 'americano'
  },
  {
    id: 4,
    title: 'Black tes',
    description: 'Hot black tea',
    price: 4.00,
    image: 'blacktea'
  }
];

export async function menuRoutes(fastify: FastifyInstance) {
  // GET /api/menu - Get all menu items
  fastify.get('/api/menu', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return menuItems;
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch menu items' });
    }
  });

  // GET /api/menu/:id - Get single menu item
  fastify.get('/api/menu/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const id = parseInt(request.params.id);
      const item = menuItems.find(item => item.id === id);

      if (!item) {
        return reply.status(404).send({ error: 'Menu item not found' });
      }

      return item;
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ error: 'Failed to fetch menu item' });
    }
  });
}
