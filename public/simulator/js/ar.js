// AR 検証(2026-09-05): プレビュー PNG を貼った実寸の薄い箱を GLB として組み立て、
// <model-viewer> に渡して壁に掛ける。iPhone は AR Quick Look(USDZ は model-viewer が GLB から自動生成)、
// Android は WebXR / Scene Viewer。URL 末尾に #ar があるときだけ有効(app.js 側で制御)。
// 依存: model-viewer(CDN、必要になった時だけ読み込む)。
(function () {
  "use strict";

  const MODEL_VIEWER_SRC = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";

  // ---- glTF 2.0 バイナリ(GLB)を最小構成で書き出す ----
  // 箱の寸法はメートル。前面(+Z)にテクスチャ、他 5 面は無地。背面(-Z)が壁側。
  function buildGlb(pngBytes, widthM, heightM, depthM) {
    const W = widthM / 2, H = heightM / 2;
    // 各面 4 頂点。z は [-depth, 0](model-viewer の壁設置はバウンディングボックスの -Z 面を壁に当てる)。
    const zf = 0, zb = -depthM;
    const faces = [
      // 前面(+Z) テクスチャ。uv は上が v=0 になるよう左上→右上→右下→左下。
      { p: [[-W, H, zf], [W, H, zf], [W, -H, zf], [-W, -H, zf]], n: [0, 0, 1], uv: [[0, 0], [1, 0], [1, 1], [0, 1]], mat: 0 },
      // 背面(-Z)
      { p: [[W, H, zb], [-W, H, zb], [-W, -H, zb], [W, -H, zb]], n: [0, 0, -1], mat: 1 },
      // 上面
      { p: [[-W, H, zb], [W, H, zb], [W, H, zf], [-W, H, zf]], n: [0, 1, 0], mat: 1 },
      // 下面
      { p: [[-W, -H, zf], [W, -H, zf], [W, -H, zb], [-W, -H, zb]], n: [0, -1, 0], mat: 1 },
      // 左面
      { p: [[-W, H, zb], [-W, H, zf], [-W, -H, zf], [-W, -H, zb]], n: [-1, 0, 0], mat: 1 },
      // 右面
      { p: [[W, H, zf], [W, H, zb], [W, -H, zb], [W, -H, zf]], n: [1, 0, 0], mat: 1 },
    ];

    const pos = [], nrm = [], uvs = [], idx0 = [], idx1 = [];
    faces.forEach((f) => {
      const base = pos.length / 3;
      f.p.forEach((v, i) => {
        pos.push(v[0], v[1], v[2]);
        nrm.push(f.n[0], f.n[1], f.n[2]);
        const t = f.uv ? f.uv[i] : [0, 0];
        uvs.push(t[0], t[1]);
      });
      const tgt = f.mat === 0 ? idx0 : idx1;
      tgt.push(base, base + 2, base + 1, base, base + 3, base + 2);
    });

    const posArr = new Float32Array(pos), nrmArr = new Float32Array(nrm), uvArr = new Float32Array(uvs);
    const idx0Arr = new Uint16Array(idx0), idx1Arr = new Uint16Array(idx1);

    // バッファを 4 バイト境界で連結
    const chunks = [posArr, nrmArr, uvArr, idx0Arr, idx1Arr, pngBytes];
    const views = [];
    let offset = 0;
    const parts = [];
    chunks.forEach((c) => {
      const bytes = c instanceof Uint8Array ? c : new Uint8Array(c.buffer, c.byteOffset, c.byteLength);
      views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength });
      parts.push(bytes);
      offset += bytes.byteLength;
      const pad = (4 - (offset % 4)) % 4;
      if (pad) { parts.push(new Uint8Array(pad)); offset += pad; }
    });
    const bin = new Uint8Array(offset);
    let o = 0; parts.forEach((p) => { bin.set(p, o); o += p.byteLength; });

    const minP = [-W, -H, zb], maxP = [W, H, zf];
    const json = {
      asset: { version: "2.0", generator: "kakephoto-ar" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name: "kakejiku" }],
      meshes: [{ primitives: [
        { attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 },
        { attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 4, material: 1 },
      ] }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: pos.length / 3, type: "VEC3", min: minP, max: maxP },
        { bufferView: 1, componentType: 5126, count: nrm.length / 3, type: "VEC3" },
        { bufferView: 2, componentType: 5126, count: uvs.length / 2, type: "VEC2" },
        { bufferView: 3, componentType: 5123, count: idx0.length, type: "SCALAR" },
        { bufferView: 4, componentType: 5123, count: idx1.length, type: "SCALAR" },
      ],
      bufferViews: views.map((v, i) => (i <= 2 ? Object.assign({ target: 34962 }, v) : i <= 4 ? Object.assign({ target: 34963 }, v) : v)),
      buffers: [{ byteLength: bin.byteLength }],
      images: [{ bufferView: 5, mimeType: "image/png" }],
      samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
      textures: [{ sampler: 0, source: 0 }],
      materials: [
        { name: "front", pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.9 } },
        { name: "side", pbrMetallicRoughness: { baseColorFactor: [0.85, 0.81, 0.74, 1], metallicFactor: 0, roughnessFactor: 0.9 } },
      ],
    };

    const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const jsonPad = (4 - (jsonBytes.byteLength % 4)) % 4;
    const jsonLen = jsonBytes.byteLength + jsonPad;
    const total = 12 + 8 + jsonLen + 8 + bin.byteLength;
    const out = new ArrayBuffer(total);
    const dv = new DataView(out);
    const u8 = new Uint8Array(out);
    let p = 0;
    dv.setUint32(p, 0x46546c67, true); p += 4; // "glTF"
    dv.setUint32(p, 2, true); p += 4;
    dv.setUint32(p, total, true); p += 4;
    dv.setUint32(p, jsonLen, true); p += 4;
    dv.setUint32(p, 0x4e4f534a, true); p += 4; // JSON
    u8.set(jsonBytes, p); p += jsonBytes.byteLength;
    for (let i = 0; i < jsonPad; i++) u8[p++] = 0x20;
    dv.setUint32(p, bin.byteLength, true); p += 4;
    dv.setUint32(p, 0x004e4942, true); p += 4; // BIN
    u8.set(bin, p);
    return new Blob([out], { type: "model/gltf-binary" });
  }

  function canvasToPngBytes(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("toBlob failed"));
        blob.arrayBuffer().then((ab) => resolve(new Uint8Array(ab)), reject);
      }, "image/png");
    });
  }

  let loaderPromise = null;
  function ensureModelViewer() {
    if (customElements.get("model-viewer")) return Promise.resolve();
    if (loaderPromise) return loaderPromise;
    loaderPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.type = "module";
      s.src = MODEL_VIEWER_SRC;
      s.onload = () => customElements.whenDefined("model-viewer").then(resolve, reject);
      s.onerror = () => reject(new Error("model-viewer の読み込みに失敗"));
      document.head.appendChild(s);
    });
    return loaderPromise;
  }

  let currentUrl = null;

  // canvas(プレビュー PNG)と 1px あたりの mm から実寸 GLB を作り、model-viewer で AR を起動する。
  // depthMm: 軸棒ぶんの厚み(既定 15mm)。
  function openAR(viewer, canvas, mmPerPx, depthMm) {
    const widthM = (canvas.width * mmPerPx) / 1000;
    const heightM = (canvas.height * mmPerPx) / 1000;
    const depthM = (depthMm || 15) / 1000;
    return Promise.all([ensureModelViewer(), canvasToPngBytes(canvas)]).then(([, png]) => {
      const blob = buildGlb(png, widthM, heightM, depthM);
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = URL.createObjectURL(blob);
      return new Promise((resolve, reject) => {
        const onLoad = () => {
          viewer.removeEventListener("load", onLoad);
          viewer.removeEventListener("error", onErr);
          resolve({ widthM, heightM, bytes: blob.size, canActivate: viewer.canActivateAR });
        };
        const onErr = (e) => {
          viewer.removeEventListener("load", onLoad);
          viewer.removeEventListener("error", onErr);
          reject(new Error("モデルの読み込みに失敗: " + (e && e.detail ? JSON.stringify(e.detail) : "")));
        };
        viewer.addEventListener("load", onLoad);
        viewer.addEventListener("error", onErr);
        viewer.src = currentUrl;
      });
    }).then((info) => {
      if (viewer.canActivateAR) viewer.activateAR();
      return info;
    });
  }

  window.KakeAR = { buildGlb, openAR, ensureModelViewer };
})();
