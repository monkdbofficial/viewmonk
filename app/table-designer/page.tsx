'use client';

import { useRouter } from 'next/navigation';
import { useActiveConnection } from '../lib/monkdb-context';
import TableDesignerWizard from '../components/table-designer/TableDesignerWizard';
import ConnectionPrompt from '../components/common/ConnectionPrompt';

export default function TableDesignerPage() {
  const router = useRouter();
  const activeConnection = useActiveConnection();

  // Require active connection
  if (!activeConnection) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ConnectionPrompt onConnect={() => router.push('/connections')} />
      </div>
    );
  }

  const handleSuccess = () => {
    // Optionally navigate to schema viewer or show success message
    router.push('/unified-browser');
  };

  const handleClose = () => {
    // Navigate back or to dashboard
    router.push('/dashboard');
  };

  return (
    <div className="-m-8 h-[calc(100vh-4rem)] overflow-hidden">
      <TableDesignerWizard
        connectionId={activeConnection.id}
        onSuccess={handleSuccess}
        onClose={handleClose}
      />
    </div>
  );
}
