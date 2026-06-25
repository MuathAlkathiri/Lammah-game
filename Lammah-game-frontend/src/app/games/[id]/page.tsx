'use client';

import { GameBoard } from '@/components/games/game-board';
import { RequireAuth } from '@/components/auth/require-auth';
import { useParams } from 'next/navigation';

export default function GamePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!id) {
    return <div className="text-center py-8">لم يتم العثور على اللعبة</div>;
  }
  
  return (
    <RequireAuth>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">اللعبة</h1>
        <GameBoard gameId={id} />
      </div>
    </RequireAuth>
  );
}
