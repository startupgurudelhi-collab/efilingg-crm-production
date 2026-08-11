/**
 * AI Sales Agent V1 Foundation - REST API Router
 * Efilingg CRM AI Sales Module
 */

import { Router, Request, Response } from 'express';
import { AiAgentRepository } from './db';
import { AiQualifiedLeadStatus } from '../../types/aiAgent';

export const aiAgentRouter = Router();

// -------------------------------------------------------------
// 1. SETTINGS
// -------------------------------------------------------------

// GET /settings
aiAgentRouter.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = AiAgentRepository.getSettings();
    return res.status(200).json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /settings
aiAgentRouter.put('/settings', (req: Request, res: Response) => {
  try {
    const { agent_enabled, max_questions, max_messages, handover_message, userId, userName } = req.body;
    const updated = AiAgentRepository.updateSettings(
      {
        agent_enabled: Boolean(agent_enabled),
        max_questions: Number(max_questions) || 5,
        max_messages: Number(max_messages) || 20,
        handover_message: handover_message || '',
      },
      userId,
      userName
    );
    return res.status(200).json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2. KNOWLEDGE BASE (SERVICES)
// -------------------------------------------------------------

// GET /services
aiAgentRouter.get('/services', (req: Request, res: Response) => {
  try {
    const services = AiAgentRepository.getServices();
    return res.status(200).json({ success: true, count: services.length, services });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /services/:id
aiAgentRouter.get('/services/:id', (req: Request, res: Response) => {
  try {
    const service = AiAgentRepository.getServiceById(req.params.id);
    if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
    return res.status(200).json({ success: true, service });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /services
aiAgentRouter.post('/services', (req: Request, res: Response) => {
  try {
    const { service_name, description, price, timeline, required_documents, active, userId, userName } = req.body;
    if (!service_name) {
      return res.status(400).json({ success: false, error: 'Service name is required' });
    }

    const created = AiAgentRepository.addService(
      {
        service_name,
        description: description || '',
        price: price || 0,
        timeline: timeline || '',
        required_documents: Array.isArray(required_documents)
          ? required_documents
          : String(required_documents || '').split(',').map((s) => s.trim()).filter(Boolean),
        active: active !== undefined ? Boolean(active) : true,
      },
      userId,
      userName
    );

    return res.status(201).json({ success: true, service: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /services/:id
aiAgentRouter.put('/services/:id', (req: Request, res: Response) => {
  try {
    const { service_name, description, price, timeline, required_documents, active, userId, userName } = req.body;
    const updated = AiAgentRepository.updateService(
      req.params.id,
      {
        ...(service_name && { service_name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(timeline !== undefined && { timeline }),
        ...(required_documents !== undefined && {
          required_documents: Array.isArray(required_documents)
            ? required_documents
            : String(required_documents || '').split(',').map((s) => s.trim()).filter(Boolean),
        }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
      userId,
      userName
    );

    if (!updated) return res.status(404).json({ success: false, error: 'Service not found' });
    return res.status(200).json({ success: true, service: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /services/:id
aiAgentRouter.delete('/services/:id', (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body || {};
    const success = AiAgentRepository.deleteService(req.params.id, userId, userName);
    if (!success) return res.status(404).json({ success: false, error: 'Service not found' });
    return res.status(200).json({ success: true, message: 'Service deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3. FAQ TRAINING
// -------------------------------------------------------------

// GET /faqs
aiAgentRouter.get('/faqs', (req: Request, res: Response) => {
  try {
    const serviceId = req.query.service_id as string | undefined;
    const faqs = AiAgentRepository.getFaqs(serviceId);
    return res.status(200).json({ success: true, count: faqs.length, faqs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /faqs
aiAgentRouter.post('/faqs', (req: Request, res: Response) => {
  try {
    const { service_id, question, answer, active, userId, userName } = req.body;
    if (!service_id || !question || !answer) {
      return res.status(400).json({ success: false, error: 'service_id, question, and answer are required' });
    }

    const created = AiAgentRepository.addFaq(
      {
        service_id,
        question,
        answer,
        active: active !== undefined ? Boolean(active) : true,
      },
      userId,
      userName
    );

    return res.status(201).json({ success: true, faq: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /faqs/:id
aiAgentRouter.put('/faqs/:id', (req: Request, res: Response) => {
  try {
    const { service_id, question, answer, active, userId, userName } = req.body;
    const updated = AiAgentRepository.updateFaq(
      req.params.id,
      {
        ...(service_id && { service_id }),
        ...(question && { question }),
        ...(answer && { answer }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
      userId,
      userName
    );

    if (!updated) return res.status(404).json({ success: false, error: 'FAQ not found' });
    return res.status(200).json({ success: true, faq: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /faqs/:id
aiAgentRouter.delete('/faqs/:id', (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body || {};
    const success = AiAgentRepository.deleteFaq(req.params.id, userId, userName);
    if (!success) return res.status(404).json({ success: false, error: 'FAQ not found' });
    return res.status(200).json({ success: true, message: 'FAQ deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 4. LEAD FORM BUILDER
// -------------------------------------------------------------

// GET /lead-forms
aiAgentRouter.get('/lead-forms', (req: Request, res: Response) => {
  try {
    const serviceId = req.query.service_id as string | undefined;
    const forms = AiAgentRepository.getLeadForms(serviceId);
    return res.status(200).json({ success: true, count: forms.length, forms });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /lead-forms
aiAgentRouter.post('/lead-forms', (req: Request, res: Response) => {
  try {
    const { service_id, form_name, active, userId, userName } = req.body;
    if (!service_id || !form_name) {
      return res.status(400).json({ success: false, error: 'service_id and form_name are required' });
    }

    const created = AiAgentRepository.addLeadForm(
      {
        service_id,
        form_name,
        active: active !== undefined ? Boolean(active) : true,
      },
      userId,
      userName
    );

    return res.status(201).json({ success: true, form: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /lead-forms/:id
aiAgentRouter.put('/lead-forms/:id', (req: Request, res: Response) => {
  try {
    const { form_name, active, userId, userName } = req.body;
    const updated = AiAgentRepository.updateLeadForm(
      req.params.id,
      {
        ...(form_name && { form_name }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
      userId,
      userName
    );

    if (!updated) return res.status(404).json({ success: false, error: 'Lead form not found' });
    return res.status(200).json({ success: true, form: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /lead-forms/:id
aiAgentRouter.delete('/lead-forms/:id', (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body || {};
    const success = AiAgentRepository.deleteLeadForm(req.params.id, userId, userName);
    if (!success) return res.status(404).json({ success: false, error: 'Lead form not found' });
    return res.status(200).json({ success: true, message: 'Lead form deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /lead-fields
aiAgentRouter.get('/lead-fields', (req: Request, res: Response) => {
  try {
    const formId = req.query.form_id as string | undefined;
    const fields = AiAgentRepository.getLeadFields(formId);
    return res.status(200).json({ success: true, count: fields.length, fields });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /lead-fields
aiAgentRouter.post('/lead-fields', (req: Request, res: Response) => {
  try {
    const { form_id, field_name, field_label, field_type, required, display_order, options, userId, userName } = req.body;
    if (!form_id || !field_name || !field_label || !field_type) {
      return res.status(400).json({ success: false, error: 'form_id, field_name, field_label, and field_type are required' });
    }

    const created = AiAgentRepository.addLeadField(
      {
        form_id,
        field_name,
        field_label,
        field_type,
        required: Boolean(required),
        display_order: Number(display_order) || 1,
        options: Array.isArray(options) ? options : [],
      },
      userId,
      userName
    );

    return res.status(201).json({ success: true, field: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /lead-fields/:id
aiAgentRouter.put('/lead-fields/:id', (req: Request, res: Response) => {
  try {
    const { field_name, field_label, field_type, required, display_order, options, userId, userName } = req.body;
    const updated = AiAgentRepository.updateLeadField(
      req.params.id,
      {
        ...(field_name && { field_name }),
        ...(field_label && { field_label }),
        ...(field_type && { field_type }),
        ...(required !== undefined && { required: Boolean(required) }),
        ...(display_order !== undefined && { display_order: Number(display_order) }),
        ...(options !== undefined && { options: Array.isArray(options) ? options : [] }),
      },
      userId,
      userName
    );

    if (!updated) return res.status(404).json({ success: false, error: 'Lead field not found' });
    return res.status(200).json({ success: true, field: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /lead-fields/:id
aiAgentRouter.delete('/lead-fields/:id', (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body || {};
    const success = AiAgentRepository.deleteLeadField(req.params.id, userId, userName);
    if (!success) return res.status(404).json({ success: false, error: 'Lead field not found' });
    return res.status(200).json({ success: true, message: 'Lead field deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 5. QUALIFIED LEADS
// -------------------------------------------------------------

// GET /qualified-leads
aiAgentRouter.get('/qualified-leads', (req: Request, res: Response) => {
  try {
    const leads = AiAgentRepository.getQualifiedLeads();
    return res.status(200).json({ success: true, count: leads.length, leads });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /qualified-leads/:id
aiAgentRouter.get('/qualified-leads/:id', (req: Request, res: Response) => {
  try {
    const lead = AiAgentRepository.getQualifiedLeadById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    return res.status(200).json({ success: true, lead });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /qualified-leads
aiAgentRouter.post('/qualified-leads', (req: Request, res: Response) => {
  try {
    const { conversation_id, customer_name, mobile, email, service_name, lead_summary, collected_data, status } = req.body;
    if (!customer_name || !mobile || !service_name) {
      return res.status(400).json({ success: false, error: 'customer_name, mobile, and service_name are required' });
    }

    const created = AiAgentRepository.addQualifiedLead({
      conversation_id: conversation_id || `CONV-${Date.now()}`,
      customer_name,
      mobile,
      email: email || '',
      service_name,
      lead_summary: lead_summary || '',
      collected_data: collected_data || {},
      status: (status as AiQualifiedLeadStatus) || 'NEW',
    });

    return res.status(201).json({ success: true, lead: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /qualified-leads/:id/status
aiAgentRouter.put('/qualified-leads/:id/status', (req: Request, res: Response) => {
  try {
    const { status, changedBy, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });

    const updated = AiAgentRepository.updateQualifiedLeadStatus(
      req.params.id,
      status as AiQualifiedLeadStatus,
      changedBy || 'Master Admin',
      notes || ''
    );

    if (!updated) return res.status(404).json({ success: false, error: 'Qualified lead not found' });
    return res.status(200).json({ success: true, lead: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /qualified-leads/:id
aiAgentRouter.put('/qualified-leads/:id', (req: Request, res: Response) => {
  try {
    const updated = AiAgentRepository.updateQualifiedLead(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Qualified lead not found' });
    return res.status(200).json({ success: true, lead: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /qualified-leads/:id
aiAgentRouter.delete('/qualified-leads/:id', (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body || {};
    const success = AiAgentRepository.deleteQualifiedLead(req.params.id, userId, userName);
    if (!success) return res.status(404).json({ success: false, error: 'Qualified lead not found' });
    return res.status(200).json({ success: true, message: 'Qualified lead deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 6. CONVERSATION SESSIONS & TRAINING LOGS & DASHBOARD
// -------------------------------------------------------------

// GET /conversation-sessions
aiAgentRouter.get('/conversation-sessions', (req: Request, res: Response) => {
  try {
    const sessions = AiAgentRepository.getConversationSessions();
    return res.status(200).json({ success: true, count: sessions.length, sessions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /conversation-sessions
aiAgentRouter.post('/conversation-sessions', (req: Request, res: Response) => {
  try {
    const session = AiAgentRepository.saveConversationSession(req.body);
    return res.status(200).json({ success: true, session });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /training-logs
aiAgentRouter.get('/training-logs', (req: Request, res: Response) => {
  try {
    const logs = AiAgentRepository.getTrainingLogs();
    return res.status(200).json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /dashboard
aiAgentRouter.get('/dashboard', (req: Request, res: Response) => {
  try {
    const metrics = AiAgentRepository.getDashboardMetrics();
    const recentLogs = AiAgentRepository.getTrainingLogs().slice(0, 10);
    const recentLeads = AiAgentRepository.getQualifiedLeads().slice(0, 5);

    return res.status(200).json({
      success: true,
      metrics,
      recentLogs,
      recentLeads,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
