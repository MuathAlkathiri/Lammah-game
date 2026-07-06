'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RequireAdmin } from '@/components/auth/require-admin';
import { CatalogForm } from '@/components/catalogs/catalog-form';
import { CatalogsList } from '@/components/catalogs/catalogs-list';

export default function AdminCatalogsPage() {
  const [open, setOpen] = useState(false);

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-primary">Admin only</p>
            <h1 className="text-3xl font-bold">إدارة الكتالوجات</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>إضافة كتالوج جديد</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة كتالوج جديد</DialogTitle>
              </DialogHeader>
              <CatalogForm onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <CatalogsList />
      </div>
    </RequireAdmin>
  );
}
