import { setRequestLocale } from 'next-intl/server';

import { YeekeeResultView } from './YeekeeResultView';

export default async function YeekeeResultPage({
  params,
}: {
  params: Promise<{ locale: string; marketId: string; roundId: string }>;
}) {
  const { locale, roundId } = await params;
  setRequestLocale(locale);

  return <YeekeeResultView roundId={roundId} />;
}
