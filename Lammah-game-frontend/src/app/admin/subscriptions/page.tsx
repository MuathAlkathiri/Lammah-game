'use client';

import { RequireAdmin } from '@/components/auth/require-admin';
import { SubscriptionAdmin } from '@/components/subscriptions/subscription-admin';

export default function AdminSubscriptionsPage() {
  return (
    <RequireAdmin>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">إدارة الاشتراكات</h1>
        <SubscriptionAdmin />
      </div>
    </RequireAdmin>
  );
}
