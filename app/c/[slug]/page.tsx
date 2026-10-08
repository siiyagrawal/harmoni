import { Suspense } from "react";
import PublicCard from "../../components/harmoni/public-card";

async function PublicCardRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicCard slug={slug} />;
}

export default function PublicCardPage({ params }: PageProps<"/c/[slug]">) {
  return (
    <Suspense fallback={<main className="app in"><p className="c">Loading card…</p></main>}>
      <PublicCardRoute params={params} />
    </Suspense>
  );
}
