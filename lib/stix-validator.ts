import { STIXIndicator, TLPMarking } from './stix-types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_TLP_MARKINGS: TLPMarking[] = ['TLP:CLEAR', 'TLP:GREEN', 'TLP:AMBER', 'TLP:AMBER+STRICT', 'TLP:RED'];

const STIX_PATTERN_REGEX = /^\[([a-z-]+:[a-z_]+(\.[a-z_]+)*\s*(=|!=|>|<|>=|<=|LIKE|MATCHES|ISSUBSET|ISSUPERSET)\s*'[^']*')\]$/i;

function validatePattern(pattern: string): string[] {
  const errors: string[] = [];
  if (!pattern.startsWith('[') || !pattern.endsWith(']')) {
    errors.push('STIX pattern must be enclosed in square brackets');
  }
  if (!STIX_PATTERN_REGEX.test(pattern)) {
    errors.push(`Invalid STIX pattern syntax: ${pattern}`);
  }
  return errors;
}

function validateConfidence(confidence: number): string[] {
  const errors: string[] = [];
  if (confidence < 0 || confidence > 100) {
    errors.push(`Confidence must be 0-100, got ${confidence}`);
  }
  return errors;
}

function validateTimestamps(indicator: Partial<STIXIndicator>): string[] {
  const errors: string[] = [];
  if (indicator.created && indicator.modified) {
    if (new Date(indicator.modified) < new Date(indicator.created)) {
      errors.push('modified timestamp cannot be before created timestamp');
    }
  }
  if (indicator.valid_from && indicator.valid_until) {
    if (new Date(indicator.valid_until) <= new Date(indicator.valid_from)) {
      errors.push('valid_until must be after valid_from');
    }
  }
  return errors;
}

export function validateSTIXIndicator(indicator: Partial<STIXIndicator>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!indicator.type || indicator.type !== 'indicator') {
    errors.push('type must be "indicator"');
  }
  if (!indicator.id || !indicator.id.startsWith('indicator--')) {
    errors.push('id must start with "indicator--"');
  }
  if (!indicator.pattern) {
    errors.push('pattern is required');
  } else {
    errors.push(...validatePattern(indicator.pattern));
  }
  if (!indicator.pattern_type) {
    errors.push('pattern_type is required');
  } else if (indicator.pattern_type !== 'stix') {
    warnings.push(`Non-standard pattern_type: ${indicator.pattern_type}`);
  }
  if (!indicator.valid_from) {
    errors.push('valid_from is required');
  }

  // Optional field validation
  if (indicator.confidence !== undefined) {
    errors.push(...validateConfidence(indicator.confidence));
  }
  if (indicator.object_marking_refs) {
    for (const ref of indicator.object_marking_refs) {
      if (!ref.startsWith('marking-definition--')) {
        errors.push(`Invalid marking reference: ${ref}`);
      }
    }
  }

  errors.push(...validateTimestamps(indicator));

  // Warnings
  if (!indicator.confidence) {
    warnings.push('No confidence score provided, defaulting to 50');
  }
  if (!indicator.object_marking_refs || indicator.object_marking_refs.length === 0) {
    warnings.push('No TLP marking provided, defaulting to TLP:CLEAR');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateTLPMarking(marking: string): boolean {
  return VALID_TLP_MARKINGS.includes(marking as TLPMarking);
}

export function validateBatch(indicators: Partial<STIXIndicator>[]): {
  valid: Partial<STIXIndicator>[];
  invalid: { indicator: Partial<STIXIndicator>; errors: string[] }[];
  totalWarnings: string[];
} {
  const valid: Partial<STIXIndicator>[] = [];
  const invalid: { indicator: Partial<STIXIndicator>; errors: string[] }[] = [];
  const totalWarnings: string[] = [];

  for (const ind of indicators) {
    const result = validateSTIXIndicator(ind);
    if (result.valid) {
      valid.push(ind);
    } else {
      invalid.push({ indicator: ind, errors: result.errors });
    }
    totalWarnings.push(...result.warnings);
  }

  return { valid, invalid, totalWarnings };
}
