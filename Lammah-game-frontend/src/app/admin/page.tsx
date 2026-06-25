'use client';

import Link from 'next/link';
import { RequireAdmin } from '@/components/auth/require-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const cards = [
  { title: 'الفئات', href: '/admin/categories', description: 'إدارة تصنيفات الأسئلة' },
  { title: 'الأسئلة', href: '/admin/questions', description: 'إضافة واعتماد الأسئلة' },
  { title: 'مولد الذكاء الاصطناعي', href: '/admin/ai-generator', description: 'توليد أسئلة كمسودات' },
  { title: 'الاشتراكات', href: '/admin/subscriptions', description: 'تعديل اشتراكات المستخدمين' },
];

export default function AdminPage() {
  return (
    <RequireAdmin>
      <div className="space-y-8">
        <div>
          <p className="text-sm font-black text-primary">غرفة التحكم</p>
          <h1 className="text-5xl font-black">إدارة لمّة</h1>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-2xl font-black">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </RequireAdmin>
  );
}
