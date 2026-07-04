'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useCreateGame, useCategories } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getEntityId } from '@/lib/utils';

const gameSchema = z.object({
  name: z.string().min(1, 'اسم اللعبة مطلوب'),
  teamAName: z.string().min(1, 'اسم الفريق أ مطلوب'),
  teamAMembers: z.string().min(1, 'أعضاء الفريق أ مطلوبون'),
  teamBName: z.string().min(1, 'اسم الفريق ب مطلوب'),
  teamBMembers: z.string().min(1, 'أعضاء الفريق ب مطلوبون'),
  categoryIds: z.array(z.string()).length(6, 'يجب اختيار 6 تصنيفات بالضبط'),
});

type GameFormData = z.infer<typeof gameSchema>;

export function GameForm() {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<GameFormData>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      categoryIds: [],
    },
  });

  const router = useRouter();
  const { data: categoriesData } = useCategories();
  const createGame = useCreateGame();
  const selectedCategories = watch('categoryIds') || [];
  const categories = categoriesData || [];
  const [submitError, setSubmitError] = useState('');

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setValue('categoryIds', selectedCategories.filter(id => id !== categoryId), { shouldValidate: true });
    } else {
      setValue('categoryIds', [...selectedCategories, categoryId], { shouldValidate: true });
    }
  };

  const onSubmit = async (data: GameFormData) => {
    setSubmitError('');
    try {
      const gameData = {
        name: data.name,
        teams: [
          {
            name: data.teamAName,
            members: data.teamAMembers.split(',').map(m => m.trim()).filter(Boolean),
          },
          {
            name: data.teamBName,
            members: data.teamBMembers.split(',').map(m => m.trim()).filter(Boolean),
          },
        ],
        categoryIds: data.categoryIds,
      };

      const game = await createGame.mutateAsync(gameData);
      router.push(`/games/${getEntityId(game)}`);
    } catch (error) {
      const backendMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error
        : null;
      setSubmitError(
        backendMessage ||
          'تعذر إنشاء اللعبة. إذا كنت استخدمت لعبتك المجانية، تحتاج اشتراك عشان تنشئ لعبة جديدة.'
      );
      console.error('Failed to create game:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">اسم اللعبة</label>
        <Input placeholder="أدخل اسم اللعبة" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">اسم الفريق أ</label>
          <Input placeholder="مثال: الفريق الأحمر" {...register('teamAName')} />
          {errors.teamAName && <p className="text-sm text-destructive">{errors.teamAName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">اسم الفريق ب</label>
          <Input placeholder="مثال: الفريق الأزرق" {...register('teamBName')} />
          {errors.teamBName && <p className="text-sm text-destructive">{errors.teamBName.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">أعضاء الفريق أ (مفصول بفواصل)</label>
          <Textarea placeholder="أحمد، سارة، محمد" {...register('teamAMembers')} />
          {errors.teamAMembers && <p className="text-sm text-destructive">{errors.teamAMembers.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">أعضاء الفريق ب (مفصول بفواصل)</label>
          <Textarea placeholder="علي، فاطمة، خديجة" {...register('teamBMembers')} />
          {errors.teamBMembers && <p className="text-sm text-destructive">{errors.teamBMembers.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">الفئات</label>
        <p className="text-sm text-muted-foreground mb-3">
          اخترت {selectedCategories.length} من 6 تصنيفات
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {categories.map((category) => (
            <label key={getEntityId(category)} className="cursor-pointer">
              {(() => {
                const categoryId = getEntityId(category);
                const selected = !!categoryId && selectedCategories.includes(categoryId);

                return (
                  <div className={`rounded-3xl border p-4 transition-all ${
                    selected
                      ? 'border-primary bg-primary/15 text-primary watermelon-glow'
                      : 'border-white/10 bg-white/[0.06] hover:border-primary/50 hover:bg-white/[0.09]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => categoryId && handleCategoryToggle(categoryId)}
                      className="sr-only"
                    />
                    <span className="text-base font-black">{category.name}</span>
                  </div>
                );
              })()}
            </label>
          ))}
        </div>
        {errors.categoryIds && <p className="text-sm text-destructive">{errors.categoryIds.message}</p>}
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <Button type="submit" disabled={createGame.isPending || selectedCategories.length !== 6}>
        {createGame.isPending ? 'جاري الإنشاء...' : 'إنشاء لعبة'}
      </Button>
    </form>
  );
}
