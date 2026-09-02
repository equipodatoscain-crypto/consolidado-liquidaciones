const state={rows:[],filtered:[],charts:{}};
const $=(id)=>document.getElementById(id);
const money=new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0});
const dateFmt=new Intl.DateTimeFormat("es-CO",{year:"numeric",month:"short",day:"2-digit"});
const palette={"APROBADA":"#10b981","EN REVISIÓN":"#f59e0b","PENDIENTE":"#3b82f6","RECHAZADA":"#ef4444"};

function safeDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?null:date}
function unique(key){return [...new Set(state.rows.map(row=>row[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"))}
function fillSelect(id,values){const select=$(id);const first=select.options[0];select.replaceChildren(first,...values.map(value=>new Option(value,value)))}
function statusClass(status){return status.includes("APROB")?"aprobada":status.includes("REVIS")?"revision":status.includes("RECH")?"rechazada":"pendiente"}
function showToast(message,error=false){const toast=$("toast");toast.textContent=message;toast.className=`toast show${error?" error":""}`;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.className="toast",3000)}

function applyFilters(){
  const from=$("dateFrom").value,to=$("dateTo").value,unit=$("unitFilter").value,status=$("statusFilter").value,term=$("searchFilter").value.trim().toLocaleLowerCase("es");
  state.filtered=state.rows.filter(row=>{
    const date=String(row.fecha||"").slice(0,10);
    const haystack=[row.id,row.contrato,row.ruta,row.beneficiario,row.concepto,row.segmento].join(" ").toLocaleLowerCase("es");
    return(!from||date>=from)&&(!to||date<=to)&&(!unit||row.unidad===unit)&&(!status||row.estado===status)&&(!term||haystack.includes(term));
  });
  render();
}

function render(){
  const rows=state.filtered,total=rows.reduce((sum,row)=>sum+(Number(row.valor)||0),0),approved=rows.filter(row=>row.estado.includes("APROB")),pending=rows.filter(row=>row.estado.includes("PEND")||row.estado.includes("REVIS"));
  $("kpiTotal").textContent=money.format(total);$("kpiApproved").textContent=approved.length;$("kpiApprovedPct").textContent=`${rows.length?Math.round(approved.length/rows.length*100):0}% del total`;$("kpiPending").textContent=pending.length;$("kpiRecords").textContent=rows.length;$("kpiAverage").textContent=`Promedio ${money.format(rows.length?total/rows.length:0)}`;$("resultCount").textContent=`${rows.length} ${rows.length===1?"resultado":"resultados"}`;$("tableSummary").textContent=`Mostrando ${rows.length} de ${state.rows.length} registros`;
  $("tableBody").innerHTML=rows.map(row=>`<tr><td><span class="cell-main">${escapeHtml(row.id)}</span></td><td>${row.fecha&&safeDate(row.fecha)?dateFmt.format(safeDate(row.fecha)):"—"}</td><td><span class="cell-main">${escapeHtml(row.unidad)}</span><span class="cell-sub">${escapeHtml(row.contrato)} · ${escapeHtml(row.segmento)}</span></td><td><span class="cell-main">${escapeHtml(row.ruta)}</span></td><td>${escapeHtml(row.beneficiario)}</td><td>${escapeHtml(row.concepto)}</td><td><span class="badge ${statusClass(row.estado)}">${escapeHtml(row.estado)}</span></td><td class="right cell-main">${money.format(Number(row.valor)||0)}</td></tr>`).join("");
  $("emptyState").hidden=rows.length>0;updateCharts(rows);
}

function aggregate(rows,key){return rows.reduce((acc,row)=>{const label=row[key]||"SIN DEFINIR";acc[label]=(acc[label]||0)+(Number(row.valor)||0);return acc},{})}
function chartConfig(type,labels,data,colors){return{type,data:{labels,datasets:[{data,backgroundColor:colors,borderRadius:type==="bar"?7:0,borderWidth:type==="doughnut"?4:0,borderColor:type==="doughnut"?"#fff":undefined}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==="doughnut",position:"bottom",labels:{boxWidth:10,usePointStyle:true,font:{family:"Inter",size:10}}},tooltip:{callbacks:{label:(ctx)=>`${ctx.label}: ${money.format(ctx.raw)}`}}},scales:type==="bar"?{x:{grid:{display:false},ticks:{font:{family:"Inter",size:9}}},y:{grid:{color:"#edf2f7"},ticks:{callback:value=>`${Math.round(value/1e6)} M`,font:{family:"Inter",size:9}}}}:undefined}}}
function updateCharts(rows){
  const status=aggregate(rows,"estado"),units=Object.entries(aggregate(rows,"unidad")).sort((a,b)=>b[1]-a[1]).slice(0,6);
  state.charts.status?.destroy();state.charts.unit?.destroy();
  state.charts.status=new Chart($("statusChart"),chartConfig("doughnut",Object.keys(status),Object.values(status),Object.keys(status).map(key=>palette[key]||"#94a3b8")));
  state.charts.unit=new Chart($("unitChart"),chartConfig("bar",units.map(([key])=>key),units.map(([,value])=>value),["#2563eb","#60a5fa","#7c3aed","#a78bfa","#10b981","#34d399"]));
}
function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]))}

async function loadData(){
  const button=$("refreshData");button.disabled=true;button.textContent="Actualizando…";
  try{const response=await fetch("/api/liquidaciones",{cache:"no-store"});if(!response.ok)throw new Error("La fuente de datos no respondió");const payload=await response.json();state.rows=payload.rows||[];state.filtered=[...state.rows];fillSelect("unitFilter",unique("unidad"));fillSelect("statusFilter",unique("estado"));const mode=$("dataMode");mode.textContent=payload.mode==="database"?"SQL Server conectado":"Vista demostrativa";mode.className=`data-mode ${payload.mode==="database"?"live":"demo"}`;$("lastUpdate").textContent=`Actualizado ${new Date(payload.updatedAt).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"})}`;applyFilters();showToast("Información actualizada correctamente");}
  catch(error){showToast(error.message,true)}finally{button.disabled=false;button.innerHTML="<span>↻</span> Actualizar datos"}
}
function exportCsv(){const headers=["Liquidación","Fecha","Unidad","Contrato","Segmento","Ruta","Beneficiario","Concepto","Estado","Valor"];const lines=[headers,...state.filtered.map(row=>[row.id,row.fecha,row.unidad,row.contrato,row.segmento,row.ruta,row.beneficiario,row.concepto,row.estado,row.valor])].map(cells=>cells.map(value=>`"${String(value??"").replaceAll('"','""')}"`).join(";"));const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`consolidado-liquidaciones-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);showToast("Archivo CSV generado");}

["dateFrom","dateTo","unitFilter","statusFilter"].forEach(id=>$(id).addEventListener("change",applyFilters));$("searchFilter").addEventListener("input",applyFilters);$("refreshData").addEventListener("click",loadData);$("exportCsv").addEventListener("click",exportCsv);$("clearFilters").addEventListener("click",()=>{["dateFrom","dateTo","unitFilter","statusFilter","searchFilter"].forEach(id=>$(id).value="");applyFilters()});
window.addEventListener("load",()=>{const wait=()=>window.Chart?loadData():setTimeout(wait,80);wait()});setInterval(loadData,300000);
