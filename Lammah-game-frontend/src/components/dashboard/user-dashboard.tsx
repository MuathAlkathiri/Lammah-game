"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FolderOpen,
  Gamepad2,
  Info,
  Play,
  Search,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { useCatalogs } from "@/features/catalogs";
import { useCategories } from "@/features/categories";
import { useGames } from "@/features/games";
import { getMediaUrl } from "@/lib/api/media-url";
import { formatDate, getEntityId } from "@/lib/utils";
import {
  groupCategoriesByCatalog,
  CatalogCategoryGroup,
} from "@/lib/categories/catalog-groups";
import { Category, Game } from "@/types";

type UserActionCardProps = {
  title: string;
  description: string;
  href: string;
  icon: typeof Gamepad2;
};

function WatermelonOutline({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute opacity-[0.055] ${className}`}
      aria-hidden="true"
    >
      <div className="h-28 w-40 rounded-b-full border border-white/70 border-t-0" />
      <div className="absolute left-7 top-7 h-1.5 w-1.5 rounded-full bg-white/70" />
      <div className="absolute left-16 top-12 h-1.5 w-1.5 rounded-full bg-white/70" />
      <div className="absolute left-28 top-8 h-1.5 w-1.5 rounded-full bg-white/70" />
    </div>
  );
}

function UserActionCard({
  title,
  description,
  href,
  icon: Icon,
}: UserActionCardProps) {
  return (
    <Link
      href={href}
      className="group min-h-48 rounded-[1.35rem] border border-white/[0.09] bg-[#22173f]/78 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.16)] transition duration-300 hover:-translate-y-1 hover:border-white/[0.16] hover:bg-[#281a49]"
    >
      <div className="flex h-full flex-col items-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full border border-white/[0.08] bg-[#22C55E]/12 text-[#22C55E] transition group-hover:bg-[#22C55E]/16">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-5 text-xl font-black leading-tight">{title}</h3>
        <p className="mt-2 max-w-48 text-sm leading-6 text-zinc-400">
          {description}
        </p>
        <ArrowLeft
          className="mt-auto h-5 w-5 self-start text-zinc-300 transition group-hover:-translate-x-1 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

function getGameProgress(game: Game, index: number) {
  if (game.status === "finished") return 100;
  if (game.status === "in_progress") return 55 + ((index * 13) % 30);
  return 24 + ((index * 11) % 22);
}

function GameCover({ game, index }: { game: Game; index: number }) {
  const styles = [
    "from-emerald-400/80 via-green-600/70 to-[#1f6f4f]",
    "from-sky-400/75 via-indigo-500/60 to-[#26194f]",
    "from-violet-400/70 via-fuchsia-500/45 to-[#26163e]",
  ];

  return (
    <div
      className={`relative h-28 w-full overflow-hidden rounded-2xl bg-gradient-to-br ${styles[index % styles.length]} sm:h-32 sm:w-32`}
    >
      <div className="absolute inset-x-4 bottom-4 h-10 rounded-[50%] bg-black/16 blur-sm" />
      <div className="absolute bottom-5 right-5 h-12 w-16 rotate-[-18deg] rounded-xl border border-white/35 bg-white/12" />
      <div className="absolute bottom-7 right-10 h-12 w-16 rotate-[10deg] rounded-xl border border-white/45 bg-white/18" />
      <div className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/16 text-white">
        <Gamepad2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <span className="sr-only">{game.name}</span>
    </div>
  );
}

function ContinuePlayingCard({ game, index }: { game: Game; index: number }) {
  const progress = getGameProgress(game, index);

  return (
    <div className="grid gap-5 rounded-[1.35rem] border border-white/[0.09] bg-[#21173d]/82 p-5 shadow-[0_16px_44px_rgba(0,0,0,0.18)] sm:grid-cols-[8rem_1fr] sm:items-center">
      <GameCover game={game} index={index} />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black">{game.name}</h3>
            <p className="mt-1 text-sm text-zinc-400">
              لعبت آخر مرة {formatDate(game.updatedAt || game.createdAt)}
            </p>
          </div>
          <span className="rounded-full border border-[#22C55E]/15 bg-[#22C55E]/10 px-3 py-1 text-xs font-black text-[#22C55E]">
            تحدي
          </span>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-[#22C55E]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-10 text-left text-sm font-bold text-zinc-300">
            {progress}%
          </span>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-4 min-w-44 border-[#22C55E]/35 text-[#22C55E] hover:bg-[#22C55E]/10"
        >
          <Link href={`/games/${getEntityId(game)}`}>
            <Play className="ml-2 h-4 w-4" aria-hidden="true" />
            أكمل اللعب
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CategoryTile({
  category,
  selected,
  disabled,
  onToggle,
}: {
  category: Category;
  selected: boolean;
  disabled: boolean;
  onToggle: (categoryId: string) => void;
}) {
  const bannerUrl = getMediaUrl(category.banner?.url);
  const categoryId = getEntityId(category);

  return (
    <button
      type="button"
      disabled={disabled && !selected}
      onClick={() => onToggle(categoryId)}
      className={`group relative aspect-square min-w-36 overflow-hidden rounded-[1.35rem] border bg-[#22173f]/80 text-right shadow-[0_12px_32px_rgba(0,0,0,0.16)] transition duration-300 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-55 ${
        selected
          ? "border-[#22C55E] ring-2 ring-[#22C55E]/40"
          : "border-white/[0.09] hover:border-[#22C55E]/45"
      }`}
    >
      {bannerUrl ? (
        <>
          <Image
            src={bannerUrl}
            alt={category.name}
            fill
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/5" />
        </>
      ) : (
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(34,197,94,0.14),transparent_9rem),linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
      )}
      {selected && (
        <span className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-[#22C55E] text-[#111827] shadow-lg">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 z-10 p-4">
        <span className="block text-base font-black leading-tight text-white drop-shadow">
          {category.name}
        </span>
        {category.description && (
          <span className="mt-1 line-clamp-2 hidden text-xs leading-5 text-zinc-300 sm:block">
            {category.description}
          </span>
        )}
      </span>
    </button>
  );
}

function CategoryGroupSection({
  group,
  selectedCategoryIds,
  onToggleCategory,
}: {
  group: CatalogCategoryGroup;
  selectedCategoryIds: string[];
  onToggleCategory: (categoryId: string) => void;
}) {
  const selectionFull = selectedCategoryIds.length >= 6;

  return (
    <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-1.5 text-sm font-black text-[#22C55E]">
            {group.title}
          </span>
          <span className="text-xs font-bold text-zinc-500">
            {group.categories.length} فئة
          </span>
        </div>
      </div>
      {group.description && (
        <p className="mb-4 max-w-2xl text-sm leading-6 text-zinc-400">
          {group.description}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {group.categories.map((category) => (
          <CategoryTile
            key={getEntityId(category)}
            category={category}
            selected={selectedCategoryIds.includes(getEntityId(category))}
            disabled={selectionFull}
            onToggle={onToggleCategory}
          />
        ))}
      </div>
    </div>
  );
}

export function UserDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { data: games } = useGames();
  const { data: categories } = useCategories();
  const { data: catalogs } = useCatalogs();
  const userName = user?.fullName?.split(" ")[0] || "لاعب";
  const continueGames = (games || []).slice(0, 2);
  const categoryGroups = groupCategoriesByCatalog(
    categories || [],
    catalogs || [],
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const selectedCategories = useMemo(
    () =>
      selectedCategoryIds
        .map((categoryId) =>
          (categories || []).find(
            (category) => getEntityId(category) === categoryId,
          ),
        )
        .filter((category): category is Category => Boolean(category)),
    [categories, selectedCategoryIds],
  );
  const newGameHref = isAuthenticated ? "/#categories" : "/login";
  const gamesHref = isAuthenticated ? "/games" : "/login";
  const canStartGame = selectedCategoryIds.length === 6;

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((currentIds) => {
      if (currentIds.includes(categoryId)) {
        return currentIds.filter((id) => id !== categoryId);
      }

      if (currentIds.length >= 6) {
        return currentIds;
      }

      return [...currentIds, categoryId];
    });
  };

  const handleStartGame = () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!canStartGame) return;

    router.push(`/games/new?categories=${selectedCategoryIds.join(",")}`);
  };

  return (
    <div className="relative -mx-4 -mt-4 overflow-hidden bg-[#1a1333] px-4 pb-36 pt-2 text-white sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(36,20,71,0.88)_0%,rgba(26,19,51,0.98)_52%,#17112d_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.055),transparent_34rem)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.28)_1px,transparent_0)] [background-size:28px_28px]" />
      <WatermelonOutline className="-right-10 top-20 rotate-[-24deg]" />
      <WatermelonOutline className="left-2 top-56 rotate-[26deg]" />
      <WatermelonOutline className="left-12 top-[32rem] hidden rotate-[-8deg] lg:block" />
      <WatermelonOutline className="right-12 top-[37rem] hidden rotate-[15deg] lg:block" />

      <div className="relative mx-auto max-w-7xl space-y-9">
        <section className="rounded-[1.75rem] border border-white/[0.09] bg-[#241447]/58 px-6 py-14 text-center shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl md:px-12 md:py-16">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.06] text-2xl shadow-[0_12px_36px_rgba(0,0,0,0.18)]">
            🍉
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            أهلًا {userName} 👋
          </h1>
          <p className="mt-3 text-xl font-bold text-zinc-300 md:text-2xl">
            جاهز لتحدي جديد؟
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
            اختر لعبتك المفضلة وابدأ التحدي مع أصدقائك.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="min-w-56 rounded-2xl bg-[#22C55E] text-[#111827] shadow-none hover:bg-[#22C55E]/90"
            >
              <Link href={newGameHref}>
                <Gamepad2 className="ml-2 h-5 w-5" aria-hidden="true" />
                ابدأ لعبة جديدة
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-w-52 rounded-2xl border-white/[0.16] bg-transparent shadow-none hover:bg-white/[0.06]"
            >
              <Link href={gamesHref}>
                <FolderOpen className="ml-2 h-5 w-5" aria-hidden="true" />
                ألعابي
              </Link>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {[
              { label: "سريعة وممتعة", icon: Zap },
              { label: "مناسبة للجلسات", icon: Users },
              { label: "بدون إنترنت", icon: WifiOff },
            ].map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.055] px-4 py-2 text-sm font-medium text-zinc-300"
              >
                <Icon
                  className="h-4 w-4 text-[#22C55E]/90"
                  aria-hidden="true"
                />
                {label}
              </span>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">اختصارات سريعة</h2>
            <Zap className="h-5 w-5 text-[#22C55E]" aria-hidden="true" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <UserActionCard
              title="ابدأ لعبة جديدة"
              description="اختر لعبة وأضف اللاعبين وابدأ التحدي."
              href={newGameHref}
              icon={Gamepad2}
            />
            <UserActionCard
              title="ألعابي"
              description="تابع الألعاب التي لعبتها وأكملها."
              href={gamesHref}
              icon={BookOpen}
            />
            <UserActionCard
              title="تصفح الألعاب"
              description="اكتشف ألعاب جديدة ومتنوعة."
              href={gamesHref}
              icon={Search}
            />
            <UserActionCard
              title="معلومات اللعبة"
              description="تعرف على قواعد اللعب وكيفية التحدي."
              href={gamesHref}
              icon={Info}
            />
          </div>
        </section>

        {!!categoryGroups.length && (
          <section id="categories" className="scroll-mt-28">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#22C55E]">
                  تصفح حسب الكتالوج
                </p>
                <h2 className="mt-1 text-3xl font-black">كل الفئات</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-zinc-400">
                اختر من الفئات المتاحة، مرتبة تحت كتالوجات تساعدك تلقى نوع
                التحدي المناسب.
              </p>
            </div>
            <div className="space-y-5">
              {categoryGroups.map((group) => (
                <CategoryGroupSection
                  key={group.id}
                  group={group}
                  selectedCategoryIds={selectedCategoryIds}
                  onToggleCategory={handleToggleCategory}
                />
              ))}
            </div>
          </section>
        )}

        {!!continueGames.length && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black">أكمل لعبك</h2>
              <Gamepad2 className="h-5 w-5 text-zinc-400" aria-hidden="true" />
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {continueGames.map((game, index) => (
                <ContinuePlayingCard
                  key={getEntityId(game)}
                  game={game}
                  index={index}
                />
              ))}
            </div>
          </section>
        )}
        <div id="account" className="sr-only" aria-label="حسابي" />
      </div>

      {!!categoryGroups.length && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#17112d]/92 px-4 py-3 shadow-[0_-20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-white">
                اخترت {selectedCategoryIds.length} من 6 فئات
              </p>
              <div className="mt-2 flex max-w-3xl flex-wrap gap-2">
                {selectedCategories.length ? (
                  selectedCategories.map((category) => (
                    <span
                      key={getEntityId(category)}
                      className="rounded-full border border-[#22C55E]/20 bg-[#22C55E]/10 px-3 py-1 text-xs font-bold text-[#22C55E]"
                    >
                      {category.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-400">
                    اختر الفئات من الكتالوجات بالأعلى.
                  </span>
                )}
              </div>
            </div>
            <Button
              type="button"
              size="lg"
              disabled={!canStartGame}
              onClick={handleStartGame}
              className="min-w-48 rounded-2xl bg-[#22C55E] text-[#111827] hover:bg-[#22C55E]/90"
            >
              ابدأ اللعبة
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
