/**
 * Enterprise Customer Identity Resolution Service
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 1)
 *
 * Provides identity lookup by Phone, Email, PAN, GSTIN, Company Name,
 * strict duplicate customer prevention, and event bus emissions.
 */

import { CustomerV2, CustomerLookupResult } from './types';
import { getCustomers, saveCustomer } from './db';
import { eventBus } from '../eventBus';

export class CustomerIdentityService {
  /**
   * Normalize Phone Number to standard digits string (e.g. "919812492102" or "9812492102")
   */
  public static normalizePhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    // If phone starts with 91 and has 12 digits, standard Indian mobile format
    return digits;
  }

  /**
   * Compare 2 phone numbers for equivalence (checking last 10 digits)
   */
  public static isPhoneMatch(p1: string, p2: string): boolean {
    const d1 = this.normalizePhone(p1);
    const d2 = this.normalizePhone(p2);
    if (!d1 || !d2) return false;
    const last10_1 = d1.slice(-10);
    const last10_2 = d2.slice(-10);
    return last10_1 === last10_2;
  }

  /**
   * Find Customer by Phone, Email, PAN, GSTIN, or Company
   */
  public static findCustomer(criteria: {
    phone?: string;
    email?: string;
    pan?: string;
    gstin?: string;
    companyName?: string;
  }): CustomerLookupResult {
    const customers = getCustomers();

    // 1. Phone Match (Highest Priority)
    if (criteria.phone) {
      const match = customers.find((c) => this.isPhoneMatch(c.phone, criteria.phone!));
      if (match) {
        return {
          matchFound: true,
          customer: match,
          matchType: 'PHONE',
          confidenceScore: 1.0,
        };
      }
    }

    // 2. Email Match
    if (criteria.email) {
      const targetEmail = criteria.email.trim().toLowerCase();
      const match = customers.find((c) => c.email && c.email.trim().toLowerCase() === targetEmail);
      if (match) {
        return {
          matchFound: true,
          customer: match,
          matchType: 'EMAIL',
          confidenceScore: 0.95,
        };
      }
    }

    // 3. GSTIN Match
    if (criteria.gstin) {
      const targetGstin = criteria.gstin.trim().toUpperCase();
      const match = customers.find((c) => c.gstin && c.gstin.trim().toUpperCase() === targetGstin);
      if (match) {
        return {
          matchFound: true,
          customer: match,
          matchType: 'GSTIN',
          confidenceScore: 0.95,
        };
      }
    }

    // 4. PAN Match
    if (criteria.pan) {
      const targetPan = criteria.pan.trim().toUpperCase();
      const match = customers.find((c) => c.pan && c.pan.trim().toUpperCase() === targetPan);
      if (match) {
        return {
          matchFound: true,
          customer: match,
          matchType: 'PAN',
          confidenceScore: 0.9,
        };
      }
    }

    // 5. Company Name Match
    if (criteria.companyName) {
      const targetCompany = criteria.companyName.trim().toLowerCase();
      const match = customers.find(
        (c) => c.companyName && c.companyName.trim().toLowerCase() === targetCompany
      );
      if (match) {
        return {
          matchFound: true,
          customer: match,
          matchType: 'COMPANY',
          confidenceScore: 0.85,
        };
      }
    }

    return {
      matchFound: false,
    };
  }

  /**
   * Create Customer with Duplicate Prevention Check
   */
  public static createCustomer(data: Omit<CustomerV2, 'id' | 'createdAt' | 'updatedAt'>): CustomerV2 {
    // Check duplicates by phone, email, PAN, GSTIN
    const duplicateLookup = this.findCustomer({
      phone: data.phone,
      email: data.email,
      pan: data.pan,
      gstin: data.gstin,
    });

    if (duplicateLookup.matchFound && duplicateLookup.customer) {
      console.warn(
        `[CustomerIdentityService] Duplicate customer detected via ${duplicateLookup.matchType} match with ID ${duplicateLookup.customer.id}`
      );
      // Prevent duplicate - return existing customer
      return duplicateLookup.customer;
    }

    const newId = `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const newCustomer: CustomerV2 = {
      ...data,
      id: newId,
      phone: this.normalizePhone(data.phone),
      email: data.email?.trim().toLowerCase(),
      pan: data.pan?.trim().toUpperCase(),
      gstin: data.gstin?.trim().toUpperCase(),
      createdAt: now,
      updatedAt: now,
    };

    const saved = saveCustomer(newCustomer);

    // Emit CustomerCreated event on Event Bus
    eventBus.publishAsync('CustomerCreated', 'CUSTOMER', {
      customerId: saved.id,
      name: saved.name,
      phone: saved.phone,
      email: saved.email,
      pan: saved.pan,
      gstin: saved.gstin,
    });

    return saved;
  }
}
