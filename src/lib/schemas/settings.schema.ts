import { z } from 'zod';

/**
 * Editor settings schema
 */
export const EditorSettingsSchema = z.object({
  font_size: z.number().int().min(8).max(32),
  font_family: z.string().min(1).max(100),
  tab_size: z.number().int().min(1).max(8),
  auto_save: z.boolean(),
  minimap: z.boolean(),
});

export type EditorSettings = z.infer<typeof EditorSettingsSchema>;

/**
 * Theme settings schema
 */
export const ThemeSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']),
  color_scheme: z.string().min(1).max(50),
});

export type ThemeSettings = z.infer<typeof ThemeSettingsSchema>;

/**
 * User settings schema
 */
export const UserSettingsSchema = z.object({
  user_id: z.string().uuid(),
  editor: EditorSettingsSchema,
  theme: ThemeSettingsSchema,
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

/**
 * Save settings request schema
 */
export const SaveSettingsRequestSchema = z.object({
  user_id: z.string().uuid().optional(),
  editor: EditorSettingsSchema.partial().optional(),
  theme: ThemeSettingsSchema.partial().optional(),
});

export type SaveSettingsRequest = z.infer<typeof SaveSettingsRequestSchema>;
