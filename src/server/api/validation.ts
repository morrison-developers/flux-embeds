import { z } from 'zod';

export const boardIdSchema = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);

const hexColorSchema = z
  .string()
  .regex(/^#(?:[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  .transform((value) => value.toLowerCase());

export const themeQuerySchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  accent: hexColorSchema.default('#161d21'),
  bg: hexColorSchema.default('#ffffff'),
  text: hexColorSchema.default('#111111'),
  compact: z.enum(['0', '1']).default('0'),
});

export const liveQuerySchema = z.object({
  gameId: z.string().min(1).max(40).optional(),
  testMode: z.enum(['0', '1']).optional(),
});

export const ownerPatchSchema = z.object({
  initials: z.string().min(1).max(4),
  displayName: z.string().min(1).max(64),
  bgColor: hexColorSchema,
  textColor: hexColorSchema,
  sortOrder: z.number().int().min(0),
});

export const boardPatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  defaultGameId: z.string().min(1).max(40).nullable().optional(),
  topTeamLabel: z.string().min(1).max(64).optional(),
  sideTeamLabel: z.string().min(1).max(64).optional(),
  columnMarkers: z.array(z.number().int().min(0).max(9)).length(10).optional(),
  rowMarkers: z.array(z.number().int().min(0).max(9)).length(10).optional(),
  assignments: z.array(z.array(z.string().trim().max(4)).length(10)).length(10).optional(),
  themeDefaults: z
    .object({
      theme: z.enum(['light', 'dark', 'auto']),
      accent: hexColorSchema,
      bg: hexColorSchema,
      text: hexColorSchema,
    })
    .optional(),
  owners: z.array(ownerPatchSchema).optional(),
});

export const guestClaimSchema = z.object({
  initials: z.string().trim().min(1).max(4).optional(),
  bgColor: hexColorSchema.optional(),
  textColor: hexColorSchema.optional(),
});

export const guestPickSchema = z.object({
  row: z.number().int().min(0).max(9),
  col: z.number().int().min(0).max(9),
  selected: z.boolean(),
});

export const guestAdminActionSchema = z.object({
  action: z.enum(['clear_picks', 'clear_winners', 'clear_all', 'seed_demo']),
});
