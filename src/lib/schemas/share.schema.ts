import { z } from 'zod';

/**
 * Create share request schema
 */
export const CreateShareRequestSchema = z.object({
  language: z.string().min(1).max(50),
  files: z
    .record(z.string(), z.string())
    .refine((files) => Object.keys(files).length > 0, {
      message: 'At least one file is required',
    })
    .refine((files) => Object.keys(files).length <= 10, {
      message: 'Maximum 10 files allowed',
    }),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  expires_in_days: z
    .number()
    .int()
    .positive()
    .max(365, 'Max expiration is 365 days')
    .optional(),
  user_id: z.string().uuid().optional(),
});

export type CreateShareRequest = z.infer<typeof CreateShareRequestSchema>;

/**
 * Share schema
 */
export const ShareSchema = z.object({
  id: z.string().uuid(),
  language: z.string(),
  files: z.record(z.string(), z.string()),
  title: z.string(),
  description: z.string(),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  user_id: z.string().uuid(),
  view_count: z.number().int().nonnegative(),
});

export type Share = z.infer<typeof ShareSchema>;

/**
 * Delete share response schema
 */
export const DeleteShareResponseSchema = z.object({
  deleted: z.boolean(),
  message: z.string(),
});

export type DeleteShareResponse = z.infer<typeof DeleteShareResponseSchema>;
