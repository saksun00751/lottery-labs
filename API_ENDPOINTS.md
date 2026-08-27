# API Endpoints — แยกตามเมนู

เอกสารนี้รวบรวม **API ทั้งหมดของแอป** โดยแบ่งตามเมนู/หน้าจอที่เรียกใช้งาน

โครงสร้างการเรียก API มี 3 ชั้น:

| ชั้น | ที่อยู่ | คำอธิบาย |
|------|---------|-----------|
| **Route Handler** | `app/api/**/route.ts` | endpoint ภายในของ Next.js ที่ฝั่ง Client เรียก (`fetch("/api/...")`) ทำหน้าที่เป็น proxy + แนบ token |
| **Server Action** | `lib/actions.ts`, `app/actions/*.ts` | ฟังก์ชัน `"use server"` ที่ Client เรียกโดยตรง (ไม่มี URL) |
| **Backend API** | `lib/api/client.ts` → `${API_BASE}` | API จริงฝั่งหลังบ้าน (`NEXT_PUBLIC_API_BASE_URL` / `API_BASE_URL`) |

**Auth:** Route handler ส่วนใหญ่อ่าน token จากคุกกี้ (`getApiToken()`) แล้วส่งเป็น `Authorization: Bearer <token>` ไปยัง Backend
พร้อมแนบภาษาจากคุกกี้ (`X-Language`, `language`, `lang`, `locale`) — ถ้าไม่มี token จะตอบ `401`

---

## 1. เมนู Login / Register (`/login`, `/register`)

| ประเภท | ชื่อ/Endpoint | Method | Backend ปลายทาง | รายละเอียด |
|--------|---------------|--------|------------------|-------------|
| Server Action | `loginWithPasswordAction` | — | `POST /auth/login` | เข้าสู่ระบบด้วย `user_name` + `password` สำเร็จแล้วเซ็ตคุกกี้ token |
| Server Action | `registerAction` | — | `POST /auth/register` → `POST /auth/login` | สมัครสมาชิกด้วยเบอร์โทร แล้ว auto-login ต่อทันที (รหัสผ่าน 6–16 ตัวอักษร) |
| Server Action | `registerWithUsernameAction` | — | `POST /auth/register-with-username` → `POST /auth/login` | สมัครสมาชิกแบบกำหนด username เอง แล้ว auto-login |
| Server Action | (OTP) | — | `POST /auth/login/otp` | ยืนยัน OTP ด้วย `user_name` (เบอร์โทร) + `otp` |
| Client → Backend | — | POST | `POST /auth/register/bank-account-name` | ตรวจสอบชื่อบัญชีธนาคารตอนสมัคร ส่ง `{ bank, acc_no }` |
| Server (cached) | `getBanks()` | GET | `GET /auth/register/banks` | รายการธนาคารสำหรับ dropdown หน้าสมัคร (cache tag: `banks`) |
| Server Action | `logoutAction` | — | `POST /auth/logout` | ออกจากระบบ + ล้างคุกกี้ (เรียกจาก Navbar และหน้าโปรไฟล์) |

---

## 2. เมนูหน้าแรก / Dashboard (`/dashboard`)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/balance` | GET | `GET /member/balance` (fallback `GET /member/loadbalance`) | ดึงยอดเครดิตคงเหลือ ใช้ใน `BalanceCard` และ `UserProvider` |
| `/api/member/loadbalance` | GET | `GET /member/loadbalance` | รีเฟรชยอดเงิน (ใช้หลังฝาก/รับโบนัส/รับโปรฯ) |
| `/api/lotto/markets` | GET | `GET /lotto/markets/latest` | รายการกลุ่ม/ตลาดหวยล่าสุด พร้อมงวดและเวลาปิดรับ ใช้ใน `LotteryCategories`, `LotteryGroups` |
| `/api/slides` | GET | `GET /slides` | แบนเนอร์สไลด์หน้าแรก (`PromoBanner`) |
| `/api/theme` | GET | `GET /theme` | ค่าธีม/สีของเว็บ |
| Server (cached) | GET | `GET /meta/site` | Meta ของเว็บ: ชื่อ, โลโก้, โค้ด header (cache tag: `site-meta`) |
| Server (cached) | GET | `GET /lotto/navbar-config` | ตั้งค่าเมนูที่แสดงบน Navbar (cache tag: `navbar-config`) |
| Server | GET | `GET /member/profile` | โปรไฟล์สมาชิก ใช้ตรวจสอบสิทธิ์ใน layout ของ `(protected)` |

---

## 3. เมนูแทงหวย (`/bet`, `/category/[id]`)

### 3.1 หวยทั่วไป

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/lotto/markets/[marketId]/betting-context` | GET | `GET /lotto/markets/{marketId}/betting-context` | ข้อมูลตั้งค่าห้องแทง: ประเภทการแทง, อัตราจ่าย, ขั้นต่ำ/สูงสุด, งวดปัจจุบัน |
| `/api/lotto/groups/[groupId]/packages` | GET | `GET /lotto/groups/{groupId}/packages` | รายการแพ็กเกจอัตราจ่ายของกลุ่มหวย |
| `/api/lotto/groups/[groupId]/selected-package` | GET | `GET /lotto/groups/{groupId}/selected-package` | แพ็กเกจที่สมาชิกเลือกอยู่ปัจจุบัน |
| `/api/lotto/groups/[groupId]/select-package` | POST | `POST /lotto/groups/{groupId}/select-package` | เลือก/เปลี่ยนแพ็กเกจอัตราจ่าย |
| Server Action `confirmBet` | — | `POST /lotto/bet` | ส่งโพย ส่ง `{ draw_id, package_id, items[] }` โดย `items` = `{ bet_type, number, amount, note? }` |

### 3.2 หวยยี่กี (Yeekee)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/lotto/yeekee/[marketId]/rounds` | GET | `GET /lotto/yeekee/markets/{marketId}/rounds` | รายการรอบยี่กีทั้งหมดของตลาดนั้น พร้อมสถานะ/เวลา |
| `/api/v1/lotto/yeekee/rounds/[roundId]/shoot` | POST | `POST /lotto/yeekee/rounds/{roundId}/shoot` | ยิงเลข (ส่งตัวเลขเข้ารอบ) |
| `/api/v1/lotto/yeekee/rounds/[roundId]/shoots` | GET | `GET /lotto/yeekee/rounds/{roundId}/shoots?limit=` | รายการเลขที่ถูกยิงในรอบ รองรับ `page`, `limit` |
| `/api/v1/lotto/yeekee/rounds/[roundId]/result-proof` | GET | `GET /lotto/yeekee/rounds/{roundId}/result-proof` | หลักฐานการออกผล (ยอดรวม/สูตรคำนวณ) |
| `/api/v1/lotto/yeekee/rounds/[roundId]/reward-status` | GET | `GET /lotto/yeekee/rounds/{roundId}/reward-status` | สถานะการจ่ายรางวัลของรอบ |

---

## 4. เมนูผลรางวัล & ตรวจผล (`/results`, `/check-result`)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/lotto/markets` | GET | `GET /lotto/markets/latest` | รายการหวยสำหรับเลือกดูผล |
| `/api/lotto/results/by-date` | GET | `GET /lotto/results/by-date?draw_date=` | ผลรางวัลตามวันที่ (query: `draw_date`, จำเป็น) |
| Server Action `fetchSlipDetail` | — | `GET /lotto/tickets/{slipId}` | รายละเอียดโพยเพื่อตรวจผลรายใบ |

---

## 5. เมนูประวัติโพย (`/history`)

| ประเภท | Endpoint | Method | Backend ปลายทาง | รายละเอียด |
|--------|----------|--------|------------------|-------------|
| Server | `getTickets()` | — | `GET /lotto/tickets` | รายการโพยทั้งหมดของสมาชิก (โหลดฝั่ง server) |
| Server Action | `fetchSlipDetail` | — | `GET /lotto/tickets/{slipId}` | รายละเอียดในโพย: รายการเลข, ยอดแทง, สถานะ, เงินรางวัล |
| Server Action | `cancelSlip` | — | `POST /lotto/tickets/{slipId}/cancel` | ยกเลิกโพย (เฉพาะที่ยังยกเลิกได้) |

---

## 6. เมนูฝากเงิน (`/deposit`)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/deposit/channels` | GET | `GET /member/profile` (อ่าน `profile.deposit`) | ช่องทางฝากที่เปิดใช้: `bank`, `payment`, `tw`, `slip` พร้อมลำดับการแสดงผล |
| `/api/deposit/loadbank` | POST | `POST /deposit/loadbank` | บัญชีรับเงินตามช่องทาง ส่ง `{ method }` ตอบกลับ `bank[]` (เลขบัญชี, ชื่อ, โลโก้, QR, ขั้นต่ำ) |
| `/api/deposit/loadbank/random` | POST | `POST /deposit/loadbank/random` | สุ่มบัญชีรับเงิน 1 บัญชี ส่ง `{ method }` (ใช้ใน `DepositPageRandom`) |
| `/api/payment/[id]/deposit/create` | POST | forward ไปยัง `payment_url` ใน body | สร้างรายการฝากผ่าน payment gateway — `[id]` = provider id, `payment_url` ต้องอยู่โดเมนเดียวกับ `API_BASE` เท่านั้น |
| `/api/payment/[id]/deposit/status/[txid]` | GET | `GET /{id}/deposit/status/{txid}` | ตรวจสถานะรายการฝาก (poll) |
| `/api/payment/[id]/deposit/expire/[txid]` | POST | `POST /{id}/deposit/expire/{txid}` | ปิด/ยกเลิกรายการฝากที่หมดอายุ |
| `/api/payment/[id]/qrcode/[requestId]` | GET | `GET /{id}/qrcode/{requestId}` | ดึง QR Code สำหรับชำระเงิน |
| `/api/deposit/bank` | GET | — | ⚠️ **คืน 503** — ระบบเดิม (DB) ถูกถอด กำลังย้ายไป API |
| `/api/deposit/submit` | POST | — | ⚠️ **คืน 503** — รับ `multipart/form-data` (`amount`, `method`, `accountCode`, `bankShortcode`, `slip`) บันทึกสลิปลง `uploads/slips` แล้วตอบว่ากำลังย้ายไป API |

**Provider id (`[id]`)**: ต้องตรงกับ `^[a-zA-Z0-9_-]+$` มิฉะนั้นตอบ `400`

---

## 7. เมนูถอนเงิน (`/withdraw`)

| ประเภท | Endpoint | Method | Backend ปลายทาง | รายละเอียด |
|--------|----------|--------|------------------|-------------|
| Route Handler | `/api/withdraw` | POST | `POST /wallet/withdraw` | ส่ง `{ amount: number }` → แปลงเป็น string ก่อนส่ง Backend, ตรวจว่า > 0 |
| Server Action | `withdrawAction` | — | `POST /wallet/withdraw` | เส้นทางที่หน้า `WithdrawPage` ใช้จริง |

---

## 8. เมนูโปรโมชั่น (`/promotion`)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/promotion/list` | GET | `GET /promotion/list` | รายการโปรโมชั่นทั้งหมด + โปรฯ ที่เลือกอยู่ (ไม่บังคับ login) |
| `/api/promotion/select` | POST | `POST /promotion/select` | รับโปรโมชั่น ส่ง `{ promotion: string }` (รหัสโปรฯ) |
| `/api/promotion/deselect` | POST | `POST /promotion/deselect` | ยกเลิกโปรโมชั่นที่รับไว้ (ไม่มี body) |

ใช้ทั้งในหน้าโปรโมชั่นและใน `PromotionPanel` บนหน้าฝากเงิน

---

## 9. เมนูโบนัส / กระเป๋าเงิน (`/bonus`)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/wallet/claim` | POST | `POST /wallet/claim` | รับเงินจากกระเป๋าย่อยเข้าเครดิตหลัก ส่ง `{ source }` โดย `source` ต้องเป็น `bonus` \| `cashback` \| `faststart` \| `ic` |
| `/api/member/loadbalance` | GET | `GET /member/loadbalance` | รีเฟรชยอดหลังรับโบนัส |

---

## 10. เมนูกงล้อเสี่ยงโชค (`/spin`, `/spin/history`)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/wheel/spin` | POST | `POST /wheel/spin` | หมุนกงล้อ (ไม่มี body) ตอบกลับ `{ point, diamond, title, msg, img }` แปลงจาก `format` ของ Backend |
| `/api/wheel/history` | GET | `GET /wheel/history` | ประวัติการหมุน จัดกลุ่มตามวันที่ (`date` → `data[] = { credit, time }`) |

---

## 11. เมนูของรางวัล / แลกแต้ม (`/reward`)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/reward/list` | GET | `GET /reward/list` | รายการของรางวัล — query ที่อนุญาต: `page`, `per_page`, `q`, `reward_type`, `featured_only` |
| `/api/reward/history` | GET | `GET /reward/history` | ประวัติการแลก — query ที่อนุญาต: `page`, `per_page`, `q`, `status`, `reward_type`, `mode` |
| `/api/reward/redeem` | POST | `POST /reward/redeem` | แลกของรางวัล ส่ง `{ reward_id: number }` ตอบกลับสถานะ + แต้มคงเหลือ + `format` สำหรับ popup |

> query key ที่ไม่อยู่ใน allowlist จะถูกตัดทิ้งก่อน forward

---

## 12. เมนูรายการเดินบัญชี (`/transactions`)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/member/history/[type]` | GET | `GET /wallet/transactions?...` | ประวัติธุรกรรมตามแท็บ — query: `date_start`, `date_stop`, `page` ตอบกลับ `{ data, summary, pagination }` |

**ค่า `[type]` ที่รองรับ:** `all`, `deposit`, `withdraw`, `lotto_bet`, `lotto_refund`, `referral`, `cashback`, `ic`, `bonus`, `game`, `admin_adjust`, `rollback`, `other` — นอกเหนือจากนี้ตอบ `400`

---

## 13. เมนูเกม (`/games/[type]`, `/games/[type]/[id]`)

| ประเภท | Endpoint | Method | Backend ปลายทาง | รายละเอียด |
|--------|----------|--------|------------------|-------------|
| Server | `getGameTypes()` | — | `GET /games/types` | ประเภทเกมทั้งหมด (สล็อต, คาสิโน, กีฬา ฯลฯ) |
| Server | `getProviders()` | — | `GET /games/providers/{typeId}` | ค่ายเกมในแต่ละประเภท |
| Route Handler | `/api/games/login` | POST | `POST /games/login` | เข้าเล่นเกม ส่ง `{ id, game }` ตอบกลับ `{ url }` สำหรับเปิดหน้าเกม — ถ้าไม่มี url ตอบ `400` |

---

## 14. เมนูโปรไฟล์ / เปลี่ยนรหัสผ่าน (`/profile`, `/change-password`)

| ประเภท | Endpoint | Method | Backend ปลายทาง | รายละเอียด |
|--------|----------|--------|------------------|-------------|
| Server | `getCurrentUser()` | — | `GET /member/profile` | ข้อมูลสมาชิก: ชื่อ, เบอร์, บัญชีธนาคาร, ยอดเงิน, สิทธิ์ต่าง ๆ |
| Server Action | `changePasswordAction` | — | `POST /member/change-password` | เปลี่ยนรหัสผ่าน |
| Server Action | `logoutAction` | — | `POST /auth/logout` | ออกจากระบบ |

---

## 15. เมนูแนะนำเพื่อน (`/referral`)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/referral` | GET | — | ⚠️ **Placeholder** — ยังไม่ต่อ Backend คืนค่าจำลอง `{ referralCode: "LT"+id, referredCount: 0, totalEarned: 0, referrals: [] }` |

---

## 16. เมนูติดต่อเรา (`/contact`, `/contact-public`)

| ประเภท | Endpoint | Method | Backend ปลายทาง | รายละเอียด |
|--------|----------|--------|------------------|-------------|
| Server (cached) | `getContactChannels()` | — | `GET /meta/contact-channels` | ช่องทางติดต่อ (Line, โทร, ฯลฯ) ใช้ทั้งหน้า contact และปุ่มลอย FAB — cache tag: `contact-channels` |

---

## 17. Realtime (ทำงานเบื้องหลังทุกหน้า — `UserProvider`)

| Endpoint ภายใน | Method | Backend ปลายทาง | รายละเอียด |
|----------------|--------|------------------|-------------|
| `/api/realtime/config` | GET | `GET /realtime/config` | ค่าตั้งต้น Pusher/Echo (key, cluster, host) — ไม่ต้อง login |
| `/api/realtime/context` | GET | `GET /member/realtime-context` | ช่อง (channel) ที่สมาชิกต้อง subscribe |
| `/api/realtime/auth` | POST | `POST /realtime/auth` | ยืนยันสิทธิ์เข้า private channel — forward body ดิบ (`x-www-form-urlencoded`) ตามที่ Pusher ส่งมา |
| `/api/realtime/heartbeat` | POST | `POST /member/heartbeat` | แจ้งสถานะออนไลน์ของสมาชิกเป็นระยะ |

---

## 18. ระบบภายใน (ไม่ผูกกับเมนู)

| Endpoint ภายใน | Method | รายละเอียด |
|----------------|--------|-------------|
| `/api/revalidate` | POST | ล้าง cache ของ Next.js ตาม tag — ต้องส่ง `Authorization: Bearer <REVALIDATE_TOKEN>` body: `{ tag }` หรือ `{ tags: [] }` — tag ที่อนุญาต: `site-meta`, `navbar-config`, `banks`, `contact-channels` |
| `/api/theme` | GET | ค่าธีมของเว็บ (จาก `GET /theme`) |

---

## สรุปรหัสสถานะที่ใช้ร่วมกัน

| Status | ความหมาย |
|--------|-----------|
| `200` | สำเร็จ — โดยทั่วไปตอบ `{ success: true, ... }` |
| `400` | ข้อมูลที่ส่งมาไม่ถูกต้อง (JSON เสีย, พารามิเตอร์ไม่ผ่านการตรวจ) หรือ Backend ปฏิเสธ |
| `401` | ไม่มี token / ยังไม่ได้เข้าสู่ระบบ |
| `500` | เรียก Backend ไม่สำเร็จ / ข้อผิดพลาดที่ไม่คาดคิด |
| `503` | ฟีเจอร์อยู่ระหว่างย้ายไป API (`/api/deposit/bank`, `/api/deposit/submit`) |
