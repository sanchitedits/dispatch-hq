import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { verifyShopifyWebhook } from './src/auth';
import { ShopifyWebhookSchema, ProductSchema } from './src/schema';

// Mock DB for local preview holding the complex logic
const MOCK_DB = {
  products: [
    { id: 'prod_1', shopDns: 'test.myshopify.com', name: 'Advanced React Course (1080p Video)', type: 'digital', price: 149.00, sales: 1042, status: 'active', config: { maxDownloads: 3, expirationHours: 48, ipBlock: true } },
    { id: 'prod_2', shopDns: 'test.myshopify.com', name: 'Proxima Video Editor - License', type: 'license', price: 89.99, sales: 450, status: 'active', config: { keysAvailable: 5040 } },
    { id: 'prod_3', shopDns: 'test.myshopify.com', name: 'Creator Merch T-Shirt (Large)', type: 'physical', price: 24.99, sales: 156, status: 'active' }
  ],
  logs: [
    { id: 1, time: new Date().toISOString(), event: 'System Start', details: 'AWS DB Initialized', status: 'info' }
  ]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // IMPORTANT: For Shopify Webhooks, we need raw body for HMAC validation.
  // We apply JSON parsing for standard API routes, and raw for webhooks.
  app.use('/api/webhooks', express.raw({ type: 'application/json' }));
  app.use(express.json());

  // --- API ROUTES (Simulating AWS API Gateway + Lambda) ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', environment: 'AWS-Preview' });
  });

  // 1. Fetch Products
  app.get('/api/products', (req, res) => {
    // In production AWS, this does a Scan or Query on DynamoDB:
    // const command = new QueryCommand({ TableName: "Dispatch", KeyConditionExpression: "PK = :pk", ExpressionAttributeValues: { ":pk": `STORE#${shop}` }})
    res.json(MOCK_DB.products);
  });

  // 2. Fetch Logs
  app.get('/api/logs', (req, res) => {
    // In prod AWS, query DynamoDB `LOG#...`
    res.json(MOCK_DB.logs);
  });

  // 3. Shopify Webhook ingestion endpoint (orders/create)
  // In real AWS architecture, API Gateway puts this straight onto an SQS Queue, and a background Lambda processes it.
  app.post('/api/webhooks/orders', (req: Request, res: Response) => {
    try {
      const hmac = req.get('X-Shopify-Hmac-Sha256') || '';
      const secret = process.env.SHOPIFY_WEBHOOK_SECRET || 'test_secret';
      
      // In prod, uncomment to STRICTLY enforce HMAC
      // const isValid = verifyShopifyWebhook(req.body.toString(), hmac, secret);
      // if (!isValid) return res.status(401).send('Unauthorized webhook');
      
      const payload = JSON.parse(req.body.toString());
      const order = ShopifyWebhookSchema.parse(payload);

      // Simulate the dispatch logic that would happen in the background Lambda SQS worker
      MOCK_DB.logs.unshift({
        id: Date.now(),
        time: new Date().toISOString(),
        event: 'Order Received',
        details: `Order #${order.id} queuing for dispatch engine.`,
        status: 'info'
      });

      // Quick 200 Return to Shopify so they don't timeout
      res.status(200).send('OK');
    } catch (err: any) {
      console.error("Webhook processing error:", err.message);
      res.status(400).json({ error: 'Bad Request' });
    }
  });

  // --- VITE MIDDLEWARE ---
  // Serves the React frontend
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
