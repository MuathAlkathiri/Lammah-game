"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCategories } from "@/features/categories";
import {
  useGenerateReviewedQuestions,
  useSaveReviewedDrafts,
} from "../hooks/use-ai-generation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewedQuestionDraft } from "../types/ai-generation.types";
import { getEntityId } from "@/lib/utils";
import { getMediaUrl } from "@/lib/api/media-url";

export function AIGenerator() {
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategories();
  const generateQuestions = useGenerateReviewedQuestions();
  const saveDrafts = useSaveReviewedDrafts();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [generatedQuestions, setGeneratedQuestions] = useState<
    ReviewedQuestionDraft[]
  >([]);
  const categories = categoriesData || [];
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const generationBackendMessage =
    generateQuestions.error?.response?.data.message;
  const generationErrorMessage = generateQuestions.error
    ? generateQuestions.error.code === "ECONNABORTED"
      ? "انتهت مهلة التوليد. تأكد من تشغيل LM Studio وتحميل النموذج، أو جرّب عددًا أقل."
      : Array.isArray(generationBackendMessage)
        ? generationBackendMessage.join("، ")
        : generationBackendMessage ||
          "تعذر توليد الأسئلة. تأكد من توفر مزود الذكاء الاصطناعي ثم حاول مجددًا."
    : null;
  const saveBackendMessage = saveDrafts.error?.response?.data.message;
  const saveErrorMessage = saveDrafts.error
    ? Array.isArray(saveBackendMessage)
      ? saveBackendMessage.join("، ")
      : saveBackendMessage || "تعذر حفظ المسودات. حاول مجددًا."
    : null;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (generatedQuestions.length > saved.size) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [generatedQuestions.length, saved.size]);

  const handleGenerate = async () => {
    if (!selectedCategory) return;

    try {
      const result = await generateQuestions.mutateAsync({
        categoryId: selectedCategory,
        count: 2,
      });
      setGeneratedQuestions(result.data.questions || []);
      setSelected(
        new Set((result.data.questions || []).map((_, index) => index)),
      );
      setSaved(new Set());
    } catch (error) {
      console.error("Failed to generate reviewed questions:", error);
    }
  };

  const handleSave = async (indices: number[]) => {
    const unsaved = indices.filter((index) => !saved.has(index));
    if (!selectedCategory || !unsaved.length) return;
    const result = await saveDrafts.mutateAsync({
      drafts: unsaved.map((index) => generatedQuestions[index]),
      categoryId: selectedCategory,
    });
    const failed = new Set(
      (result.failures || []).map(
        (failure: { index: number }) => unsaved[failure.index],
      ),
    );
    setSaved(
      new Set([...saved, ...unsaved.filter((index) => !failed.has(index))]),
    );
  };

  const renderAsset = (question: ReviewedQuestionDraft) => {
    if (question.assetStatus === "NOT_REQUIRED") {
      return null;
    }

    if (question.assetStatus === "PENDING") {
      return (
        <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/10 p-4 text-sm">
          جاري تجهيز الملف...
        </div>
      );
    }

    if (question.assetStatus === "FAILED") {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">فشل تجهيز الملف</p>
          {question.assetFailureStep && (
            <p className="mt-1">الخطوة: {question.assetFailureStep}</p>
          )}
          <p className="mt-1 break-words">
            {question.assetFailureReason || "لم يتم إرجاع سبب الفشل."}
          </p>
          {question.assetFailureDiagnostics && (
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-background/60 p-2 text-xs text-foreground">
              {JSON.stringify(question.assetFailureDiagnostics, null, 2)}
            </pre>
          )}
        </div>
      );
    }

    if (!question.asset?.url) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          الملف جاهز حسب الحالة، لكن رابط الملف غير موجود.
        </div>
      );
    }

    const assetUrl = getMediaUrl(question.asset.url);

    if (question.type === "audio") {
      return (
        <audio controls className="w-full">
          <source src={assetUrl} />
        </audio>
      );
    }

    if (question.type === "image") {
      return (
        <Image
          src={assetUrl}
          alt="Question asset"
          width={960}
          height={540}
          unoptimized
          className="max-h-72 w-full rounded-2xl object-contain"
        />
      );
    }

    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm">
        الملف جاهز:{" "}
        <a className="underline" href={assetUrl} target="_blank">
          فتح الملف
        </a>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-white/[0.06] to-destructive/10">
        <CardHeader>
          <CardTitle className="text-3xl font-black">
            مصنع الأسئلة الذكي
          </CardTitle>
          <CardDescription>
            قم بتحديد فئة وسيقوم الذكاء الاصطناعي بإنشاء مسودات قابلة للمراجعة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">اختر فئة</label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              disabled={categoriesLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    categoriesLoading ? "جاري تحميل الفئات..." : "اختر فئة"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem
                    key={getEntityId(category)}
                    value={getEntityId(category)}
                  >
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
            {generateQuestions.isPending ? "جاري التوليد..." : "توليد أسئلة"}
          </Button>

          {generationErrorMessage && (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {generationErrorMessage}
            </p>
          )}

          {saveErrorMessage && (
            <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {saveErrorMessage}
            </p>
          )}

          {generatedQuestions.length > 0 && (
            <div className="mt-4 rounded-3xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm text-muted-foreground">
                تم توليد {generatedQuestions.length} مسودات. لم يتم حفظها في
                قاعدة البيانات بعد.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    handleSave(generatedQuestions.map((_, index) => index))
                  }
                  disabled={
                    saveDrafts.isPending ||
                    saved.size === generatedQuestions.length
                  }
                >
                  حفظ كل المسودات
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleSave([...selected])}
                  disabled={saveDrafts.isPending}
                >
                  حفظ المحدد
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setGeneratedQuestions([]);
                    setSelected(new Set());
                    setSaved(new Set());
                  }}
                >
                  تجاهل غير المحفوظ
                </Button>
                {saved.size > 0 && (
                  <Button asChild variant="outline">
                    <Link href="/admin/ai-generated">عرض الأسئلة المحفوظة</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {generatedQuestions.length > 0 && (
        <div>
          <h2 className="mb-4 text-3xl font-black">المسودات المُولدة</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {generatedQuestions.map((question, index) => (
              <Card
                key={index}
                data-testid={`ai-draft-${index}`}
                className="overflow-hidden"
              >
                {question.coverImageStatus === "READY" &&
                question.coverImage?.url ? (
                  <Image
                    src={getMediaUrl(question.coverImage.url)}
                    alt="صورة غلاف السؤال"
                    width={960}
                    height={384}
                    unoptimized
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-muted text-sm text-muted-foreground">
                    تعذر تجهيز صورة الغلاف
                  </div>
                )}
                <CardHeader>
                  <label className="mb-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(index)}
                      disabled={saved.has(index)}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          event.target.checked
                            ? next.add(index)
                            : next.delete(index);
                          return next;
                        })
                      }
                    />{" "}
                    {saved.has(index) ? "تم الحفظ" : "تحديد للحفظ"}
                  </label>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <CardTitle className="text-xl font-black leading-snug">
                        {question.question}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        الإجابة:{" "}
                        <span className="font-semibold">
                          {question.correctAnswer}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{question.gameMode}</Badge>
                        <Badge variant="secondary">{question.type}</Badge>
                        <Badge
                          data-testid="primary-asset-status"
                          variant={
                            question.assetStatus === "FAILED"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          Primary{" "}
                          {question.primaryAssetStatus ?? question.assetStatus}
                        </Badge>
                        <Badge
                          data-testid="cover-asset-status"
                          variant={
                            question.coverImageStatus === "FAILED"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          Cover {question.coverImageStatus}
                        </Badge>
                        {question.assetFailureStep && (
                          <Badge variant="destructive">
                            {question.assetFailureStep}
                          </Badge>
                        )}
                        {question.wasGameplayAutoFixed && (
                          <Badge variant="secondary">
                            تم تعديل النوع تلقائيًا
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">مسودة</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {renderAsset(question)}
                  {question.coverImageFailureReason && (
                    <p className="text-xs text-muted-foreground">
                      سبب فشل الغلاف: {question.coverImageFailureReason}
                    </p>
                  )}
                  {question.assetRequest && (
                    <pre className="overflow-auto rounded-2xl bg-black/20 p-3 text-xs text-muted-foreground">
                      {JSON.stringify(question.assetRequest, null, 2)}
                    </pre>
                  )}
                  {question.gameplayFixReason && (
                    <div className="rounded-2xl bg-primary/10 p-3 text-sm text-muted-foreground">
                      {question.gameplayFixReason}
                    </div>
                  )}
                  {question.explanation && (
                    <p className="text-sm text-muted-foreground">
                      الشرح: {question.explanation}
                    </p>
                  )}
                  {question.issues.length > 0 && (
                    <div className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
                      {question.issues.join("، ")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
