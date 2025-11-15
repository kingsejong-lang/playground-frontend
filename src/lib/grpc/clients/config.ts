/**
 * gRPC-Web client configuration
 * Provides common configuration for all gRPC clients
 */

/**
 * gRPC Gateway URL
 * In production, this should be configured via environment variables
 */
export const GRPC_GATEWAY_URL =
  process.env.NEXT_PUBLIC_GRPC_GATEWAY_URL || 'http://localhost:8080';

/**
 * Get gRPC metadata with authentication token
 * This includes the JWT token from localStorage
 */
export function getGrpcMetadata(): { [key: string]: string } {
  const metadata: { [key: string]: string } = {
    'content-type': 'application/grpc-web-text',
  };

  // Add JWT token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      metadata['authorization'] = `Bearer ${token}`;
    }
  }

  return metadata;
}

/**
 * Create gRPC error with detailed message
 */
export function createGrpcError(serviceName: string, methodName: string, error: any): Error {
  const message = error.message || error.toString();
  return new Error(`[gRPC ${serviceName}.${methodName}] ${message}`);
}
