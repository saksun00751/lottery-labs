'use client';

import {
  ArrowDownToLine,
  Check,
  CreditCard,
  Gift,
  Info,
  Landmark,
  Receipt,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { BankAccountCard, DepositAccountCard } from '@/components/finance/BankAccountCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Money } from '@/components/ui/Money';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import { isExpiredStatus, isPaidLikeStatus, type DepositPaymentSession } from '@/lib/api/endpoints';
import {
  useBankAccounts,
  useClaimPromotion,
  useCreateDepositPayment,
  useDepositAccounts,
  useDepositPaymentProviders,
  useDepositPaymentStatus,
  useDeselectPromotion,
  useExpireDepositPayment,
  useMe,
  usePromotions,
  useWallet,
} from '@/lib/api/queries';
import { cn } from '@/lib/utils/cn';
import { formatAmountInput, formatMoney, parseAmountInput, toMajor } from '@/lib/utils/money';
import { pushToast } from '@/lib/toast';
import type {
  BankAccount,
  DepositChannel,
  DepositMethod,
  Promotion,
  User,
  Wallet as WalletType,
} from '@/types';

import styles from '../finance.module.scss';

const METHOD_ORDER: DepositMethod[] = ['bank', 'payment', 'tw', 'slip'];

const METHOD_ICON: Record<DepositMethod, typeof Landmark> = {
  bank: Landmark,
  payment: CreditCard,
  tw: Smartphone,
  slip: Receipt,
};

const METHOD_LABEL_KEY: Record<DepositMethod, string> = {
  bank: 'chBank',
  payment: 'chPayment',
  tw: 'chTw',
  slip: 'chSlip',
};

const METHOD_DESC_KEY: Record<DepositMethod, string> = {
  bank: 'chBankDesc',
  payment: 'chPaymentDesc',
  tw: 'chTwDesc',
  slip: 'chSlipDesc',
};

export function DepositView() {
  const t = useTranslations('deposit');
  const tWallet = useTranslations('wallet');

  const { data: walletData, isLoading: walletLoading } = useWallet();
  const { data: accounts } = useBankAccounts();
  const { data: meData } = useMe();
  const { data: promotionsData, isLoading: promotionsLoading } = usePromotions();

  const wallet = walletData as WalletType | undefined;
  const bankAccounts = (accounts as BankAccount[] | undefined) ?? [];
  const user = meData as User | undefined;
  const promotions = ((promotionsData as Promotion[] | undefined) ?? []).filter((p) => p.title);

  const activePromotion = user?.activePromotionName
    ? promotions.find((p) => p.title === user.activePromotionName)
    : undefined;
  const browsablePromotions = promotions.filter((p) => p.title !== user?.activePromotionName);

  const [method, setMethod] = useState<DepositMethod>('bank');
  const [openPromotion, setOpenPromotion] = useState<Promotion | null>(null);

  return (
    <div className={styles.page}>
      <PageHeader
        icon={<ArrowDownToLine size={22} />}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <div className={cn(styles.layout, styles.singleColumn)}>
        <div className={styles.column}>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>
              <Wallet size={15} aria-hidden />
              {tWallet('balance')}
            </span>
            {walletLoading ? (
              <Skeleton width={180} height={38} />
            ) : (
              <Money value={wallet?.balance ?? 0} size="xl" tone="accent" suffix="THB" />
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden>
                <Landmark size={18} />
              </span>
              {tWallet('myBankAccount')}
            </h2>
            <div className={styles.channelList}>
              {bankAccounts.map((account) => (
                <BankAccountCard
                  key={account.id}
                  bankName={account.bankName}
                  accountNumber={account.accountNumber}
                  accountName={account.accountName}
                  isPrimary={account.isPrimary}
                />
              ))}
            </div>
          </div>

          {(promotionsLoading || browsablePromotions.length > 0 || activePromotion) && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span className={styles.cardIcon} aria-hidden>
                  <Gift size={18} />
                </span>
                {t('promoSectionTitle')}
              </h2>

              {activePromotion && <ActivePromotionCard promotion={activePromotion} />}

              {promotionsLoading ? (
                <Skeleton height={140} radius={16} />
              ) : browsablePromotions.length > 0 ? (
                <div className={styles.promoScroll}>
                  {browsablePromotions.map((promo) => (
                    <PromoMiniCard
                      key={promo.id}
                      promotion={promo}
                      onOpen={() => setOpenPromotion(promo)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardIcon} aria-hidden>
                <Landmark size={18} />
              </span>
              {t('selectMethod')}
            </h2>

            <div className={styles.channelGrid}>
              {METHOD_ORDER.map((m) => {
                const Icon = METHOD_ICON[m];
                const active = m === method;
                return (
                  <button
                    key={m}
                    type="button"
                    className={cn(styles.channelTile, active && styles.channelTileActive)}
                    onClick={() => setMethod(m)}
                  >
                    <span className={styles.channelIcon} aria-hidden>
                      <Icon size={18} />
                    </span>
                    <span className={styles.channelTileText}>
                      <span className={styles.channelTileTitle}>{t(METHOD_LABEL_KEY[m])}</span>
                      <span className={styles.channelTileDesc}>{t(METHOD_DESC_KEY[m])}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 'var(--sp-4)' }}>
              {method === 'payment' ? (
                <PaymentMethodPanel />
              ) : (
                <AccountMethodPanel method={method} />
              )}
            </div>
          </div>
        </div>
      </div>

      <PromotionDetailModal promotion={openPromotion} onClose={() => setOpenPromotion(null)} />
    </div>
  );
}

/* ---------------------------- promo mini card ------------------------------ */

function PromoMiniCard({ promotion, onOpen }: { promotion: Promotion; onOpen: () => void }) {
  return (
    <button type="button" className={styles.promoMini} onClick={onOpen}>
      <div className={styles.promoMiniImage}>
        {promotion.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={promotion.imageUrl} alt="" />
        ) : (
          <Gift size={22} aria-hidden />
        )}
        {promotion.badge && <span className={styles.promoMiniBadge}>{promotion.badge}</span>}
      </div>
      <div className={styles.promoMiniTitle}>{promotion.title}</div>
    </button>
  );
}

/* --------------------------- promo detail modal ----------------------------- */

function PromotionDetailModal({
  promotion,
  onClose,
}: {
  promotion: Promotion | null;
  onClose: () => void;
}) {
  const t = useTranslations('promotion');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const claim = useClaimPromotion();

  return (
    <Modal
      open={!!promotion}
      onClose={onClose}
      title={promotion?.title ?? ''}
      closeLabel={tCommon('close')}
    >
      {promotion && (
        <>
          {promotion.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={promotion.imageUrl} alt="" className={styles.promoModalImage} />
          )}
          <p className={styles.promoModalDesc}>{promotion.description}</p>

          <div className={styles.promoModalMeta}>
            {promotion.minDeposit > 0 && (
              <Badge tone="neutral">
                {t('minDeposit', {
                  amount: formatMoney(promotion.minDeposit, { locale, compactDecimals: true }),
                })}
              </Badge>
            )}
            {promotion.turnoverMultiplier > 1 && (
              <Badge tone="accent">{t('turnover', { multiplier: promotion.turnoverMultiplier })}</Badge>
            )}
          </div>

          <Button
            block
            variant={promotion.claimed ? 'secondary' : 'primary'}
            disabled={promotion.claimed || !promotion.claimable}
            loading={claim.isPending}
            leftIcon={promotion.claimed ? <Check size={17} /> : <Gift size={17} />}
            onClick={() => {
              claim.mutate(promotion.id, {
                onSuccess: () => {
                  pushToast({ tone: 'success', title: t('claimSuccess') });
                  onClose();
                },
                onError: (error) =>
                  pushToast({
                    tone: 'danger',
                    title: error instanceof ApiError ? error.message : t('claim'),
                  }),
              });
            }}
          >
            {promotion.claimed ? t('claimed') : t('claim')}
          </Button>
        </>
      )}
    </Modal>
  );
}

/* ------------------------- active promotion summary ------------------------ */

function ActivePromotionCard({ promotion }: { promotion: Promotion }) {
  const t = useTranslations('deposit');
  const tCommon = useTranslations('common');
  const deselect = useDeselectPromotion();

  return (
    <div className={styles.summaryRow} style={{ marginBottom: 'var(--sp-3)' }}>
      <div>
        <div className={styles.summaryLabel}>{t('activePromoTitle')}</div>
        <div className={styles.summaryValue}>{promotion.title}</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<X size={14} />}
        loading={deselect.isPending}
        onClick={() => {
          deselect.mutate(undefined, {
            onSuccess: () => pushToast({ tone: 'success', title: t('cancelPromoSuccess') }),
            onError: (error) =>
              pushToast({
                tone: 'danger',
                title: error instanceof ApiError ? error.message : tCommon('error'),
              }),
          });
        }}
      >
        {deselect.isPending ? t('cancellingPromo') : t('cancelPromo')}
      </Button>
    </div>
  );
}

/* ------------------------- bank / tw / slip method ------------------------- */

function AccountMethodPanel({ method }: { method: Exclude<DepositMethod, 'payment'> }) {
  const t = useTranslations('deposit');
  const locale = useLocale();
  const { data, isLoading } = useDepositAccounts(method);
  const accounts = (data as DepositChannel[] | undefined) ?? [];
  const minAmount = accounts[0]?.minAmount ?? 10_000;

  if (isLoading) return <Skeleton height={140} radius={14} />;
  if (accounts.length === 0) return <EmptyState title={t('noAccounts')} />;

  return (
    <>
      <div className={styles.channelList}>
        {accounts.map((account) => (
          <DepositAccountCard
            key={account.id}
            bankName={account.bankName}
            accountNumber={account.accountNumber}
            accountName={account.accountName}
            bankLogoUrl={account.bankLogoUrl}
            qrImageUrl={account.qrImageUrl}
            minAmount={account.minAmount}
            remark={account.remark}
          />
        ))}
      </div>

      <div className={styles.noteCard} style={{ marginTop: 'var(--sp-4)' }}>
        <div className={styles.noteHead}>
          <span className={styles.noteIcon} aria-hidden>
            <Info size={14} />
          </span>
          <span className={styles.noteTitle}>{t('notesTitle')}</span>
        </div>
        <div className={styles.noteList}>
          <div className={styles.noteItem}>
            {t('noteAmount', {
              amount: formatMoney(minAmount, { locale, compactDecimals: true }),
            })}
          </div>
          <div className={styles.noteItem}>
            {method === 'slip' ? t('slipNote') : t('autoCreditNote')}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------ payment method ----------------------------- */

function formatCountdown(totalSec: number): string {
  const sec = Math.max(0, totalSec);
  const hh = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  const p2 = (n: number) => String(n).padStart(2, '0');
  return hh > 0 ? `${p2(hh)}:${p2(mm)}:${p2(ss)}` : `${p2(mm)}:${p2(ss)}`;
}

function PaymentMethodPanel() {
  const t = useTranslations('deposit');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const { data, isLoading } = useDepositPaymentProviders();
  const providers = data?.providers ?? [];
  const paymentUrls = data?.paymentUrls ?? {};

  const [providerId, setProviderId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [session, setSession] = useState<{ providerId: string; requestId: string } | null>(null);
  const [initialSession, setInitialSession] = useState<DepositPaymentSession | null>(null);
  const [expiredFired, setExpiredFired] = useState(false);
  const [statusModal, setStatusModal] = useState<'success' | 'expired' | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const createPayment = useCreateDepositPayment();
  const expirePayment = useExpireDepositPayment();
  const { data: statusData } = useDepositPaymentStatus(
    session?.providerId ?? null,
    session?.requestId ?? null,
  );

  const provider = providers.find((p) => p.id === providerId) ?? providers[0];
  const amount = parseAmountInput(amountText);
  // `deposit/status` only ever carries `status` (no qrcode/amount/expiry) —
  // keep the QR/amount/expiry fixed from `initialSession` and let polling
  // update only the live status, or it'd blank the QR out on the first poll.
  const display = initialSession;
  const liveStatus = statusData?.status ?? initialSession?.status;
  const countdownSec = display?.expiresAtMs
    ? Math.max(0, Math.floor((display.expiresAtMs - now) / 1000))
    : null;

  function closeSession() {
    setSession(null);
    setInitialSession(null);
    setExpiredFired(false);
    setStatusModal(null);
  }

  // Tick the countdown once a second while a session is open.
  useEffect(() => {
    if (!session || statusModal) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session, statusModal]);

  // Auto-expire the QR once its countdown hits zero, same as lotto-seed-app.
  useEffect(() => {
    if (!session || statusModal || expiredFired) return;
    if (countdownSec === null || countdownSec > 0) return;
    setExpiredFired(true);
    expirePayment.mutate({ providerId: session.providerId, requestId: session.requestId });
  }, [session, statusModal, expiredFired, countdownSec, expirePayment]);

  // Surface a settled status (paid or expired) as a modal, then head home.
  useEffect(() => {
    if (!session || !liveStatus || statusModal) return;
    if (isPaidLikeStatus(liveStatus)) setStatusModal('success');
    else if (isExpiredStatus(liveStatus)) setStatusModal('expired');
  }, [session, liveStatus, statusModal]);

  useEffect(() => {
    if (!statusModal) return;
    const timer = setTimeout(() => router.push('/'), 2200);
    return () => clearTimeout(timer);
  }, [statusModal, router]);

  if (isLoading) return <Skeleton height={140} radius={14} />;
  if (providers.length === 0) return <EmptyState title={t('noProviders')} />;

  if (session) {
    return (
      <>
        <div className={styles.detailList}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('paymentStatusLabel')}</span>
            <span className={styles.detailValue}>{liveStatus ?? '…'}</span>
          </div>
          {display?.qrImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={display.qrImageUrl} alt={t('scanQr')} className={styles.paymentQr} />
          )}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('amountLabel')}</span>
            <span className={styles.detailValue}>
              {formatMoney(display?.amount ?? 0, { locale, compactDecimals: true })}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('expiresAtLabel')}</span>
            <span className={cn(styles.detailValue, countdownSec === 0 && styles.detailHighlight)}>
              {countdownSec === null
                ? t('noExpire')
                : countdownSec > 0
                  ? t('expiresIn', { time: formatCountdown(countdownSec) })
                  : t('expired')}
            </span>
          </div>
          {display?.requestId && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('requestIdLabel')}</span>
              <span className={styles.detailValue}>{display.requestId}</span>
            </div>
          )}
        </div>
        <Button
          variant="secondary"
          block
          style={{ marginTop: 'var(--sp-3)' }}
          loading={expirePayment.isPending}
          disabled={!!statusModal}
          onClick={() => {
            expirePayment.mutate(
              { providerId: session.providerId, requestId: session.requestId },
              { onSuccess: closeSession },
            );
          }}
        >
          {t('cancelPayment')}
        </Button>

        <Modal
          open={!!statusModal}
          onClose={closeSession}
          title={statusModal === 'success' ? t('depositSuccessTitle') : t('paymentExpiredTitle')}
          description={
            statusModal === 'success' ? t('depositSuccessMessage') : t('paymentExpiredMessage')
          }
          closeLabel={tCommon('close')}
          footer={
            <Button block onClick={() => router.push('/')}>
              {t('goHome')}
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div className={styles.fieldGroup}>
      <div className={styles.subLabel}>{t('selectProvider')}</div>
      <div className={styles.channelGrid}>
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn(styles.channelTile, provider?.id === p.id && styles.channelTileActive)}
            onClick={() => setProviderId(p.id)}
          >
            <span className={styles.channelTileText}>
              <span className={styles.channelTileTitle}>{p.name}</span>
            </span>
          </button>
        ))}
      </div>

      <Input
        amount
        value={amountText}
        onChange={(event) => setAmountText(formatAmountInput(event.target.value))}
        placeholder={t('amountPlaceholder')}
        inputMode="decimal"
        hint={
          provider
            ? t('minAmount', {
                amount: formatMoney(provider.minAmount, { locale, compactDecimals: true }),
              })
            : undefined
        }
      />

      <Button
        size="lg"
        block
        loading={createPayment.isPending}
        disabled={!provider || amount < (provider?.minAmount ?? 0)}
        onClick={() => {
          if (!provider) return;
          createPayment.mutate(
            {
              providerId: provider.id,
              paymentUrl: paymentUrls[provider.id] ?? '',
              amountMajor: toMajor(amount),
            },
            {
              onSuccess: (result) => {
                setSession({ providerId: provider.id, requestId: result.requestId });
                setInitialSession(result);
                setExpiredFired(false);
                setNow(Date.now());
                pushToast({ tone: 'success', title: t('paymentCreated') });
              },
              onError: (error) =>
                pushToast({
                  tone: 'danger',
                  title: error instanceof ApiError ? error.message : tCommon('error'),
                }),
            },
          );
        }}
      >
        {t('payNow')}
      </Button>
    </div>
  );
}
