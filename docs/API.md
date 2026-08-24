# API Contract

สัญญาระหว่าง frontend กับ backend ของ Lottery Labs

Frontend ไม่เรียก backend โดยตรง — ทุก request ผ่าน Route Handler ของตัวเองที่
`/api/proxy/<path>` ซึ่งจะแนบ `Authorization: Bearer <token>` จาก httpOnly cookie
แล้ว forward ไปที่ `API_BASE_URL/<path>`

`<path>` ในเอกสารนี้คือ path ที่ backend เห็น (หลังตัด `/api/proxy` ออกแล้ว)

---

## กติกาทั่วไป

**จำนวนเงินทั้งหมดเป็นจำนวนเต็มหน่วยสตางค์**
`12345` = 123.45 บาท — ห้ามส่งเป็นทศนิยม

**Content type** — `application/json` ทั้งขาไปและขากลับ

**Error response** — status 4xx/5xx พร้อม body:

```json
{
  "code": "insufficient_balance",
  "message": "ยอดเงินคงเหลือไม่เพียงพอ",
  "fields": { "amount": "insufficient_balance" }
}
```

- `message` แสดงต่อผู้ใช้โดยตรง จึงควรเป็นภาษาที่ผู้ใช้อ่านออก
- `fields` (ถ้ามี) จะถูกแมปกลับไปยัง input ที่ผิดในฟอร์มโดยอัตโนมัติ

**Idempotency** — request ต่อไปนี้จะแนบ header `Idempotency-Key: <uuid>`

| endpoint |
| --- |
| `POST lottery/tickets` |
| `POST wallet/deposits` |
| `POST wallet/withdrawals` |
| `POST wallet/cashback/claim` |
| `POST promotions/{id}/claim` |

backend **ต้อง** เก็บ key ไว้และคืนผลลัพธ์เดิมเมื่อได้รับ key ซ้ำ
มิฉะนั้นผู้ใช้ที่กดรัวหรือเน็ตหลุดแล้ว retry จะถูกตัดเงินสองรอบ

**Pagination** — endpoint ที่คืน list ยาวรับ `?page=1&pageSize=20` และคืน:

```json
{ "items": [], "page": 1, "pageSize": 20, "total": 0 }
```

---

## Authentication

Endpoint กลุ่มนี้ frontend เรียกผ่าน `/api/auth/*` ของตัวเอง (ไม่ผ่าน `/api/proxy`)
เพราะเป็นจุดเดียวที่มีสิทธิ์เขียน session cookie

### `POST auth/login`

```jsonc
// request — key แรกขึ้นกับ NEXT_PUBLIC_LOGIN_MODE
{ "username": "demo_player", "password": "..." }
{ "phone": "0812345678",     "password": "..." }
```

```jsonc
// 200
{ "accessToken": "...", "user": { /* User */ } }
```

`401` เมื่อ credential ไม่ถูกต้อง

### `POST auth/register`

```jsonc
{
  "bankCode": "KBANK",
  "bankAccountNumber": "1234567890",
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "identifier": "demo_player",   // username หรือเบอร์โทร ตาม LOGIN_MODE
  "password": "...",
  "phone": "0812345678",
  "referralCode": "LL8K2M"       // optional
}
```

```jsonc
// 200 — สมัครแล้วล็อกอินให้เลย
{ "accessToken": "...", "user": { /* User */ } }
```

`422` พร้อม `fields` เมื่อข้อมูลไม่ผ่าน validation (เช่น username ซ้ำ)

### `POST auth/logout`

เพิกถอน token ปัจจุบัน คืน `204` หรือ `{ "ok": true }`

---

## Reference

### `GET banks`

```jsonc
{
  "items": [
    { "code": "KBANK", "name": "ธนาคารกสิกรไทย", "shortName": "กสิกรไทย", "color": "#138f2d" }
  ]
}
```

ใช้ใน dropdown หน้าสมัครสมาชิก — frontend cache ไว้ 24 ชั่วโมง

---

## Account

### `GET me`

```jsonc
{
  "id": "u_10024",
  "username": "demo_player",
  "phone": "0812345678",
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "referralCode": "LL8K2M",
  "createdAt": "2025-11-02T08:14:00.000Z",
  "bankAccounts": [ /* BankAccount[] */ ]
}
```

### `GET wallet`

```jsonc
{
  "balance": 1284550,          // ยอดเงินคงเหลือ
  "diamond": 1240,             // ไดมอนด์ (จำนวนเต็มธรรมดา ไม่ใช่หน่วยเงิน)
  "cashback": 32800,           // คืนยอดเสียที่รอรับ
  "monthlyTurnover": 4560000,  // ยอดเดือนนี้
  "currency": "THB",
  "updatedAt": "2026-08-24T20:40:27.244Z"
}
```

frontend refetch อัตโนมัติเมื่อกลับมาที่แท็บ ทุก 60 วินาที และหลังทุก mutation ที่ขยับเงิน

### `GET me/bank-accounts`

```jsonc
{
  "items": [
    {
      "id": "ba_1",
      "bankCode": "KBANK",
      "bankName": "ธนาคารกสิกรไทย",
      "accountNumber": "1234567890",
      "accountName": "สมชาย ใจดี",
      "isPrimary": true
    }
  ]
}
```

### `POST me/change-password`

```jsonc
{ "currentPassword": "...", "newPassword": "..." }
```

`422` + `{ "fields": { "currentPassword": "invalid_password" } }` เมื่อรหัสเดิมผิด

---

## Lottery

### `GET lottery/rounds?category=`

`category` (optional): `government` | `yeekee` | `foreign` | `stock` | `hanoi` | `laos`

```jsonc
{
  "items": [
    {
      "id": "yeekee-vip",
      "name": "ยี่กี VIP",
      "category": "yeekee",
      "status": "open",                          // open | closing | closed | settled
      "closesAt": "2026-08-24T21:00:00.000Z",    // ใช้เดินนับถอยหลัง
      "drawsAt":  "2026-08-24T21:02:00.000Z",
      "label": "รอบที่ 85",
      "betTypes": ["3top", "3tod", "2top", "2bottom", "run_top", "run_bottom"]
    }
  ]
}
```

`status` ควรเป็น `closing` เมื่อใกล้ปิดรับ — UI จะเปลี่ยนเป็นสีเตือนและกะพริบ

### `GET lottery/rounds/{id}`

คืน object เดียวในรูปแบบเดียวกับด้านบน

### `GET lottery/rounds/{id}/rates`

```jsonc
{
  "roundId": "yeekee-vip",
  "betTypes": [
    { "id": "3top",  "digits": 3, "payout": 900, "minStake": 100, "maxStake": 200000 },
    { "id": "2top",  "digits": 2, "payout": 95,  "minStake": 100, "maxStake": 500000 }
  ],
  "restricted": [
    { "betType": "2top", "number": "19", "payout": 50 },   // เลขอั้น จ่ายลด
    { "betType": "2top", "number": "69", "payout": null }  // ปิดรับ
  ]
}
```

- `payout` คือตัวคูณ — เดิมพัน 1 บาทที่ 900 ได้คืน 900 บาท
- `restricted[].payout: null` = ปิดรับเลขนั้น UI จะกดไม่ได้
- `restricted[].payout` น้อยกว่าอัตราปกติ = เลขอั้น UI จะขึ้นขอบเตือน

### `POST lottery/tickets`

ส่งโพย — ต้องแนบ `Idempotency-Key`

```jsonc
{
  "roundId": "yeekee-vip",
  "items": [
    { "betType": "2top", "number": "42",  "stake": 5000, "payout": 95 },
    { "betType": "3top", "number": "842", "stake": 5000, "payout": 900 }
  ]
}
```

**backend ต้อง validate ใหม่ทั้งหมด ห้ามเชื่อค่าจาก client:**
อัตราจ่าย, เลขอั้น/ปิดรับ, ขั้นต่ำ-สูงสุดต่อเลข, งวดยังเปิดอยู่หรือไม่ และยอดเงินคงเหลือ

```jsonc
// 200 — คืน Ticket ที่สร้างแล้ว
{
  "id": "tk_1",
  "reference": "PY26082401",
  "roundId": "yeekee-vip",
  "roundName": "ยี่กี VIP",
  "roundLabel": "รอบที่ 85",
  "createdAt": "2026-08-24T20:15:00.000Z",
  "status": "pending",                  // pending | won | lost | void | refunded
  "totalStake": 10000,
  "totalWin": 0,
  "items": [
    { "betType": "2top", "number": "42", "stake": 5000, "payout": 95,
      "status": "pending", "winAmount": 0 }
  ]
}
```

error ที่ frontend รองรับ: `insufficient_balance`, `round_closed`, `empty_slip`

### `GET lottery/tickets?status=&page=`

`status` (optional): `pending` | `won` | `lost` | `void` | `refunded`
คืน `Paginated<Ticket>`

### `GET lottery/tickets/{id}`

คืน `Ticket` เดียว

### `GET lottery/results`

```jsonc
{
  "items": [
    {
      "roundId": "hanoi-special",
      "roundName": "ฮานอย พิเศษ",
      "roundLabel": "ประจำวันที่ 23/08/2569",
      "drawnAt": "2026-08-23T14:00:00.000Z",
      "numbers": { "3top": "758", "2top": "58", "2bottom": "46" }
    }
  ]
}
```

`numbers` เป็น partial map — ใส่เฉพาะประเภทที่งวดนั้นออกผล

---

## Wallet

### `GET wallet/channels`

ช่องทางฝากเงิน

```jsonc
{
  "items": [
    {
      "id": "dc_1",
      "type": "bank_transfer",        // bank_transfer | qr_promptpay | truemoney
      "bankName": "ธนาคารกสิกรไทย",
      "accountNumber": "0451234567",
      "accountName": "บจก. ลอตเตอรี่ แล็บส์",
      "qrPayload": "0002010102...",   // เฉพาะ qr_promptpay
      "minAmount": 10000,
      "maxAmount": 50000000
    }
  ]
}
```

### `GET wallet/transactions?type=&page=`

`type` (optional): `deposit` | `withdraw` | `bonus` | `cashback`

```jsonc
{
  "items": [
    {
      "id": "t1",
      "reference": "DP26082401",
      "type": "deposit",
      "status": "success",       // pending | processing | success | failed | cancelled
      "amount": 100000,
      "balanceAfter": 1284550,   // null ได้ถ้ายังไม่ settle
      "bankAccount": { "bankCode": "KBANK", "bankName": "...", "accountNumber": "..." },
      "note": "โบนัสฝากประจำวัน 10%",
      "createdAt": "2026-08-24T17:00:00.000Z",
      "completedAt": "2026-08-24T17:00:20.000Z"
    }
  ],
  "page": 1, "pageSize": 20, "total": 6
}
```

### `POST wallet/deposits`

แจ้งฝาก — ต้องแนบ `Idempotency-Key`

```jsonc
{ "amount": 100000, "channelId": "dc_1", "promotionId": "promo_daily" }
```

คืน `Transaction` ที่ status เป็น `pending`

### `POST wallet/withdrawals`

ขอถอน — ต้องแนบ `Idempotency-Key`

```jsonc
{ "amount": 50000, "bankAccountId": "ba_1" }
```

คืน `Transaction` ที่ status เป็น `processing`
error ที่รองรับ: `insufficient_balance`, `amount_too_low`

> **แนะนำ:** ควรบังคับ OTP หรือ PIN ก่อนถอนจริง endpoint นี้เตรียมไว้ให้เพิ่ม field ได้

### `POST wallet/cashback/claim`

รับคืนยอดเสีย — ต้องแนบ `Idempotency-Key`

```jsonc
// 200
{ "claimed": 32800, "balance": 1317350 }
```

---

## Promotions

### `GET promotions`

```jsonc
{
  "items": [
    {
      "id": "promo_welcome",
      "title": "โบนัสต้อนรับสมาชิกใหม่ 100%",
      "description": "ฝากครั้งแรกรับโบนัสทันที 100% สูงสุด 1,000 บาท",
      "badge": "100%",
      "minDeposit": 10000,
      "bonusPercent": 100,
      "turnoverMultiplier": 3,
      "startsAt": null,
      "endsAt": null,
      "claimed": false,
      "claimable": true,
      "terms": ["สำหรับสมาชิกใหม่", "ทำยอดครบ 3 เท่าก่อนถอน"]
    }
  ]
}
```

`title` / `description` / `terms` เป็นข้อความสำเร็จรูปจาก backend
หากต้องการหลายภาษา ให้ backend คืนตาม `Accept-Language` ที่ proxy ส่งต่อไป

### `POST promotions/{id}/claim`

รับโปรโมชั่น — ต้องแนบ `Idempotency-Key`
`409` + `already_claimed` เมื่อรับไปแล้ว

---

## Referral

### `GET referral`

```jsonc
{
  "code": "LL8K2M",
  "link": "https://lotterylabs.example/r/LL8K2M",
  "totalFriends": 14,
  "activeFriends": 9,
  "totalCommission": 187450,
  "pendingCommission": 12300,
  "commissionPercent": 1
}
```

### `GET referral/friends?page=`

```jsonc
{
  "items": [
    {
      "id": "f1",
      "maskedName": "สม***ญ",   // ต้อง mask มาจาก backend ห้ามส่งชื่อเต็ม
      "joinedAt": "2026-08-01T04:00:00.000Z",
      "turnover": 1240000,
      "commission": 12400
    }
  ],
  "page": 1, "pageSize": 20, "total": 14
}
```

---

## ข้อควรระวังฝั่ง backend

1. **Validate ทุกอย่างใหม่** — client ส่ง `payout` มาด้วยเพื่อความสะดวกในการแสดงผล
   แต่ต้องคำนวณจากอัตราจริงฝั่ง server เสมอ
2. **Idempotency ไม่ใช่ตัวเลือก** — ถ้าไม่ implement ผู้ใช้จะถูกตัดเงินซ้ำแน่นอน
3. **Rate limit** `auth/login` และ `auth/register`
4. **ห้าม log** เลขบัญชีธนาคารและเบอร์โทรลงระบบ tracking ภายนอก
5. **ปิดรับตามเวลา server** — `closesAt` ที่ส่งให้ client เป็นแค่การแสดงผล
   การตัดสินว่าโพยทันหรือไม่ต้องใช้เวลาฝั่ง server เท่านั้น
