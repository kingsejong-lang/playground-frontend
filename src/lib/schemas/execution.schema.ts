import { z } from 'zod';

/**
 * Execute request schema
 */
export const ExecuteRequestSchema = z.object({
  language: z
    .string()
    .min(1, 'Language is required')
    .max(50, 'Language ID too long'),
  files: z
    .record(z.string(), z.string())
    .refine((files) => Object.keys(files).length > 0, {
      message: 'At least one file is required',
    })
    .refine((files) => Object.keys(files).length <= 10, {
      message: 'Maximum 10 files allowed',
    })
    .refine(
      (files) =>
        Object.entries(files).every(
          ([filename, content]) =>
            filename.length <= 255 && content.length <= 1024 * 1024
        ),
      {
        message: 'File name max 255 chars, content max 1MB',
      }
    ),
  args: z.string().max(1024, 'Args too long').optional(),
  stdin: z.string().max(65536, 'Stdin too large').optional(),
  timeout_seconds: z
    .number()
    .int()
    .positive()
    .max(30, 'Timeout max 30 seconds')
    .optional(),
});

export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;

/**
 * Execution event schema
 */
export const ExecutionEventSchema = z.object({
  kind: z.enum([
    'started',
    'compiling',
    'compiled',
    'running',
    'output',
    'stderr',
    'completed',
    'failed',
    'timeout',
  ]),
  message: z.string(),
  timestamp: z.string().datetime(),
});

export type ExecutionEvent = z.infer<typeof ExecutionEventSchema>;

/**
 * Execution metrics schema
 */
export const ExecutionMetricsSchema = z.object({
  compile_time_ms: z.number().int().nonnegative().optional(),
  run_time_ms: z.number().int().nonnegative(),
  memory_bytes: z.number().int().nonnegative(),
  cpu_percent: z.number().nonnegative().max(100).optional(),
});

export type ExecutionMetrics = z.infer<typeof ExecutionMetricsSchema>;

/**
 * Execution error schema
 */
export const ExecutionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.string().optional(),
});

export type ExecutionError = z.infer<typeof ExecutionErrorSchema>;

/**
 * Execute response schema
 */
export const ExecuteResponseSchema = z.object({
  request_id: z.string().uuid('Invalid request ID'),
  success: z.boolean(),
  events: z.array(ExecutionEventSchema),
  metrics: ExecutionMetricsSchema.optional(),
  error: ExecutionErrorSchema.optional(),
});

export type ExecuteResponse = z.infer<typeof ExecuteResponseSchema>;
