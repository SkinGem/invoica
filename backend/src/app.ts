import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import invoiceStatsRoutes from './routes/invoice-stats';
import invoiceExportRoutes from './routes/invoices-export';
import invoiceRoutes from './routes/invoices';
import apiKeyRoutes from './routes/api-keys';
import webhookRoutes from './routes/webhooks';
import settlementSummaryRoutes from './routes/settlement-summary';
import settlementRoutes from './routes/settlements';
import healthRoutes from './routes/health';
import wellKnownRoutes from './routes/well-known';
import aiInferenceRoutes from './routes/ai-inference';
import ledgerRoutes from './routes/ledger';
import adminRoutes from './routes/admin';
import gasBackstopRouter from './routes/gas-backstop';
import reputationLeaderboardRoutes from './routes/reputation-leaderboard';
import reputationRoutes from './routes/reputation';
import reputationHistoryRoutes from './routes/reputation-history';
import metricsRoutes from './routes/metrics';
import taxRoutes from './routes/tax';
import agentRoutes from './routes/agents';
import sapRoutes from './routes/sap';
import sapExecuteRoutes from './routes/sap-execute';
import invoiceDownloadRoutes from './routes/invoice-download';
import pactSessionRoutes from './routes/pact-session';
import mandateRoutes from './routes/mandates';
import openapiRoutes from './routes/openapi';
import clinpayDrsRoutes from './routes/clinpay-drs';
import companyRoutes from './routes/company';
import billingRoutes from './routes/billing';
import { clinpayWebhookRouter, clinpayRouter } from './routes/clinpay';
import x402InvoiceRoutes from './routes/x402-invoice';
import stripeWebhookRoutes from './routes/webhooks-stripe';
import billingPayAsYouGoRoutes from './routes/billing-pay-as-you-go';
import clinpayReportsRoutes from './routes/clinpay-reports';
import publicMandatesRoutes from './routes/public-mandates';
import aiaxStaticRouter from './aiax/static-server';
import { authenticate } from './middleware/auth';

const app = express();

// M1-SEC-08 (plan §3.8): security headers. API-only service — CSP locks
// everything down to 'none' since we never serve HTML/JS from this origin.
// HSTS 1 year per plan; X-Content-Type-Options nosniff via helmet defaults.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
}));

// BUG-006 fix: explicit CORS origins — no wildcard on main API
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['https://app.invoica.ai', 'https://invoica.ai', 'https://www.invoica.ai'];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: 86400,
}));

// AsterPay webhook needs raw body for HMAC verification — must run BEFORE express.json.
app.use(clinpayWebhookRouter);

// Stripe webhook needs raw body for signature verification — must run BEFORE express.json.
app.use(stripeWebhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Public routes (no authentication required)
app.use('/health', healthRoutes);
app.use('/.well-known', wellKnownRoutes);

// AIAX static server - public routes for agent discovery
app.use('/aiax', aiaxStaticRouter);

// Public mandates endpoint - redacted view for AIAX
app.use('/v1/public', publicMandatesRoutes);

// Apply authentication middleware to all routes below this point
app.use(authenticate);

// Protected API routes
app.use('/v1/invoices', invoiceRoutes);
app.use('/v1/invoice-stats', invoiceStatsRoutes);
app.use('/v1/invoices-export', invoiceExportRoutes);
app.use('/v1/api-keys', apiKeyRoutes);
app.use('/v1/webhooks', webhookRoutes);
app.use('/v1/settlement-summary', settlementSummaryRoutes);
app.use('/v1/settlements', settlementRoutes);
app.use('/v1/ai-inference', aiInferenceRoutes);
app.use('/v1/ledger', ledgerRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/gas-backstop', gasBackstopRouter);
app.use('/v1/reputation-leaderboard', reputationLeaderboardRoutes);
app.use('/v1/reputation', reputationRoutes);
app.use('/v1/reputation-history', reputationHistoryRoutes);
app.use('/v1/metrics', metricsRoutes);
app.use('/v1/tax', taxRoutes);
app.use('/v1/agents', agentRoutes);
app.use('/v1/sap', sapRoutes);
app.use('/v1/sap-execute', sapExecuteRoutes);
app.use('/v1/invoice-download', invoiceDownloadRoutes);
app.use('/v1/pact-session', pactSessionRoutes);
app.use('/v1/mandates', mandateRoutes);
app.use('/v1/openapi', openapiRoutes);
app.use('/v1/clinpay-drs', clinpayDrsRoutes);
app.use('/v1/company', companyRoutes);
app.use('/v1/billing', billingRoutes);
app.use('/v1/clinpay', clinpayRouter);
app.use('/v1/x402-invoice', x402InvoiceRoutes);
app.use('/v1/billing-pay-as-you-go', billingPayAsYouGoRoutes);
app.use('/v1/clinpay-reports', clinpayReportsRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message || 'Something went wrong';
    
  res.status(status).json({
    error: {
      message,
      status,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
});

// 404 handler for unmatched routes
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      path: req.originalUrl
    }
  });
});

export default app;