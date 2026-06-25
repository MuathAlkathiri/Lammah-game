'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RequireAuth } from '@/components/auth/require-auth';
import { GameForm } from '@/components/games/game-form';

export default function NewGamePage() {
  return (
    <RequireAuth>
      <div className="space-y-8">
        <div>
          <p className="text-sm font-black text-primary">اختاروا الستة الكبار</p>
          <h1 className="text-5xl font-black">إنشاء لعبة جديدة</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-black">معلومات اللعبة</CardTitle>
          </CardHeader>
          <CardContent>
            <GameForm />
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  );
}
