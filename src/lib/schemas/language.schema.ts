import { z } from 'zod';

/**
 * Language spec schema
 */
export const LanguageSpecSchema = z.object({
  docker_image: z.string().min(1),
  compile_cmd: z.string().optional(),
  run_cmd: z.string().min(1),
  default_timeout: z.number().int().positive(),
  default_memory_limit: z.number().int().positive(),
});

export type LanguageSpec = z.infer<typeof LanguageSpecSchema>;

/**
 * Language schema
 */
export const LanguageSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  version: z.string().min(1).max(20),
  extensions: z.array(z.string().min(1).max(10)),
  capabilities: z.array(z.enum(['compile', 'run', 'format', 'lint', 'debug'])),
  spec: LanguageSpecSchema,
});

export type Language = z.infer<typeof LanguageSchema>;

/**
 * Languages list response schema
 */
export const LanguagesResponseSchema = z.object({
  languages: z.array(LanguageSchema),
});

export type LanguagesResponse = z.infer<typeof LanguagesResponseSchema>;

/**
 * Template schema
 */
export const TemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  content: z.string(),
});

export type Template = z.infer<typeof TemplateSchema>;
