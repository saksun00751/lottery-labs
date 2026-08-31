'use client';

import { Award, Disc3, Gem } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/lib/api/client';
import { useSpinWheel, useWallet, useWheelList } from '@/lib/api/queries';
import { pushToast } from '@/lib/toast';
import { formatNumber } from '@/lib/utils/intl';

import styles from './spin.module.scss';

/* Minimal shape of the Winwheel.js instance/constructor this page relies on —
 * ported from lotto-seed-app's `/spin` page, same library, same canvas draw mode. */
interface WinwheelInstance {
  animation: {
    duration?: number;
    spins?: number;
    stopAngle?: number;
    callbackFinished?: (() => void) | undefined;
  };
  rotationAngle: number;
  draw(): void;
  startAnimation(): void;
  stopAnimation(canvasRest?: boolean): void;
}
interface WinwheelConstructor {
  new (options: {
    canvasId: string;
    numSegments: number;
    drawMode: string;
    imageDirection: string;
    outerRadius: number;
    innerRadius: number;
    strokeStyle: string;
    lineWidth: number;
    segments: Array<{ fillStyle: string; image: string }>;
    animation: { type: string; duration: number; spins: number };
  }): WinwheelInstance;
}
declare global {
  interface Window {
    Winwheel?: WinwheelConstructor;
    TweenMax?: unknown;
  }
}

function loadScript(src: string, flag: keyof Window): Promise<void> {
  return new Promise((resolve) => {
    if (window[flag]) {
      resolve();
      return;
    }
    const existing = document.querySelector(
      `script[data-flag="${String(flag)}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.dataset.flag = String(flag);
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          if (!url) {
            resolve();
            return;
          }
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  ).then(() => undefined);
}

export function SpinView() {
  const t = useTranslations('spin');
  const locale = useLocale();

  const { data: wheel, isLoading: wheelLoading } = useWheelList();
  const { data: wallet } = useWallet();
  const spinMutation = useSpinWheel();

  const segments = wheel?.segments ?? [];
  const wheelEnabled = wheel?.enabled ?? true;
  const diamond = wallet?.diamond ?? 0;

  const wheelRef = useRef<WinwheelInstance | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelReady, setWheelReady] = useState(false);

  useEffect(() => {
    if (segments.length === 0) return;
    let cancelled = false;

    const init = async () => {
      await loadScript('/TweenMax.min.js', 'TweenMax');
      await loadScript('/Winwheel.min.js', 'Winwheel');
      if (cancelled) return;

      const Winwheel = window.Winwheel;
      if (!Winwheel) return;

      await preloadImages(segments.map((s) => s.imageUrl));
      if (cancelled) return;

      wheelRef.current = new Winwheel({
        canvasId: 'spin-canvas',
        numSegments: segments.length,
        drawMode: 'segmentImage',
        imageDirection: 'N',
        outerRadius: 170,
        innerRadius: 0,
        strokeStyle: 'white',
        lineWidth: 2,
        segments: segments.map((s) => ({ fillStyle: s.fillStyle, image: s.imageUrl })),
        animation: { type: 'spinToStop', duration: 5, spins: 8 },
      });

      setTimeout(() => {
        if (!cancelled) {
          wheelRef.current?.draw();
          setWheelReady(true);
        }
      }, 100);
    };

    void init();

    return () => {
      cancelled = true;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [segments]);

  const handleSpin = async () => {
    if (isSpinning || diamond < 1 || !wheelEnabled || !wheelRef.current) return;
    setIsSpinning(true);

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    wheelRef.current.stopAnimation(false);
    wheelRef.current.animation.stopAngle = undefined;
    wheelRef.current.animation.callbackFinished = undefined;
    wheelRef.current.rotationAngle = 0;
    wheelRef.current.draw();

    let result;
    try {
      result = await spinMutation.mutateAsync();
    } catch (error) {
      pushToast({
        tone: 'danger',
        title: error instanceof ApiError ? error.message : t('spinError'),
      });
      setIsSpinning(false);
      return;
    }

    if (typeof result.point !== 'number') {
      pushToast({ tone: 'danger', title: t('spinError') });
      setIsSpinning(false);
      return;
    }

    const wheel = wheelRef.current;
    wheel.animation.stopAngle = result.point;
    wheel.animation.spins = 3 + Math.floor(Math.random() * 3); // 3-5 full turns before landing
    const animDuration = (wheel.animation.duration ?? 5) * 1000;

    let shown = false;
    const showResult = () => {
      if (shown) return;
      shown = true;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      pushToast({
        tone: 'success',
        title: result.title ?? t('spinDone'),
        description: result.msg,
      });
      setIsSpinning(false);
    };

    wheel.animation.callbackFinished = showResult;
    wheel.startAnimation();

    fallbackTimerRef.current = setTimeout(() => {
      wheel.stopAnimation(false);
      showResult();
    }, animDuration + 800);
  };

  const buttonLabel = isSpinning
    ? t('spinning')
    : !wheelEnabled
      ? t('disabled')
      : diamond < 1
        ? t('noDiamond')
        : t('spinBtn');

  return (
    <div className={styles.page}>
      <PageHeader icon={<Disc3 size={22} />} title={t('title')} subtitle={t('subtitle')} />

      <Link href="/bonus" className={styles.bonusNotice}>
        <Award size={16} />
        <span>{t('bonusNotice')}</span>
      </Link>

      <div className={styles.card}>
        <div className={styles.diamondChip}>
          <Gem size={15} />
          <span className={styles.diamondValue}>{formatNumber(diamond, locale)}</span>
          <span className={styles.diamondLabel}>{t('diamond')}</span>
        </div>

        {wheelLoading ? (
          <Skeleton height={340} radius={20} />
        ) : segments.length === 0 ? (
          <EmptyState title={t('unavailable')} />
        ) : (
          <>
            <div className={styles.canvasWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/wheel_back.png" alt="" className={styles.canvasBg} />
              <div className={styles.pointer}>
                <svg width="22" height="30" viewBox="0 0 22 30">
                  <circle cx="11" cy="6" r="4" fill="var(--surface-1)" stroke="var(--danger)" strokeWidth="2" />
                </svg>
              </div>
              <canvas
                id="spin-canvas"
                className={styles.canvas}
                width="400"
                height="400"
                aria-label={t('title')}
              />
              {!wheelReady && <Skeleton className={styles.canvasSkeleton} radius={999} />}
            </div>

            <Button
              type="button"
              size="lg"
              block
              disabled={isSpinning || diamond < 1 || !wheelEnabled || !wheelReady}
              loading={isSpinning}
              onClick={handleSpin}
            >
              {buttonLabel}
            </Button>
          </>
        )}

        <Link href="/spin/history" className={styles.historyLink}>
          {t('history')}
        </Link>
      </div>
    </div>
  );
}
