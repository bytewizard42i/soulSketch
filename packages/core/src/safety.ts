/**
 * @soulsketch/core - Safety Module
 * Security and privacy utilities for SoulSketch
 */

/**
 * PII patterns for redaction
 */
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  ipv4: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
};

/**
 * Redact PII from text
 */
export function redactPII(text: string, options: {
  emails?: boolean;
  phones?: boolean;
  ssn?: boolean;
  creditCards?: boolean;
  ipAddresses?: boolean;
} = {}): string {
  let redacted = text;

  if (options.emails !== false) {
    redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]');
  }
  if (options.phones !== false) {
    redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]');
  }
  if (options.ssn !== false) {
    redacted = redacted.replace(PII_PATTERNS.ssn, '[SSN_REDACTED]');
  }
  if (options.creditCards !== false) {
    redacted = redacted.replace(PII_PATTERNS.creditCard, '[CC_REDACTED]');
  }
  if (options.ipAddresses !== false) {
    redacted = redacted.replace(PII_PATTERNS.ipv4, '[IP_REDACTED]');
  }

  return redacted;
}

/**
 * Validate triplet weights sum to 1.0
 */
export function validateTripletWeights(weights: { alice: number; cassie: number; casey: number }): {
  valid: boolean;
  error?: string;
  normalized?: { alice: number; cassie: number; casey: number };
} {
  const sum = weights.alice + weights.cassie + weights.casey;
  const tolerance = 0.01;

  // Check if weights are valid numbers
  if (isNaN(weights.alice) || isNaN(weights.cassie) || isNaN(weights.casey)) {
    return { valid: false, error: 'Weights must be valid numbers' };
  }

  // Check if weights are non-negative
  if (weights.alice < 0 || weights.cassie < 0 || weights.casey < 0) {
    return { valid: false, error: 'Weights cannot be negative' };
  }

  // Check if sum is approximately 1.0
  if (Math.abs(sum - 1.0) > tolerance) {
    // Auto-normalize if close
    if (sum > 0) {
      return {
        valid: true,
        normalized: {
          alice: weights.alice / sum,
          cassie: weights.cassie / sum,
          casey: weights.casey / sum
        },
        error: `Weights sum to ${sum.toFixed(3)}, normalized to 1.0`
      };
    }
    return { valid: false, error: `Weights must sum to 1.0 (current sum: ${sum.toFixed(3)})` };
  }

  return { valid: true };
}

/**
 * Content filtering for inappropriate content
 */
export function filterContent(text: string, _level: 'low' | 'medium' | 'high' = 'medium'): {
  safe: boolean;
  filtered?: string;
  violations?: string[];
} {
  // Placeholder implementation - production would use ML models
  const violations: string[] = [];
  
  // Basic keyword filtering (would be much more sophisticated in production)
  const inappropriateKeywords = ['password', 'secret_key', 'private_key'];
  
  for (const keyword of inappropriateKeywords) {
    if (text.toLowerCase().includes(keyword)) {
      violations.push(`Contains sensitive keyword: ${keyword}`);
    }
  }

  if (violations.length > 0) {
    return {
      safe: false,
      violations,
      filtered: text.replace(/password|secret_key|private_key/gi, '[REDACTED]')
    };
  }

  return { safe: true };
}

/**
 * Sanitize file paths to prevent directory traversal
 */
export function sanitizePath(path: string): string {
  // Remove any .. components and normalize
  return path.replace(/\.\./g, '').replace(/\/+/g, '/');
}

/**
 * Create audit log entry
 */
export function createAuditLog(event: {
  action: string;
  user?: string;
  resource?: string;
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}): string {
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    timestamp,
    ...event
  });
}
