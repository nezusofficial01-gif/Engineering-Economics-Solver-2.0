import React, { useMemo, useState } from "react";
import { Calculator, BookOpen, FileText, RotateCcw, Copy, Printer, ChevronDown, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  money, number, pct, parseCashflows, npv, factorAP, factorPA, factorFA,
  factorAF, gradientPresentWorth, gradientFutureWorth, annualEquivalent,
  extractNarrative
} from "./engine";

const methods = [
  ["single","Single Payment","P dan F dari satu arus kas"],
  ["uniform","Uniform Series","P, F, atau A dari arus kas seragam"],
  ["gradient","Arithmetic Gradient","Arus kas dengan perubahan tetap"],
  ["npv","Net Present Value (NPV)","Nilai sekarang bersih investasi"],
  ["ae","Annual Equivalent (AE)","Nilai tahunan ekuivalen"],
  ["interest","Interest","Bunga nominal dan efektif"]
];

const initialCashflows = "0,-100000000\n1,-10000000\n2,-10000000\n3,20000000\n4,20000000\n5,20000000\n6,20000000\n7,20000000";

function Field({label, value, onChange, type="number", hint, step="any"}) {
  return <label className="field"><span>{label}</span><input type={type} step={step} value={value} onChange={e=>onChange(e.target.value)} /><small>{hint}</small></label>;
}
function SelectField({label,value,onChange,options}) {
  return <label className="field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>;
}
function App() {
  const [method,setMethod] = useState("npv");
  const [narrative,setNarrative] = useState("");
  const [rate,setRate] = useState("10");
  const [n,setN] = useState("7");
  const [amount,setAmount] = useState("100000000");
  const [mode,setMode] = useState("P");
  const [g,setG] = useState("500000");
  const [principal,setPrincipal] = useState("67073235");
  const [nominal,setNominal] = useState("7");
  const [frequency,setFrequency] = useState("2");
  const [years,setYears] = useState("1");
  const [flowsText,setFlowsText] = useState(initialCashflows);
  const [confirmed,setConfirmed] = useState(false);
  const [result,setResult] = useState(null);
  const [error,setError] = useState("");
  const [parseNote,setParseNote] = useState("");
  const [showSteps,setShowSteps] = useState(true);

  const rateValue = Number(rate)/100;
  const nValue = Number(n);
  const fieldsSummary = useMemo(() => {
    if (method==="npv" || method==="ae") return parseCashflowsSafe(flowsText);
    return [];
  }, [flowsText,method]);

  function resetResult(){setResult(null);setError("");setConfirmed(false);}
  function changeMethod(v){setMethod(v);resetResult();}
  function parseText(){
    if(!narrative.trim()){setParseNote("Tempel narasi soal terlebih dahulu.");return;}
    try {
      const p=extractNarrative(narrative);
      setMethod(p.method==="single-f"||p.method==="single-p"?"single":p.method);
      if(p.rates.length)setRate(String(p.rates[p.rates.length-1]));
      if(p.years.length){
        const last=p.years[p.years.length-1];
        setN(String(Number(last[2]||last[1])));
      }
      if(p.amounts.length)setAmount(String(p.amounts[0].value));
      setParseNote(`Indikasi metode: ${p.method}. Ditemukan ${p.amounts.length} kandidat angka, ${p.rates.length} kandidat bunga. Periksa dan lengkapi semua data secara manual; parser belum menentukan makna setiap angka.`);
      resetResult();
    } catch(e){setParseNote(e.message);}
  }
  function calculate(){
    try {
      const i=Number(rate)/100;
      if(!Number.isFinite(i)||i<0)throw new Error("Suku bunga harus berupa angka nonnegatif.");
      let answer,label,steps=[],checks=[];
      if(method==="single"){
        const x=Number(amount), periods=Number(n);
        if(!Number.isFinite(x)||x<0||!Number.isInteger(periods)||periods<0)throw new Error("Nilai arus kas harus nonnegatif dan periode bilangan bulat nonnegatif.");
        answer=mode==="P"?x/Math.pow(1+i,periods):x*Math.pow(1+i,periods);
        label=mode==="P"?"Present Worth (P)":"Future Worth (F)";
        steps=[`Diketahui: nilai arus kas = ${money(x)}, i = ${pct(i)} per periode, n = ${periods} periode.`,
          mode==="P"?"Rumus: P = F / (1+i)ⁿ":"Rumus: F = P × (1+i)ⁿ",
          mode==="P"?`P = ${money(x)} / (1 + ${i})^${periods}`:`F = ${money(x)} × (1 + ${i})^${periods}`,
          `Hasil ${label} = ${money(answer)}.`];
        checks=["Bunga dan periode diasumsikan memiliki satuan waktu yang sama.","Bunga majemuk digunakan."];
      } else if(method==="uniform"){
        const x=Number(amount), periods=Number(n);
        if(!Number.isFinite(x)||x<0||!Number.isInteger(periods)||periods<=0)throw new Error("Nilai harus nonnegatif dan jumlah periode harus bilangan bulat positif.");
        const factors={P:factorPA(i,periods),F:factorFA(i,periods),AfromP:factorAP(i,periods),AfromF:factorAF(i,periods)};
        answer=x*factors[mode];
        label=mode==="P"?"Present Worth (P)":mode==="F"?"Future Worth (F)":"Pembayaran/setoran periodik (A)";
        const formulas={P:"P = A × (P/A, i, n)",F:"F = A × (F/A, i, n)",AfromP:"A = P × (A/P, i, n)",AfromF:"A = F × (A/F, i, n)"};
        steps=[`Diketahui: nilai input = ${money(x)}, i = ${pct(i)}, n = ${periods}.`,`Rumus: ${formulas[mode]}`,`Faktor yang digunakan = ${number(factors[mode])}.`,`Hasil = ${money(answer)}.`];
        checks=["Arus kas diasumsikan sama besar dan terjadi pada akhir setiap periode.","Satuan periode bunga harus sama dengan periode arus kas."];
      } else if(method==="gradient"){
        const G=Number(g), periods=Number(n);
        if(!Number.isFinite(G)||G<0||!Number.isInteger(periods)||periods<=0)throw new Error("Gradient harus nonnegatif dan periode bilangan bulat positif.");
        answer=mode==="P"?gradientPresentWorth(G,i,periods):gradientFutureWorth(G,i,periods);
        label=mode==="P"?"Present Worth Gradient (P/G)":"Future Worth Gradient (F/G)";
        steps=[`Diketahui: G = ${money(G)}, i = ${pct(i)}, n = ${periods}.`,
          mode==="P"?"Rumus: P/G = [(1+i)ⁿ − i·n − 1] / [i²(1+i)ⁿ]":"Rumus: F/G = [(1+i)ⁿ − i·n − 1] / i²",
          `Nilai gradient ekuivalen = ${money(answer)}.`];
        checks=["Gradient murni diasumsikan 0 pada periode pertama, G pada periode kedua, dan seterusnya.","Jika ada arus kas dasar seragam, hitung komponen tersebut secara terpisah dengan Uniform Series."];
      } else if(method==="interest"){
        const P=Number(principal), j=Number(nominal)/100, m=Number(frequency), t=Number(years);
        if(!Number.isFinite(P)||P<0||!Number.isFinite(j)||j<0||!Number.isInteger(m)||m<=0||!Number.isFinite(t)||t<0)throw new Error("Periksa modal, bunga, frekuensi, dan durasi.");
        const effective=Math.pow(1+j/m,m)-1;
        answer=P*Math.pow(1+j/m,m*t);
        label="Future Value (F)";
        steps=[`Diketahui: P = ${money(P)}, nominal j = ${pct(j)}, m = ${m} kali/tahun, t = ${t} tahun.`,
          `Bunga per periode = j/m = ${pct(j/m)}.`,
          `Bunga efektif tahunan = (1 + j/m)ᵐ − 1 = ${pct(effective)}.`,
          `F = P × (1 + j/m)ᵐᵗ = ${money(answer)}.`];
        checks=[`Penggandaan bunga ${m} kali per tahun.`,`Bunga efektif tahunan ${pct(effective)}.`];
      } else {
        const flows=parseCashflows(flowsText);
        const maxYear=Math.max(...flows.map(x=>x.year));
        const periods=method==="ae"?Number(n):maxYear;
        if(method==="ae"&&(!Number.isInteger(periods)||periods<=0||maxYear>periods))throw new Error("Umur analisis harus bilangan bulat positif dan mencakup semua arus kas.");
        const pv=npv(flows,i);
        answer=method==="ae"?annualEquivalent(flows,i,periods):pv;
        label=method==="ae"?"Annual Equivalent (AE)":"Net Present Value (NPV)";
        steps=[`Diketahui: i = ${pct(i)} per periode; umur analisis = ${periods} periode.`,
          "Tabel arus kas dan present worth:",
          ...flows.map(cf=>`Tahun ${cf.year}: CF = ${money(cf.amount)}; PW = ${money(cf.amount/Math.pow(1+i,cf.year))}.`),
          `NPV = Σ CFₜ/(1+i)ᵗ = ${money(pv)}.`,
          ...(method==="ae"?[`AE = NPV × (A/P, i, n) = ${money(pv)} × ${number(factorAP(i,periods))} = ${money(answer)}.`]:[])];
        checks=["Arus kas positif berarti penerimaan dan negatif berarti pengeluaran.","Arus kas didiskontokan ke periode 0.","Arus kas diasumsikan terjadi pada akhir periode."];
      }
      setResult({answer,label,steps,checks,method});
      setError("");setConfirmed(true);
    } catch(e){setResult(null);setError(e.message);}
  }
  const academicText = result ? [
    `METODE: ${result.label}`,
    "DIKETAHUI:",
    method==="npv"||method==="ae"?flowsText: `i = ${rate}% per periode; n = ${n} periode.`,
    "DITANYA: "+result.label,
    "PENYELESAIAN:",
    ...result.steps,
    "KESIMPULAN:",
    result.method==="npv"?(result.answer>0?"NPV positif, sehingga investasi layak berdasarkan tingkat bunga yang digunakan.":result.answer<0?"NPV negatif, sehingga investasi tidak layak berdasarkan tingkat bunga yang digunakan.":"NPV sama dengan nol, sehingga berada pada titik impas.") :
    result.method==="ae"?(result.answer>0?"AE bersih positif.":"AE bersih negatif."):"Hasil perhitungan diperoleh sesuai asumsi periode dan bunga yang dicantumkan.",
    "HASIL AKHIR: "+money(result.answer)
  ].join("\n\n") : "";

  async function copyResult(){
    if(!academicText)return;
    try{await navigator.clipboard.writeText(academicText);alert("Jawaban akademik berhasil disalin.");}
    catch{alert("Clipboard tidak tersedia. Silakan pilih dan salin teks hasil secara manual.");}
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark"><Calculator size={23}/></div>
      <div className="brand-copy"><strong>Engineering Economics Solver</strong><span>Alat bantu perhitungan Ekonomi Teknik</span></div>
      <span className="version">V1.0 · BETA</span>
    </header>
    <main className="layout">
      <aside className="sidebar">
        <div className="side-title">MODUL PERHITUNGAN</div>
        {methods.map(([id,title,sub])=><button key={id} className={`nav-item ${method===id?"active":""}`} onClick={()=>changeMethod(id)}>
          <span className="nav-dot"/><span><b>{title}</b><small>{sub}</small></span>
        </button>)}
        <div className="side-note"><BookOpen size={17}/><span>Gunakan hasil sebagai alat bantu belajar. Periksa asumsi dan satuan sebelum mengumpulkan jawaban.</span></div>
      </aside>
      <section className="workspace">
        <div className="page-heading"><div><div className="eyebrow">ENGINEERING ECONOMICS</div><h1>Problem Solver</h1><p>Masukkan soal, periksa data, lalu susun penyelesaian akademik.</p></div><span className="status-pill"><span/> Calculation engine aktif</span></div>
        <div className="mode-grid">
          <section className="card input-card">
            <div className="card-heading"><div><span className="step-no">01</span><div><h2>Input soal</h2><p>Pilih metode dan masukkan data perhitungan.</p></div></div></div>
            <div className="method-select"><label>METODE PERHITUNGAN</label><select value={method} onChange={e=>changeMethod(e.target.value)}>{methods.map(([id,title])=><option value={id} key={id}>{title}</option>)}</select></div>
            <div className="narrative-box">
              <label>INPUT NARASI SOAL <span className="optional">OPSIONAL</span></label>
              <textarea value={narrative} onChange={e=>setNarrative(e.target.value)} placeholder="Tempel soal dari dosen di sini. Contoh: Investasi awal Rp100 juta, biaya operasional Rp10 juta per tahun selama 7 tahun, pendapatan Rp30 juta per tahun mulai tahun ke-3 sampai ke-7, bunga 10%." rows="4"/>
              <div className="narrative-actions"><button className="btn btn-light" onClick={parseText}><FileText size={15}/> Identifikasi narasi</button><span className="helper">Parser awal: hasil ekstraksi wajib diperiksa.</span></div>
              {parseNote&&<div className="notice"><AlertTriangle size={15}/>{parseNote}</div>}
            </div>
            <div className="section-rule"><span>DATA PERHITUNGAN</span></div>
            <div className="form-grid">
              {(method==="npv"||method==="ae") ? <>
                <Field label="Tingkat bunga per periode (%)" value={rate} onChange={v=>{setRate(v);resetResult();}} hint="Contoh: 10 untuk 10%."/>
                {method==="ae"&&<Field label="Umur analisis (periode)" value={n} onChange={v=>{setN(v);resetResult();}} hint="Jumlah periode ekuivalensi tahunan."/>}
              </> : method==="single" ? <>
                <SelectField label="Nilai yang dicari" value={mode} onChange={v=>{setMode(v);resetResult();}} options={[["P","Present Worth (P)"],["F","Future Worth (F)"]]}/>
                <Field label="Nilai arus kas (Rp)" value={amount} onChange={v=>{setAmount(v);resetResult();}}/>
                <Field label="Bunga per periode (%)" value={rate} onChange={v=>{setRate(v);resetResult();}}/>
                <Field label="Jumlah periode (n)" value={n} onChange={v=>{setN(v);resetResult();}}/>
              </> : method==="uniform" ? <>
                <SelectField label="Nilai yang dicari" value={mode} onChange={v=>{setMode(v);resetResult();}} options={[["P","Present Worth (P) dari A"],["F","Future Worth (F) dari A"],["AfromP","Angsuran A dari P"],["AfromF","Setoran A dari F"]]}/>
                <Field label="Nilai A atau pokok (Rp)" value={amount} onChange={v=>{setAmount(v);resetResult();}}/>
                <Field label="Bunga per periode (%)" value={rate} onChange={v=>{setRate(v);resetResult();}}/>
                <Field label="Jumlah periode (n)" value={n} onChange={v=>{setN(v);resetResult();}}/>
              </> : method==="gradient" ? <>
                <SelectField label="Nilai yang dicari" value={mode} onChange={v=>{setMode(v);resetResult();}} options={[["P","Present Worth (P)"],["F","Future Worth (F)"]]}/>
                <Field label="Kenaikan per periode (G) (Rp)" value={g} onChange={v=>{setG(v);resetResult();}}/>
                <Field label="Bunga per periode (%)" value={rate} onChange={v=>{setRate(v);resetResult();}}/>
                <Field label="Jumlah periode gradient" value={n} onChange={v=>{setN(v);resetResult();}}/>
              </> : <>
                <Field label="Modal awal (P) (Rp)" value={principal} onChange={v=>{setPrincipal(v);resetResult();}}/>
                <Field label="Bunga nominal tahunan (%)" value={nominal} onChange={v=>{setNominal(v);resetResult();}}/>
                <SelectField label="Frekuensi penggandaan" value={frequency} onChange={v=>{setFrequency(v);resetResult();}} options={[["1","Tahunan"],["2","Semesteran"],["3","Setiap 4 bulan"],["4","Kuartalan"],["6","Dua bulanan"],["12","Bulanan"]]}/>
                <Field label="Lama investasi (tahun)" value={years} onChange={v=>{setYears(v);resetResult();}}/>
              </>}
            </div>
            {(method==="npv"||method==="ae")&&<div className="cashflow-editor">
              <div className="cashflow-title"><div><b>Arus kas per periode</b><small>Format: tahun,nominal · Positif = penerimaan, negatif = pengeluaran.</small></div><button className="text-button" onClick={()=>setFlowsText(initialCashflows)}>Muat contoh soal</button></div>
              <textarea value={flowsText} onChange={e=>{setFlowsText(e.target.value);resetResult();}} rows="7" spellCheck="false"/>
              <div className="helper">Contoh: 0,-100000000 berarti investasi awal Rp100 juta.</div>
              {fieldsSummary.length>0&&<div className="preview-table"><b>Pratinjau arus kas</b><table><thead><tr><th>Tahun</th><th>Arus kas</th></tr></thead><tbody>{fieldsSummary.map((f,i)=><tr key={i}><td>{f.year}</td><td>{money(f.amount)}</td></tr>)}</tbody></table></div>}
            </div>}
            <div className="form-footer"><span className="helper">Pastikan satuan bunga sama dengan satuan periode arus kas.</span><button className="btn btn-primary" onClick={calculate}><Calculator size={16}/> Hitung sekarang</button></div>
            {error&&<div className="error-box"><AlertTriangle size={16}/>{error}</div>}
          </section>
          <section className="card output-card">
            <div className="card-heading"><div><span className="step-no">02</span><div><h2>Hasil penyelesaian</h2><p>Rincian perhitungan dan jawaban akademik.</p></div></div></div>
            {!result?<div className="empty-state"><div className="empty-icon"><Calculator size={30}/></div><h3>Belum ada hasil</h3><p>Pilih metode, lengkapi data, lalu tekan <b>Hitung sekarang</b>. Hasil akan ditampilkan di sini.</p><div className="empty-check"><CheckCircle2 size={15}/> Perhitungan dilakukan secara lokal</div><div className="empty-check"><CheckCircle2 size={15}/> Tidak membutuhkan API berbayar</div></div>:
              <div className="result-content">
                <div className="answer-panel"><span>HASIL AKHIR · {result.label.toUpperCase()}</span><strong>{money(result.answer)}</strong><small>{result.method==="npv"?(result.answer>0?"NPV positif · Layak berdasarkan asumsi":result.answer<0?"NPV negatif · Tidak layak berdasarkan asumsi":"NPV nol · Titik impas"):result.method==="ae"?"Nilai tahunan ekuivalen bersih":"Hasil perhitungan ekuivalen"}</small></div>
                <div className="academic-section">
                  <div className="result-heading"><h3>Langkah penyelesaian</h3><button className="text-button" onClick={()=>setShowSteps(!showSteps)}>{showSteps?"Sembunyikan":"Tampilkan"} <ChevronDown size={14}/></button></div>
                  {showSteps&&<ol className="steps-list">{result.steps.map((s,i)=><li key={i}><span>{i+1}</span><p>{s}</p></li>)}</ol>}
                </div>
                <div className="checks-panel"><b><CheckCircle2 size={16}/> Pemeriksaan dan asumsi</b>{result.checks.map((c,i)=><p key={i}>• {c}</p>)}</div>
                <div className="result-actions"><button className="btn btn-light" onClick={copyResult}><Copy size={15}/> Salin jawaban</button><button className="btn btn-light" onClick={()=>window.print()}><Printer size={15}/> Cetak</button></div>
                <div className="academic-text"><b>Pratinjau jawaban akademik</b><pre>{academicText}</pre></div>
              </div>}
          </section>
        </div>
        <footer>ENGINEERING ECONOMICS SOLVER · Versi awal untuk pembelajaran · Verifikasi asumsi sebelum menggunakan hasil.</footer>
      </section>
    </main>
  </div>;
}

function parseCashflowsSafe(text){
  try{return parseCashflows(text);}catch{return [];}
}

export default App;