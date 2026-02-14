'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TEMPLATES, TemplateConfig } from '../lib/template-config';
import {
  Activity,
  FileText,
  Heart,
  Factory,
  TrendingUp,
  ArrowRight,
  Filter,
  Search,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// DASHBOARD TEMPLATE SELECTOR
// ============================================================================
// Purpose: Gallery of professional dashboard templates
// ============================================================================

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all');

  // Filter templates
  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;

    const matchesComplexity =
      selectedComplexity === 'all' || template.complexity === selectedComplexity;

    return matchesSearch && matchesCategory && matchesComplexity;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-[#0a0e1a] dark:via-[#0D1B2A] dark:to-[#001021]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-[#001E2B]/95">
        <div className="mx-auto max-w-[1600px] px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Dashboard Templates
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Professional pre-built dashboards for every use case • Customize to your needs
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mt-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="operations">Operations</option>
              <option value="compliance">Compliance</option>
              <option value="health">Health</option>
              <option value="industrial">Industrial</option>
              <option value="executive">Executive</option>
            </select>

            {/* Complexity Filter */}
            <select
              value={selectedComplexity}
              onChange={(e) => setSelectedComplexity(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No templates found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}

        {/* Custom Template CTA */}
        <div className="mt-12 rounded-xl border-2 border-dashed border-gray-300 bg-white/50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/30">
          <Activity className="mx-auto h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Need a Custom Dashboard?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-2xl mx-auto">
            Use our dashboard builder to create a fully customized solution tailored to your specific needs.
            Drag and drop widgets, configure data sources, and export your dashboard.
          </p>
          <Link
            href="/dashboard-builder"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Launch Dashboard Builder
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================

interface TemplateCardProps {
  template: TemplateConfig;
}

function TemplateCard({ template }: TemplateCardProps) {
  const categoryIcons = {
    operations: Activity,
    compliance: FileText,
    health: Heart,
    industrial: Factory,
    executive: TrendingUp,
  };

  const categoryColors = {
    operations: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    compliance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    health: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    industrial: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    executive: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  const complexityColors = {
    beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const IconComponent = categoryIcons[template.category];

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1 border-gray-200 dark:border-gray-700">
      {/* Template Icon/Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
        <div className="relative text-8xl">{template.icon}</div>
        <div className="absolute top-4 right-4 flex gap-2">
          <Badge className={categoryColors[template.category]}>
            {template.category}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {template.name}
            </h3>
          </div>
          <Badge className={complexityColors[template.complexity]} variant="outline">
            {template.complexity}
          </Badge>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {template.description}
        </p>

        {/* Features */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Key Features:
          </p>
          <ul className="space-y-1">
            {template.features.slice(0, 3).map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          {template.features.length > 3 && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              +{template.features.length - 3} more features
            </p>
          )}
        </div>

        {/* Ideal For */}
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Ideal For:
          </p>
          <div className="flex flex-wrap gap-1">
            {template.idealFor.slice(0, 2).map((role, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={template.path}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            View Template
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
            Preview
          </button>
        </div>
      </div>
    </Card>
  );
}
