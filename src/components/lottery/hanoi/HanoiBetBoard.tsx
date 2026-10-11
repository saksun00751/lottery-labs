'use client';

import { AlertTriangle, Delete, Keyboard, Plus, ScrollText, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SelectedPackageCard } from '@/components/lottery/SelectedPackageCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Money } from '@/components/ui/Money';
import { useRouter } from '@/i18n/navigation';
import { ApiError, newIdempotencyKey } from '@/lib/api/client';
import { useHanoiQuote, useSubmitHanoiBet, useWallet } from '@/lib/api/queries';
import { pushToast } from '@/lib/toast';
import { cn } from '@/lib/utils/cn';
import {
  HANOI_CHANNELS,
  HANOI_MAX_SELECTIONS,
  betTypesFor,
  expandSelection,
  onlyDigits,
  positionCount,
  sourceLabel,
} from '@/lib/utils/hanoi';
import { toMinor } from '@/lib/utils/money';
import type {
  HanoiCapability,
  HanoiChannel,
  HanoiDigits,
  HanoiMethod,
  HanoiSelection,
  LotteryRound,
  Wallet,
} from '@/types';

import styles from './HanoiBetBoard.module.scss';

type FieldKey = 'number' | 'left' | 'right' | 'rangeStart' | 'rangeEnd';
type Fields = Record<FieldKey, string>;

const EMPTY_FIELDS: Fields = { number: '', left: '', right: '', rangeStart: '', rangeEnd: '' };
const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

/** The input boxes a method needs, with how many digits each takes. */
function fieldSpec(method: HanoiMethod, digits: HanoiDigits): Array<[FieldKey, number]> {
  switch (method) {
    case 'mix':
      return [['number', 3]];
    case 'cross':
      return [
        ['left', 2],
        ['right', 2],
      ];
    case 'range':
      return [
        ['rangeStart', digits],
        ['rangeEnd', digits],
      ];
    default:
      return [['number', digits]];
  }
}

interface SlipLine {
  id: number;
  sel: HanoiSelection;
}

export function HanoiBetBoard({
  round,
  capability,
  packageId,
}: {
  round: LotteryRound;
  capability: HanoiCapability;
  packageId: number;
}) {
  const t = useTranslations('lottery.hanoi');
  const tCommon = useTranslations('common');
  const tSlip = useTranslations('lottery.slip');
  const router = useRouter();

  const firstOpen = (digits: HanoiDigits): HanoiChannel =>
    HANOI_CHANNELS.find((c) => capability.channelsByDigits[digits][c]) ?? 'A';

  const [digits, setDigits] = useState<HanoiDigits>(capability.channelsByDigits[3].B ? 3 : 2);
  const [channel, setChannel] = useState<HanoiChannel>(
    capability.channelsByDigits[3].B ? 'B' : firstOpen(2),
  );
  const [method, setMethod] = useState<HanoiMethod>('straight');
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [active, setActive] = useState<FieldKey>('number');
  const [amountText, setAmountText] = useState('10');
  const [lines, setLines] = useState<SlipLine[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const nextId = useRef(1);
  // One id per business request: kept across retries, dropped once the items change.
  const requestRef = useRef<{ id: string; hash: string } | null>(null);

  const spec = fieldSpec(method, digits);
  const open = capability.channelsByDigits[digits];
  const methods = capability.methods[digits];
  const amount = Number(amountText);
  const amountOk = Number.isFinite(amount) && amount > 0;

  const resetFields = useCallback((nextMethod: HanoiMethod, nextDigits: HanoiDigits) => {
    setFields(EMPTY_FIELDS);
    setActive(fieldSpec(nextMethod, nextDigits)[0][0]);
  }, []);

  const pickDigits = (next: HanoiDigits) => {
    if (next === digits) return;
    setDigits(next);
    // A channel or method the new digit count doesn't offer falls back to the first that works.
    const nextChannel = capability.channelsByDigits[next][channel] ? channel : firstOpen(next);
    const nextMethod = capability.methods[next].includes(method) ? method : 'straight';
    setChannel(nextChannel);
    setMethod(nextMethod);
    resetFields(nextMethod, next);
  };

  const pickMethod = (next: HanoiMethod) => {
    setMethod(next);
    resetFields(next, digits);
  };

  const press = useCallback(
    (digit: string) => {
      const index = Math.max(0, spec.findIndex(([key]) => key === active));
      const [key, size] = spec[index];
      if (fields[key].length >= size) return;
      const value = fields[key] + digit;
      setFields({ ...fields, [key]: value });
      // Filling a box hands focus to the next one (cross left → right, range start → end).
      const next = spec[index + 1];
      if (value.length === size && next) setActive(next[0]);
    },
    [active, fields, spec],
  );

  const backspace = useCallback(() => {
    const index = spec.findIndex(([key]) => key === active);
    const key = spec[index < 0 ? 0 : index][0];
    if (fields[key]) {
      setFields((prev) => ({ ...prev, [key]: prev[key].slice(0, -1) }));
    } else if (index > 0) {
      setActive(spec[index - 1][0]);
    }
  }, [active, fields, spec]);

  const draft = useMemo(
    () =>
      expandSelection({
        channel,
        digits,
        method,
        number: fields.number,
        left: fields.left,
        right: fields.right,
        rangeStart: fields.rangeStart,
        rangeEnd: fields.rangeEnd,
      }),
    [channel, digits, method, fields],
  );

  const typed = Object.values(fields).some(Boolean);
  const canAdd =
    draft.ok && amountOk && open[channel] && lines.length < HANOI_MAX_SELECTIONS && !confirmOpen;

  const add = useCallback(() => {
    if (!draft.ok || !amountOk || !open[channel] || lines.length >= HANOI_MAX_SELECTIONS) return;
    const sel: HanoiSelection = {
      channel,
      digits,
      method,
      amount,
      ...(method === 'cross'
        ? { left: fields.left, right: fields.right }
        : method === 'range'
          ? { rangeStart: fields.rangeStart, rangeEnd: fields.rangeEnd }
          : { number: fields.number }),
    };
    setLines((prev) => [...prev, { id: nextId.current++, sel }]);
    resetFields(method, digits);
  }, [draft, amountOk, open, channel, lines.length, digits, method, amount, fields, resetFields]);

  // Desktop shortcut: type digits straight from the keyboard, Enter to add.
  useEffect(() => {
    if (confirmOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) {
        return;
      }
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        press(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        backspace();
      } else if (event.key === 'Enter' && canAdd) {
        // A focused button already handles Enter itself.
        if (target?.tagName === 'BUTTON') return;
        event.preventDefault();
        add();
      } else if (event.key === 'Tab' && spec.length > 1 && !event.shiftKey) {
        const index = spec.findIndex(([key]) => key === active);
        if (index >= 0 && index < spec.length - 1) {
          event.preventDefault();
          setActive(spec[index + 1][0]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmOpen, press, backspace, add, canAdd, spec, active]);

  /* ----------------------------- server price ----------------------------- */

  const selections = useMemo(() => lines.map((l) => l.sel), [lines]);
  const quote = useHanoiQuote(round.drawId, packageId, selections);
  const quoteError = quote.error instanceof ApiError ? quote.error : null;
  const quoteReady = !!quote.data && !quote.isFetching && !quote.isError;

  const { data: walletData } = useWallet();
  const wallet = walletData as Wallet | undefined;
  const totalNet = quote.data?.totalNet ?? 0;
  const insufficient = quoteReady && totalNet > (wallet?.balance ?? 0);

  const errorText = (error: unknown) => {
    if (error instanceof ApiError && t.has(`errors.${error.code}`)) return t(`errors.${error.code}`);
    if (error instanceof ApiError && error.message) return error.message;
    return tCommon('errorHint');
  };

  /* -------------------------------- submit -------------------------------- */

  const submit = useSubmitHanoiBet();

  const onConfirm = () => {
    if (!round.drawId || lines.length === 0) return;
    const hash = JSON.stringify([round.drawId, packageId, selections]);
    if (!requestRef.current || requestRef.current.hash !== hash) {
      requestRef.current = { id: newIdempotencyKey(), hash };
    }
    submit.mutate(
      {
        drawId: round.drawId,
        packageId,
        clientRequestId: requestRef.current.id,
        items: selections,
      },
      {
        onSuccess: (result) => {
          requestRef.current = null;
          setLines([]);
          setConfirmOpen(false);
          pushToast({
            tone: 'success',
            title: result.ticketId
              ? tSlip('submitted', { reference: result.ticketId })
              : t('submitted'),
          });
          router.push('/slip');
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) requestRef.current = null;
          // No answer from the server: the bet may have gone through, so keep the same
          // request id and tell the member to check before sending again.
          const unknown = !(error instanceof ApiError) || error.status >= 500;
          pushToast({
            tone: unknown ? 'warning' : 'danger',
            title: unknown ? t('unknownOutcome') : errorText(error),
            description: unknown ? t('unknownOutcomeHint') : undefined,
          });
        },
      },
    );
  };

  /* -------------------------------- render -------------------------------- */

  const problemText = !draft.ok && draft.problem !== 'incomplete' ? t(`problems.${draft.problem}`) : null;
  const draftEstimate = draft.ok && amountOk ? toMinor(draft.units * amount) : 0;
  const single = channel === 'ABCD' ? null : capability.limits[betTypesFor(channel, digits)[0]];
  const abcdClosed = !open.ABCD;
  const lineNet = (index: number, sel: HanoiSelection) => {
    const fromServer = quote.data && !quote.isFetching ? quote.data.selectionNet[index] : undefined;
    if (fromServer !== undefined) return fromServer;
    const e = expandSelection(sel);
    return e.ok ? toMinor(e.units * sel.amount) : 0;
  };

  const slipPanel = (
    <>
      {lines.length === 0 ? (
        <div className={styles.slipEmpty}>
          <ScrollText size={28} aria-hidden />
          <strong>{t('slip.empty')}</strong>
          <span>{t('slip.emptyHint')}</span>
        </div>
      ) : (
        <ul className={styles.lines}>
          {lines.map((line, index) => {
            const e = expandSelection(line.sel);
            return (
              <li key={line.id} className={styles.line}>
                <span className={styles.lineTag}>
                  {line.sel.channel}
                  {line.sel.digits}
                </span>
                <div className={styles.lineBody}>
                  <span className={styles.lineNumber}>{sourceLabel(line.sel)}</span>
                  <span className={styles.lineMeta}>
                    {t(`methods.${line.sel.method}`)}
                    {e.ok && ` · ${t('slip.units', { count: e.units })} × ${line.sel.amount}`}
                  </span>
                </div>
                <Money value={lineNet(index, line.sel)} size="sm" />
                <button
                  type="button"
                  className={styles.lineRemove}
                  aria-label={t('slip.remove')}
                  onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                >
                  <X size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {lines.length > 0 && (
        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>{t('totals.bet')}</span>
            {quote.data ? <Money value={quote.data.totalBet} size="md" /> : <span>…</span>}
          </div>
          {!!quote.data?.totalDiscount && (
            <div className={styles.totalRow}>
              <span>{t('totals.discount')}</span>
              <Money value={-quote.data.totalDiscount} size="md" tone="danger" />
            </div>
          )}
          <div className={cn(styles.totalRow, styles.totalStrong)}>
            <span>{t('totals.net')}</span>
            {quote.data ? <Money value={quote.data.totalNet} size="lg" tone="accent" /> : <span>…</span>}
          </div>
          {!!quote.data?.potentialWin && (
            <div className={styles.totalRow}>
              <span>{t('totals.potentialWin')}</span>
              <Money value={quote.data.potentialWin} size="sm" tone="success" />
            </div>
          )}
          {quote.isFetching && <div className={styles.quoteNote}>{t('totals.calculating')}</div>}
          {quoteError && (
            <div className={styles.alert} role="alert">
              <AlertTriangle size={16} aria-hidden />
              {errorText(quoteError)}
            </div>
          )}
          {insufficient && (
            <div className={styles.alert} role="alert">
              <AlertTriangle size={16} aria-hidden />
              {t('totals.insufficient')}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className={styles.layout}>
      <section className={styles.builder} aria-label={t('builderTitle')}>
        <div className={styles.block}>
          <div className={styles.blockHead}>
            <h2 className={styles.blockTitle}>{t('channel')}</h2>
            <span className={styles.blockHint}>{t('positions', { count: positionCount(channel, digits) })}</span>
          </div>
          <div className={styles.channels} role="group" aria-label={t('channel')}>
            {HANOI_CHANNELS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(styles.channel, channel === c && styles.on)}
                aria-pressed={channel === c}
                disabled={!open[c]}
                onClick={() => setChannel(c)}
              >
                <span className={styles.channelName}>{c}</span>
                <span className={styles.channelSub}>{t('positions', { count: positionCount(c, digits) })}</span>
              </button>
            ))}
          </div>
          {abcdClosed && <p className={styles.note}>{t('abcdClosed', { digits })}</p>}
        </div>

        <div className={styles.twoUp}>
          <div className={styles.block}>
            <h2 className={styles.blockTitle}>{t('digits')}</h2>
            <div className={styles.seg} role="group" aria-label={t('digits')}>
              {([2, 3] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={cn(styles.segBtn, digits === d && styles.on)}
                  aria-pressed={digits === d}
                  onClick={() => pickDigits(d)}
                >
                  {t('digitsValue', { count: d })}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.block}>
            <h2 className={styles.blockTitle}>{t('method')}</h2>
            <div className={styles.seg} role="group" aria-label={t('method')}>
              {methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn(styles.segBtn, method === m && styles.on)}
                  aria-pressed={method === m}
                  onClick={() => pickMethod(m)}
                >
                  {t(`methods.${m}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className={styles.methodHint}>{t(`methodHints.${method}`)}</p>

        <div className={styles.entry}>
          <div className={styles.entryLeft}>
            <div className={styles.fieldsRow}>
              {spec.map(([key, size]) => (
                <button
                  key={key}
                  type="button"
                  className={cn(styles.field, active === key && styles.fieldOn)}
                  onClick={() => setActive(key)}
                  aria-label={`${t(`fields.${key}`)} ${fields[key]}`}
                >
                  <span className={styles.fieldLabel}>
                    {method === 'mix' ? t('fields.mixNumber') : t(`fields.${key}`)}
                  </span>
                  <span className={styles.slots}>
                    {Array.from({ length: size }, (_, i) => (
                      <span
                        key={i}
                        className={cn(
                          styles.slot,
                          !fields[key][i] && styles.slotEmpty,
                          active === key && i === fields[key].length && styles.slotNext,
                        )}
                      >
                        {fields[key][i] ?? ''}
                      </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.amountRow}>
              <label className={styles.amountLabel} htmlFor="hanoi-amount">
                {t('perUnit')}
              </label>
              <div className={styles.quick}>
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={cn(styles.quickBtn, amount === a && styles.on)}
                    onClick={() => setAmountText(String(a))}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <input
                id="hanoi-amount"
                className={styles.amountInput}
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ''))}
                aria-invalid={!amountOk}
              />
            </div>
            {single && single.maxStake > 0 && (
              <p className={styles.note}>
                {t('limits')} <Money value={single.minStake} size="sm" compact /> –{' '}
                <Money value={single.maxStake} size="sm" compact />
              </p>
            )}

            <div className={styles.preview} aria-live="polite">
              {draft.ok ? (
                <>
                  <div className={styles.previewLine}>
                    {t('preview', { numbers: draft.numbers.length, positions: draft.positions, units: draft.units })}
                    {amountOk && <Money value={draftEstimate} size="md" tone="accent" />}
                  </div>
                  <div className={styles.chips}>
                    {draft.numbers.slice(0, 48).map((n) => (
                      <span key={n} className={styles.chip}>
                        {n}
                      </span>
                    ))}
                    {draft.numbers.length > 48 && (
                      <span className={styles.chip}>+{draft.numbers.length - 48}</span>
                    )}
                  </div>
                </>
              ) : (
                <p className={cn(styles.previewHint, problemText && styles.problem)}>
                  {problemText ?? (typed ? t('keepTyping') : t('previewEmpty'))}
                </p>
              )}
            </div>

            <Button size="lg" block disabled={!canAdd} onClick={add} leftIcon={<Plus size={18} />}>
              {t('add')}
            </Button>
            <p className={styles.kbd}>
              <Keyboard size={14} aria-hidden />
              {t('keyboardHint')}
            </p>
          </div>

          <div className={styles.pad} role="group" aria-label={t('keypad')}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} type="button" className={styles.padKey} onClick={() => press(d)}>
                {d}
              </button>
            ))}
            <button
              type="button"
              className={cn(styles.padKey, styles.padFn)}
              onClick={() => resetFields(method, digits)}
            >
              {t('clear')}
            </button>
            <button type="button" className={styles.padKey} onClick={() => press('0')}>
              0
            </button>
            <button
              type="button"
              className={cn(styles.padKey, styles.padFn)}
              onClick={backspace}
              aria-label={t('backspace')}
            >
              <Delete size={20} />
            </button>
          </div>
        </div>
      </section>

      <aside className={styles.slip}>
        <SelectedPackageCard groupId={round.groupId} />
        <div className={styles.slipCard}>
          <div className={styles.slipHead}>
            <span className={styles.slipTitle}>
              <ScrollText size={16} aria-hidden />
              {t('slip.title')}
            </span>
            <span className={styles.slipCount}>{t('slip.count', { count: lines.length })}</span>
          </div>
          <div className={styles.slipBody}>{slipPanel}</div>
          <div className={styles.slipFoot}>
            {wallet && (
              <div className={styles.balance}>
                <span>{t('totals.balance')}</span>
                <Money value={wallet.balance} size="sm" />
              </div>
            )}
            <Button
              size="lg"
              block
              disabled={lines.length === 0 || !quoteReady || insufficient}
              onClick={() => setConfirmOpen(true)}
              leftIcon={<ScrollText size={18} />}
            >
              {t('slip.confirm')}
            </Button>
            {lines.length > 0 && (
              <Button variant="ghost" block onClick={() => setLines([])} leftIcon={<Trash2 size={16} />}>
                {t('slip.clear')}
              </Button>
            )}
          </div>
        </div>
      </aside>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('confirmTitle')}
        description={t('confirmHint')}
        closeLabel={tCommon('close')}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button loading={submit.isPending} disabled={!quoteReady || insufficient} onClick={onConfirm}>
              {t('confirmButton')}
            </Button>
          </>
        }
      >
        <ul className={styles.lines}>
          {lines.map((line, index) => (
            <li key={line.id} className={styles.line}>
              <span className={styles.lineTag}>
                {line.sel.channel}
                {line.sel.digits}
              </span>
              <div className={styles.lineBody}>
                <span className={styles.lineNumber}>{sourceLabel(line.sel)}</span>
                <span className={styles.lineMeta}>{t(`methods.${line.sel.method}`)}</span>
              </div>
              <Money value={lineNet(index, line.sel)} size="sm" />
            </li>
          ))}
        </ul>
        <div className={styles.totals}>
          <div className={cn(styles.totalRow, styles.totalStrong)}>
            <span>{t('totals.net')}</span>
            <Money value={totalNet} size="lg" tone="accent" />
          </div>
        </div>
        <p className={styles.note}>{t('confirmRetryNote')}</p>
      </Modal>
    </div>
  );
}
