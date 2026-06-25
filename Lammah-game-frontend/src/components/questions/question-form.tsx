'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateQuestion, useCategories } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getEntityId } from '@/lib/utils';

const questionSchema = z.object({
  categoryId: z.string().min(1, 'الفئة مطلوبة'),
  question: z.string().min(1, 'السؤال مطلوب'),
  answer: z.string().min(1, 'الإجابة مطلوبة'),
  explanation: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  points: z.enum(['200', '400', '600']),
  type: z.enum(['text', 'image', 'audio', 'video']),
  mediaUrl: z.string().optional(),
  status: z.enum(['draft', 'approved', 'rejected']),
  source: z.enum(['manual', 'ai']),
  isFreeGameQuestion: z.boolean(),
});

type QuestionFormData = z.infer<typeof questionSchema>;

interface QuestionFormProps {
  onSuccess?: () => void;
}

export function QuestionForm({ onSuccess }: QuestionFormProps) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      type: 'text',
      difficulty: 'easy',
      points: '200',
      status: 'draft',
      source: 'manual',
      isFreeGameQuestion: false,
    },
  });

  const { data: categoriesData } = useCategories();
  const createQuestion = useCreateQuestion();
  const questionType = watch('type');
  const categories = categoriesData?.data || [];

  const onSubmit = async (data: QuestionFormData) => {
    try {
      const submitData = {
        ...data,
        points: parseInt(data.points),
      };
      await createQuestion.mutateAsync(submitData);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create question:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">الفئة</label>
        <Select onValueChange={(value) => setValue('categoryId', value, { shouldValidate: true })}>
          <SelectTrigger>
            <SelectValue placeholder="اختر فئة" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={getEntityId(cat)} value={getEntityId(cat)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">السؤال</label>
        <Textarea placeholder="أدخل السؤال" {...register('question')} />
        {errors.question && <p className="text-sm text-destructive">{errors.question.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">الإجابة</label>
        <Textarea placeholder="أدخل الإجابة" {...register('answer')} />
        {errors.answer && <p className="text-sm text-destructive">{errors.answer.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">الشرح (اختياري)</label>
        <Textarea placeholder="أدخل شرح الإجابة" {...register('explanation')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">الصعوبة</label>
          <Select defaultValue="easy" onValueChange={(value) => setValue('difficulty', value as QuestionFormData['difficulty'])}>
            <SelectTrigger>
              <SelectValue placeholder="سهل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">سهل</SelectItem>
              <SelectItem value="medium">متوسط</SelectItem>
              <SelectItem value="hard">صعب</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">النقاط</label>
          <Select defaultValue="200" onValueChange={(value) => setValue('points', value as QuestionFormData['points'])}>
            <SelectTrigger>
              <SelectValue placeholder="200" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="400">400</SelectItem>
              <SelectItem value="600">600</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">نوع السؤال</label>
        <Select defaultValue="text" onValueChange={(value) => setValue('type', value as QuestionFormData['type'])}>
          <SelectTrigger>
            <SelectValue placeholder="نص" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">نص</SelectItem>
            <SelectItem value="image">صورة</SelectItem>
            <SelectItem value="audio">صوت</SelectItem>
            <SelectItem value="video">فيديو</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">الحالة</label>
          <Select defaultValue="draft" onValueChange={(value) => setValue('status', value as QuestionFormData['status'])}>
            <SelectTrigger>
              <SelectValue placeholder="مسودة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="approved">موافق عليه</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">المصدر</label>
          <Select defaultValue="manual" onValueChange={(value) => setValue('source', value as QuestionFormData['source'])}>
            <SelectTrigger>
              <SelectValue placeholder="يدوي" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">يدوي</SelectItem>
              <SelectItem value="ai">ذكاء اصطناعي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="rounded" {...register('isFreeGameQuestion')} />
        سؤال مخصص للعبة المجانية
      </label>

      {questionType !== 'text' && (
        <div>
          <label className="block text-sm font-medium mb-2">رابط الوسيط</label>
          <Input placeholder="أدخل رابط الصورة/الصوت/الفيديو" {...register('mediaUrl')} />
        </div>
      )}

      <Button type="submit" disabled={createQuestion.isPending}>
        {createQuestion.isPending ? 'جاري الإنشاء...' : 'إنشاء سؤال'}
      </Button>
    </form>
  );
}
