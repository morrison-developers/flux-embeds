import { z } from 'zod';

const hexColorSchema = z
  .string()
  .regex(/^#(?:[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  .transform((v) => v.toLowerCase());

const querySchema = z.object({
  board: z.string().min(1),
  gameId: z.string().min(1).optional(),
  parentOrigin: z.string().url().optional(),
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  accent: hexColorSchema.default('#161d21'),
  bg: hexColorSchema.default('#ffffff'),
  text: hexColorSchema.default('#111111'),
  compact: z.enum(['0', '1']).default('0'),
});

export type SuperbOwlQuery = z.infer<typeof querySchema>;

export function parseSuperbOwlQuery(params: URLSearchParams) {
  return querySchema.safeParse({
    board: params.get('board') ?? undefined,
    gameId: params.get('gameId') ?? undefined,
    parentOrigin: params.get('parentOrigin') ?? undefined,
    theme: params.get('theme') ?? undefined,
    accent: params.get('accent') ?? undefined,
    bg: params.get('bg') ?? undefined,
    text: params.get('text') ?? undefined,
    compact: params.get('compact') ?? undefined,
  });
}
