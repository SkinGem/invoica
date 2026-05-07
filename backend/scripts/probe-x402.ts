// Standalone probe: mount x402-invoice route on minimal Express, curl-probe locally.
// Bypasses the rest of app.ts (which has unrelated local-env issues).
import express from 'express';
import x402 from '../src/routes/x402-invoice';

const app = express();
app.use(express.json());
app.use('/api/x402', x402);

const port = parseInt(process.env.PORT || '3099', 10);
app.listen(port, () => console.log(`probe listening on ${port}`));
