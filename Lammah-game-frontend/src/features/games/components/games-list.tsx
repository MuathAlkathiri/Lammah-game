"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGames } from "../hooks/use-games";
import { getEntityId, getStatusLabel } from "@/lib/utils";

export function GamesList() {
  const { data, isLoading, error } = useGames();
  const games = data || [];

  if (isLoading) return <div className="text-center py-8">جاري التحميل...</div>;
  if (error)
    return <div className="text-center py-8 text-destructive">حدث خطأ</div>;
  if (!games.length)
    return <div className="text-center py-8">لا توجد ألعاب</div>;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {games.map((game) => (
        <Card
          key={getEntityId(game)}
          className="overflow-hidden bg-gradient-to-br from-white/[0.09] to-primary/[0.06]"
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-black">
                  {game.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {(game.teamA || game.teams?.[0])?.name || "الفريق أ"}{" "}
                  <span className="font-bold">
                    {(game.teamA || game.teams?.[0])?.score ?? 0}
                  </span>{" "}
                  -
                  <span className="font-bold">
                    {(game.teamB || game.teams?.[1])?.score ?? 0}
                  </span>{" "}
                  {(game.teamB || game.teams?.[1])?.name || "الفريق ب"}
                </p>
              </div>
              <Badge className="bg-primary text-primary-foreground">
                {getStatusLabel(game.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/games/${getEntityId(game)}`}>
              <Button size="lg" className="w-full">
                متابعة اللعبة
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
