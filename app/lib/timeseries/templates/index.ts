import { iotTemplate } from './iot-template';
import { analyticsTemplate } from './analytics-template';
import { businessTemplate } from './business-template';
import { financeTemplate } from './finance-template';
import { infrastructureTemplate } from './infrastructure-template';
import { weatherTemplate } from './weather-template';
import { saasTemplate } from './saas-template';
import { ecommerceTemplate } from './ecommerce-template';
import { devopsTemplate } from './devops-template';
import { marketingTemplate } from './marketing-template';
import { supplyChainTemplate } from './supply-chain-template';
import { energyTemplate } from './energy-template';
import type { TemplateDefinition, TemplateCategory } from '../types';

export const ALL_TEMPLATES: TemplateDefinition[] = [
  // Business
  businessTemplate,
  saasTemplate,
  supplyChainTemplate,
  // Analytics
  analyticsTemplate,
  ecommerceTemplate,
  marketingTemplate,
  // Finance
  financeTemplate,
  // Infrastructure / DevOps
  infrastructureTemplate,
  devopsTemplate,
  // IoT / Energy
  iotTemplate,
  energyTemplate,
  // Weather
  weatherTemplate,
];

export function getTemplate(id: string): TemplateDefinition | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: TemplateCategory): TemplateDefinition[] {
  return ALL_TEMPLATES.filter((t) => t.category === category);
}

export {
  iotTemplate, analyticsTemplate, businessTemplate, financeTemplate,
  infrastructureTemplate, weatherTemplate, saasTemplate, ecommerceTemplate,
  devopsTemplate, marketingTemplate, supplyChainTemplate, energyTemplate,
};
