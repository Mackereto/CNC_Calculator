import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import Calculator from './components/calculator/Calculator';
import ReferenceFaq from './components/reference/ReferenceFaq';

type Page = 'calc' | 'ref';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('cnc-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });
  const [page, setPage] = useState<Page>('calc');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('cnc-theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const go = (p: Page) => {
    setPage(p);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };
  useEffect(() => {
    const onGotoRef = () => go('ref');
    window.addEventListener('cnc:goto-ref', onGotoRef);
    return () => window.removeEventListener('cnc:goto-ref', onGotoRef);
  }, []);

  const heroRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!heroRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-reveal]',
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.08, overwrite: true },
      );
    }, heroRef);
    return () => ctx.revert();
  }, [page]);

  return (
    <div className="cnc-wash min-h-screen font-[family-name:var(--font-body)] antialiased">
      <header className="no-print sticky top-0 z-[300] border-b border-[var(--color-rule)] bg-[color-mix(in_srgb,var(--color-paper)_92%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={() => go('calc')}
            aria-label="กลับหน้าคำนวณ"
            className="cnc-display text-[1.05rem] text-[var(--color-ink)]"
          >
            CNC<span className="text-[var(--color-accent)]">·</span>Calc
          </button>
          <nav aria-label="หลัก" className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => go('calc')}
              aria-current={page === 'calc' ? 'page' : undefined}
              className={'cnc-navlink' + (page === 'calc' ? ' cnc-navlink--active' : '')}
            >
              คำนวณ
            </button>
            <button
              type="button"
              onClick={() => go('ref')}
              aria-current={page === 'ref' ? 'page' : undefined}
              className={'cnc-navlink' + (page === 'ref' ? ' cnc-navlink--active' : '')}
            >
              ตาราง
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="สลับโหมดสว่าง/มืด"
              aria-pressed={theme === 'dark'}
              className="cnc-iconbtn"
            >
              <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
            </button>
          </nav>
        </div>
        <div id="cnc-stepbar-slot" className="mx-auto w-full max-w-5xl px-4 sm:px-6" />
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
        {page === 'calc' ? (
          <>
            <section ref={heroRef} aria-labelledby="page-h" className="mb-6 sm:mb-8">
              <h1
                id="page-h"
                data-reveal
                className="cnc-display mt-3 hidden text-[clamp(1.65rem,5.2vw+0.6rem,2.75rem)] sm:block"
              >
                รอบสปินเดิลกับอัตราป้อน<span className="text-[var(--color-accent)]">ที่ถูกต้อง</span>ตั้งแต่ดอกแรก
              </h1>
              <p data-reveal className="mt-2 hidden max-w-[62ch] text-[0.95rem] leading-relaxed text-[var(--color-ink-2)] sm:block">
                เลือกวัสดุ ชนิดดอก และขนาดดอก — ระบบเติม Vc กับ fz ที่แนะนำตามแคตตาล็อก OSG (เหล็ก) หรือ Harvey Tool (ไนลอน/พลาสติก) ให้เลย กรอกเองได้ถ้าอยากลอง แล้วดูคำเตือนก่อนกดสตาร์ต
              </p>
              <dl data-reveal className="mt-4 hidden grid-cols-3 gap-2 sm:grid sm:gap-3">
                {[
                  ['2 โหมด', 'Vc·fz ⇄ S·F'],
                  ['G-code', 'พร้อมคัดลอก'],
                  ['เตือน 3 ระดับ', 'bad · warn · ok'],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="min-w-0 rounded-[var(--radius-card)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-2.5"
                  >
                    <dt className="truncate text-[0.78rem] font-semibold uppercase tracking-wide text-[var(--color-ink-2)]">{k}</dt>
                    <dd className="m-0 truncate text-[0.9rem] font-bold text-[var(--color-ink)]">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <main>
              <Calculator />
            </main>
          </>
        ) : (
          <main ref={heroRef as React.RefObject<HTMLElement>}>
            <section aria-labelledby="faq-h">
              <h2 data-reveal id="faq-h" className="cnc-display mt-2 text-[clamp(1.25rem,3vw+0.7rem,1.75rem)]">
                ตารางกับที่มา
              </h2>
              <p data-reveal className="mb-4 mt-2 max-w-[68ch] text-[0.92rem] leading-relaxed text-[var(--color-ink-2)]">
                ค่าแนะนำทั้งหมดมาจาก<b>แคตตาล็อกเทคนิคของ OSG (End Mill Technical)</b> สำหรับดอกคาร์ไบด์เคลือบ DUROREY และตาราง Harvey Tool สำหรับพลาสติก รายละเอียดแต่ละตารางกดเพื่อขยาย
              </p>
              <ReferenceFaq />
              <div className="mt-6">
                <button type="button" onClick={() => go('calc')} className="cnc-btn cnc-btn--ghost">
                  ← กลับหน้าคำนวณ
                </button>
              </div>
            </section>
          </main>
        )}

        <footer className="mt-8 border-t border-[var(--color-rule)] pt-4 text-xs leading-relaxed text-[var(--color-ink-2)]">
          <p className="m-0">
            CNC·Calc — ค่าแนะนำตามแคตตาล็อก OSG / Harvey Tool · ดอก AE-MS-H, AE-BM/BD-H · ระยะยื่นเกิน 4D ลด Vc/fz ตามหลักปฏิบัติ
          </p>
        </footer>
      </div>
    </div>
  );
}
