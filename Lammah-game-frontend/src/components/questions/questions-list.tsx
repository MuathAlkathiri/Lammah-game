'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteQuestion, usePatchQuestion, useQuestions, useUpdateQuestionStatus } from '@/lib/hooks';
import { getStatusLabel, getDifficultyLabel, getEntityId, getQuestionTypeLabel } from '@/lib/utils';
import { Question } from '@/types';

interface QuestionsListProps {
  canPreview?: boolean;
}

export function QuestionsList({ canPreview = false }: QuestionsListProps) {
  const { data, isLoading, error } = useQuestions();
  const updateQuestionStatus = useUpdateQuestionStatus();
  const patchQuestion = usePatchQuestion();
  const deleteQuestion = useDeleteQuestion();
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const questions = data?.data || [];

  useEffect(() => {
    if (selectedQuestion?.type !== 'audio') return;

    audioRef.current?.play().catch(() => {
      // Some browsers block autoplay; controls remain visible for manual playback.
    });
  }, [selectedQuestion]);

  const renderQuestionMedia = (question: Question) => {
    if (question.type === 'text') return null;

    if (!question.mediaUrl) {
      return (
        <div className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-sm text-muted-foreground">
          لا يوجد ملف مرفق لهذا السؤال.
        </div>
      );
    }

    if (question.type === 'image') {
      return (
        <img
          src={question.mediaUrl}
          alt="Question media"
          className="max-h-[55vh] w-full rounded-2xl object-contain"
        />
      );
    }

    if (question.type === 'audio') {
      return (
        <audio ref={audioRef} controls autoPlay className="w-full">
          <source src={question.mediaUrl} />
        </audio>
      );
    }

    if (question.type === 'video') {
      return (
        <video controls className="max-h-[55vh] w-full rounded-2xl">
          <source src={question.mediaUrl} />
        </video>
      );
    }

    return null;
  };

  if (isLoading) return <div className="text-center py-8">جاري التحميل...</div>;
  if (error) return <div className="text-center py-8 text-destructive">حدث خطأ</div>;
  if (!questions.length) return <div className="text-center py-8">لا توجد أسئلة</div>;

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        {questions.map((question) => (
          <Card key={getEntityId(question)}>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4">
                <div className="flex-1">
                  <CardTitle className="text-xl font-black leading-snug">{question.question}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    الإجابة: <span className="font-semibold">{question.answer}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{question.points}</Badge>
                  <Badge variant="outline">{getDifficultyLabel(question.difficulty)}</Badge>
                  <Badge variant="outline">{getQuestionTypeLabel(question.type)}</Badge>
                  <Badge variant="outline">{question.source === 'ai' ? 'AI' : 'يدوي'}</Badge>
                  {question.isFreeGameQuestion && <Badge>لعبة مجانية</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {canPreview && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedQuestion(question)}
                  >
                    فتح السؤال
                  </Button>
                )}
                {question.status === 'draft' && question.source === 'ai' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateQuestionStatus.mutate({ id: getEntityId(question), status: 'approved' })}
                      disabled={updateQuestionStatus.isPending}
                    >
                      موافق عليه
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateQuestionStatus.mutate({ id: getEntityId(question), status: 'rejected' })}
                      disabled={updateQuestionStatus.isPending}
                    >
                      مرفوض
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => patchQuestion.mutate({
                    id: getEntityId(question),
                    data: { isFreeGameQuestion: !question.isFreeGameQuestion },
                  })}
                  disabled={patchQuestion.isPending}
                >
                  {question.isFreeGameQuestion ? 'إلغاء المجانية' : 'اجعله مجاني'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteQuestion.mutate(getEntityId(question))}
                  disabled={deleteQuestion.isPending}
                >
                  حذف
                </Button>
                <Badge variant="outline">{getStatusLabel(question.status)}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="max-w-3xl rounded-[2rem] border-primary/20 bg-[#160829]/95 p-5 shadow-2xl shadow-primary/20 backdrop-blur-xl md:p-8">
          {selectedQuestion && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-center text-2xl font-black leading-tight md:text-4xl">
                  {selectedQuestion.question}
                </DialogTitle>
              </DialogHeader>

              {renderQuestionMedia(selectedQuestion)}

              <div className="rounded-3xl border border-primary/25 bg-primary/10 p-5 text-center">
                <p className="text-sm font-semibold text-muted-foreground">الإجابة:</p>
                <p className="mt-2 text-2xl font-black text-primary">{selectedQuestion.answer}</p>
              </div>

              {selectedQuestion.explanation && (
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-sm font-semibold text-muted-foreground">الشرح:</p>
                  <p className="mt-1 text-lg">{selectedQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
