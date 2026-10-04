import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-canvas px-margin">
      <div className="text-center">
        <p className="text-label-sm text-on-surface-variant uppercase">Lex Condominial</p>
        <h1 className="mt-sm text-headline-lg text-on-surface">Cobrança condominial</h1>
        <p className="mt-sm text-body-md text-on-surface-variant">Em construção.</p>
        <Link
          href="/design-site"
          className="mt-lg inline-block text-label-lg text-primary-container underline-offset-4 hover:underline"
        >
          Ver design system
        </Link>
      </div>
    </main>
  );
}
