'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateCatalog, useUpdateCatalog } from '@/lib/hooks';
import { getEntityId } from '@/lib/utils';
import { Catalog } from '@/types';

const catalogSchema = z.object({
  name: z.string().min(1, 'اسم الكتالوج مطلوب'),
  isActive: z.boolean(),
});

type CatalogFormData = z.infer<typeof catalogSchema>;

interface CatalogFormProps {
  catalog?: Catalog;
  onSuccess?: () => void;
}

export function CatalogForm({ catalog, onSuccess }: CatalogFormProps) {
  const catalogId = catalog ? getEntityId(catalog) : '';
  const createCatalog = useCreateCatalog();
  const updateCatalog = useUpdateCatalog(catalogId);
  const isPending = createCatalog.isPending || updateCatalog.isPending;
  const { register, handleSubmit, formState: { errors } } = useForm<CatalogFormData>({
    resolver: zodResolver(catalogSchema),
    defaultValues: {
      name: catalog?.name.ar ?? '',
      isActive: catalog?.isActive ?? true,
    },
  });

  const onSubmit = async (data: CatalogFormData) => {
    const catalogName = data.name.trim();
    const payload = {
      name: {
        ar: catalogName,
        en: catalogName,
      },
      isActive: data.isActive,
    };

    if (catalogId) {
      await updateCatalog.mutateAsync(payload);
    } else {
      await createCatalog.mutateAsync(payload);
    }

    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">اسم الكتالوج</label>
        <Input placeholder="مثال: رياضة" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="rounded" {...register('isActive')} />
        نشط
      </label>

      <Button type="submit" disabled={isPending}>
        {isPending
          ? 'جاري الحفظ...'
          : catalogId
            ? 'حفظ الكتالوج'
            : 'إنشاء كتالوج'}
      </Button>
    </form>
  );
}
