const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

test("la página contiene los elementos principales del dashboard",()=>{
  const html=fs.readFileSync(path.join(__dirname,"..","public","index.html"),"utf8");
  assert.match(html,/Consolidado de Liquidaciones/);
  assert.match(html,/Filtros del consolidado/);
  assert.match(html,/Liquidaciones consolidadas/);
  assert.match(html,/Exportar CSV/);
});

test("ningún secreto está versionado",()=>{
  const files=["server.js","render.yaml","public/app.js"];
  for(const file of files){
    const content=fs.readFileSync(path.join(__dirname,"..",file),"utf8");
    assert.doesNotMatch(content,/Luis2026/i);
  }
});
