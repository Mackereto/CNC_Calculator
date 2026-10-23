// Report presets, table 3.1: D, z, Vc, fz, band (ae = 60% D always).
export interface Preset {
  code: string;
  label: string;
  D: number;
  z: number;
  Vc: number;
  fz: number;
  band: number;
}

export const PRESETS: Preset[] = [
  { code: 'C01', label: 'C01 · D 1 · ก่อนชุบ', D: 1, z: 4, Vc: 120, fz: 0.01, band: 0 },
  { code: 'C02', label: 'C02 · D 3 · ก่อนชุบ', D: 3, z: 4, Vc: 120, fz: 0.03, band: 0 },
  { code: 'C03', label: 'C03 · D 5 · ก่อนชุบ', D: 5, z: 4, Vc: 120, fz: 0.05, band: 0 },
  { code: 'C04', label: 'C04 · D 8 · ก่อนชุบ', D: 8, z: 6, Vc: 120, fz: 0.08, band: 0 },
  { code: 'C05', label: 'C05 · D 12 · ก่อนชุบ', D: 12, z: 6, Vc: 120, fz: 0.12, band: 0 },
  { code: 'C06', label: 'C06 · D 1 · หลังชุบ', D: 1, z: 4, Vc: 70, fz: 0.007, band: 2 },
  { code: 'C07', label: 'C07 · D 3 · หลังชุบ', D: 3, z: 4, Vc: 70, fz: 0.021, band: 2 },
  { code: 'C08', label: 'C08 · D 5 · หลังชุบ', D: 5, z: 4, Vc: 70, fz: 0.035, band: 2 },
  { code: 'C09', label: 'C09 · D 8 · หลังชุบ', D: 8, z: 6, Vc: 70, fz: 0.056, band: 2 },
  { code: 'C10', label: 'C10 · D 12 · หลังชุบ', D: 12, z: 6, Vc: 70, fz: 0.084, band: 2 },
];
