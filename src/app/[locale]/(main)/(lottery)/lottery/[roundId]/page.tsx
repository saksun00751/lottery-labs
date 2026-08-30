import { setRequestLocale } from 'next-intl/server';

import { BetView } from './BetView';

export default async function BetPage({
  params,
}: {
  params: Promise<{ locale: string; roundId: string }>;
}) {
  const { locale, roundId } = await params;
  setRequestLocale(locale);

  return <BetView roundId={roundId} />;
}
