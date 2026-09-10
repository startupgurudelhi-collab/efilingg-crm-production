import { Lead, LeadStage } from '../types';
import { getLeads, saveLeads, getEmployees, createNotification, writeActivityLog } from './db';
import { pushToPostgres } from './postgresSync';

export interface WebsiteLeadPayload {
  customerName: string;
  mobile: string;
  email?: string;
  city?: string;
  state?: string;
  serviceRequired?: string;
  source?: string;
  leadSource?: string;
  submissionChannel?: string;
  packageDetails?: string;
  packageFee?: number;
  externalLeadId?: string;
  websiteUrl?: string;
  notes?: string;
  internalNotes?: string;
  stage?: LeadStage;
  assignedTo?: string;
}

export const DEFAULT_WEBSITE_API_KEY = 'efilingg_legomark_live_sec_8923fae9912c';

/**
 * Checks if a lead originated from a website, landing page, or external marketing source
 */
export function isWebsiteLead(lead: Lead): boolean {
  if (!lead) return false;
  if (lead.externalLeadId) return true;
  if (lead.websiteUrl) return true;
  if (lead.submissionChannel) return true;
  
  const source = (lead.leadSource || lead.source || '').toLowerCase();
  return (
    source.includes('website') ||
    source.includes('legomark') ||
    source.includes('google ads') ||
    source.includes('landing') ||
    source.includes('web') ||
    source.includes('online form') ||
    source.includes('portal')
  );
}

/**
 * Returns all website leads sorted with newest first
 */
export function getWebsiteLeads(): Lead[] {
  const allLeads = getLeads();
  return allLeads
    .filter(isWebsiteLead)
    .sort((a, b) => new Date(b.creationDate || 0).getTime() - new Date(a.creationDate || 0).getTime());
}

/**
 * Pre-seeds the exact leads from the user's screenshots (Samita & Rajesh Kumar from legomarkindia.com)
 * if they don't already exist.
 */
export function ensureSampleWebsiteLeads(): void {
  try {
    const leads = getLeads();
    let changed = false;

    // 1. Lead from Screenshot 2: Samita from Siliguri (ID: f1af6d40)
    const existingSamita = leads.find(
      l => l.externalLeadId === 'f1af6d40' || (l.mobile && l.mobile.includes('6294685285'))
    );

    if (!existingSamita) {
      const samitaLead: Lead = {
        id: 'LD-2241',
        externalLeadId: 'f1af6d40',
        customerName: 'Samita',
        mobile: '6294685285',
        email: 'samaakhambenrai@gmail.com',
        businessName: 'Samita Enterprises',
        serviceRequired: 'Trademark Registration',
        leadSource: 'Website (LEGOMARK INDIA)',
        source: 'Website',
        submissionChannel: 'service_landing_page_application_form',
        city: 'Siliguri',
        state: 'West Bengal',
        packageDetails: 'Service application initiated for Trademark Registration (Growth & Compliance - ₹11,999)',
        packageFee: 11999,
        websiteUrl: 'legomarkindia.com',
        stage: 'New Lead',
        creationDate: '2026-09-10T12:29:00.000Z',
        notes: 'Service application initiated for Trademark Registration (Growth & Compliance - ₹11,999). Client requested prompt legal assistance.',
        internalNotes: 'Client submitted lead form via service landing page. Awaiting initial consultation call.',
        assignedTo: 'EMP-ADMIN',
        createdBy: 'EMP-ADMIN',
        version: 1,
        updatedAt: '2026-09-10T12:29:00.000Z',
        updatedBy: 'API-LEGOMARK'
      };
      leads.unshift(samitaLead);
      changed = true;
    }

    // 2. Lead from Screenshot 1: Rajesh Kumar (Corporate Annual Retainer - ₹29,999)
    const existingRajesh = leads.find(
      l => l.externalLeadId === 'legomark-9a3b' || (l.mobile && l.mobile.includes('7530847878'))
    );

    if (!existingRajesh) {
      const rajeshLead: Lead = {
        id: 'LD-2240',
        externalLeadId: 'legomark-9a3b',
        customerName: 'Rajesh Kumar',
        mobile: '+91 75308 47878',
        email: 'rajesh.kumar@acmecorp.in',
        businessName: 'Acme Technologies Pvt Ltd',
        serviceRequired: 'Trademark Registration',
        leadSource: 'Website (LEGOMARK INDIA)',
        source: 'Website',
        submissionChannel: 'service_landing_page_application_form',
        city: 'New Delhi',
        state: 'Delhi',
        packageDetails: 'Corporate Annual Retainer - Professional Assistance ₹29,999',
        packageFee: 29999,
        websiteUrl: 'legomarkindia.com',
        stage: 'Contacted',
        creationDate: '2026-09-10T11:15:00.000Z',
        notes: 'Corporate Annual Retainer for multi-class trademark filing and advisory assistance.',
        internalNotes: 'Payment initiated on frontend checkout. Follow-up regarding POA and DSC.',
        assignedTo: 'EMP-ADMIN',
        createdBy: 'EMP-ADMIN',
        version: 1,
        updatedAt: '2026-09-10T11:15:00.000Z',
        updatedBy: 'API-LEGOMARK'
      };
      leads.push(rajeshLead);
      changed = true;
    }

    if (changed) {
      saveLeads(leads);
      pushToPostgres('efilingg_crm_leads', JSON.stringify(leads)).catch(e => {
        console.warn('[Website Leads Seed] PostgreSQL push deferred:', e.message);
      });
    }
  } catch (err) {
    console.error('[Website Leads Seed Error]', err);
  }
}

/**
 * Creates or updates a website lead in the CRM storage
 */
export function ingestWebsiteLead(payload: WebsiteLeadPayload, triggerBy = 'API-LEGOMARK'): Lead {
  const leads = getLeads();

  // Normalize phone digits
  const cleanMobile = (payload.mobile || '').replace(/\D/g, '');
  const last10 = cleanMobile.length > 10 ? cleanMobile.slice(-10) : cleanMobile;

  // Check if lead already exists by externalLeadId or phone + service
  let existingIndex = -1;
  if (payload.externalLeadId) {
    existingIndex = leads.findIndex(l => l.externalLeadId === payload.externalLeadId);
  }
  if (existingIndex === -1 && last10.length >= 10) {
    existingIndex = leads.findIndex(l => {
      const lMobile = (l.mobile || '').replace(/\D/g, '');
      const lLast10 = lMobile.length > 10 ? lMobile.slice(-10) : lMobile;
      return lLast10 === last10 && (l.serviceRequired === payload.serviceRequired || !payload.serviceRequired);
    });
  }

  const employees = getEmployees();
  const defaultAdmin = employees.find(e => e.role === 'admin')?.id || 'EMP-ADMIN';

  if (existingIndex !== -1) {
    // Update existing lead with latest website details
    const existing = leads[existingIndex];
    const updatedLead: Lead = {
      ...existing,
      customerName: payload.customerName || existing.customerName,
      email: payload.email || existing.email,
      city: payload.city || existing.city,
      state: payload.state || existing.state,
      notes: payload.notes || payload.packageDetails ? `${existing.notes ? existing.notes + '\n\n' : ''}[New Website Submission ${new Date().toLocaleDateString('en-IN')}]: ${payload.notes || payload.packageDetails}` : existing.notes,
      packageDetails: payload.packageDetails || existing.packageDetails,
      packageFee: payload.packageFee !== undefined ? Number(payload.packageFee) : existing.packageFee,
      externalLeadId: payload.externalLeadId || existing.externalLeadId,
      websiteUrl: payload.websiteUrl || existing.websiteUrl,
      submissionChannel: payload.submissionChannel || existing.submissionChannel,
      source: payload.source || existing.source || 'Website',
      leadSource: payload.leadSource || existing.leadSource || 'Website (LEGOMARK INDIA)',
      updatedAt: new Date().toISOString(),
      updatedBy: triggerBy,
      version: (existing.version || 1) + 1
    };

    leads[existingIndex] = updatedLead;
    saveLeads(leads);
    pushToPostgres('efilingg_crm_leads', JSON.stringify(leads)).catch(console.warn);

    writeActivityLog(
      triggerBy,
      'Website Integration',
      'system',
      'Website Lead Updated',
      `Updated lead ${updatedLead.customerName} (${updatedLead.mobile}) via website webhook.`
    );

    return updatedLead;
  }

  // Create brand new lead
  let maxIdNum = 2240;
  leads.forEach(l => {
    if (l.id && l.id.startsWith('LD-')) {
      const num = parseInt(l.id.replace('LD-', ''), 10);
      if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
    }
  });

  const newId = `LD-${maxIdNum + 1}`;
  const nowIso = new Date().toISOString();

  const newLead: Lead = {
    id: newId,
    customerName: payload.customerName || 'Website Visitor',
    mobile: payload.mobile || '',
    email: payload.email || '',
    businessName: '',
    serviceRequired: payload.serviceRequired || 'Trademark Registration',
    leadSource: payload.leadSource || 'Website (LEGOMARK INDIA)',
    source: payload.source || 'Website',
    submissionChannel: payload.submissionChannel || 'service_landing_page_application_form',
    city: payload.city || '',
    state: payload.state || '',
    packageDetails: payload.packageDetails || '',
    packageFee: payload.packageFee !== undefined ? Number(payload.packageFee) : 0,
    externalLeadId: payload.externalLeadId || `web-${Date.now().toString(36)}`,
    websiteUrl: payload.websiteUrl || 'legomarkindia.com',
    stage: payload.stage || 'New Lead',
    creationDate: nowIso,
    notes: payload.notes || payload.packageDetails || 'Captured directly from website lead form',
    internalNotes: payload.internalNotes || '',
    assignedTo: payload.assignedTo || defaultAdmin,
    createdBy: defaultAdmin,
    version: 1,
    updatedAt: nowIso,
    updatedBy: triggerBy
  };

  leads.unshift(newLead);
  saveLeads(leads);
  pushToPostgres('efilingg_crm_leads', JSON.stringify(leads)).catch(console.warn);

  // Send realtime notification to sales / admin team
  createNotification({
    title: 'New Website Lead Captured',
    message: `${newLead.customerName} (${newLead.serviceRequired}) submitted lead form on ${newLead.websiteUrl || 'Website'}.`,
    type: 'lead_assigned',
    userId: newLead.assignedTo,
    link: `lead-${newLead.id}`
  });

  writeActivityLog(
    triggerBy,
    'Website Integration',
    'system',
    'Website Lead Ingested',
    `Created new lead ${newLead.customerName} (${newLead.mobile}) for ${newLead.serviceRequired} from ${newLead.websiteUrl || 'Website'}.`
  );

  return newLead;
}
