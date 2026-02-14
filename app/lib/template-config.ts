// ============================================================================
// DASHBOARD TEMPLATE CONFIGURATION
// ============================================================================
// Purpose: Configuration system for professional dashboard templates
// ============================================================================

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  category: 'operations' | 'compliance' | 'health' | 'industrial' | 'executive';
  thumbnail: string;
  icon: string;
  features: string[];
  idealFor: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  widgets: string[];
  path: string;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'city-operations',
    name: 'City Operations Center',
    description: 'Real-time command center for traffic management and emergency response with live feeds, action buttons, and agent monitoring.',
    category: 'operations',
    thumbnail: '/templates/city-operations.png',
    icon: '🏙️',
    features: [
      'Live pollution event feed',
      'One-click mitigation actions',
      'Agent status monitoring',
      'Alert management dashboard',
      'Traffic pattern analysis',
      'Emergency response protocols',
    ],
    idealFor: [
      'City traffic managers',
      'Emergency response teams',
      'Municipal operations',
      'Environmental agencies',
    ],
    complexity: 'intermediate',
    widgets: [
      'Real-time map',
      'Event feed',
      'Quick actions',
      'Agent monitor',
      'Alert timeline',
      'Response metrics',
    ],
    path: '/templates/city-operations',
  },
  {
    id: 'compliance',
    name: 'Regulatory Compliance',
    description: 'Comprehensive compliance tracking with violations, enforcement, standards monitoring, audit trails, and automated reporting.',
    category: 'compliance',
    thumbnail: '/templates/compliance.png',
    icon: '📋',
    features: [
      'Compliance status dashboard',
      'Violation tracking',
      'Standards comparison',
      'Audit trail logs',
      'Automated report generation',
      'Enforcement alerts',
    ],
    idealFor: [
      'Environmental regulators',
      'Compliance officers',
      'Government agencies',
      'Audit teams',
    ],
    complexity: 'advanced',
    widgets: [
      'Compliance matrix',
      'Violation list',
      'Standards table',
      'Audit log',
      'Report scheduler',
      'Enforcement tracker',
    ],
    path: '/templates/compliance',
  },
  {
    id: 'public-health',
    name: 'Public Health Monitoring',
    description: 'Health impact correlation with respiratory cases, hospital admissions, vulnerable population tracking, and risk assessment.',
    category: 'health',
    thumbnail: '/templates/public-health.png',
    icon: '🏥',
    features: [
      'AQI-health correlation charts',
      'Hospital admission tracking',
      'Vulnerable population maps',
      'Risk multiplier calculator',
      'Health advisory system',
      'Epidemiological analysis',
    ],
    idealFor: [
      'Health departments',
      'Epidemiologists',
      'Hospital administrators',
      'Public health officials',
    ],
    complexity: 'intermediate',
    widgets: [
      'Health correlation chart',
      'Risk heatmap',
      'Admission tracker',
      'Vulnerable zones',
      'Advisory generator',
      'Statistical analysis',
    ],
    path: '/templates/public-health',
  },
  {
    id: 'industrial',
    name: 'Industrial Monitoring',
    description: 'Facility-centric emission tracking, operational optimization, compliance status, and cost analysis for industrial managers.',
    category: 'industrial',
    thumbnail: '/templates/industrial.png',
    icon: '🏭',
    features: [
      'Facility emission tracking',
      'Operational metrics',
      'Compliance dashboard',
      'Cost optimization',
      'Production correlation',
      'Permit management',
    ],
    idealFor: [
      'Industrial facility managers',
      'Environmental coordinators',
      'Plant operators',
      'Sustainability teams',
    ],
    complexity: 'intermediate',
    widgets: [
      'Emission trends',
      'Facility map',
      'Compliance status',
      'Cost tracker',
      'Production overlay',
      'Permit calendar',
    ],
    path: '/templates/industrial',
  },
  {
    id: 'executive',
    name: 'Executive Dashboard',
    description: 'High-level KPIs, trends, policy simulations, and ROI for city administrators, executives, and policy makers.',
    category: 'executive',
    thumbnail: '/templates/executive.png',
    icon: '📊',
    features: [
      'Executive KPI summary',
      'Trend analysis',
      'Policy simulation',
      'ROI tracking',
      'Budget allocation',
      'Strategic recommendations',
    ],
    idealFor: [
      'City administrators',
      'Executives',
      'Policy makers',
      'Budget planners',
    ],
    complexity: 'beginner',
    widgets: [
      'Executive KPIs',
      'Trend dashboard',
      'Policy simulator',
      'ROI calculator',
      'Budget pie chart',
      'Recommendations',
    ],
    path: '/templates/executive',
  },
];

export function getTemplateById(id: string): TemplateConfig | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(
  category: TemplateConfig['category']
): TemplateConfig[] {
  return TEMPLATES.filter((t) => t.category === category);
}

export function getTemplatesByComplexity(
  complexity: TemplateConfig['complexity']
): TemplateConfig[] {
  return TEMPLATES.filter((t) => t.complexity === complexity);
}
