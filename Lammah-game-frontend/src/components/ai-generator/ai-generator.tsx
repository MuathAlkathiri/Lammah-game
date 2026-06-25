'use client';

import { useState } from 'react';
import { useCategories, useGenerateQuestions } from '@/lib/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Question } from '@/types';
import { getEntityId } from '@/lib/utils';

export function AIGenerator() {
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const generateQuestions = useGenerateQuestions();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const categories = categoriesData?.data || [];

  const handleGenerate = async () => {
    if (!selectedCategory) return;

    try {
      const response = await generateQuestions.mutateAsync({
        categoryId: selectedCategory,
        count: 10,
      });
      setGeneratedQuestions(response.data || []);
    } catch (error) {
      console.error('Failed to generate questions:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-white/[0.06] to-destructive/10">
        <CardHeader>
          <CardTitle className="text-3xl font-black">مصنع الأسئلة الذكي</CardTitle>
          <CardDescription>
            قم بتحديد فئة وسيقوم الذكاء الاصطناعي بإنشاء أسئلة تلقائيًا
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">اختر فئة</label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              disabled={categoriesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={categoriesLoading ? 'جاري تحميل الفئات...' : 'اختر فئة'} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={getEntityId(category)} value={getEntityId(category)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!selectedCategory || generateQuestions.isPending}
            className="w-full"
          >
            {generateQuestions.isPending ? 'جاري التوليد...' : 'توليد أسئلة'}
          </Button>

          {generatedQuestions.length > 0 && (
            <div className="mt-4 rounded-3xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm text-muted-foreground">
                تم توليد {generatedQuestions.length} أسئلة. جميع الأسئلة محفوظة كمسودات وتحتاج إلى موافقة.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                يجب اعتماد الأسئلة من صفحة إدارة الأسئلة قبل ظهورها في الألعاب.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Questions */}
      {generatedQuestions.length > 0 && (
        <div>
          <h2 className="mb-4 text-3xl font-black">الأسئلة المُولدة</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {generatedQuestions.map((question, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-black leading-snug">{question.question}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        الإجابة: <span className="font-semibold">{question.answer}</span>
                      </p>
                    </div>
                    <Badge variant="outline">مسودة</Badge>
                  </div>
                </CardHeader>
                {question.explanation && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      الشرح: {question.explanation}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
