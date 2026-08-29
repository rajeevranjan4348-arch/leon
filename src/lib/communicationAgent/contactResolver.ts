import { ContactRecord, DisambiguationChoice } from './types';
import { permissionManager } from './permissionManager';

export const SYSTEM_DEFAULT_CONTACTS: ContactRecord[] = [
  {
    id: 'contact_mom',
    displayName: 'Mom',
    relationship: 'Family (Mother)',
    phone: '+1 (800) 555-0101',
    isFavorite: true,
  },
  {
    id: 'contact_dad',
    displayName: 'Dad',
    relationship: 'Family (Father)',
    phone: '+1 (800) 555-0102',
    isFavorite: true,
  },
  {
    id: 'contact_rahul_sharma',
    displayName: 'Rahul Sharma',
    relationship: 'Work / Tech Lead',
    phone: '+1 (555) 234-5678',
    email: 'rahul.sharma@example.com',
  },
  {
    id: 'contact_rahul_verma',
    displayName: 'Rahul Verma',
    relationship: 'College Friend',
    phone: '+1 (555) 876-5432',
    email: 'rahul.verma@example.org',
  },
  {
    id: 'contact_alex_chen',
    displayName: 'Alex Chen',
    relationship: 'Colleague',
    phone: '+1 (555) 432-1098',
    email: 'alex.chen@company.com',
  },
  {
    id: 'contact_sarah_jenkins',
    displayName: 'Sarah Jenkins',
    relationship: 'Project Manager',
    phone: '+1 (555) 345-6789',
    email: 'sarah.j@company.com',
  },
  {
    id: 'contact_dr_sharma',
    displayName: 'Dr. Sharma',
    relationship: 'Family Physician',
    phone: '+1 (555) 901-2345',
  },
  {
    id: 'contact_school',
    displayName: 'Oakridge School & Admin',
    relationship: 'Principal / Admin Office',
    phone: '+1 (555) 678-9012',
  },
  {
    id: 'contact_office',
    displayName: 'Office Manager',
    relationship: 'HQ Operations',
    phone: '+1 (555) 789-0123',
  },
  {
    id: 'contact_brother',
    displayName: 'Brother',
    relationship: 'Family (Brother)',
    phone: '+1 (800) 555-0103',
  },
  {
    id: 'contact_sister',
    displayName: 'Sister',
    relationship: 'Family (Sister)',
    phone: '+1 (800) 555-0104',
  },
];

const LOCAL_CONTACTS_KEY = 'rishi_local_contacts';

export class ContactResolver {
  private static instance: ContactResolver;

  private constructor() {}

  public static getInstance(): ContactResolver {
    if (!ContactResolver.instance) {
      ContactResolver.instance = new ContactResolver();
    }
    return ContactResolver.instance;
  }

  public getAllContacts(): ContactRecord[] {
    if (!permissionManager.isAllowed('contacts')) {
      return [];
    }

    let customContacts: ContactRecord[] = [];
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(LOCAL_CONTACTS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          customContacts = parsed.map((c: any) => ({
            id: c.id || `contact_${c.displayName.toLowerCase().replace(/\s+/g, '_')}`,
            displayName: c.displayName || c.name,
            phone: c.phone || '',
            relationship: c.relationship || c.role || 'Contact',
            email: c.email,
            isFavorite: !!c.isFavorite,
          }));
        }
      } catch (e) {
        console.warn('Failed to parse local contacts', e);
      }
    }

    // Merge and deduplicate by phone or id
    const map = new Map<string, ContactRecord>();
    for (const c of [...SYSTEM_DEFAULT_CONTACTS, ...customContacts]) {
      map.set(c.id, c);
    }
    return Array.from(map.values());
  }

  public saveContact(contact: ContactRecord): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const all = this.getAllContacts();
      const existingIdx = all.findIndex((c) => c.id === contact.id);
      if (existingIdx >= 0) {
        all[existingIdx] = contact;
      } else {
        all.push(contact);
      }
      localStorage.setItem(LOCAL_CONTACTS_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save contact', e);
    }
  }

  /**
   * Resolves a target string (e.g. "Rahul", "Mom", "Dad", "555-1234") into a contact match
   * or a list of disambiguation options if multiple matches exist.
   */
  public resolve(target: string): {
    exactMatch: ContactRecord | null;
    disambiguationRequired: boolean;
    choices: DisambiguationChoice[];
  } {
    if (!target || !target.trim()) {
      return { exactMatch: null, disambiguationRequired: false, choices: [] };
    }

    const cleanTarget = target.trim();
    const targetLower = cleanTarget.toLowerCase();

    // Check if directly a phone number
    const digitsOnly = cleanTarget.replace(/[^0-9+]/g, '');
    if (digitsOnly.length >= 7) {
      const directContact: ContactRecord = {
        id: `phone_${digitsOnly}`,
        displayName: cleanTarget,
        phone: cleanTarget,
        relationship: 'Direct Phone Number',
      };
      return { exactMatch: directContact, disambiguationRequired: false, choices: [] };
    }

    const allContacts = this.getAllContacts();

    // 1. Exact relationship / exact displayName match
    const exactNameMatch = allContacts.find(
      (c) =>
        c.displayName.toLowerCase() === targetLower ||
        (c.relationship && c.relationship.toLowerCase() === targetLower)
    );

    // If exact unique match like "Mom" or "Dad"
    if (exactNameMatch && (targetLower === 'mom' || targetLower === 'dad' || targetLower === 'brother' || targetLower === 'sister')) {
      return { exactMatch: exactNameMatch, disambiguationRequired: false, choices: [] };
    }

    // 2. Find all matching contacts
    const matching: DisambiguationChoice[] = [];

    for (const c of allContacts) {
      const nameLower = c.displayName.toLowerCase();
      const relLower = (c.relationship || '').toLowerCase();

      let score = 0;
      if (nameLower === targetLower) {
        score = 100;
      } else if (nameLower.startsWith(targetLower + ' ')) {
        score = 90;
      } else if (nameLower.includes(targetLower)) {
        score = 75;
      } else if (relLower.includes(targetLower)) {
        score = 70;
      }

      if (score > 0) {
        matching.push({
          contact: c,
          matchScore: score,
          distinguishingDetail: `${c.relationship || 'Contact'} • ${c.phone}`,
        });
      }
    }

    // Sort matching by score descending
    matching.sort((a, b) => b.matchScore - a.matchScore);

    if (matching.length === 1) {
      return {
        exactMatch: matching[0].contact,
        disambiguationRequired: false,
        choices: matching,
      };
    }

    if (matching.length > 1) {
      // If one is an exact 100 score and others are partial
      if (matching[0].matchScore === 100 && matching[1].matchScore < 90) {
        return {
          exactMatch: matching[0].contact,
          disambiguationRequired: false,
          choices: matching,
        };
      }

      // Disambiguation required! (e.g. "Rahul" -> "Rahul Sharma" vs "Rahul Verma")
      return {
        exactMatch: null,
        disambiguationRequired: true,
        choices: matching,
      };
    }

    // Fallback: create ad-hoc contact
    const fallbackContact: ContactRecord = {
      id: `adhoc_${targetLower.replace(/\s+/g, '_')}`,
      displayName: cleanTarget,
      phone: '',
      relationship: 'New Contact',
    };

    return {
      exactMatch: fallbackContact,
      disambiguationRequired: false,
      choices: [],
    };
  }
}

export const contactResolver = ContactResolver.getInstance();
