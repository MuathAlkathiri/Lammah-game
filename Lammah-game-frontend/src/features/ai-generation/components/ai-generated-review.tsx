"use client";

import { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useDeleteQuestion,
  usePatchQuestion,
  useUpdateQuestionStatus,
} from "@/features/questions";
import {
  useAiBulkAction,
  useAiGenerated,
  useRetryQuestionAsset,
} from "../hooks/use-ai-generation";
import { getMediaUrl } from "@/lib/api/media-url";
import { getEntityId } from "@/lib/utils";
import { Question } from "@/types";

export function AiGeneratedReview() {
  const [filters, setFilters] = useState<Record<string, string>>({
    status: "draft",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data = [], isLoading } = useAiGenerated(filters);
  const statusMutation = useUpdateQuestionStatus();
  const patch = usePatchQuestion();
  const remove = useDeleteQuestion();
  const retry = useRetryQuestionAsset();
  const bulk = useAiBulkAction();
  const setFilter = (key: string, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const runBulk = (action: "approve" | "reject" | "delete") => {
    if (
      !selected.size ||
      (action === "delete" && !confirm("حذف الأسئلة المحددة نهائيًا؟"))
    )
      return;
    bulk.mutate(
      { ids: [...selected], action },
      { onSuccess: () => setSelected(new Set()) },
    );
  };
  const edit = (question: Question) => {
    const text = prompt("نص السؤال", question.question);
    if (!text) return;
    const answer = prompt(
      "الإجابة الصحيحة",
      question.correctAnswer || question.answer,
    );
    if (!answer) return;
    const wrongAnswers = prompt(
      "الإجابات الخاطئة، مفصولة بفاصلة",
      (question.wrongAnswers || []).join(", "),
    )
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const explanation =
      prompt("الشرح", question.explanation || "") ?? question.explanation;
    const difficulty = prompt(
      "الصعوبة: easy / medium / hard",
      question.difficulty,
    ) as Question["difficulty"] | null;
    const points = Number(
      prompt("النقاط: 200 / 400 / 600", String(question.points)),
    );
    const gameMode = prompt("Game mode", question.gameMode || "trivia") as
      Question["gameMode"] | null;
    patch.mutate({
      id: getEntityId(question),
      data: {
        question: text,
        answer,
        correctAnswer: answer,
        wrongAnswers,
        explanation,
        ...(difficulty ? { difficulty } : {}),
        ...([200, 400, 600].includes(points) ? { points, score: points } : {}),
        ...(gameMode ? { gameMode } : {}),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">
          الأسئلة المولدة بالذكاء الاصطناعي
        </h1>
        <p className="text-muted-foreground">
          مراجعة المسودات المحفوظة قبل النشر.
        </p>
      </div>
      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-4">
          <input
            className="rounded-xl bg-background p-3"
            placeholder="بحث"
            onChange={(e) => setFilter("search", e.target.value)}
          />
          {[
            ["status", "draft,approved,rejected,published,archived"],
            ["difficulty", "easy,medium,hard"],
            [
              "gameMode",
              "trivia,identifyCharacter,identifyVoice,identifyImage,completeQuote,timeline,emojiPuzzle",
            ],
            ["assetStatus", "READY,FAILED,NOT_REQUIRED"],
          ].map(([key, values]) => (
            <select
              key={key}
              className="rounded-xl bg-background p-3"
              value={filters[key] || ""}
              onChange={(e) => setFilter(key, e.target.value)}
            >
              <option value="">{key}</option>
              {values.split(",").map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          ))}
          <input
            className="rounded-xl bg-background p-3"
            placeholder="Category ID"
            onChange={(e) => setFilter("category", e.target.value)}
          />
          <input
            className="rounded-xl bg-background p-3"
            placeholder="Catalog ID"
            onChange={(e) => setFilter("catalog", e.target.value)}
          />
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => runBulk("approve")}>اعتماد المحدد</Button>
        <Button variant="secondary" onClick={() => runBulk("reject")}>
          رفض المحدد
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            data
              .filter((question) => selected.has(getEntityId(question)))
              .forEach((question) => {
                const id = getEntityId(question);
                if (question.assetStatus === "FAILED")
                  retry.mutate({ id, target: "primary" });
                if (question.coverImageStatus === "FAILED")
                  retry.mutate({ id, target: "cover" });
              })
          }
        >
          إعادة الملفات الفاشلة
        </Button>
        <Button variant="destructive" onClick={() => runBulk("delete")}>
          حذف المحدد
        </Button>
      </div>
      {isLoading ? (
        <p>جاري التحميل...</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.map((question) => {
            const id = getEntityId(question);
            const cover = question.coverImage?.url;
            const primary = question.primaryAsset?.url || question.mediaUrl;
            return (
              <Card key={id} className="overflow-hidden">
                {cover ? (
                  <Image
                    src={getMediaUrl(cover)}
                    alt="غلاف السؤال"
                    width={960}
                    height={352}
                    unoptimized
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-muted text-muted-foreground">
                    لا توجد صورة غلاف
                  </div>
                )}
                <CardHeader>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(id)}
                      onChange={(e) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          e.target.checked ? next.add(id) : next.delete(id);
                          return next;
                        })
                      }
                    />{" "}
                    تحديد
                  </label>
                  <CardTitle>{question.question}</CardTitle>
                  <p>الإجابة: {question.correctAnswer || question.answer}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{question.status}</Badge>
                    <Badge variant="outline">{question.difficulty}</Badge>
                    <Badge variant="outline">{question.gameMode}</Badge>
                    <Badge variant="outline">
                      Primary {question.assetStatus}
                    </Badge>
                    <Badge variant="outline">
                      Cover {question.coverImageStatus}
                    </Badge>
                    <Badge variant="secondary">
                      Quality {question.qualityScore ?? "-"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {primary &&
                    (question.type === "audio" ? (
                      <audio
                        controls
                        className="w-full"
                        src={getMediaUrl(primary)}
                      />
                    ) : (
                      <Image
                        src={getMediaUrl(primary)}
                        alt="الملف الأساسي"
                        width={960}
                        height={540}
                        unoptimized
                        className="max-h-64 w-full object-contain"
                      />
                    ))}
                  {question.issues?.length ? (
                    <p className="text-sm text-destructive">
                      {question.issues.join("، ")}
                    </p>
                  ) : null}
                  {question.assetFailureReason && (
                    <p className="text-sm text-destructive">
                      {question.assetFailureReason}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => edit(question)}
                    >
                      عرض / تعديل
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        statusMutation.mutate({ id, status: "approved" })
                      }
                    >
                      اعتماد
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        statusMutation.mutate({ id, status: "rejected" })
                      }
                    >
                      رفض
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retry.mutate({ id, target: "primary" })}
                    >
                      إعادة الملف الأساسي
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retry.mutate({ id, target: "cover" })}
                    >
                      إعادة الغلاف
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        confirm("حذف السؤال؟") && remove.mutate(id)
                      }
                    >
                      حذف
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
