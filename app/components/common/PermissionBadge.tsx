/**
 * PermissionBadge Component
 * Visual indicator of user's current permission level
 */

import React from 'react';

interface PermissionBadgeProps {
  role: 'read-only' | 'read-write' | 'superuser';
  size?: 'sm' | 'md' | 'lg';
}

const badges = {
  'read-only': {
    icon: '👁️',
    text: 'Read-Only',
    color: 'blue',
    description: 'Can view data only',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  'read-write': {
    icon: '✏️',
    text: 'Read-Write',
    color: 'green',
    description: 'Can view and modify data',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  'superuser': {
    icon: '👑',
    text: 'Administrator',
    color: 'purple',
    description: 'Full database access',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
};

export function PermissionBadge({ role, size = 'md' }: PermissionBadgeProps) {
  const badge = badges[role] || badges['read-only'];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border ${badge.bgColor} ${badge.textColor} ${badge.borderColor} ${sizeClasses[size]}`}
      title={badge.description}
    >
      <span>{badge.icon}</span>
      <span className="font-semibold">{badge.text}</span>
      {size !== 'sm' && <span className="text-xs opacity-75">• {badge.description}</span>}
    </div>
  );
}

export default PermissionBadge;
