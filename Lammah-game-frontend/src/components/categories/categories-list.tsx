"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCategories, useDeleteCategory } from "@/lib/hooks";
import { getEntityId } from "@/lib/utils";

export function CategoriesList() {
  const router = useRouter();
  const { data, isLoading, error } = useCategories();
  const categories = data || [];
  const deleteCategory = useDeleteCategory();

  if (isLoading) return <div className="text-center py-8">جاري التحميل...</div>;
  if (error)
    return <div className="text-center py-8 text-destructive">حدث خطأ</div>;
  if (!categories.length)
    return <div className="text-center py-8">لا توجد فئات</div>;

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const categoryId = getEntityId(category);

        return (
          <Card
            key={categoryId}
            role="button"
            tabIndex={0}
            className="overflow-hidden cursor-pointer transition hover:border-primary/60 hover:bg-white/[0.04]"
            onClick={() => router.push(`/categories/${categoryId}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/categories/${categoryId}`);
              }
            }}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl font-black">
                    {category.name}
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                  <p className="text-xs text-muted-foreground mt-2">
                    {category.slug}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={category.isActive ? "default" : "secondary"}>
                    {category.isActive ? "نشطة" : "غير نشطة"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteCategory.mutate(categoryId);
                    }}
                    disabled={deleteCategory.isPending}
                  >
                    حذف
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
