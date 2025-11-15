import { z } from 'zod';

/**
 * Register request schema
 */
export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/**
 * Login request schema
 */
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * Refresh token request schema
 * Note: Refresh token is now sent as httpOnly cookie automatically
 */
export const RefreshTokenRequestSchema = z.object({});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

/**
 * User schema
 */
export const UserSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
  email: z.string().email('Invalid email'),
  name: z.string(),
  roles: z.array(z.string()),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Tokens schema
 */
export const TokensSchema = z.object({
  access_token: z.string().min(1, 'Access token is required'),
  refresh_token: z.string().min(1, 'Refresh token is required'),
  expires_in: z.number().int().positive('Expires in must be positive'),
});

export type Tokens = z.infer<typeof TokensSchema>;

/**
 * Auth response schema (register/login)
 * Note: Tokens are now set as httpOnly cookies by the backend
 */
export const AuthResponseSchema = z.object({
  user: UserSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * Refresh token response schema
 * Note: New tokens are set as httpOnly cookies by the backend
 */
export const RefreshTokenResponseSchema = z.object({
  success: z.boolean(),
});

export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

/**
 * Get me response schema
 */
export const GetMeResponseSchema = UserSchema;

export type GetMeResponse = z.infer<typeof GetMeResponseSchema>;
