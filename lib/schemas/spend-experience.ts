import { z } from 'zod';
export const spendExperienceStatusSchema = z.enum(['draft', 'active', 'ended']);

export const spendRailSchema = z.enum(['base_usdc', 'stellar_usdc']);

/**
 * Points per 1 USDC (e.g. 1000 = 1000 IRL points for $1 USDC).
 */
export const createSpendExperienceRequestSchema = z
  .object({
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional().nullable(),
    event_id: z.string().min(1).max(256).optional().nullable(),
    status: spendExperienceStatusSchema.default('draft'),
    spend_rail: spendRailSchema.default('base_usdc'),
    points_to_usdc_rate: z.coerce.number().positive().max(1e15),
    max_usdc_per_user: z.coerce.number().positive().max(1e9),
    start_time: z.string().datetime({ offset: true }),
    end_time: z.string().datetime({ offset: true }),
    idempotency_key: z.string().min(8).max(256).optional(),
  })
  .strict()
  .refine((data) => new Date(data.end_time) > new Date(data.start_time), {
    message: 'end_time must be after start_time',
    path: ['end_time'],
  });

export const updateSpendExperienceRequestSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional().nullable(),
    event_id: z.string().min(1).max(256).optional().nullable(),
    status: spendExperienceStatusSchema.optional(),
    points_to_usdc_rate: z.coerce.number().positive().max(1e15).optional(),
    max_usdc_per_user: z.coerce.number().positive().max(1e9).optional(),
    start_time: z.string().datetime({ offset: true }).optional(),
    end_time: z.string().datetime({ offset: true }).optional(),
    spend_rail: z
      .never({
        errorMap: () => ({
          message:
            'spend_rail cannot be changed after the spend experience is created',
        }),
      })
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
  .superRefine((data, ctx) => {
    if (data.start_time !== undefined && data.end_time !== undefined) {
      if (new Date(data.end_time) <= new Date(data.start_time)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'end_time must be after start_time',
          path: ['end_time'],
        });
      }
    }
  });
