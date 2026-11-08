import { z } from 'zod';

export const coordinatesSchema = z.tuple([
  z.number().min(-83).max(-80),
  z.number().min(27).max(30),
]);
const percent = z.number().min(0).max(100).nullable();
export const areaSchema = z.object({
  id: z.string().regex(/^12\d{9}$/),
  label: z.string(),
  county: z.string(),
  coordinates: coordinatesSchema,
  poverty: percent,
  povertyMoe: percent,
  lowAccess: percent,
  snap: percent,
  population: z.number().int().nonnegative(),
  households: z.number().int().nonnegative(),
  urban: z.boolean(),
});
export type Area = z.infer<typeof areaSchema>;
export const reasons = [
  'Venue unavailable',
  'Safety/accessibility concern',
  'Existing unlisted service',
  'Hours conflict',
  'Local knowledge',
  'Other',
] as const;
export const decisionSchema = z
  .object({
    id: z.string().regex(/^12\d{9}$/),
    status: z.enum(['shortlisted', 'dismissed', 'flagged']),
    reason: z.enum(reasons).optional(),
  })
  .strict();
export type Decision = z.infer<typeof decisionSchema>;
export const scenarioSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    note: z.string().trim().max(300),
    candidateId: z.string().regex(/^12\d{9}$/),
    coordinates: coordinatesSchema,
    county: z.string().min(1).max(40),
    radius: z.number().min(0.5).max(10),
    capacity: z.number().int().min(1).max(5000),
    day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    cost: z.number().min(0).max(1000000).nullable(),
    budget: z.number().min(0).max(1000000).nullable(),
    povertyWeight: z.number().min(0).max(100),
    surveyEnabled: z.boolean(),
    decisions: z.array(decisionSchema).max(30),
    shortlist: z.array(z.string().regex(/^12\d{9}$/)).max(10),
    comparisons: z.array(z.string().regex(/^12\d{9}$/)).max(2),
  })
  .strict()
  .refine((s) => s.end > s.start, { message: 'End time must be after start time', path: ['end'] });
export type Scenario = z.infer<typeof scenarioSchema>;
export const surveyQuestions = [
  {
    key: 'works',
    label: 'Would this proposed location and time work for you?',
    options: ['Yes', 'Maybe', 'No', 'Prefer not to say'],
  },
  {
    key: 'barrier',
    label: 'What would make attending difficult?',
    options: [
      'Distance',
      'Transportation',
      'Schedule',
      'Accessibility',
      'None',
      'Prefer not to say',
    ],
  },
  {
    key: 'time',
    label: 'Which time is generally easiest?',
    options: [
      'Weekday morning',
      'Weekday afternoon',
      'Weekday evening',
      'Weekend',
      'Prefer not to say',
    ],
  },
  {
    key: 'travel',
    label: 'How would you likely get there?',
    options: ['Walk', 'Drive', 'Public transit', 'Ride with someone', 'Other', 'Prefer not to say'],
  },
] as const;
export const surveySchema = z
  .object({
    works: z.enum(surveyQuestions[0].options),
    barrier: z.enum(surveyQuestions[1].options),
    time: z.enum(surveyQuestions[2].options),
    travel: z.enum(surveyQuestions[3].options),
  })
  .strict();
export type Survey = z.infer<typeof surveySchema>;
export const manifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  methodVersion: z.literal('priority-proximity-v1'),
  datasetVersion: z.string().regex(/^[a-f0-9]{12}$/),
  mode: z.enum(['observed', 'illustrative']),
  generatedAt: z.iso.datetime({ offset: true }),
  geography: z.array(z.string()).min(1),
  areaCount: z.number().int().positive(),
  retailerCount: z.number().int().nonnegative(),
  sourceHashes: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
  assetHashes: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
  units: z.record(z.string(), z.string()),
  publicationBasis: z.string().min(1),
  baseline: z.string(),
  missingness: z.record(z.string(), z.number().int().nonnegative()),
  sourceDates: z.record(z.string(), z.string()),
});
export type Manifest = z.infer<typeof manifestSchema>;
export type Dataset = { areas: Area[]; manifest: Manifest };
