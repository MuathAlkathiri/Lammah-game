'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RequireAuth } from '@/components/auth/require-auth';
import { useAuth } from '@/components/auth/auth-provider';
import { GamesList } from '@/components/games/games-list';

export default function GamesPage() {
  const { user } = useAuth();
  const canUseFreeGame = (user?.freeGamesUsed || 0) === 0;
  const hasActiveSubscription = user?.subscriptionStatus === 'active';

  return (
    <RequireAuth>
      <div className="space-y-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-primary">جاهز للتحدي؟</p>
            <h1 className="text-5xl font-black">ألعابي</h1>
          </div>
          <Link href="/games/new">
            <Button size="lg">لعبة جديدة</Button>
          </Link>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 to-white/[0.06]">
          <CardContent className="pt-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              الألعاب المجانية المستخدمة: {user?.freeGamesUsed ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">
              حالة الاشتراك: {user?.subscriptionStatus || 'none'}
            </p>
            {canUseFreeGame && <p className="text-primary">عندك لعبة مجانية واحدة</p>}
            {!canUseFreeGame && !hasActiveSubscription && (
              <p className="text-destructive">تحتاج اشتراك لإنشاء لعبة جديدة</p>
            )}
          </CardContent>
        </Card>

        <GamesList />
      </div>
    </RequireAuth>
  );
}
