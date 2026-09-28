import {
  addDaysToLocalDate,
  toLocalDate,
  weekdayOf,
  zonedInstant,
  type LocalDate,
} from '@/core/time';
import type { Appointment, AppointmentStatus } from '@/features/appointments/domain/appointment';
import type { Business } from '@/features/catalog/domain/business';
import type { Professional } from '@/features/catalog/domain/professional';
import type { Service } from '@/features/catalog/domain/service';
import type { WorkingHours } from '@/features/catalog/domain/working-hours';

// Stable ids: identical to supabase/seed/01_catalog.sql and 02_demo_data.sql.
const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;

export const DEMO_BUSINESS_ID = id('1');
export const PROFESSIONAL_IDS = { marco: id('101'), lena: id('102'), sam: id('103') } as const;
export const SERVICE_IDS = {
  classicHaircut: id('201'),
  skinFade: id('202'),
  beardTrim: id('203'),
  haircutBeard: id('204'),
  hotTowelShave: id('205'),
  kidsCut: id('206'),
} as const;
export const DEMO_USER_ID = id('301');
export const ADMIN_USER_ID = id('302');
export const DEMO_USER_NAME = 'Casey Morgan';
export const DEMO_USER_EMAIL = 'client@agendo.dev';
export const ADMIN_USER_NAME = 'Nora Blake';

export const FAKE_CLIENTS = [
  { id: id('311'), name: 'Alex Rivera' },
  { id: id('312'), name: 'Priya Shah' },
  { id: id('313'), name: 'Diego Morales' },
  { id: id('314'), name: 'Hannah Lee' },
  { id: id('315'), name: 'Omar Haddad' },
  { id: id('316'), name: 'Sofia Rossi' },
  { id: id('317'), name: 'Liam Carter' },
  { id: id('318'), name: 'Mei Chen' },
] as const;

export const demoBusiness: Business = {
  id: DEMO_BUSINESS_ID,
  name: 'Northside Barber Co.',
  timezone: 'America/Mexico_City',
  currency: 'USD',
  slotIntervalMinutes: 15,
  minNoticeMinutes: 60,
  maxAdvanceDays: 30,
  cancelLimitHours: 2,
  reminderLeadMinutes: 120,
};

export const demoServices: Service[] = [
  {
    id: SERVICE_IDS.classicHaircut,
    name: 'Classic haircut',
    description: 'Scissor or clipper cut with a clean finish.',
    durationMinutes: 30,
    priceCents: 2000,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: SERVICE_IDS.skinFade,
    name: 'Skin fade',
    description: 'Tight fade blended to your preferred length on top.',
    durationMinutes: 45,
    priceCents: 2800,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: SERVICE_IDS.beardTrim,
    name: 'Beard trim',
    description: 'Shape and line-up for your beard.',
    durationMinutes: 20,
    priceCents: 1200,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: SERVICE_IDS.haircutBeard,
    name: 'Haircut + beard',
    description: 'Classic haircut with a full beard trim.',
    durationMinutes: 60,
    priceCents: 3500,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: SERVICE_IDS.hotTowelShave,
    name: 'Hot towel shave',
    description: 'Traditional straight-razor shave with hot towels.',
    durationMinutes: 30,
    priceCents: 2200,
    isActive: true,
    sortOrder: 5,
  },
  {
    id: SERVICE_IDS.kidsCut,
    name: 'Kids cut',
    description: 'Haircut for children under 12.',
    durationMinutes: 25,
    priceCents: 1500,
    isActive: true,
    sortOrder: 6,
  },
];

export const demoProfessionals: Professional[] = [
  {
    id: PROFESSIONAL_IDS.marco,
    name: 'Marco',
    bio: 'Precision cuts and sharp beard work. Ten years behind the chair.',
    avatarUrl: null,
    isActive: true,
    serviceIds: [
      SERVICE_IDS.classicHaircut,
      SERVICE_IDS.skinFade,
      SERVICE_IDS.beardTrim,
      SERVICE_IDS.haircutBeard,
      SERVICE_IDS.kidsCut,
    ],
  },
  {
    id: PROFESSIONAL_IDS.lena,
    name: 'Lena',
    bio: 'Cuts, color and styling. Loves a good transformation.',
    avatarUrl: null,
    isActive: true,
    serviceIds: [SERVICE_IDS.classicHaircut, SERVICE_IDS.skinFade, SERVICE_IDS.kidsCut],
  },
  {
    id: PROFESSIONAL_IDS.sam,
    name: 'Sam',
    bio: 'Beard specialist and old-school hot towel shaves.',
    avatarUrl: null,
    isActive: true,
    serviceIds: [SERVICE_IDS.beardTrim, SERVICE_IDS.haircutBeard, SERVICE_IDS.hotTowelShave],
  },
];

// Monday-Friday 09:00-13:00 and 14:00-19:00; Saturday 10:00-16:00; Sunday closed. Sam does not work Mondays.
export const demoWorkingHours: WorkingHours[] = Object.values(PROFESSIONAL_IDS).flatMap(
  (professionalId) => {
    const weekdays = [1, 2, 3, 4, 5].filter(
      (d) => !(professionalId === PROFESSIONAL_IDS.sam && d === 1),
    );
    return [
      ...weekdays.flatMap((weekday) => [
        { professionalId, weekday, startTime: '09:00', endTime: '13:00' },
        { professionalId, weekday, startTime: '14:00', endTime: '19:00' },
      ]),
      { professionalId, weekday: 6, startTime: '10:00', endTime: '16:00' },
    ];
  },
);

interface Draft {
  clientId: string;
  professionalId: string;
  serviceId: string;
  date: LocalDate;
  time: string;
  status: AppointmentStatus;
}

/**
 * Same algorithm as supabase/seed/02_demo_data.sql: keep both in sync.
 * Appointment ids are deterministic (demo-appt-001, ...).
 */
export function buildDemoAppointments(now: Date): Appointment[] {
  const tz = demoBusiness.timezone;
  const today = toLocalDate(now, tz);
  const drafts: Draft[] = [];
  let seq = 0; // generation order over all fictitious appointments (client rotation)
  let other = 0; // appointments on days other than today (every 4th is cancelled)

  for (let offset = -7; offset <= 7; offset++) {
    const date = addDaysToLocalDate(today, offset);
    const weekday = weekdayOf(date);
    if (weekday === 0) continue; // closed on Sundays

    const entries: [string, string, string][] =
      date === today
        ? [
            [PROFESSIONAL_IDS.marco, SERVICE_IDS.classicHaircut, '10:00'],
            [PROFESSIONAL_IDS.marco, SERVICE_IDS.skinFade, '15:00'],
            [PROFESSIONAL_IDS.lena, SERVICE_IDS.skinFade, '11:00'],
            ...(weekday !== 6
              ? ([[PROFESSIONAL_IDS.lena, SERVICE_IDS.kidsCut, '16:30']] as [
                  string,
                  string,
                  string,
                ][])
              : []),
            ...(weekday !== 1
              ? ([[PROFESSIONAL_IDS.sam, SERVICE_IDS.beardTrim, '12:00']] as [
                  string,
                  string,
                  string,
                ][])
              : []),
          ]
        : [
            [PROFESSIONAL_IDS.marco, SERVICE_IDS.classicHaircut, '10:00'],
            [PROFESSIONAL_IDS.lena, SERVICE_IDS.skinFade, '15:00'],
          ];

    for (const [professionalId, serviceId, time] of entries) {
      const client = FAKE_CLIENTS[seq % FAKE_CLIENTS.length];
      seq++;
      let status: AppointmentStatus = 'booked';
      if (date !== today) {
        other++;
        if (other % 4 === 0) status = 'cancelled';
      }
      drafts.push({ clientId: client?.id ?? '', professionalId, serviceId, date, time, status });
    }
  }

  // Casey Morgan: n-th Monday-Friday workday from today, not counting today.
  const nthWorkday = (n: number): LocalDate => {
    const step = Math.sign(n);
    let date = today;
    for (let left = Math.abs(n); left > 0;) {
      date = addDaysToLocalDate(date, step);
      const weekday = weekdayOf(date);
      if (weekday >= 1 && weekday <= 5) left--;
    }
    return date;
  };
  const caseyEntries: [number, string, string, string, AppointmentStatus][] = [
    [1, PROFESSIONAL_IDS.marco, SERVICE_IDS.beardTrim, '17:00', 'booked'],
    [3, PROFESSIONAL_IDS.lena, SERVICE_IDS.classicHaircut, '12:00', 'booked'],
    [-1, PROFESSIONAL_IDS.marco, SERVICE_IDS.classicHaircut, '12:00', 'booked'],
    [-3, PROFESSIONAL_IDS.lena, SERVICE_IDS.skinFade, '17:00', 'booked'],
    [-5, PROFESSIONAL_IDS.marco, SERVICE_IDS.kidsCut, '11:00', 'cancelled'],
  ];
  for (const [n, professionalId, serviceId, time, status] of caseyEntries) {
    drafts.push({
      clientId: DEMO_USER_ID,
      professionalId,
      serviceId,
      date: nthWorkday(n),
      time,
      status,
    });
  }

  return drafts.map((d, i) => {
    const service = demoServices.find((s) => s.id === d.serviceId);
    const start = zonedInstant(d.date, d.time, tz);
    const end = new Date(start.getTime() + (service?.durationMinutes ?? 0) * 60_000);
    return {
      id: `demo-appt-${String(i + 1).padStart(3, '0')}`,
      clientId: d.clientId,
      professionalId: d.professionalId,
      serviceId: d.serviceId,
      start,
      end,
      status: d.status,
      createdAt: new Date(start.getTime() - 3 * 86_400_000),
      cancelledAt: d.status === 'cancelled' ? new Date(start.getTime() - 86_400_000) : null,
      serviceName: service?.name ?? '',
      professionalName: demoProfessionals.find((p) => p.id === d.professionalId)?.name ?? '',
      clientName:
        d.clientId === DEMO_USER_ID
          ? DEMO_USER_NAME
          : (FAKE_CLIENTS.find((c) => c.id === d.clientId)?.name ?? null),
    };
  });
}
