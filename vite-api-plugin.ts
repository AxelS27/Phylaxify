import type { Plugin } from 'vite';

export function devApiPlugin(): Plugin {
  return {
    name: 'phylaxify-dev-api',
    apply: 'serve',
    async configureServer(server) {
      const dotenv = await import('dotenv');
      dotenv.config({ path: '.env.local' });

      const express = (await import('express')).default;
      const app = express();
      app.use(express.json());

      const wrap =
        (handler: (req: any, res: any) => any | Promise<any>) =>
        (req: any, res: any) => {
          if (req.params && Object.keys(req.params).length > 0) {
            req.query = { ...req.query, ...req.params };
          }
          return Promise.resolve(handler(req, res)).catch((err) => {
            console.error('[dev-api]', err);
            if (!res.headersSent) {
              res.status(500).json({ error: (err as Error).message });
            }
          });
        };

      const { default: healthHandler } = await import('./api/health');
      const { default: saweriaHandler } = await import(
        './api/webhook/saweria/[token]'
      );
      const { default: trakteerHandler } = await import(
        './api/webhook/trakteer/[token]'
      );
      const { default: testHandler } = await import(
        './api/test/donation/[token]'
      );

      app.get('/api/health', wrap(healthHandler));
      app.post('/api/webhook/saweria/:token', wrap(saweriaHandler));
      app.post('/api/webhook/trakteer/:token', wrap(trakteerHandler));
      app.post('/api/test/donation/:token', wrap(testHandler));

      server.middlewares.use(app);
      console.log('[dev-api] mounted /api routes on Vite dev server');
    },
  };
}
