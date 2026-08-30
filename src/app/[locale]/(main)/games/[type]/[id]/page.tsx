import { setRequestLocale } from 'next-intl/server';

import { ProviderGamesView } from './ProviderGamesView';

export default async function ProviderGamesPage({
  params,
}: {
  params: Promise<{ locale: string; type: string; id: string }>;
}) {
  const { locale, type, id } = await params;
  setRequestLocale(locale);

  return <ProviderGamesView type={type} providerId={id} />;
}
