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
import { QuestionForm } from '@/components/questions/question-form';
import { QuestionsList } from '@/components/questions/questions-list';

export default function AdminQuestionsPage() {
  const [open, setOpen] = useState(false);

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">إدارة الأسئلة</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>إضافة سؤال جديد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة سؤال جديد</DialogTitle>
              </DialogHeader>
              <QuestionForm onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <QuestionsList canPreview />
      </div>
    </RequireAdmin>
  );
}
