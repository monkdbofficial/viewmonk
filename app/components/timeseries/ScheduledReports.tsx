'use client';

import { useState } from 'react';
import { Calendar, Clock, Mail, Users, FileText, X, Plus, Trash2, CheckCircle } from 'lucide-react';

export interface ScheduledReport {
  id: string;
  name: string;
  dashboardId: string;
  dashboardName: string;
  schedule: 'daily' | 'weekly' | 'monthly' | 'custom';
  time: string; // HH:MM format
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv' | 'png';
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  includeFilters: boolean;
  includeCharts: boolean;
}

interface ScheduledReportsProps {
  reports: ScheduledReport[];
  onCreateReport: (report: Omit<ScheduledReport, 'id' | 'lastRun' | 'nextRun'>) => void;
  onUpdateReport: (id: string, updates: Partial<ScheduledReport>) => void;
  onDeleteReport: (id: string) => void;
  dashboards: any[];
}

export default function ScheduledReports({ reports, onCreateReport, onUpdateReport, onDeleteReport, dashboards }: ScheduledReportsProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newReport, setNewReport] = useState({
    name: '',
    dashboardId: '',
    dashboardName: '',
    schedule: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
    time: '09:00',
    recipients: [] as string[],
    format: 'pdf' as 'pdf' | 'excel' | 'csv' | 'png',
    enabled: true,
    includeFilters: true,
    includeCharts: true,
  });
  const [emailInput, setEmailInput] = useState('');

  const handleCreateReport = () => {
    if (!newReport.name || !newReport.dashboardId || newReport.recipients.length === 0) {
      alert('Please fill all required fields and add at least one recipient');
      return;
    }

    const selectedDashboard = dashboards.find(d => d.id === newReport.dashboardId);
    onCreateReport({
      ...newReport,
      dashboardName: selectedDashboard?.name || '',
    });

    setNewReport({
      name: '',
      dashboardId: '',
      dashboardName: '',
      schedule: 'daily',
      time: '09:00',
      recipients: [],
      format: 'pdf',
      enabled: true,
      includeFilters: true,
      includeCharts: true,
    });
    setShowCreateForm(false);
  };

  const addRecipient = () => {
    if (emailInput && emailInput.includes('@')) {
      setNewReport({
        ...newReport,
        recipients: [...newReport.recipients, emailInput],
      });
      setEmailInput('');
    }
  };

  const removeRecipient = (email: string) => {
    setNewReport({
      ...newReport,
      recipients: newReport.recipients.filter(e => e !== email),
    });
  };

  const getScheduleLabel = (schedule: string) => {
    switch (schedule) {
      case 'daily': return 'Every Day';
      case 'weekly': return 'Every Week';
      case 'monthly': return 'Every Month';
      case 'custom': return 'Custom';
      default: return schedule;
    }
  };

  const getScheduleColor = (schedule: string) => {
    switch (schedule) {
      case 'daily': return 'from-blue-600 to-blue-700';
      case 'weekly': return 'from-green-600 to-green-700';
      case 'monthly': return 'from-purple-600 to-purple-700';
      case 'custom': return 'from-orange-600 to-orange-700';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  return (
    <div className="relative">
      {/* Scheduled Reports Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-md hover:shadow-lg transition-all"
      >
        <Calendar className="h-4 w-4" />
        Reports
        {reports.filter(r => r.enabled).length > 0 && (
          <span className="ml-1 rounded-full bg-gradient-to-r from-green-600 to-green-700 px-2.5 py-0.5 text-xs font-bold text-white shadow-md">
            {reports.filter(r => r.enabled).length}
          </span>
        )}
      </button>

      {/* Scheduled Reports Panel */}
      {showPanel && (
        <div className="absolute right-0 top-full mt-3 w-[700px] rounded-2xl border border-gray-200/50 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-gray-700/50 dark:bg-gray-800/95 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700/50 bg-gradient-to-r from-blue-50 via-green-50 to-purple-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-900 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-green-600 shadow-lg">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Scheduled Reports
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {reports.filter(r => r.enabled).length} active • {reports.length} total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                  title="Create scheduled report"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Create Report Form */}
          {showCreateForm && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Schedule New Report</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Report name"
                  value={newReport.name}
                  onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newReport.dashboardId}
                    onChange={(e) => setNewReport({ ...newReport, dashboardId: e.target.value })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="">Select Dashboard</option>
                    {dashboards.map(dashboard => (
                      <option key={dashboard.id} value={dashboard.id}>{dashboard.name}</option>
                    ))}
                  </select>

                  <select
                    value={newReport.format}
                    onChange={(e) => setNewReport({ ...newReport, format: e.target.value as any })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                    <option value="png">PNG</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newReport.schedule}
                    onChange={(e) => setNewReport({ ...newReport, schedule: e.target.value as any })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom</option>
                  </select>

                  <input
                    type="time"
                    value={newReport.time}
                    onChange={(e) => setNewReport({ ...newReport, time: e.target.value })}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newReport.includeFilters}
                      onChange={(e) => setNewReport({ ...newReport, includeFilters: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Include Filters
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newReport.includeCharts}
                      onChange={(e) => setNewReport({ ...newReport, includeCharts: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Include Charts
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Recipients
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      placeholder="user@company.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={addRecipient}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all"
                    >
                      Add
                    </button>
                  </div>
                  {newReport.recipients.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newReport.recipients.map((email, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                        >
                          {email}
                          <button
                            onClick={() => removeRecipient(email)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateReport}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-semibold shadow-lg transition-all"
                >
                  Create Scheduled Report
                </button>
              </div>
            </div>
          )}

          {/* Reports List */}
          <div className="flex-1 overflow-y-auto p-6">
            {reports.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No scheduled reports</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <div
                    key={report.id}
                    className={`rounded-xl border p-4 transition-all ${
                      report.enabled
                        ? 'border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-60'
                    } hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={report.enabled}
                          onChange={() => onUpdateReport(report.id, { enabled: !report.enabled })}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{report.name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${getScheduleColor(report.schedule)} text-white`}>
                              {getScheduleLabel(report.schedule)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {report.dashboardName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {report.time}
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {report.recipients.length} recipients
                              </span>
                            </div>
                            {report.nextRun && (
                              <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Next run: {new Date(report.nextRun).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteReport(report.id)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
