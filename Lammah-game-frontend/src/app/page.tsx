import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="space-y-12">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-primary/15 via-white/[0.06] to-destructive/10 p-8 text-center shadow-2xl shadow-black/30 md:p-14">
        <div className="floaty mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[2rem] bg-primary text-5xl shadow-2xl shadow-primary/25">
          🍉
        </div>
        <h1 className="text-5xl font-black leading-tight md:text-7xl">لمّة الأسئلة</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground md:text-2xl">
          جو حفلة، تحدي فرق، ولوحة أسئلة تلمع مثل ألعاب المسابقات التلفزيونية.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/games/new">
            <Button size="lg">ابدأ لعبة جديدة</Button>
          </Link>
          <Link href="/games">
            <Button size="lg" variant="outline">ألعابي</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/categories">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-black">الفئات</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">إدارة فئات الأسئلة</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/questions">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-black">الأسئلة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">عرض وإضافة الأسئلة</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/games">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-black">الألعاب</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">إنشاء لعبة جديدة</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/ai-generator">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-black">AI</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">توليد أسئلة تلقائية</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-black">لعب مع الفريق</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              انضم إلى لعبة تفاعلية مع فريقك واستمتع بتجربة ألعاب مثيرة.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>أسئلة متنوعة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              اختر من بين فئات متعددة وأسئلة متنوعة بمستويات صعوبة مختلفة.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الذكاء الاصطناعي</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              استخدم مولد الأسئلة الذكي لإنشاء أسئلة جديدة تلقائيًا.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
