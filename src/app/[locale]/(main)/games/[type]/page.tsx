import { setRequestLocale } from 'next-intl/server';

import { GameTypeView } from './GameTypeView';

export default async function GameTypePage({
  params,
}: {
  params: Promise<{ locale: string; type: string }>;
}) {
  const { locale, type } = await params;
  setRequestLocale(locale);

  return <GameTypeView type={type} />;
}
