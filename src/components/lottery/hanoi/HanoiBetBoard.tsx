'use client';

import { AlertTriangle, Delete, Keyboard, ScrollText, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter as useAppRouter } from 'next/navigation';
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
  positionsLabel,
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
const QUICK_AMOUNTS = [1, 5, 10, 20, 50, 100];

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

/** Per-unit price of one slip line, editable in place; only a positive number reaches the slip. */
function SlipAmount({
  value,
  label,
  onCommit,
}: {
  value: number;
  label: string;
  onCommit: (next: number) => void;
}) {
  const [text, setText] = useState(String(value));
  return (
    <input
      className={styles.lineAmount}
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={text}
      onChange={(event) => {
        const next = event.target.value.replace(/[^\d.]/g, '');
        setText(next);
        const n = Number(next);
        if (Number.isFinite(n) && n > 0 && n !== value) onCommit(n);
      }}
      onBlur={() => setText(String(value))}
    />
  );
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

  const counts = capability.positions;

  const firstOpen = (digits: HanoiDigits): HanoiChannel =>
    HANOI_CHANNELS.find((c) => capability.channelsByDigits[digits][c]) ?? 'A';

  // Opens on A with 2 digits; falls back to whatever the draw actually accepts.
  const startDigits: HanoiDigits = HANOI_CHANNELS.some((c) => capability.channelsByDigits[2][c]) ? 2 : 3;
  const [digits, setDigits] = useState<HanoiDigits>(startDigits);
  const [channel, setChannel] = useState<HanoiChannel>(
    capability.channelsByDigits[startDigits].A ? 'A' : firstOpen(startDigits),
  );
  const [method, setMethod] = useState<HanoiMethod>('straight');
  // Which A-positions are ticked, per digit count. Starts with just the first (A1).
  const [pickedA, setPickedA] = useState<Record<HanoiDigits, number[]>>(() => ({
    2: counts.aLabels[2].slice(0, 1),
    3: counts.aLabels[3].slice(0, 1),
  }));
  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [active, setActive] = useState<FieldKey>('number');
  const [amountText, setAmountText] = useState('1');
  const [lines, setLines] = useState<SlipLine[]>([]);
  const [slipSession, setSlipSession] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const nextId = useRef(1);
  // One id per business request: kept across retries, dropped once the items change.
  const requestRef = useRef<{ id: string; hash: string } | null>(null);

  const spec = fieldSpec(method, digits);
  const open = capability.channelsByDigits[digits];
  const methods = capability.methods[digits];
  const amount = Number(amountText);
  const amountOk = Number.isFinite(amount) && amount > 0;

  const aLabels = counts.aLabels[digits];
  const splitA = channel === 'A' && aLabels.length > 1;
  const pickedNow = pickedA[digits];
  // Every ticked A-position becomes its own slip line, so each one is priced and shown separately.
  const aPositions = splitA ? [...pickedNow].sort((a, b) => a - b) : undefined;
  const linesToAdd = aPositions ? aPositions.length : 1;

  const toggleA = (n: number) =>
    setPickedA((prev) => ({
      ...prev,
      [digits]: prev[digits].includes(n) ? prev[digits].filter((x) => x !== n) : [...prev[digits], n],
    }));

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
        positions: splitA ? pickedNow : undefined,
      }, counts),
    [channel, digits, method, fields, counts, splitA, pickedNow],
  );

  const typed = Object.values(fields).some(Boolean);
  const canAdd =
    draft.ok && amountOk && open[channel] && lines.length + linesToAdd <= HANOI_MAX_SELECTIONS && !confirmOpen;

  const add = useCallback(() => {
    if (!draft.ok || !amountOk || !open[channel] || lines.length + linesToAdd > HANOI_MAX_SELECTIONS) return;
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
    const added = aPositions
      ? aPositions.map((n) => ({ id: nextId.current++, sel: { ...sel, positions: [n] } }))
      : [{ id: nextId.current++, sel }];
    setLines((prev) => [...prev, ...added]);
    resetFields(method, digits);
  }, [draft, amountOk, open, channel, lines.length, linesToAdd, digits, method, amount, fields, resetFields, aPositions]);

  // An unsent slip is lost on leave. Reload/close can only use the browser's own prompt
  // (beforeunload); in-app links and Back/Forward open our own dialog instead.
  const hasSlip = lines.length > 0;
  const [leaveAsk, setLeaveAsk] = useState<{ stay: () => void; leave: () => void } | null>(null);
  const askingRef = useRef(false);
  askingRef.current = leaveAsk !== null;
  const appRouter = useAppRouter();
  const appRouterRef = useRef(appRouter);
  appRouterRef.current = appRouter;

  useEffect(() => {
    if (!hasSlip) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      if (askingRef.current) return;
      setLeaveAsk({
        stay: () => {},
        leave: () => appRouterRef.current.push(url.pathname + url.search + url.hash),
      });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [hasSlip]);

  // Back/forward: while the slip has items, park a spare history entry on top of this page.
  // Back (or swipe-back) then only lands on the same page, which opens the dialog — staying
  // re-parks the entry, leaving steps back once more. The push also drops any forward
  // entries, so Forward can't leave either.
  useEffect(() => {
    if (!hasSlip) return;
    let guarding = true;
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      if (!guarding || askingRef.current) return;
      setLeaveAsk({
        stay: () => window.history.pushState(null, '', window.location.href),
        leave: () => {
          guarding = false;
          window.history.back();
        },
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      guarding = false;
      window.removeEventListener('popstate', onPopState);
    };
  }, [hasSlip]);

  // Once every box is filled the line is complete — drop it on the slip without another tap.
  useEffect(() => {
    if (typed && canAdd) add();
  }, [typed, canAdd, add]);

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
  const quote = useHanoiQuote(round.drawId, packageId, selections, slipSession);
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

  const clearSlip = () => {
    setLines([]);
    setSlipSession((n) => n + 1);
    requestRef.current = null;
  };

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
          clearSlip();
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
    const e = expandSelection(sel, counts);
    return e.ok ? toMinor(e.units * sel.amount) : 0;
  };

  // "A2" would read as position A2, so the tag shows the channel — or the one position picked —
  // and the digit count lives in the meta line.
  const tagFor = (sel: HanoiSelection) =>
    sel.channel === 'A' && sel.positions?.length === 1 ? `A${sel.positions[0]}` : sel.channel;

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
            const e = expandSelection(line.sel, counts);
            return (
              <li key={line.id} className={cn(styles.line, styles.lineSlip)}>
                <span className={styles.lineTag}>{tagFor(line.sel)}</span>
                <span className={styles.lineNumber}>{sourceLabel(line.sel)}</span>
                <Money value={lineNet(index, line.sel)} size="sm" />
                <button
                  type="button"
                  className={styles.lineRemove}
                  aria-label={t('slip.remove')}
                  onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                >
                  <X size={16} />
                </button>
                <div className={styles.lineSub}>
                  <span className={styles.lineMeta}>
                    {t(`methods.${line.sel.method}`)} · {t('digitsValue', { count: line.sel.digits })}
                    {positionsLabel(line.sel) && ` · ${positionsLabel(line.sel)}`}
                    {e.ok && ` · ${t('slip.units', { count: e.units })} ×`}
                  </span>
                  <SlipAmount
                    value={line.sel.amount}
                    label={t('perUnit')}
                    onCommit={(next) =>
                      setLines((prev) =>
                        prev.map((l) => (l.id === line.id ? { ...l, sel: { ...l.sel, amount: next } } : l)),
                      )
                    }
                  />
                </div>
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
            <span className={styles.blockHint}>
              {t('positions', { count: positionCount(channel, digits, counts, splitA ? pickedNow : undefined) })}
            </span>
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
                <span className={styles.channelSub}>{t('positions', { count: positionCount(c, digits, counts) })}</span>
              </button>
            ))}
          </div>
          {splitA && (
            <div className={styles.positionPick}>
              <span className={styles.positionLabel}>{t('pickPositions')}</span>
              <div
                className={styles.positionChips}
                style={{ ['--position-count' as string]: aLabels.length }}
                role="group"
                aria-label={t('pickPositions')}
              >
                {aLabels.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={cn(styles.positionChip, pickedNow.includes(n) && styles.on)}
                    aria-pressed={pickedNow.includes(n)}
                    onClick={() => toggleA(n)}
                  >
                    A{n}
                  </button>
                ))}
              </div>
              {pickedNow.length === 0 && <p className={styles.note}>{t('pickPositionsEmpty')}</p>}
            </div>
          )}
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

            {typed && (
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
                  {problemText ?? t('keepTyping')}
                </p>
              )}
            </div>
            )}
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
        <div className={styles.packageSlot}>
          <SelectedPackageCard groupId={round.groupId} />
        </div>
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
              <Button variant="ghost" block onClick={clearSlip} leftIcon={<Trash2 size={16} />}>
                {t('slip.clear')}
              </Button>
            )}
          </div>
        </div>
      </aside>

      <Modal
        open={leaveAsk !== null}
        onClose={() => {
          leaveAsk?.stay();
          setLeaveAsk(null);
        }}
        title={t('leaveTitle')}
        description={t('leaveWarning')}
        closeLabel={tCommon('close')}
        footer={
          <>
            <Button
              variant="danger"
              onClick={() => {
                leaveAsk?.leave();
                setLeaveAsk(null);
              }}
            >
              {t('leaveConfirm')}
            </Button>
            <Button
              onClick={() => {
                leaveAsk?.stay();
                setLeaveAsk(null);
              }}
            >
              {t('leaveStay')}
            </Button>
          </>
        }
      />

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
              <span className={styles.lineTag}>{tagFor(line.sel)}</span>
              <div className={styles.lineBody}>
                <span className={styles.lineNumber}>{sourceLabel(line.sel)}</span>
                <span className={styles.lineMeta}>
                  {t(`methods.${line.sel.method}`)} · {t('digitsValue', { count: line.sel.digits })}
                  {positionsLabel(line.sel) && ` · ${positionsLabel(line.sel)}`}
                </span>
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
