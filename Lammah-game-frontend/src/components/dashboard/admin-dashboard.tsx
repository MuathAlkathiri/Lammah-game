'use client';

import Link from 'next/link';
import {
  Bot,
  Boxes,
  ClipboardList,
  Gamepad2,
  LayoutDashboard,
  ListChecks,
  Users,
} from 'lucide-react';
import { RequireAdmin } from '@/components/auth/require-admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCatalogs, useCategories, useGames, useQuestions, useUsers } from '@/lib/hooks';
import { formatDate, getEntityId, getStatusLabel } from '@/lib/utils';
import { DashboardCard } from './dashboard-card';
import { StatsCard } from './stats-card';

const managementCards = [
  {
    title: 'Games management',
    description: 'متابعة الألعاب المحفوظة وحالة كل تحدي.',
    href: '/games',
    icon: Gamepad2,
  },
  {
    title: 'Catalogs management',
    description: 'تنظيم الفئات داخل كتالوجات واضحة.',
    href: '/admin/catalogs',
    icon: Boxes,
  },
  {
    title: 'Categories management',
    description: 'إضافة وتعديل فئات الأسئلة المتاحة.',
    href: '/admin/categories',
    icon: Boxes,
  },
  {
    title: 'Questions management',
    description: 'مراجعة الأسئلة واعتماد المحتوى.',
    href: '/admin/questions',
    icon: ClipboardList,
  },
  {
    title: 'AI question generation',
    description: 'توليد أسئلة كمسودات للمراجعة.',
    href: '/admin/ai-generator',
    icon: Bot,
  },
  {
    title: 'Users',
    description: 'إدارة اشتراكات وصلاحيات المستخدمين.',
    href: '/admin/subscriptions',
    icon: Users,
  },
];

export function AdminDashboard() {
  return (
    <RequireAdmin>
      <AdminDashboardContent />
    </RequireAdmin>
  );
}

function AdminDashboardContent() {
  const { data: games } = useGames();
  const { data: catalogs } = useCatalogs();
  const { data: categories } = useCategories();
  const { data: questions } = useQuestions();
  const { data: users } = useUsers();

  const aiQuestions = (questions || []).filter((question) => question.source === 'ai').length;
  const recentGames = (games || []).slice(0, 4);

  return (
    <div className="space-y-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Admin only
              </div>
              <p className="text-sm font-black text-primary">غرفة التحكم</p>
              <h1 className="mt-2 text-4xl font-black leading-tight md:text-5xl">Admin Dashboard</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                لوحة عملية لإدارة الألعاب والفئات والأسئلة ومراجعة المحتوى المولد.
              </p>
            </div>
            <Link
              href="/admin/ai-generator"
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black transition hover:border-primary/40 hover:text-primary"
            >
              AI question generation
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatsCard label="Total games" value={games?.length ?? 0} icon={Gamepad2} />
          <StatsCard label="Total catalogs" value={catalogs?.length ?? 0} icon={Boxes} />
          <StatsCard label="Total categories" value={categories?.length ?? 0} icon={Boxes} />
          <StatsCard label="Total questions" value={questions?.length ?? 0} icon={ClipboardList} />
          <StatsCard label="AI generated questions" value={aiQuestions} icon={Bot} />
          <StatsCard label="Users" value={users?.length ?? 0} icon={Users} helper="مدعوم عبر الاشتراكات" />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-primary">Admin-only shortcuts</p>
              <h2 className="text-2xl font-black">Management</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {managementCards.map((card) => (
              <DashboardCard key={card.href + card.title} {...card} tone="admin" badge="Admin" />
            ))}
          </div>
        </section>

        {!!recentGames.length && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl font-black">
                <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
                Recent activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentGames.map((game) => (
                <Link
                  key={getEntityId(game)}
                  href={`/games/${getEntityId(game)}`}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-primary/35 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-black">{game.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      آخر تحديث: {formatDate(game.updatedAt || game.createdAt)}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs font-black text-muted-foreground">
                    {getStatusLabel(game.status)}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
