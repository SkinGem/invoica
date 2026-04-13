// company.ts — Company profile + supported countries API (user-scoped)
// GET  /v1/company/countries — static list of tax-supported countries
// GET  /v1/company/profile   — current user's company profile
// POST /v1/company/profile   — create/update company profile
// POST /v1/company/verify    — trigger verification (placeholder)
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

function getSb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/** Extract user ID from Supabase JWT in Authorization header */
async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb.auth.getUser(token);
  return data.user?.id || null;
}

const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States',   regLabel: 'EIN',              regPlaceholder: '12-3456789',     regFormat: 'XX-XXXXXXX',           autoVerify: false },
  { code: 'GB', name: 'United Kingdom',  regLabel: 'Company Number',   regPlaceholder: '12345678',       regFormat: '8 digits',             autoVerify: true  },
  { code: 'FR', name: 'France',          regLabel: 'SIREN',            regPlaceholder: '123456789',      regFormat: '9 digits',             autoVerify: true  },
  { code: 'DE', name: 'Germany',         regLabel: 'HRB Number',       regPlaceholder: 'HRB 12345',      regFormat: 'HRB + digits',         autoVerify: true  },
  { code: 'NL', name: 'Netherlands',     regLabel: 'KvK Number',       regPlaceholder: '12345678',       regFormat: '8 digits',             autoVerify: true  },
  { code: 'IE', name: 'Ireland',         regLabel: 'CRO Number',       regPlaceholder: '123456',         regFormat: '6 digits',             autoVerify: true  },
  { code: 'ES', name: 'Spain',           regLabel: 'CIF/NIF',          regPlaceholder: 'B12345678',      regFormat: 'Letter + 8 digits',    autoVerify: true  },
  { code: 'IT', name: 'Italy',           regLabel: 'Codice Fiscale',   regPlaceholder: '12345678901',    regFormat: '11 digits',            autoVerify: true  },
  { code: 'BE', name: 'Belgium',         regLabel: 'BCE Number',       regPlaceholder: '0123.456.789',   regFormat: '0XXX.XXX.XXX',         autoVerify: true  },
  { code: 'LU', name: 'Luxembourg',      regLabel: 'RCS Number',       regPlaceholder: 'B12345',         regFormat: 'B + digits',           autoVerify: true  },
  { code: 'CH', name: 'Switzerland',     regLabel: 'UID',              regPlaceholder: 'CHE-123.456.789', regFormat: 'CHE-XXX.XXX.XXX',     autoVerify: false },
  { code: 'JP', name: 'Japan',           regLabel: 'Corporate Number', regPlaceholder: '1234567890123',  regFormat: '13 digits',            autoVerify: false },
];

router.get('/v1/company/countries', (_req: Request, res: Response) => {
  res.json({ success: true, data: SUPPORTED_COUNTRIES });
});

router.get('/v1/company/profile', async (req: Request, res: Response) => {
  const userId = await getUserId(req);
  if (!userId) {
    res.json({ success: true, data: null });
    return;
  }
  const sb = getSb();
  const { data, error } = await sb
    .from('CompanyProfile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'DB_ERROR' } });
    return;
  }
  res.json({ success: true, data: data || null });
});

router.post('/v1/company/profile', async (req: Request, res: Response) => {
  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
    return;
  }
  const sb = getSb();
  const body = req.body as Record<string, unknown>;

  // Check if profile exists for this user
  const { data: existing } = await sb
    .from('CompanyProfile')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  const profileData = {
    user_id:             userId,
    profile_type:        body.profile_type || 'registered_company',
    company_name:        body.company_name || null,
    company_country:     body.company_country || null,
    registration_number: body.registration_number || null,
    vat_number:          body.vat_number || null,
    address:             body.address || null,
    project_name:        body.project_name || null,
    verification_status: 'unverified',
  };

  let data, error;
  if (existing) {
    ({ data, error } = await sb.from('CompanyProfile').update(profileData).eq('id', existing.id).select().single());
  } else {
    ({ data, error } = await sb.from('CompanyProfile').insert(profileData).select().single());
  }

  if (error) {
    res.status(500).json({ success: false, error: { message: error.message, code: 'DB_ERROR' } });
    return;
  }
  res.json({ success: true, data });
});

router.post('/v1/company/verify', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      message: 'Verification pending — auto-verification via VIES/Companies House will run asynchronously',
      profile: null,
    },
  });
});

export default router;
