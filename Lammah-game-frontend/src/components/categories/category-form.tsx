'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateCategory } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const categorySchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  slug: z.string().min(1, 'المعرّف مطلوب'),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  onSuccess?: () => void;
}

export function CategoryForm({ onSuccess }: CategoryFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      isActive: true,
    },
  });

  const createCategory = useCreateCategory();

  const onSubmit = async (data: CategoryFormData) => {
    try {
      await createCategory.mutateAsync(data);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">الاسم</label>
        <Input
          placeholder="أدخل اسم الفئة"
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">المعرّف</label>
        <Input
          placeholder="sports"
          {...register('slug')}
        />
        {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">الوصف</label>
        <Textarea
          placeholder="أدخل وصف الفئة (اختياري)"
          {...register('description')}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="rounded" {...register('isActive')} />
        نشطة
      </label>

      <Button type="submit" disabled={createCategory.isPending}>
        {createCategory.isPending ? 'جاري الإنشاء...' : 'إنشاء فئة'}
      </Button>
    </form>
  );
}
