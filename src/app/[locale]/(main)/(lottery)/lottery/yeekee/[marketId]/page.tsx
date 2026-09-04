import { setRequestLocale } from 'next-intl/server';

import { YeekeeMarketView } from './YeekeeMarketView';

export default async function YeekeeMarketPage({
  params,
}: {
  params: Promise<{ locale: string; marketId: string }>;
}) {
  const { locale, marketId } = await params;
  setRequestLocale(locale);

  return <YeekeeMarketView marketId={marketId} />;
}
