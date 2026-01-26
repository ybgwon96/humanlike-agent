interface MaskingPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const MASKING_PATTERNS: MaskingPattern[] = [
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL]',
  },
  {
    name: 'credit_card',
    pattern: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
    replacement: '[CREDIT_CARD]',
  },
  {
    name: 'api_key',
    pattern: /\b(sk|pk|api|key|token|secret)[-_][a-zA-Z0-9_-]{20,}\b/gi,
    replacement: '[API_KEY]',
  },
  {
    name: 'korean_resident_id',
    pattern: /\b\d{6}[-.\s][1-4]\d{6}\b/g,
    replacement: '[RESIDENT_ID]',
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b/g,
    replacement: '[SSN]',
  },
  {
    name: 'phone',
    pattern: /\b(?:010|011|016|017|018|019)[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g,
    replacement: '[PHONE]',
  },
  {
    name: 'ip_address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_ADDRESS]',
  },
  {
    name: 'password',
    pattern: /(password|passwd|pwd|secret)[:=]\s*['"]?[^\s'"]+['"]?/gi,
    replacement: '[PASSWORD_REDACTED]',
  },
];

export interface MaskingResult {
  maskedContent: string;
  detectedPatterns: string[];
}

export function maskSensitiveData(content: string): MaskingResult {
  let maskedContent = content;
  const detectedPatterns: string[] = [];

  for (const { name, pattern, replacement } of MASKING_PATTERNS) {
    const matches = maskedContent.match(pattern);
    if (matches !== null && matches.length > 0) {
      detectedPatterns.push(name);
      maskedContent = maskedContent.replace(pattern, replacement);
    }
  }

  return {
    maskedContent,
    detectedPatterns,
  };
}

export function addCustomPattern(name: string, pattern: RegExp, replacement: string): void {
  MASKING_PATTERNS.push({ name, pattern, replacement });
}

export function getPatternNames(): string[] {
  return MASKING_PATTERNS.map((p) => p.name);
}
