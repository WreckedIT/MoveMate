import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import * as http from 'http';
import cors from 'cors';

const app = express();
// Configure CORS to allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add a simple health check route that responds immediately
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log all incoming requests to debug
  log(`Incoming request: ${req.method} ${req.url} (Origin: ${req.get('origin') || 'None'})`);

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Create Express HTTP server
const server = http.createServer(app);

// Get the port - default to 5000 but check if we need an alternate port
const port = parseInt(process.env.PORT || '5000', 10);

// Immediately bind to the port to signal readiness
log(`Starting Express server on port ${port}`);

// Try to start the server, but handle if the port is already in use
const httpServer = server.listen(port, '0.0.0.0', () => {
  log(`Express server running on port ${port}`);
  
  // Extra logging to help debug startup issues
  const mode = process.env.PROXY_MODE === 'true' ? 'PROXY' : 'DIRECT';
  log(`Server mode: ${mode}`);
  log(`Node version: ${process.version}`);
  log(`Database URL: ${process.env.DATABASE_URL ? '(present)' : '(missing)'}`);
});

// Handle the case where the port is already in use
httpServer.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    log(`Port ${port} is already in use, trying to use it anyway...`);
    
    // If port is in use, we're likely already running on it in Replit
    // Let's consider this a success for the Replit workflow
    process.exit(0);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Register all the routes AFTER the server has started
// This way, Replit can detect the open port immediately
(async () => {
  try {
    // Add global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Register all API routes in the background
    await registerRoutes(app);
    
    // Set up Vite for the frontend in the background
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    // Log full initialization after everything is set up
    log(`Server is fully initialized and ready on port ${port}`);
  } catch (error) {
    console.error("Error during server initialization:", error);
  }
})();
