'use client';

import { useState, useEffect } from 'react';
import {
  Play,
  Check,
  X,
  AlertCircle,
  Clock,
  Lock,
  Activity,
  RefreshCw,
  Info
} from 'lucide-react';

interface TransactionManagerProps {
  onExecute: (sql: string) => Promise<void>;
  isExecuting: boolean;
}

type TransactionState = 'none' | 'active' | 'committed' | 'rolled_back' | 'error';

export default function TransactionManager({ onExecute, isExecuting }: TransactionManagerProps) {
  const [transactionState, setTransactionState] = useState<TransactionState>('none');
  const [transactionStartTime, setTransactionStartTime] = useState<number | null>(null);
  const [transactionDuration, setTransactionDuration] = useState<string>('');
  const [showInfo, setShowInfo] = useState(false);

  // Update duration timer
  useEffect(() => {
    if (transactionState === 'active' && transactionStartTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - transactionStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          setTransactionDuration(`${hours}h ${minutes % 60}m ${seconds % 60}s`);
        } else if (minutes > 0) {
          setTransactionDuration(`${minutes}m ${seconds % 60}s`);
        } else {
          setTransactionDuration(`${seconds}s`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [transactionState, transactionStartTime]);

  const handleBegin = async () => {
    try {
      await onExecute('BEGIN');
      setTransactionState('active');
      setTransactionStartTime(Date.now());
      setTransactionDuration('0s');
    } catch (err) {
      setTransactionState('error');
      console.error('Failed to begin transaction:', err);
    }
  };

  const handleCommit = async () => {
    try {
      await onExecute('COMMIT');
      setTransactionState('committed');
      setTransactionStartTime(null);
      setTimeout(() => setTransactionState('none'), 3000);
    } catch (err) {
      setTransactionState('error');
      console.error('Failed to commit transaction:', err);
    }
  };

  const handleRollback = async () => {
    try {
      await onExecute('ROLLBACK');
      setTransactionState('rolled_back');
      setTransactionStartTime(null);
      setTimeout(() => setTransactionState('none'), 3000);
    } catch (err) {
      setTransactionState('error');
      console.error('Failed to rollback transaction:', err);
    }
  };

  const getStateColor = () => {
    switch (transactionState) {
      case 'none': return 'gray';
      case 'active': return 'blue';
      case 'committed': return 'green';
      case 'rolled_back': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStateIcon = () => {
    switch (transactionState) {
      case 'none': return <Activity className="h-4 w-4" />;
      case 'active': return <Clock className="h-4 w-4 animate-pulse" />;
      case 'committed': return <Check className="h-4 w-4" />;
      case 'rolled_back': return <X className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStateText = () => {
    switch (transactionState) {
      case 'none': return 'No Transaction';
      case 'active': return 'Transaction Active';
      case 'committed': return 'Committed';
      case 'rolled_back': return 'Rolled Back';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const color = getStateColor();

  return (
    <div className="flex items-center gap-2">
      {/* Transaction Status Badge */}
      <div
        className={`flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all ${
          color === 'gray'
            ? 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
            : color === 'blue'
            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
            : color === 'green'
            ? 'border-green-500 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-900/30 dark:text-green-300'
            : color === 'yellow'
            ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-300'
            : 'border-red-500 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-900/30 dark:text-red-300'
        }`}
      >
        {getStateIcon()}
        <span>{getStateText()}</span>
        {transactionState === 'active' && transactionDuration && (
          <span className="text-xs opacity-75">({transactionDuration})</span>
        )}
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Transaction Controls */}
      <div className="flex items-center gap-1">
        {transactionState === 'none' ? (
          <button
            onClick={handleBegin}
            disabled={isExecuting}
            className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
            title="Begin a new transaction"
          >
            <Play className="h-4 w-4" />
            BEGIN
          </button>
        ) : transactionState === 'active' ? (
          <>
            <button
              onClick={handleCommit}
              disabled={isExecuting}
              className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
              title="Commit the current transaction"
            >
              <Check className="h-4 w-4" />
              COMMIT
            </button>
            <button
              onClick={handleRollback}
              disabled={isExecuting}
              className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
              title="Rollback the current transaction"
            >
              <X className="h-4 w-4" />
              ROLLBACK
            </button>
          </>
        ) : null}

        {/* Info Button */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="rounded-lg border border-gray-300 bg-white p-1.5 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
          title="Transaction information"
        >
          <Info className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="fixed right-4 top-20 z-50 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Transaction Information
            </h3>
            <button
              onClick={() => setShowInfo(false)}
              className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1">What are transactions?</p>
              <p className="text-blue-800 dark:text-blue-200">
                Transactions group multiple SQL statements into a single unit. All statements succeed together or none execute.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Play className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">BEGIN</p>
                  <p className="text-gray-600 dark:text-gray-400">Starts a new transaction</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">COMMIT</p>
                  <p className="text-gray-600 dark:text-gray-400">Saves all changes permanently</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <X className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">ROLLBACK</p>
                  <p className="text-gray-600 dark:text-gray-400">Discards all changes</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-yellow-800 dark:text-yellow-200">
                  <p className="font-semibold mb-1">Important</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Use transactions for critical operations</li>
                    <li>Keep transactions short when possible</li>
                    <li>Always COMMIT or ROLLBACK</li>
                  </ul>
                </div>
              </div>
            </div>

            {transactionState === 'active' && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div className="text-orange-800 dark:text-orange-200">
                    <p className="font-semibold mb-1">Active Transaction</p>
                    <p>
                      You have an active transaction. Remember to COMMIT or ROLLBACK when done.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
