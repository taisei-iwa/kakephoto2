// 依存ゼロのサーバー。Node 標準モジュールのみ使用。
// 起動: node server.js  (PORT 環境変数で変更可、既定 5175)
// レーン: かけフォト(KAKEPHOTO)顧客向け 掛軸オーダーシミュレーター。
// 既存の個人用 kakejiku-toriawase(既定 5174)とは別ポートで動かす。
//
// 静的配信に加えて、裏方の裂地追加/削除 API を持つ(ローカル実行時のみ機能):
//   POST /api/fabric/add    … 画像を assets/fabrics/ に保存し js/catalog.js に1行追記
//   POST /api/fabric/delete … js/catalog.js から該当行を削除し画像も削除
// 公開用の静的ホスト(書き込み不可)では API は使えない。ローカルで追加 → 再デプロイの運用。
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5175;
const ROOT = __dirname;
const CATALOG_PATH = path.join(ROOT, "js", "catalog.js");
const FABRICS_DIR = path.join(ROOT, "assets", "fabrics");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function sendJSON(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readBody(req, maxBytes, cb) {
  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on("data", (c) => {
    if (aborted) return;
    size += c.length;
    if (size > maxBytes) { aborted = true; cb(new Error("too large")); req.destroy(); return; }
    chunks.push(c);
  });
  req.on("end", () => { if (!aborted) cb(null, Buffer.concat(chunks).toString("utf8")); });
  req.on("error", () => { if (!aborted) cb(new Error("read error")); });
}

// 裂地を1件追加: 画像を保存し、catalog.js の FABRIC_CATALOG に追記する。
function addFabric(body, cb) {
  const name = (body.name || "").toString().trim();
  const uses = Array.isArray(body.uses)
    ? body.uses.filter((u) => ["tenchi", "nakamawashi", "ichimonji"].indexOf(u) >= 0)
    : [];
  const grade = ["standard", "joh", "tokujou"].indexOf(body.grade) >= 0 ? body.grade : "standard";
  const tileW = Math.max(8, Math.min(400, parseInt(body.tileW, 10) || 40));
  const tileH = Math.max(8, Math.min(400, parseInt(body.tileH, 10) || tileW));
  const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(body.dataUrl || "");
  if (!name) return cb(new Error("名前が必要です"));
  if (!uses.length) return cb(new Error("用途が必要です"));
  if (!m) return cb(new Error("画像が必要です"));

  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const buf = Buffer.from(m[2], "base64");
  const ts = Date.now();
  const id = "cust_" + ts;
  const filename = "custom_" + ts + "." + ext;
  const relFile = "assets/fabrics/" + filename;
  const absFile = path.join(FABRICS_DIR, filename);

  fs.writeFile(absFile, buf, (err) => {
    if (err) return cb(err);
    fs.readFile(CATALOG_PATH, "utf8", (err2, text) => {
      if (err2) return cb(err2);
      const entry =
        "  { id: " + JSON.stringify(id) +
        ", file: " + JSON.stringify(relFile) +
        ", name: " + JSON.stringify(name) +
        ", tileW: " + tileW + ", tileH: " + tileH +
        ", uses: " + JSON.stringify(uses) +
        ", grade: " + JSON.stringify(grade) + " },";
      const startIdx = text.indexOf("const FABRIC_CATALOG = [");
      if (startIdx < 0) return cb(new Error("catalog の目印が見つかりません"));
      const closeIdx = text.indexOf("\n];", startIdx);
      if (closeIdx < 0) return cb(new Error("catalog の終端が見つかりません"));
      const newText = text.slice(0, closeIdx) + "\n" + entry + text.slice(closeIdx);
      fs.writeFile(CATALOG_PATH, newText, (err3) => {
        if (err3) return cb(err3);
        cb(null, { id: id, file: relFile, name: name, tileW: tileW, tileH: tileH, uses: uses, grade: grade });
      });
    });
  });
}

// 裂地を1件更新: catalog.js の該当行を作り直す(自作分 cust_ のみ)。
// body.dataUrl があれば画像も差し替え(新ファイル保存＋旧ファイル削除)、なければ画像は据え置き。
function updateFabric(body, cb) {
  const id = body.id;
  if (!/^cust_[0-9]+$/.test(id || "")) return cb(new Error("編集できるのは追加した裂地のみです"));
  const name = (body.name || "").toString().trim();
  const uses = Array.isArray(body.uses)
    ? body.uses.filter((u) => ["tenchi", "nakamawashi", "ichimonji"].indexOf(u) >= 0)
    : [];
  const grade = ["standard", "joh", "tokujou"].indexOf(body.grade) >= 0 ? body.grade : "standard";
  const tileW = Math.max(8, Math.min(400, parseInt(body.tileW, 10) || 40));
  const tileH = Math.max(8, Math.min(400, parseInt(body.tileH, 10) || tileW));
  if (!name) return cb(new Error("名前が必要です"));
  if (!uses.length) return cb(new Error("用途が必要です"));

  fs.readFile(CATALOG_PATH, "utf8", (err, text) => {
    if (err) return cb(err);
    const lines = text.split("\n");
    const idx = lines.findIndex((ln) => ln.indexOf('id: "' + id + '"') >= 0);
    if (idx < 0) return cb(new Error("対象が見つかりません"));
    const oldFm = /file:\s*"([^"]+)"/.exec(lines[idx]);
    const oldFile = oldFm ? oldFm[1] : null;

    function finalize(relFile) {
      lines[idx] =
        "  { id: " + JSON.stringify(id) +
        ", file: " + JSON.stringify(relFile) +
        ", name: " + JSON.stringify(name) +
        ", tileW: " + tileW + ", tileH: " + tileH +
        ", uses: " + JSON.stringify(uses) +
        ", grade: " + JSON.stringify(grade) + " },";
      fs.writeFile(CATALOG_PATH, lines.join("\n"), (e) => {
        if (e) return cb(e);
        cb(null, { id: id, file: relFile, name: name, tileW: tileW, tileH: tileH, uses: uses, grade: grade });
      });
    }

    const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(body.dataUrl || "");
    if (m) {
      const ext = m[1] === "jpeg" ? "jpg" : m[1];
      const ts = Date.now();
      const filename = "custom_" + ts + "." + ext;
      const relFile = "assets/fabrics/" + filename;
      fs.writeFile(path.join(FABRICS_DIR, filename), Buffer.from(m[2], "base64"), (e) => {
        if (e) return cb(e);
        if (oldFile) {
          const abs = path.normalize(path.join(ROOT, oldFile));
          if (abs.startsWith(FABRICS_DIR + path.sep)) fs.unlink(abs, () => {});
        }
        finalize(relFile);
      });
    } else {
      if (!oldFile) return cb(new Error("画像が見つかりません"));
      finalize(oldFile);
    }
  });
}

// 裂地を1件削除: catalog.js の該当行を消し、画像ファイルも削除する(自作分 cust_ のみ)。
function deleteFabric(id, cb) {
  if (!/^cust_[0-9]+$/.test(id || "")) return cb(new Error("削除できるのは追加した裂地のみです"));
  fs.readFile(CATALOG_PATH, "utf8", (err, text) => {
    if (err) return cb(err);
    const lines = text.split("\n");
    let removedFile = null;
    const kept = lines.filter((ln) => {
      if (ln.indexOf('id: "' + id + '"') >= 0) {
        const fm = /file:\s*"([^"]+)"/.exec(ln);
        if (fm) removedFile = fm[1];
        return false;
      }
      return true;
    });
    if (removedFile === null) return cb(null, { ok: true, notFound: true });
    fs.writeFile(CATALOG_PATH, kept.join("\n"), (err2) => {
      if (err2) return cb(err2);
      const abs = path.normalize(path.join(ROOT, removedFile));
      if (abs.startsWith(FABRICS_DIR + path.sep)) {
        fs.unlink(abs, () => cb(null, { ok: true })); // 画像削除の失敗は無視
      } else {
        cb(null, { ok: true });
      }
    });
  });
}

const server = http.createServer((req, res) => {
  // ---- 裏方 API(ローカル実行時のみ機能) ----
  if (req.method === "POST" && req.url === "/api/fabric/add") {
    readBody(req, 12 * 1024 * 1024, (err, raw) => {
      if (err) return sendJSON(res, 413, { ok: false, error: "画像が大きすぎます" });
      let body;
      try { body = JSON.parse(raw); } catch (e) { return sendJSON(res, 400, { ok: false, error: "不正なデータ" }); }
      addFabric(body, (e, fabric) => {
        if (e) return sendJSON(res, 400, { ok: false, error: e.message });
        sendJSON(res, 200, { ok: true, fabric: fabric });
      });
    });
    return;
  }
  if (req.method === "POST" && req.url === "/api/fabric/update") {
    readBody(req, 12 * 1024 * 1024, (err, raw) => {
      if (err) return sendJSON(res, 413, { ok: false, error: "画像が大きすぎます" });
      let body;
      try { body = JSON.parse(raw); } catch (e) { return sendJSON(res, 400, { ok: false, error: "不正なデータ" }); }
      updateFabric(body, (e, fabric) => {
        if (e) return sendJSON(res, 400, { ok: false, error: e.message });
        sendJSON(res, 200, { ok: true, fabric: fabric });
      });
    });
    return;
  }
  if (req.method === "POST" && req.url === "/api/fabric/delete") {
    readBody(req, 1024 * 1024, (err, raw) => {
      if (err) return sendJSON(res, 400, { ok: false, error: "不正なデータ" });
      let body;
      try { body = JSON.parse(raw); } catch (e) { return sendJSON(res, 400, { ok: false, error: "不正なデータ" }); }
      deleteFabric(body.id, (e, r) => {
        if (e) return sendJSON(res, 400, { ok: false, error: e.message });
        sendJSON(res, 200, r);
      });
    });
    return;
  }

  // ---- 静的ファイル ----
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  // パストラバーサル防止
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`kakephoto-order running at http://localhost:${PORT}`);
});
