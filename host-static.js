const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { serve } = require('@hono/node-server');
const { serveStatic } = require('@hono/node-server/serve-static');

const port = 80;

const app = new Hono();

app.use(cors({
	origin: (origin, c) => origin
}));
app.use('/*', serveStatic({ root: '/' }));
serve({
	fetch: app.fetch,
	port,
});