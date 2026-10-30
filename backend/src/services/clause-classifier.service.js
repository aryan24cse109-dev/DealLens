
const CATEGORY_RULES = [
  {
    category: 'LIABILITY',
    keywords: [
      'limitation of liability',
      'liability cap',
      'liability',
      'liable',
      'liabilities',
      'indemnity',
      'indemnify',
      'damages',
      'uncapped liability',
      'unlimited liability',
    ],
  },
  {
    category: 'TERMINATION',
    keywords: [
      'termination',
      'terminate',
      'breach',
      'cure period',
      'written notice',
    ],
  },
  {
    category: 'PAYMENT_TERMS',
    keywords: [
      'payment terms',
      'payment',
      'payable',
      'invoice',
      'invoice date',
      'calendar days',
      'late fee',
      'interest',
      'annual contract value',
      'price',
      'fee',
      'cost',
      'amount',
      'inr',
      'rupees',
    ],
  },
  {
    category: 'CONTRACT_TERM',
    keywords: [
      'effective date',
      'agreement begins',
      'agreement ends',
      'expiry',
      'expiration',
      'renewal',
      'renewed',
      'contract term',
    ],
  },
  {
    category: 'SCOPE_OF_WORK',
    keywords: [
      'scope of services',
      'scope of work',
      'deliverables',
      'implementation',
      'software support',
      'maintenance',
      'project schedule',
      'responsibilities',
    ],
  },
  {
    category: 'CONFIDENTIALITY',
    keywords: [
      'confidential',
      'confidentiality',
      'disclosure',
      'proprietary information',
    ],
  },
  {
    category: 'SERVICE_LEVEL',
    keywords: [
      'service level',
      'uptime',
      'availability',
      'response time',
      'resolution time',
      'service review',
      'support hours',
    ],
  },
];

export function classifyContractChange(change) {
  const text = [
    change.originalText ?? '',
    change.revisedText ?? '',
  ].join(' ').toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.category;
    }
  }

  return 'GENERAL';
}
