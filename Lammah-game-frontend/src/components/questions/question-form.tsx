"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateQuestion,
  useCategories,
  useUploadMusicTrack,
} from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage, getEntityId } from "@/lib/utils";

const questionSchema = z
  .object({
    categoryId: z.string().optional(),
    question: z.string().optional(),
    answer: z.string().optional(),
    explanation: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    points: z.enum(["200", "400", "600"]),
    type: z.enum(["text", "image", "audio", "video"]),
    mediaUrl: z.string().optional(),
    status: z.enum(["draft", "approved", "rejected"]),
    source: z.enum(["manual", "ai"]),
    isFreeGameQuestion: z.boolean(),
    musicTitle: z.string().optional(),
    musicArtist: z.string().optional(),
    musicAlbum: z.string().optional(),
    musicLanguage: z.enum(["ar", "en", "other"]).optional(),
    musicGenre: z.string().optional(),
    snippetDurationSeconds: z.string().optional(),
    snippetStartSecond: z.string().optional(),
  })
  .superRefine((data, context) => {
    if (data.type === "audio") {
      if (!data.musicTitle?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["musicTitle"],
          message: "اسم الأغنية مطلوب",
        });
      }

      if (!data.musicArtist?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["musicArtist"],
          message: "اسم الفنان مطلوب",
        });
      }

      return;
    }

    if (!data.categoryId?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryId"],
        message: "الفئة مطلوبة",
      });
    }

    if (!data.question?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["question"],
        message: "السؤال مطلوب",
      });
    }

    if (!data.answer?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answer"],
        message: "الإجابة مطلوبة",
      });
    }
  });

type QuestionFormData = z.infer<typeof questionSchema>;

interface QuestionFormProps {
  onSuccess?: () => void;
}

export function QuestionForm({ onSuccess }: QuestionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      type: "text",
      difficulty: "easy",
      points: "200",
      status: "draft",
      source: "manual",
      isFreeGameQuestion: false,
      musicLanguage: "ar",
      snippetDurationSeconds: "15",
    },
  });

  const { data: categoriesData } = useCategories();
  const createQuestion = useCreateQuestion();
  const uploadMusicTrack = useUploadMusicTrack();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const questionType = watch("type");
  const categories = categoriesData || [];
  const isAudioQuestion = questionType === "audio";

  useEffect(() => {
    if (!audioFile) {
      setAudioPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(audioFile);
    setAudioPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [audioFile]);

  const onSubmit = async (data: QuestionFormData) => {
    setFormMessage(null);

    try {
      if (data.type === "audio") {
        if (!audioFile) {
          setFormMessage({
            type: "error",
            text: "اختر ملف صوتي أولاً.",
          });
          return;
        }

        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("title", data.musicTitle?.trim() ?? "");
        formData.append("artist", data.musicArtist?.trim() ?? "");

        if (data.musicAlbum?.trim()) {
          formData.append("album", data.musicAlbum.trim());
        }

        if (data.musicLanguage) {
          formData.append("language", data.musicLanguage);
        }

        if (data.musicGenre?.trim()) {
          formData.append("genre", data.musicGenre.trim());
        }

        formData.append("difficulty", data.difficulty);
        formData.append(
          "snippetDurationSeconds",
          data.snippetDurationSeconds || "15",
        );

        if (data.snippetStartSecond?.trim()) {
          formData.append("snippetStartSecond", data.snippetStartSecond.trim());
        }

        await uploadMusicTrack.mutateAsync(formData);
        showToast({
          type: "success",
          message: "تم رفع الملف وإنشاء سؤال الأغنية بنجاح.",
        });
        setFormMessage({
          type: "success",
          text: "تم رفع الملف وإنشاء سؤال الأغنية بنجاح.",
        });
        onSuccess?.();
        return;
      }

      const {
        categoryId,
        musicTitle,
        musicArtist,
        musicAlbum,
        musicLanguage,
        musicGenre,
        snippetDurationSeconds,
        snippetStartSecond,
        ...questionData
      } = data;
      const submitData = {
        ...questionData,
        category: categoryId,
        points: parseInt(data.points),
      };
      await createQuestion.mutateAsync(submitData);
      showToast({ type: "success", message: "تم إنشاء السؤال بنجاح." });
      setFormMessage({ type: "success", text: "تم إنشاء السؤال بنجاح." });
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create question:", error);
      setFormMessage({
        type: "error",
        text: getApiErrorMessage(error, "تعذر إنشاء السؤال. حاول مرة أخرى."),
      });
      showToast({
        type: "error",
        message: getApiErrorMessage(error, "تعذر إنشاء السؤال. حاول مرة أخرى."),
      });
    }
  };

  const isSubmitting = createQuestion.isPending || uploadMusicTrack.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">نوع السؤال</label>
            <Select
              defaultValue="text"
              onValueChange={(value) =>
                setValue("type", value as QuestionFormData["type"], {
                  shouldValidate: true,
                })
              }
            >
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

          <div>
            <label className="block text-sm font-medium mb-2">الصعوبة</label>
            <Select
              defaultValue="easy"
              onValueChange={(value) =>
                setValue("difficulty", value as QuestionFormData["difficulty"])
              }
            >
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
        </div>

        {!isAudioQuestion ? (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">الفئة</label>
              <Select
                onValueChange={(value) =>
                  setValue("categoryId", value, { shouldValidate: true })
                }
              >
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
              {errors.categoryId && (
                <p className="text-sm text-destructive">
                  {errors.categoryId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">السؤال</label>
              <Textarea placeholder="أدخل السؤال" {...register("question")} />
              {errors.question && (
                <p className="text-sm text-destructive">
                  {errors.question.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">الإجابة</label>
              <Textarea placeholder="أدخل الإجابة" {...register("answer")} />
              {errors.answer && (
                <p className="text-sm text-destructive">
                  {errors.answer.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                الشرح (اختياري)
              </label>
              <Textarea
                placeholder="أدخل شرح الإجابة"
                {...register("explanation")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">النقاط</label>
                <Select
                  defaultValue="200"
                  onValueChange={(value) =>
                    setValue("points", value as QuestionFormData["points"])
                  }
                >
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

              <div>
                <label className="block text-sm font-medium mb-2">الحالة</label>
                <Select
                  defaultValue="draft"
                  onValueChange={(value) =>
                    setValue("status", value as QuestionFormData["status"])
                  }
                >
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">المصدر</label>
              <Select
                defaultValue="manual"
                onValueChange={(value) =>
                  setValue("source", value as QuestionFormData["source"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="يدوي" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">يدوي</SelectItem>
                  <SelectItem value="ai">ذكاء اصطناعي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                {...register("isFreeGameQuestion")}
              />
              سؤال مخصص للعبة المجانية
            </label>

            {questionType !== "text" && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  رابط الوسيط
                </label>
                <Input
                  placeholder="أدخل رابط الصورة/الصوت/الفيديو"
                  {...register("mediaUrl")}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                ملف الأغنية
              </label>
              <Input
                type="file"
                accept="audio/*"
                onChange={(event) =>
                  setAudioFile(event.target.files?.[0] ?? null)
                }
              />
              {!audioFile && (
                <p className="mt-2 text-xs text-muted-foreground">
                  ارفع ملف mp3 أو wav أو m4a. سيقوم النظام بقص مقطع تلقائياً.
                </p>
              )}
            </div>

            {audioPreviewUrl && (
              <audio controls className="w-full">
                <source src={audioPreviewUrl} />
              </audio>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  اسم الأغنية
                </label>
                <Input
                  placeholder="مثال: الأماكن"
                  {...register("musicTitle")}
                />
                {errors.musicTitle && (
                  <p className="text-sm text-destructive">
                    {errors.musicTitle.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الفنان</label>
                <Input
                  placeholder="مثال: محمد عبده"
                  {...register("musicArtist")}
                />
                {errors.musicArtist && (
                  <p className="text-sm text-destructive">
                    {errors.musicArtist.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  الألبوم (اختياري)
                </label>
                <Input placeholder="اسم الألبوم" {...register("musicAlbum")} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">اللغة</label>
                <Select
                  defaultValue="ar"
                  onValueChange={(value) =>
                    setValue(
                      "musicLanguage",
                      value as QuestionFormData["musicLanguage"],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اللغة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">عربي</SelectItem>
                    <SelectItem value="en">إنجليزي</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">النوع</label>
              <Input
                placeholder="مثال: خليجي، بوب"
                {...register("musicGenre")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  مدة المقطع بالثواني
                </label>
                <Input
                  type="number"
                  min={10}
                  max={20}
                  defaultValue={15}
                  {...register("snippetDurationSeconds")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  بداية المقطع (اختياري)
                </label>
                <Input
                  type="number"
                  min={0}
                  placeholder="اتركه فارغاً للاختيار التلقائي"
                  {...register("snippetStartSecond")}
                />
              </div>
            </div>
          </>
        )}

        {formMessage && (
          <div
            className={
              formMessage.type === "success"
                ? "rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm"
                : "rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            }
          >
            {formMessage.text}
          </div>
        )}
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isAudioQuestion
              ? "جاري رفع الملف..."
              : "جاري الإنشاء..."
            : isAudioQuestion
              ? "رفع وإنشاء سؤال"
              : "إنشاء سؤال"}
        </Button>
      </div>
    </form>
  );
}
