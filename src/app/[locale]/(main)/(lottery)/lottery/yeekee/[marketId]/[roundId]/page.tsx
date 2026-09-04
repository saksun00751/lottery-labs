import { setRequestLocale } from 'next-intl/server';

import { YeekeeBetView } from './YeekeeBetView';

export default async function YeekeeBetPage({
  params,
}: {
  params: Promise<{ locale: string; marketId: string; roundId: string }>;
}) {
  const { locale, marketId, roundId } = await params;
  setRequestLocale(locale);

  return <YeekeeBetView marketId={marketId} roundId={roundId} />;
}
