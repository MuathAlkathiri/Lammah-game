'use client';

import { RequireAdmin } from '@/components/auth/require-admin';
import { AIGenerator } from '@/components/ai-generator/ai-generator';

export default function AIGeneratorPage() {
  return (
    <RequireAdmin>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">مولد الأسئلة بالذكاء الاصطناعي</h1>
        <AIGenerator />
      </div>
    </RequireAdmin>
  );
}
