import { expect, test } from "@playwright/test";
import { assertSafePage, login } from "./helpers";

const asset = {
  type: "image",
  url: "/uploads/test/ready.svg",
  provider: "e2e-fake",
  source: "fixture",
};

const reviewedResponse = {
  statusCode: 201,
  message: "Reviewed question drafts generated successfully",
  count: 2,
  meta: {},
  data: {
    questions: [
      {
        question: "من صاحب هذا الإنجاز في الاختبار؟",
        correctAnswer: "الإجابة الآمنة",
        wrongAnswers: ["خاطئة 1", "خاطئة 2", "خاطئة 3"],
        difficulty: "medium",
        gameMode: "identifyImage",
        type: "image",
        explanation: "شرح حتمي للاختبار",
        qualityScore: 9,
        issues: [],
        assetStatus: "READY",
        primaryAssetStatus: "READY",
        asset,
        primaryAsset: asset,
        coverImageStatus: "READY",
        coverImage: asset,
      },
      {
        question: "ما السؤال الذي يبقى صالحًا عند فشل الملف؟",
        correctAnswer: "المحتوى يبقى متاحًا",
        wrongAnswers: ["يختفي", "يتسرب المسار", "يتوقف النموذج"],
        difficulty: "hard",
        gameMode: "trivia",
        type: "text",
        explanation: "الفشل الجزئي لا يخفي السؤال",
        qualityScore: 8,
        issues: ["فشل ملف آمن"],
        assetStatus: "FAILED",
        primaryAssetStatus: "FAILED",
        assetFailureReason: "لم يعثر المزود التجريبي على نتيجة",
        assetFailureStep: "safe-e2e-resolution",
        coverImageStatus: "FAILED",
        coverImageFailureReason: "تعذر تجهيز الغلاف",
      },
    ],
  },
};

test.describe("@ai deterministic AI Generator presentation", () => {
  test.beforeEach(async ({ page }) => login(page, "admin"));

  test("renders two reviewed drafts with ready and failed asset states", async ({
    page,
  }) => {
    await page.route(
      "**/admin/ai-generator/generate-reviewed",
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(reviewedResponse),
        });
      },
    );
    await page.route("**/uploads/test/*.svg", (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#22c55e"/></svg>',
      }),
    );
    await page.goto("/admin/ai-generator");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "علوم" }).click();
    await page.getByRole("button", { name: "توليد أسئلة" }).click();
    await expect(
      page.getByRole("button", { name: "جاري التوليد..." }),
    ).toBeDisabled();
    await expect(page.getByTestId("ai-draft-0")).toBeVisible();
    await expect(page.getByTestId("ai-draft-1")).toBeVisible();
    await expect(
      page.getByTestId("ai-draft-0").getByTestId("primary-asset-status"),
    ).toContainText("READY");
    await expect(
      page.getByTestId("ai-draft-1").getByTestId("primary-asset-status"),
    ).toContainText("FAILED");
    await expect(
      page.getByText("لم يعثر المزود التجريبي على نتيجة"),
    ).toBeVisible();
    await assertSafePage(page);
  });

  test("shows safe timeout guidance and re-enables generation", async ({
    page,
  }) => {
    await page.route("**/admin/ai-generator/generate-reviewed", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 500,
          message: "انتهت مهلة التوليد. حاول مجددًا.",
        }),
      }),
    );
    await page.goto("/admin/ai-generator");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "علوم" }).click();
    await page.getByRole("button", { name: "توليد أسئلة" }).click();
    await expect(
      page.getByText("انتهت مهلة التوليد. حاول مجددًا."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "توليد أسئلة" }),
    ).toBeEnabled();
    await assertSafePage(page);
  });
});
