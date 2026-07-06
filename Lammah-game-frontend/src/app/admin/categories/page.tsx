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
import { CategoryForm } from '@/components/categories/category-form';
import { CategoriesList } from '@/components/categories/categories-list';

export default function AdminCategoriesPage() {
  const [open, setOpen] = useState(false);

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">إدارة الفئات</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>إضافة فئة جديدة</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100dvh-3rem)] overflow-hidden sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>إضافة فئة جديدة</DialogTitle>
              </DialogHeader>
              <CategoryForm onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <CategoriesList />
      </div>
    </RequireAdmin>
  );
}
