/**
 * Display names for the market codes `GET lotto/results` returns.
 *
 * The archive API sends the code only — no name, logo or group — and none of the
 * other market endpoints carry the code, so there is nothing to join on. Until the
 * backend adds `market_name` to the archive response these are maintained by hand;
 * an unknown code falls back to a readable form of the code itself.
 */

export type ArchiveFamily = 'hanoi' | 'lao' | 'stock';

export const ARCHIVE_FAMILY_ORDER: ArchiveFamily[] = ['hanoi', 'lao', 'stock'];

const MARKETS: Record<string, [label: string, family: ArchiveFamily]> = {
  // Hanoi
  'hanoi-asean': ['ฮานอยอาเซียน', 'hanoi'],
  'hanoi-develop': ['ฮานอยพัฒนา', 'hanoi'],
  'hanoi-extra': ['ฮานอยเอ็กซ์ตร้า', 'hanoi'],
  'hanoi-harmonious': ['ฮานอยสามัคคี', 'hanoi'],
  'hanoi-hd': ['ฮานอย HD', 'hanoi'],
  'hanoi-normal': ['ฮานอยปกติ', 'hanoi'],
  'hanoi-redcross': ['ฮานอยกาชาด', 'hanoi'],
  'hanoi-special': ['ฮานอยพิเศษ', 'hanoi'],
  'hanoi-star': ['ฮานอยสตาร์', 'hanoi'],
  'hanoi-tv': ['ฮานอย TV', 'hanoi'],
  'hanoi-vip': ['ฮานอย VIP', 'hanoi'],
  'hanoi-visa': ['ฮานอย VISA', 'hanoi'],
  ketqua4d: ['ฮานอย 4D', 'hanoi'],
  xosokqx: ['เวียดนามปกติ ออนไลน์', 'hanoi'],
  xsktvn: ['ฮานอยเช้า', 'hanoi'],

  // Lao
  'lao-visa': ['ลาว VISA', 'lao'],
  laohungheuong: ['ลาวรุ่งเรือง', 'lao'],
  laojaroen: ['ลาวเจริญ', 'lao'],
  laokaownah: ['ลาวก้าวหน้า', 'lao'],
  laomongkol: ['ลาวมงคล', 'lao'],
  laomungkung: ['ลาวมั่งคั่ง', 'lao'],
  laomunkong: ['ลาวมั่นคง', 'lao'],
  laoplus: ['ลาวพลัส', 'lao'],
  laorumruay: ['ลาวร่ำรวย', 'lao'],
  'laos-asean': ['ลาวอาเซียน', 'lao'],
  'laos-doorwin': ['ลาวประตูชัย', 'lao'],
  'laos-harmonious': ['ลาวสามัคคี', 'lao'],
  'laos-harmoniousvip': ['ลาวสามัคคี VIP', 'lao'],
  'laos-hd': ['ลาว HD', 'lao'],
  'laos-peace': ['ลาวสันติภาพ', 'lao'],
  'laos-phathana': ['ลาวพัฒนา', 'lao'],
  'laos-population': ['ประชาชนลาว', 'lao'],
  'laos-redcross': ['ลาวกาชาด', 'lao'],
  'laos-starvip': ['ลาวสตาร์ VIP', 'lao'],
  'laos-strar': ['ลาวสตาร์', 'lao'],
  'laos-tv': ['ลาว TV', 'lao'],
  'laos-vip': ['ลาว VIP', 'lao'],
  laosiyara: ['ลาวไอยรา', 'lao'],
  laosniyom: ['ลาวนิยม', 'lao'],
  laossabaidee: ['ลาวสบายดี', 'lao'],
  laosspecial: ['ลาวพิเศษ', 'lao'],
  laosuper: ['ลาวซูเปอร์', 'lao'],
  loasnakonluuang: ['ลาวนครหลวง', 'lao'],
  'luangprabang-visa': ['หลวงพระบาง VISA', 'lao'],
  'salavan-visa': ['สาละวัน VISA', 'lao'],
  'vientiane-visa': ['เวียงจันทน์ VISA', 'lao'],

  // Stock / foreign
  'chaina-afternoon': ['หุ้นจีน บ่าย', 'stock'],
  'chaina-morning': ['หุ้นจีน เช้า', 'stock'],
  'chaina-stocka': ['จีน หุ้นบ่าย', 'stock'],
  'china-stockm': ['จีน หุ้นเช้า', 'stock'],
  'szse-visa-afternoon': ['จีน VISA บ่าย', 'stock'],
  'szse-visa-morning': ['จีน VISA เช้า', 'stock'],
  'dax-visa': ['เยอรมัน VISA', 'stock'],
  'germany-stock': ['เยอรมัน หุ้น', 'stock'],
  'germany-vip': ['เยอรมัน VIP', 'stock'],
  'dowjones-visa': ['ดาวโจนส์ VISA', 'stock'],
  'downjone-extra': ['ดาวโจนส์ เอ็กซ์ตร้า', 'stock'],
  'downjone-midnight': ['ดาวโจนส์ มิดไนท์', 'stock'],
  'downjone-star': ['ดาวโจนส์ สตาร์', 'stock'],
  'downjone-stock': ['ดาวโจนส์ หุ้น', 'stock'],
  'downjone-vip': ['ดาวโจนส์ VIP', 'stock'],
  'egypt-stock': ['อียิปต์ หุ้น', 'stock'],
  'england-stock': ['อังกฤษ หุ้น', 'stock'],
  'england-vip': ['อังกฤษ VIP', 'stock'],
  'ftse-visa': ['อังกฤษ VISA', 'stock'],
  'hangseng-afternoon': ['ฮั่งเส็ง บ่าย', 'stock'],
  'hangseng-morning': ['ฮั่งเส็ง เช้า', 'stock'],
  'hangseng-stocka': ['ฮั่งเส็ง หุ้นบ่าย', 'stock'],
  'hangseng-stockm': ['ฮั่งเส็ง หุ้นเช้า', 'stock'],
  'hangseng-visa-afternoon': ['ฮั่งเส็ง VISA บ่าย', 'stock'],
  'hangseng-visa-morning': ['ฮั่งเส็ง VISA เช้า', 'stock'],
  'hongkong-visa': ['ฮ่องกง VISA', 'stock'],
  'india-stock': ['อินเดีย หุ้น', 'stock'],
  'korea-stock': ['เกาหลี หุ้น', 'stock'],
  'korea-vip': ['เกาหลี VIP', 'stock'],
  'malasia-lotto': ['มาเลเซีย', 'stock'],
  'moexbluechip-visa': ['รัสเซีย VISA', 'stock'],
  'nikkei-afternoon': ['นิเคอิ บ่าย', 'stock'],
  'nikkei-morning': ['นิเคอิ เช้า', 'stock'],
  'nikkei-stocka': ['นิเคอิ หุ้นบ่าย', 'stock'],
  'nikkei-stockm': ['นิเคอิ หุ้นเช้า', 'stock'],
  'nikkei-visa-afternoon': ['นิเคอิ VISA บ่าย', 'stock'],
  'nikkei-visa-morning': ['นิเคอิ VISA เช้า', 'stock'],
  'russia-vip': ['รัสเซีย VIP', 'stock'],
  'singapore-stock': ['สิงคโปร์ หุ้น', 'stock'],
  'singapore-vip': ['สิงคโปร์ VIP', 'stock'],
  'taiwan-stock': ['ไต้หวัน หุ้น', 'stock'],
  'taiwan-vip': ['ไต้หวัน VIP', 'stock'],
  'thai-stocke': ['หุ้นไทย เย็น', 'stock'],
};

/** Best-effort family for a code the table doesn't know yet. */
function guessFamily(code: string): ArchiveFamily {
  if (/hanoi|xoso|xskt|ketqua/.test(code)) return 'hanoi';
  if (/^(lao|loas)/.test(code)) return 'lao';
  return 'stock';
}

export function archiveMarketLabel(code: string): string {
  return (
    MARKETS[code]?.[0] ??
    code
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

export function archiveMarketFamily(code: string): ArchiveFamily {
  return MARKETS[code]?.[1] ?? guessFamily(code);
}
