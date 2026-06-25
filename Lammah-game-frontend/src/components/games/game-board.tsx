'use client';

import { useState } from 'react';
import { useGame, useRevealAnswer, useAwardPoints, useSkipQuestion } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BoardQuestion, Question, Team } from '@/types';
import { getEntityId } from '@/lib/utils';

interface GameBoardProps {
  gameId: string;
}

export function GameBoard({ gameId }: GameBoardProps) {
  const { data: gameResponse, isLoading, error } = useGame(gameId);
  const [selectedBoardQuestion, setSelectedBoardQuestion] = useState<BoardQuestion | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);

  const revealAnswer = useRevealAnswer(gameId);
  const awardPoints = useAwardPoints(gameId);
  const skipQuestion = useSkipQuestion(gameId);

  if (isLoading) return <div className="text-center py-8">جاري التحميل...</div>;
  if (error) return <div className="text-center py-8 text-destructive">حدث خطأ</div>;
  const game = gameResponse?.data;
  if (!game) return <div className="text-center py-8">لم يتم العثور على اللعبة</div>;

  const fallbackTeamA: Team = { id: 'team-a', name: 'الفريق أ', members: [], score: 0 };
  const fallbackTeamB: Team = { id: 'team-b', name: 'الفريق ب', members: [], score: 0 };
  const teamA = game.teamA || game.teams?.[0] || fallbackTeamA;
  const teamB = game.teamB || game.teams?.[1] || fallbackTeamB;
  const selectedQuestion = selectedBoardQuestion?.question || game.currentQuestion;
  const selectedQuestionId =
    selectedBoardQuestion?.questionId ||
    (selectedQuestion ? getEntityId(selectedQuestion) : '') ||
    (selectedBoardQuestion ? getEntityId(selectedBoardQuestion) : '');
  const isTeamATurn = game.currentTeamIndex !== undefined
    ? game.currentTeamIndex === 0
    : game.currentTeamTurn === 'A';
  const winner = teamA.score === teamB.score ? 'draw' : teamA.score > teamB.score ? teamA.name : teamB.name;

  const closeQuestion = () => {
    setSelectedBoardQuestion(null);
    setAnswerRevealed(false);
  };

  const handleAward = (teamIndex: 0 | 1) => {
    if (!selectedQuestionId) return;
    awardPoints.mutate(
      { questionId: selectedQuestionId, teamIndex },
      { onSuccess: closeQuestion }
    );
  };

  const handleSkip = () => {
    if (!selectedQuestionId) return;
    skipQuestion.mutate(selectedQuestionId, { onSuccess: closeQuestion });
  };

  const renderMedia = (question: Question) => {
    if (question.type === 'text' || !question.mediaUrl) return null;

    return (
      <div className="my-4">
        {question.type === 'image' && (
          <img src={question.mediaUrl} alt="Question media" className="w-full rounded-lg" />
        )}
        {question.type === 'audio' && (
          <audio controls className="w-full">
            <source src={question.mediaUrl} />
          </audio>
        )}
        {question.type === 'video' && (
          <video controls className="w-full rounded-lg">
            <source src={question.mediaUrl} />
          </video>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="sticky top-24 z-30 grid grid-cols-2 gap-3 md:gap-5">
        <Card className={`overflow-hidden ${isTeamATurn ? 'border-primary/70 watermelon-glow' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-2xl">{teamA.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-5xl md:text-7xl font-black text-primary transition-all">
              {teamA.score}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {teamA.members.join(', ')}
            </div>
            {isTeamATurn && <Badge className="mt-4 bg-primary text-primary-foreground">الدور الحالي</Badge>}
          </CardContent>
        </Card>

        <Card className={`overflow-hidden ${!isTeamATurn ? 'border-primary/70 watermelon-glow' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg md:text-2xl">{teamB.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-5xl md:text-7xl font-black text-primary transition-all">
              {teamB.score}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {teamB.members.join(', ')}
            </div>
            {!isTeamATurn && <Badge className="mt-4 bg-primary text-primary-foreground">الدور الحالي</Badge>}
          </CardContent>
        </Card>
      </div>

      {game.status === 'finished' ? (
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-4xl font-black">انتهت اللعبة</CardTitle>
          </CardHeader>
          <CardContent>
            {game.winner === 'draw' ? (
              <p className="text-3xl font-black text-primary">تعادل!</p>
            ) : (
              <p className="text-3xl font-black text-primary">
                الفائز: {game.winner ? (game.winner === 'A' ? teamA.name : teamB.name) : winner}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="glass-panel rounded-[2rem] p-3 md:p-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {game.board?.map((column, index) => (
              <div key={game.categories?.[index] ? getEntityId(game.categories[index]) : index} className="space-y-3">
                <div className="min-h-20 rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/20 to-white/5 p-3 text-center text-base font-black md:text-lg flex items-center justify-center">
                  {game.categories?.[index]?.name || column[0]?.category?.name || `تصنيف ${index + 1}`}
                </div>
                {column.map((boardQuestion) => (
                  <button
                    key={getEntityId(boardQuestion)}
                    onClick={() => {
                      setSelectedBoardQuestion(boardQuestion);
                      setAnswerRevealed(false);
                    }}
                    disabled={boardQuestion.answered}
                    className={`pop-in min-h-24 w-full rounded-3xl border text-4xl font-black transition-all duration-300 md:min-h-28 md:text-5xl ${
                      boardQuestion.answered
                        ? 'border-white/5 bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
                        : 'border-primary/30 bg-gradient-to-br from-secondary via-violet-800 to-purple-950 text-primary shadow-xl shadow-primary/10 hover:-translate-y-1 hover:scale-[1.03] hover:border-primary hover:shadow-primary/30 cursor-pointer'
                    }`}
                  >
                    {boardQuestion.points}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Dialog */}
      <Dialog open={!!selectedBoardQuestion} onOpenChange={(open) => !open && closeQuestion()}>
        <DialogContent className="max-w-4xl rounded-[2rem] border-primary/20 bg-[#160829]/95 p-5 shadow-2xl shadow-primary/20 backdrop-blur-xl md:p-8">
          {selectedQuestion ? (
            <div className="space-y-7">
              <DialogHeader>
                <DialogTitle className="text-center text-3xl font-black leading-tight md:text-5xl">
                  {selectedQuestion.question}
                </DialogTitle>
              </DialogHeader>

              {renderMedia(selectedQuestion)}

              {answerRevealed && (
                <div className="space-y-3">
                  <div className="rounded-3xl border border-primary/25 bg-primary/10 p-5 text-center">
                    <p className="text-sm font-semibold text-muted-foreground">الإجابة:</p>
                    <p className="mt-2 text-3xl font-black text-primary">{selectedQuestion.answer}</p>
                  </div>

                  {selectedQuestion.explanation && (
                    <div className="rounded-3xl bg-white/5 p-5">
                      <p className="text-sm font-semibold text-muted-foreground">الشرح:</p>
                      <p className="mt-1 text-lg">{selectedQuestion.explanation}</p>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-3">
                    <Button
                      size="lg"
                      onClick={() => handleAward(0)}
                      disabled={awardPoints.isPending}
                    >
                      {teamA.name} يحصل على النقاط
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={() => handleAward(1)}
                      disabled={awardPoints.isPending}
                    >
                      {teamB.name} يحصل على النقاط
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleSkip}
                      disabled={skipQuestion.isPending}
                    >
                      تخطي
                    </Button>
                  </div>
                </div>
              )}

              {!answerRevealed && (
                <Button
                  size="lg"
                  onClick={() => {
                    if (selectedQuestionId) {
                      revealAnswer.mutate(selectedQuestionId);
                    }
                    setAnswerRevealed(true);
                  }}
                  disabled={revealAnswer.isPending || !selectedQuestionId}
                  className="w-full"
                >
                  اكشف الإجابة
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-center text-3xl font-black">السؤال</DialogTitle>
              </DialogHeader>
              <p className="text-muted-foreground">
                اضغط على كشف الإجابة لجلب تفاصيل السؤال من backend.
              </p>
              <Button
                size="lg"
                onClick={() => {
                  if (selectedQuestionId) {
                    revealAnswer.mutate(selectedQuestionId);
                    setAnswerRevealed(true);
                  }
                }}
                disabled={revealAnswer.isPending || !selectedQuestionId}
                className="w-full"
              >
                اكشف الإجابة
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
