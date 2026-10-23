// Workpiece materials and hardness bands (spec sections 5-5.2).
export interface MaterialOption {
  value: string;
  label: string;
  hardness: string;
}

export const MATERIALS: MaterialOption[] = [
  { value: '0', label: 'SCM440 ก่อนชุบ (อบอ่อน)', hardness: 'ประมาณ ≤30 HRC' },
  { value: '0', label: 'SCM440 Pre-hardened', hardness: 'ประมาณ 28–34 HRC' },
  { value: '1', label: 'SCM440 ชุบแข็ง', hardness: 'ประมาณ 48–55 HRC' },
  { value: '1', label: 'SKD61 ชุบแข็ง', hardness: 'ประมาณ 48–52 HRC' },
  { value: '2', label: 'SKD11 ชุบแข็ง', hardness: 'ประมาณ 58–62 HRC' },
  { value: '0', label: 'SKD61 / SKD11 อบอ่อน', hardness: 'ประมาณ ≤255 HB' },
  { value: '0', label: 'NAK80', hardness: 'ประมาณ 37–43 HRC' },
  { value: '0', label: 'S45C / S50C', hardness: 'ประมาณ 160–220 HB' },
  { value: '2', label: 'DC53 ชุบแข็ง', hardness: 'ประมาณ 60–62 HRC' },
  { value: '1', label: 'SUS420J2 ชุบแข็ง', hardness: 'ประมาณ 50–54 HRC' },
  { value: '3', label: 'SKH51 (HSS) ชุบแข็ง', hardness: 'ประมาณ 62–65 HRC' },
  {
    value: '4',
    label: 'Nylon (ไนลอนหล่อ MC สีฟ้า) · พลาสติก',
    hardness:
      'พลาสติก ไม่ใช่โลหะ (Harvey Tool จัดอยู่ในกลุ่มพลาสติกไม่เติมสาร ความแข็ง Rockwell R 100–150)',
  },
  { value: 'custom', label: 'อื่น ๆ (เลือกช่วงความแข็งเอง)', hardness: '' },
];

export interface BandOption {
  value: string;
  label: string;
}

export const BAND_OPTIONS: BandOption[] = [
  { value: '0', label: 'ไม่เกิน 45 HRC (เช่น SCM440 ก่อนชุบ)' },
  { value: '1', label: '45–55 HRC' },
  { value: '2', label: '55–62 HRC' },
  { value: '3', label: '62–66 HRC' },
  { value: '4', label: 'Nylon / พลาสติก · เก็บผิว (ae 0.10D, ap 3D)' },
  { value: '5', label: 'Nylon / พลาสติก · กึ่งหยาบ (ae 0.35D, ap 1D)' },
];
