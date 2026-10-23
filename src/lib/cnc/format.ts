// Number formatting twins from index.html: trim() strips trailing zeros,
// fmt() uses en-US grouping with fixed decimals. Lockstep pair used by
// every readout, note, and reference table — keep together.
export function trim(v: number, dp: number): string {
  return parseFloat(v.toFixed(dp)).toString();
}

export function fmt(v: number, dp: number): string {
  return v.toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}
