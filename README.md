# Lottery Labs

เว็บแทงหวยออนไลน์ — Next.js 16 (App Router) + SCSS Modules + next-intl
รองรับ 5 ภาษา (ไทย / อังกฤษ / พม่า / ลาว / เขมร), 6 ธีมสี, โหมดมืด-สว่าง และ responsive เต็มรูปแบบ

---

## เริ่มต้นใช้งาน

```bash
npm install
cp .env.example .env.local
npm run dev
```

เปิด http://localhost:3000 — ระบบจะ redirect ไปยัง `/th` ตามภาษาเริ่มต้น

ค่าเริ่มต้นคือ **โหมดจำลอง** (`NEXT_PUBLIC_USE_MOCK=true`) ทุกหน้าใช้งานได้ทันทีโดยไม่ต้องมี backend

| ฟิลด์ | ค่า |
| --- | --- |
| ชื่อผู้ใช้ / เบอร์โทร | `demo_player` หรือ `0812345678` |
| รหัสผ่าน | `password123` |

---

## คำสั่ง

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run dev` | dev server (Turbopack) |
| `npm run build` | production build (`output: 'standalone'`) |
| `npm start` | รัน production build |
| `npm run typecheck` | ตรวจ TypeScript อย่างเดียว |

---

## การตั้งค่า (.env)

ทุกอย่างที่ต้องปรับต่อ deployment อยู่ใน `.env.local` — ดูรายละเอียดครบใน `.env.example`

| ตัวแปร | ความหมาย |
| --- | --- |
| `API_BASE_URL` | URL ของ backend **ไม่มี `NEXT_PUBLIC_`** โดยตั้งใจ — เบราว์เซอร์ไม่เคยเห็นค่านี้ |
| `NEXT_PUBLIC_USE_MOCK` | `true` = ใช้ข้อมูลจำลองในหน่วยความจำแทน backend |
| `NEXT_PUBLIC_LOGIN_MODE` | `username` หรือ `phone` — สลับโหมด login ทั้งระบบ |
| `SESSION_COOKIE_NAME` | ชื่อ cookie แบบ httpOnly ที่เก็บ access token |
| `NEXT_PUBLIC_LOCALES` | ภาษาที่เปิดใช้ (คั่นด้วย comma) |
| `NEXT_PUBLIC_DEFAULT_THEME` | ธีมเริ่มต้น ต้องตรงกับธีมที่ `enabled: true` ใน SCSS |
| `NEXT_PUBLIC_DEFAULT_COLOR_MODE` | `dark` / `light` / `system` |
| `NEXT_PUBLIC_ENABLE_*` | feature flag: referral / promotion / diamond |

> เปลี่ยน `NEXT_PUBLIC_*` แล้วต้อง restart dev server — Next.js inline ค่าเหล่านี้ตอน compile

---

## ระบบธีม

**ไฟล์เดียวที่ต้องแก้: `src/styles/themes/_config.scss`**

```scss
$themes: (
  'black-gold':    ( enabled: true,  dark: (...), light: (...) ),
  'royal-purple':  ( enabled: true,  ... ),
  'emerald-jade':  ( enabled: false, ... ),   // ← ปิดธีมนี้
  ...
);
```

ตั้ง `enabled: false` แล้วธีมนั้นจะหายไปทั้ง **CSS ที่ build ออกมา** และ **ปุ่มเลือกธีมบนหน้าเว็บ**
ไม่ต้องแก้ไฟล์ TypeScript ใด ๆ

กลไก: `_emit.scss` เขียนรายชื่อธีมที่เปิดอยู่ลงใน custom property `--themes-enabled` บน `:root`
แล้ว `src/store/theme-store.ts` อ่านค่ากลับมาตอน runtime — SCSS จึงเป็น source of truth เพียงจุดเดียว

### ธีมที่มีให้

| id | ชื่อ |
| --- | --- |
| `black-gold` | ดำ-ทอง (ค่าเริ่มต้น) |
| `royal-purple` | ม่วงราชวงศ์ |
| `emerald-jade` | เขียวมรกต |
| `ruby-noir` | แดงทับทิม |
| `sapphire-ice` | น้ำเงินไพลิน |
| `rose-platinum` | โรสโกลด์ |

### เพิ่มธีมใหม่

1. เพิ่ม entry ใน `$themes` พร้อม palette `dark` และ `light` (11 สีต่อโหมด)
2. เพิ่มชื่อ + swatch ใน `themeLabels` ที่ `src/store/theme-store.ts` (ใช้แสดงในปุ่มเลือกธีมเท่านั้น)

สีอื่น ๆ ทั้งหมด (tint, gradient, hairline, shadow, glow) คำนวณให้อัตโนมัติใน `_emit.scss`

### โหมดมืด / สว่าง

เป็นคนละมิติกับธีมสี — ทุกธีมมีทั้งสองโหมด สลับได้อิสระ
`data-theme` คุมชุดสี, `data-mode` คุมมืด/สว่าง/ตามระบบ
สคริปต์ใน `ThemeScript.tsx` ทำงานก่อน first paint จึงไม่มีอาการหน้าจอกระพริบ

---

## ภาษา

ไฟล์คำแปลอยู่ที่ `messages/{th,en,my,lo,km}.json` — โครงสร้าง key เหมือนกันทุกไฟล์

จุดที่จัดการเป็นพิเศษ:
- **ฟอนต์แยกตามภาษา** — พม่า/ลาว/เขมร ต้องใช้ Noto Sans ของภาษานั้นโดยเฉพาะ ไม่งั้นสระซ้อนผิด
  (ตั้งค่าที่ `src/app/fonts.ts` + `html[lang]` ใน `globals.scss`)
- **line-height เพิ่มขึ้น** สำหรับพม่า/ลาว/เขมร เพราะ glyph ซ้อนแนวตั้ง
- **เขมรไม่มีช่องว่างระหว่างคำ** จึงตั้ง `line-break: loose` + `overflow-wrap: anywhere`
- **ตัวเลขบังคับเป็น Latin digits** (`-u-nu-latn`) ทุกภาษา — ยอดเงินต้องอ่านเทียบกับแอปธนาคารได้
- **วันที่ภาษาไทยใช้ พ.ศ.** (`ca-buddhist`)

---

## สถาปัตยกรรม

```
src/
  app/
    [locale]/
      (auth)/         login, register
      (main)/         ทุกหน้าหลังล็อกอิน (มี navbar + sidebar)
    api/
      auth/           login / logout / register — จุดเดียวที่เขียน session cookie
      proxy/[...path] relay ไป backend
  components/
    ui/               Button, Card, Field, Modal, Tabs, Badge, Money, Countdown, Feedback
    layout/           AppShell, Navbar, Sidebar, BottomNav, ThemeSwitcher, LanguageSwitcher
    lottery/          RoundCard, NumberBoard, BetSlipPanel, TicketCard, ResultCard
    finance/          BankAccountCard, PromotionCard
  lib/
    api/              client, endpoints, queries (TanStack Query), upstream, mock/
    utils/            money, lottery, intl, cn
    validators/       zod schemas
  store/              theme, bet-slip, ui (zustand)
  styles/             abstracts/ (tokens, mixins, breakpoints) + themes/
  proxy.ts            locale routing + auth gate (Next 16 แทน middleware.ts)
```

### การไหลของข้อมูล

```
Client Component
   └─ TanStack Query (src/lib/api/queries.ts)
        └─ apiFetch → /api/proxy/<path>          ← same origin, cookie ไปเอง
             └─ Route Handler
                  ├─ mock mode → src/lib/api/mock/router.ts
                  └─ real mode → API_BASE_URL + Bearer token จาก httpOnly cookie
```

**เบราว์เซอร์ไม่เคยเห็น access token และไม่เคยเห็น URL ของ backend**

---

## หลักการที่ยึดไว้

**เงิน** — เก็บเป็นจำนวนเต็มหน่วยสตางค์ (`Minor`) ตลอดทั้งระบบ ไม่มี float กับยอดเงินที่ใดเลย
แปลงเป็นทศนิยมเฉพาะตอนแสดงผลใน `<Money>` เท่านั้น

**Idempotency** — ทุก mutation ที่เกี่ยวกับเงินหรือการส่งโพย แนบ header `Idempotency-Key`
กดรัวหรือเน็ตหลุดแล้ว retry จะไม่ถูกตัดเงินซ้ำ (backend ต้อง honor header นี้)

**ยอดเงินไม่ optimistic** — ไม่มีการเดายอดคงเหลือฝั่ง client รอค่าจริงจาก server แล้ว invalidate เสมอ

**Session** — token อยู่ใน httpOnly cookie ไม่ใช่ localStorage; XSS จึงอ่านไปไม่ได้

**ขนาดตัวอักษร** — body ไม่ต่ำกว่า 16px, ตัวเล็กสุดในระบบคือ 13px และใช้เฉพาะ metadata
input ทุกช่องอย่างน้อย 16px เพื่อไม่ให้ iOS Safari zoom เอง
tap target ทุกอันอย่างน้อย 44px

---

## ระบบแทงหวย

รองรับประเภทเดิมพัน: 3 ตัวบน / 3 ตัวโต๊ด / 3 ตัวล่าง / 2 ตัวบน / 2 ตัวล่าง / วิ่งบน / วิ่งล่าง

- **นับถอยหลังรอบสด** — `useCountdown` เดินทุกวินาที คำนวณฝั่ง client เท่านั้น (กัน hydration mismatch)
  รองรับรอบสั้นแบบยี่กีที่ออกทุก 15 นาที
- **เลขอั้น / เลขปิดรับ** — เลขจ่ายลดขึ้นขอบสีเตือน, เลขปิดรับกดไม่ได้ และแต่ละเลขเก็บอัตราจ่ายของตัวเอง
- **ตัวช่วยเลือกเลข** — กลับตัวเลข, รูดหน้า, รูดหลัง, 19 ประตู, เลขเบิ้ล, สูง/ต่ำ, คู่/คี่
- **กระดาน 3 หลัก = 1,000 ปุ่ม** — แต่ละปุ่ม memo และแต่ละแถวใช้ `content-visibility: auto`
  ทำให้แถวนอกจอไม่เสีย layout/paint มือถือจึงไม่หน่วง
- **โพย** — สะสมหลายเลขหลายประเภทก่อนยืนยันครั้งเดียว, persist ลง localStorage กัน refresh หลุด

---

## เชื่อมต่อ backend จริง

1. ตั้ง `NEXT_PUBLIC_USE_MOCK=false` และใส่ `API_BASE_URL`
2. implement endpoint ตาม `docs/API.md`
3. ไม่ต้องแก้โค้ดฝั่ง client — `src/lib/api/endpoints.ts` เรียกผ่าน proxy เส้นเดียวกันอยู่แล้ว

---

## เกี่ยวกับการปฏิบัติตามกฎหมาย

โปรเจกต์นี้เตรียมโครงไว้ให้แล้ว: ข้อความยืนยันอายุ 18+ ตอนสมัคร และหน้า contact
ก่อนเปิดใช้งานจริงควรเพิ่ม KYC/ยืนยันตัวตน, การกำหนดวงเงินเล่นด้วยตนเอง (self-exclusion)
และตรวจสอบใบอนุญาตตามเขตอำนาจศาลที่ให้บริการ
