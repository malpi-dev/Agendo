export interface Business {
  id: string;
  name: string;
  timezone: string; // IANA, e.g. 'America/Mexico_City'
  currency: string; // ISO 4217, e.g. 'USD'
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  cancelLimitHours: number;
  reminderLeadMinutes: number;
}
