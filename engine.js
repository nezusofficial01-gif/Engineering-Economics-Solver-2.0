// Pure calculation functions. Cash flows occur at period-end unless noted.
export const money = (x) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 2
}).format(x);

export const number = (x) => new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 8
}).format(x);

export const pct = (x) => `${(x * 100).toLocaleString("id-ID", { maximumFractionDigits: 6 })}%`;

export function parseCashflows(text) {
  const rows = text.split(/\n/).map(s => s.trim()).filter(Boolean).map((line, idx) => {
    const parts = line.split(/[;,]/).map(s => s.trim());
    if (parts.length !== 2) throw new Error(`Baris ${idx + 1}: gunakan format tahun,nominal.`);
    const year = Number(parts[0]);
    const amount = Number(parts[1].replace(/\s/g, ""));
    if (!Number.isInteger(year) || year < 0 || !Number.isFinite(amount)) {
      throw new Error(`Baris ${idx + 1}: tahun atau nominal tidak valid.`);
    }
    return { year, amount };
  });
  if (!rows.length) throw new Error("Masukkan minimal satu baris arus kas.");
  const map = new Map();
  rows.forEach(({year, amount}) => map.set(year, (map.get(year) || 0) + amount));
  return [...map.entries()].sort((a,b) => a[0]-b[0]).map(([year, amount]) => ({year, amount}));
}

export function npv(cashflows, rate) {
  return cashflows.reduce((sum, cf) => sum + cf.amount / Math.pow(1 + rate, cf.year), 0);
}
export function factorAP(i,n) {
  if (n <= 0) throw new Error("Jumlah periode harus lebih dari nol.");
  return i === 0 ? 1/n : i * Math.pow(1+i,n) / (Math.pow(1+i,n)-1);
}
export function factorPA(i,n) {
  if (n <= 0) throw new Error("Jumlah periode harus lebih dari nol.");
  return i === 0 ? n : (Math.pow(1+i,n)-1)/(i*Math.pow(1+i,n));
}
export function factorFA(i,n) {
  if (n <= 0) throw new Error("Jumlah periode harus lebih dari nol.");
  return i === 0 ? n : (Math.pow(1+i,n)-1)/i;
}
export function factorAF(i,n) {
  if (n <= 0) throw new Error("Jumlah periode harus lebih dari nol.");
  return i === 0 ? 1/n : i/(Math.pow(1+i,n)-1);
}
export function gradientPresentWorth(G,i,n) {
  if (n <= 0) throw new Error("Jumlah periode gradient harus lebih dari nol.");
  if (i === 0) return G*n*(n-1)/2;
  return G * (Math.pow(1+i,n)-i*n-1) / (i*i*Math.pow(1+i,n));
}
export function gradientFutureWorth(G,i,n) {
  if (n <= 0) throw new Error("Jumlah periode gradient harus lebih dari nol.");
  if (i === 0) return G*n*(n-1)/2;
  return G * (Math.pow(1+i,n)-i*n-1) / (i*i);
}
export function annualEquivalent(cashflows, rate, n) {
  if (!Number.isInteger(n) || n <= 0) throw new Error("Umur analisis harus bilangan bulat positif.");
  if (Math.max(...cashflows.map(x => x.year)) > n) throw new Error("Ada arus kas setelah umur analisis.");
  return npv(cashflows, rate) * factorAP(rate,n);
}

// Conservative parser: extracts only obvious values. User must review every field.
export function extractNarrative(text) {
  const lower = text.toLowerCase();
  const rates = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].map(m => Number(m[1].replace(",", ".")));
  const years = [...text.matchAll(/(?:selama|tahun ke-|tahun)\s*(\d+)(?:\s*(?:sampai|hingga|-)\s*(\d+))?/gi)];
  const amounts = [...text.matchAll(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(miliar|juta|ribu)?/gi)]
    .map(m => {
      const v = Number(m[1].replace(/\./g,"").replace(",", "."));
      const unit = (m[2] || "").toLowerCase();
      return { raw:m[0], value:v * ({miliar:1e9,juta:1e6,ribu:1e3}[unit] || 1) };
    });
  let method = "npv";
  if (lower.includes("annual equivalent") || /\bae\b/.test(lower)) method = "ae";
  else if (lower.includes("gradient") || lower.includes("meningkat") || lower.includes("kenaikan")) method = "gradient";
  else if (lower.includes("cicilan") || lower.includes("angsuran") || lower.includes("setoran")) method = "uniform";
  else if (lower.includes("future worth") || lower.includes("nilai masa depan")) method = "single-f";
  else if (lower.includes("present worth") || lower.includes("nilai sekarang")) method = "single-p";
  return { method, rates, years, amounts };
}