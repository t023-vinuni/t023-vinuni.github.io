// Chương "Các vòng cải tiến" (đợt 9): luồng chính (V1) theo 8 bước, rồi V2 → V5 mỗi vòng một slide "trước / sau".
// Mọi số lấy từ data/cac_vong.js (sinh bởi demo/tools/xuat_cac_vong.py), không gõ tay.
import { CAC_VONG as CV } from '../../data/cac_vong.js';
import { taoHop, hopGT } from '../hop.js';
import { svgDoThi } from '../bieu_do.js';
import { kichBan } from './cac_vong_chay.js';

const BUOC = ['Frustum', 'Mặt đất', 'Gom cụm', 'Lọc cụm', 'Chọn cụm', 'Dựng hộp', 'Hậu xử lý', 'Không cụm'];
const MAU_CUM = [0x12aeb8, 0xc98200, 0x7c3aed, 0xdb2777, 0x0f766e, 0x9a3412];

// ---------- số và dữ liệu ----------
const so = (v, n = 1) => Number(v).toFixed(n).replace('.', ',');
const pct = v => `${so(v, 1)} %`;
const tong = (vong, nguon = 'gt', tap = '5_bo') => CV.tong.find(r => r.vong === vong && r.nguon_2d === nguon && r.tap === tap);
const hopVong = k => CV.xe_vd.vong.find(v => v.vong === k);
const caSo = n => CV.ca.find(c => c.so === n);
const hopTu = v => ({ cx: v.cx, cy: v.cy, cz: v.cz, l: v.l, w: v.w, h: v.h, yaw: v.yaw });
const N5 = tong(1).n;
const NPHU = tong(1, 'gt', 'tap_phu').n;

// ---------- dựng hình ----------
function moi(ctx) {
  const T = ctx.THREE;
  return {
    T,
    diem(xyz, mau, size = 0.14) {
      const g = new T.BufferGeometry();
      const pos = new Float32Array(xyz.length * 3);
      const col = new Float32Array(xyz.length * 3);
      const c = new T.Color();
      xyz.forEach((p, i) => {
        const v = ctx.S(p);
        pos.set([v.x, v.y, v.z], i * 3);
        c.setHex(Array.isArray(mau) ? mau[i] : mau);
        col.set([c.r, c.g, c.b], i * 3);
      });
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      return new T.Points(g, new T.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true }));
    },
    doan(cap, mau, { dut = false, mo = 1, tren = false } = {}) {
      const g = new T.BufferGeometry().setFromPoints(cap.flat().map(p => ctx.S(p)));
      const m = dut
        ? new T.LineDashedMaterial({ color: mau, dashSize: 0.18, gapSize: 0.1, transparent: mo < 1, opacity: mo })
        : new T.LineBasicMaterial({ color: mau, transparent: mo < 1, opacity: mo });
      if (tren) { m.depthTest = false; }
      const l = new T.LineSegments(g, m);
      if (dut) l.computeLineDistances();
      if (tren) l.renderOrder = 25;
      return l;
    },
    muiTen(goc, yaw, dai, mau) {
      const a = new T.ArrowHelper(new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), ctx.S(goc), dai, mau, 0.45, 0.28);
      a.line.material.depthTest = false; a.cone.material.depthTest = false; a.renderOrder = 30;
      return a;
    },
    // hộp "trước" (vòng cũ): xám đứt nét, không tính vào kiểm hộp GT
    hopTruoc(b) {
      const g = taoHop(ctx, b, 'de_xuat', { fill: false });
      g.traverse(o => {
        if (o.material) {
          o.material = o.material.clone();
          o.material.color = new T.Color(0x64748b);
        }
      });
      g.userData.hop = 'truoc';
      return g;
    },
    // hộp cho ca minh hoạ từ 8 đỉnh (đáy 0–3, nóc 4–7), dời về chỗ xe ví dụ
    hopGoc(goc, lech, mau, dut) {
      const p = goc.map(q => [q[0] + lech[0], q[1] + lech[1], q[2]]);
      const canh = [];
      for (let i = 0; i < 4; i++) {
        canh.push([p[i], p[(i + 1) % 4]], [p[i + 4], p[((i + 1) % 4) + 4]], [p[i], p[i + 4]]);
      }
      const g = new T.Group();
      g.add(this.doan(canh, mau, { dut }));
      g.userData.hop = 'ca';
      return g;
    }
  };
}

// xoá nhóm vẽ kèm nhãn HTML của nó (nhãn nằm ở quản lý nhãn, nhom.clear() không gỡ được)
function xoaNhom(nhom) {
  nhom.traverse(o => { if (typeof o.xoa === 'function') o.xoa(); });
  nhom.clear();
}

// lech: khoảng cách tâm hộp tới tâm GT (m); ghi ra khi > 1 m để thấy hộp chọn nhầm cụm
const chuIoU = (iou, lech) => (iou === null || iou === undefined) ? 'không ra hộp ✗'
  : `IoU ${so(iou, 3)} ${iou >= 0.5 ? '✓' : '✗'}${lech > 1 ? ` (lệch ${so(lech, 1)} m)` : ''}`;
const tamGoc = goc => [0, 1, 2].map(i => goc.reduce((a, q) => a + q[i], 0) / goc.length);

function nhanIoU(ctx, iou, pos, tien_to = '') {
  if (iou === null || iou === undefined) {
    return ctx.taoNhan(`${tien_to}Không ra hộp ✗`, pos, { uu_tien: 1, kieu: 'gt' });
  }
  const dat = iou >= 0.5;
  return ctx.taoNhan(`${tien_to}IoU ${so(iou, 3)} ${dat ? '✓ đạt' : '✗'}`, pos, { uu_tien: 1, kieu: dat ? 'cum' : 'gt' });
}

function anTheGioi(ctx, an) {
  const tg = ctx.theGioi;
  if (tg.diem) tg.diem.visible = !an;
  if (tg.ego) tg.ego.visible = !an;
  // mô hình xe ví dụ luôn ẩn trong chương này: điểm LiDAR nằm trên mặt xe nên bị che; hộp GT đã cho kích thước thật
  if (tg.nhomVat) tg.nhomVat.visible = false;
}

function moDiemTheGioi(ctx, mo) {
  const m = ctx.theGioi.diem && ctx.theGioi.diem.material;
  if (!m) return;
  m.transparent = mo < 1;
  m.opacity = mo;
  m.needsUpdate = true;
}

const thamSo = () => new URLSearchParams(window.location.search);
// chế độ chụp kiểm (?chup=1) hoặc người xem bật giảm chuyển động → không chạy hoạt ảnh
const CO_WINDOW = typeof window !== 'undefined';
const CHUP = CO_WINDOW && thamSo().has('chup');
const TINH = CHUP || (CO_WINDOW && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const veLai = ctx => { if (CHUP) ctx.canh.veMotLan(); };

// ---------- khối HTML dùng chung ----------
function daiBuoc(doi, hienTai = 0) {
  return `<div class="cv_dai_buoc">${BUOC.map((t, i) => {
    const k = i + 1;
    const lop = k === hienTai ? 'cv_buoc cv_buoc--chon' : doi.includes(k) ? 'cv_buoc cv_buoc--doi' : 'cv_buoc';
    return `<span class="${lop}" data-buoc="${k}">${k} ${t}</span>`;
  }).join('')}</div>`;
}

function dongSo(kTruoc, kSau) {
  const o = (nhan, a, b, d = 1, dv = ' %') => `<div class="cv_o_so"><div class="chu-nho">${nhan}</div>
    <div class="chu-the"><span class="cv_cu">${so(a, d)}</span> → <b>${so(b, d)}${dv}</b></div></div>`;
  return `<div class="cv_dong_so">
    ${o(`Đạt · khung GT (n = ${N5})`, tong(kTruoc).dat, tong(kSau).dat)}
    ${o('Đạt · YOLO', tong(kTruoc, 'yolo').dat, tong(kSau, 'yolo').dat)}
    ${o('IoU 3D trung vị · GT', tong(kTruoc).iou_tv, tong(kSau).iou_tv, 3, '')}
  </div>`;
}

function chenPanel(id, html) {
  const elY = document.getElementById('slide_y');
  if (!elY) return null;
  const cu = document.getElementById(id);
  if (cu) cu.remove();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'fade-in cv_panel';
  el.innerHTML = html;
  elY.parentNode.insertBefore(el, elY.nextSibling);
  return el;
}

function chenDieuKhien(html) {
  const cu = document.getElementById('cv_dieu_khien');
  if (cu) cu.remove();
  const el = document.createElement('div');
  el.id = 'cv_dieu_khien';
  el.className = 'cv_dieu_khien';
  el.innerHTML = html;
  (document.getElementById('canh_3d') || document.body).appendChild(el);
  return el;
}

function goPanel() {
  ['cv_panel_v1', 'cv_panel_vong', 'cv_dieu_khien', 'cv_chay_khung'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

// =====================================================================
// Slide 1: luồng chính (V1) theo 8 bước
// =====================================================================
const V1 = CV.xe_vd.v1;
const v1Hop = hopVong(1);
const MO_TA_BUOC = [
  `Chiếu ${V1.frustum.length} điểm LiDAR lên ảnh, giữ điểm rơi trong khung 2D (frustum).`,
  `Bỏ ${V1.nhan.filter(n => n !== 2).length} điểm mặt đất: z < 0,08 m rồi mặt phẳng RANSAC cục bộ.`,
  `Gom cụm Euclid bán kính 0,75 m → ${V1.ung_vien.length} cụm.`,
  `Lọc cụm: cần ≥ 20 điểm, đủ trải rộng và chiều cao → còn ${V1.ung_vien.filter(c => c.qua_loc).length} cụm.`,
  'Chọn cụm có tâm chiếu gần tâm khung 2D nhất.',
  `Quét θ, chọn hình chữ nhật bao nhỏ nhất → θ* = ${so(V1.theta_A_min_do, 1)}° (GT ${so(V1.gt_yaw_do, 1)}°).`,
  'Chiều cao từ phân vị 0,5 % – 99,5 % độ cao điểm. Luồng chính không hậu xử lý.',
  `Hộp chỉ bằng phần LiDAR thấy (${so(v1Hop.l, 2)} × ${so(v1Hop.w, 2)} m), lệch hướng ${so(v1Hop.yaw_lech_do, 0)}° → IoU ${so(v1Hop.iou3d, 3)}.`
];

function dungLuongChinh(ctx, lop, buocBanDau) {
  const H = moi(ctx);
  const T = H.T;
  const bGt = hopGT(ctx.theGioi);
  const gGt = taoHop(ctx, bGt, 'gt', { fill: false });
  const nhom = new T.Group();
  lop.add(gGt, nhom);
  let raf = 0;

  const fr = V1.frustum;
  const chon = fr.map((_, i) => V1.cum[i] === V1.cum_chon);
  const xyChon = fr.filter((_, i) => chon[i]);
  const zDay = Math.min(...xyChon.map(p => p[2]));

  function hinhChuNhat(thetaDo) {
    const a = thetaDo * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const u = xyChon.map(p => p[0] * c + p[1] * s).sort((m, n) => m - n);
    const v = xyChon.map(p => -p[0] * s + p[1] * c).sort((m, n) => m - n);
    const q = (arr, t) => { const k = (arr.length - 1) * t, i = Math.floor(k); return arr[i] + (arr[Math.min(i + 1, arr.length - 1)] - arr[i]) * (k - i); };
    const [u0, u1, v0, v1] = [q(u, .005), q(u, .995), q(v, .005), q(v, .995)];
    const P = (uu, vv) => [uu * c - vv * s, uu * s + vv * c, zDay];
    const g = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
    return { canh: g.map((p, i) => [p, g[(i + 1) % 4]]), dt: (u1 - u0) * (v1 - v0) };
  }

  function ve(k) {
    cancelAnimationFrame(raf);
    xoaNhom(nhom);
    const mau = fr.map((_, i) => {
      if (k === 1) return 0x1f5fc4;
      if (V1.nhan[i] !== 2) return 0x9ca3af;
      if (k === 2) return 0x1f5fc4;
      const c = V1.cum[i];
      if (c < 0) return 0xcbd5e1;
      if (k === 3) return MAU_CUM[c % MAU_CUM.length];
      if (k === 4) return V1.ung_vien[c].qua_loc ? MAU_CUM[c % MAU_CUM.length] : 0xe2e8f0;
      return c === V1.cum_chon ? 0x12aeb8 : 0xe2e8f0;
    });
    nhom.add(H.diem(fr, mau, k >= 5 ? 0.26 : 0.22));
    if (k === 2) nhom.add(ctx.taoNhan(`${V1.nhan.filter(n => n !== 2).length} điểm mặt đất bị bỏ`, [bGt.cx, bGt.cy, 0.1], { uu_tien: 2 }));
    if (k === 4) nhom.add(ctx.taoNhan(`${V1.ung_vien.filter(c => !c.qua_loc).length} cụm nhỏ bị loại`, [bGt.cx - 1.5, bGt.cy + 1.5, 0.6], { uu_tien: 2 }));
    if (k === 6) {
      const rect = new T.Group();
      nhom.add(rect);
      const veTheta = t => {
        rect.clear();
        rect.add(H.doan(hinhChuNhat(t).canh, 0xe5484d, { tren: true }));
        const el = document.getElementById('cv_do_thi_v1');
        if (el) el.innerHTML = svgDoThi({ caoPx: 90, theta: V1.theta_do, giaTri: V1.A, mau: '#e5484d', thetaChon: V1.theta_A_min_do, thetaGt: V1.gt_yaw_do % 90, nhan: 'A nhỏ nhất', conTro: t });
        veLai(ctx);
      };
      if (TINH) {
        veTheta(V1.theta_A_min_do);
      } else {
        const t0 = performance.now();
        const buoc = () => {
          const t = Math.min(((performance.now() - t0) / 4000) * 90, 89.5);
          // quét 0 → 90° trong 4 s rồi dừng ở θ*
          veTheta(t < 89.5 ? t : V1.theta_A_min_do);
          if (t < 89.5) raf = requestAnimationFrame(buoc);
        };
        buoc();
      }
    }
    if (k >= 7) {
      const b = hopTu(v1Hop);
      nhom.add(taoHop(ctx, b, 'de_xuat', { fill: k === 8 }));
      if (k === 8) {
        nhom.add(H.muiTen([b.cx, b.cy, b.cz + b.h / 2 + 0.4], b.yaw, 2.0, 0xe5484d));
        nhom.add(H.muiTen([bGt.cx, bGt.cy, bGt.cz + bGt.h / 2 + 0.9], bGt.yaw, 2.0, 0x1f9d55));
        nhom.add(nhanIoU(ctx, v1Hop.iou3d, [b.cx, b.cy, b.cz + b.h / 2 + 1.5], 'V1 · '));
      }
    }
    const elMoTa = document.getElementById('cv_mo_ta_buoc');
    if (elMoTa) elMoTa.innerHTML = `<b>Bước ${k} · ${BUOC[k - 1]}:</b> ${MO_TA_BUOC[k - 1]}`;
    document.querySelectorAll('#cv_panel_v1 .cv_buoc').forEach(el => el.classList.toggle('cv_buoc--chon', +el.dataset.buoc === k));
    const elDt = document.getElementById('cv_do_thi_v1');
    if (elDt) elDt.style.display = k === 6 ? '' : 'none';
    veLai(ctx);
  }

  const panel = chenPanel('cv_panel_v1', `
    <div class="the_trang cv_the">
      ${daiBuoc([], buocBanDau)}
      <div id="cv_mo_ta_buoc" class="chu-the cv_mo_ta"></div>
      <div id="cv_do_thi_v1"></div>
      <div class="cv_sai chu-the"><b>Sai:</b> hộp chỉ ôm phần LiDAR thấy, hướng dễ lệch, cụm &lt; 20 điểm bị bỏ. Đạt <b>${pct(tong(1).dat)}</b> (GT) · <b>${pct(tong(1, 'yolo').dat)}</b> (YOLO) trên ${N5} vật.</div>
    </div>`);
  if (panel) {
    panel.querySelectorAll('.cv_buoc').forEach(el => el.addEventListener('click', () => ve(+el.dataset.buoc)));
  }
  ve(buocBanDau);
  return () => cancelAnimationFrame(raf);
}

// =====================================================================
// Slide 2–5: khuôn chung "trước / sau"
// =====================================================================
export const CAU_HINH = {
  2: {
    doi: [4, 7], ca_sua: [3, 6], ca_sai: 11,
    sai_truoc: 'hộp chỉ bằng phần LiDAR thấy; vật xa ít điểm bị lọc mất.',
    doi_gi: '<b>B2</b> ngưỡng điểm giảm theo khoảng cách; <b>B1</b> neo mặt gần, nới hộp ra xa tới kích thước mẫu của lớp.',
    con_sai: 'hướng vẫn sai 30° trên xe ví dụ nên B1 nới theo trục sai.',
    cong_thuc: String.raw`N_{\min}(d) = \operatorname{clip}\big(20\,(10/d)^2,\ 6,\ 20\big), \qquad l' = \max(l,\ \bar l_{\text{lớp}})\ \text{(neo mặt gần)}`
  },
  3: {
    doi: [6, 7, 8], ca_sua: [1, 2], ca_sai: 9,
    sai_truoc: 'chỉ thấy đầu/đuôi xe thì trục dài bị nhận nhầm (xoay 90°); không cụm thì không có hộp.',
    doi_gi: '<b>C2</b> đổi trục khi một mặt rộng mỏng; <b>C4</b> mẫu xe hai bánh; <b>C1b</b> hộp dự phòng theo tia qua đáy khung 2D.',
    con_sai: 'xe ví dụ không kích hoạt luật nào (hộp như V2); hộp dự phòng thường lệch xa.',
    cong_thuc: String.raw`\hat d \approx \frac{f_y\, H_{\text{lớp}}}{h_{\text{px}}}, \qquad \text{trục dài} \leftarrow \text{trục ngắn nếu } w_{\text{thấy}} \approx l_{\text{mẫu}}`
  },
  4: {
    doi: [6], ca_sua: [9], ca_sai: 7,
    sai_truoc: 'diện tích nhỏ nhất bị vài điểm lẻ kéo lệch hướng (xe ví dụ 30°).',
    doi_gi: '<b>D1</b> chữ L closeness (Zhang 2017): chọn góc để điểm sát hai cạnh góc gần.',
    con_sai: 'tâm còn lệch do phần bị che; lật đầu/đuôi chưa xử lý.',
    cong_thuc: String.raw`\theta^* = \arg\max_\theta \textstyle\sum_i 1/\max\big(\min(d_{i,1}, d_{i,2}),\ d_0\big)`
  },
  5: {
    doi: [2, 3, 4, 5, 6, 7, 8], ca_sua: [13, 14], ca_sai: 9,
    sai_truoc: 'không biết hộp có chiếm chỗ tia đã đi qua; chọn cụm bằng luật.',
    doi_gi: 'đặt hộp mẫu cho <b>năng lượng nhỏ nhất</b>: tia chạm đúng mặt hộp, không xuyên chỗ trống, khớp khung 2D; chọn cụm bằng logistic.',
    con_sai: `lật đầu/đuôi ${pct(CV.v5.lat_pct.nam_bo)}; chậm ${so(CV.v5.giay_moi_vat.v5, 2)} s/vật; xe ví dụ thuộc train.`,
    cong_thuc: String.raw`E = E_{\text{mặt}} + \lambda_f E_{\text{trống}} + \lambda_{2d} E_{2d},\ E_{\text{mặt}} = \tfrac1N \textstyle\sum_i \min\big((r_i/\sigma)^2, 1\big)`
  }
};

function dungSlideVong(ctx, lop, k) {
  const H = moi(ctx);
  const T = H.T;
  const ch = CAU_HINH[k];
  const bGt = hopGT(ctx.theGioi);
  const lech = [bGt.cx, bGt.cy];
  const p = thamSo();
  let vat = ['vd', 'sua', 'sai'].includes(p.get('vat')) ? p.get('vat') : 'vd';
  // hiện hộp nào: chỉ vòng trước, chỉ vòng sau, hay cả hai chồng lên nhau (mặc định)
  let ts = ['truoc', 'sau'].includes(p.get('ts')) ? p.get('ts') : 'ca_hai';
  const hienTruoc = () => ts !== 'sau';
  const hienSau = () => ts !== 'truoc';
  let caSua = parseInt(p.get('ca') || '0', 10) || 0;
  let gocHienTai = 0;
  const nhom = new T.Group();
  lop.add(nhom);

  function veXeVd() {
    anTheGioi(ctx, false);
    nhom.add(taoHop(ctx, bGt, 'gt', { fill: false }));
    const bT = hopTu(hopVong(k - 1)), b = hopTu(hopVong(k));
    const nocGt = bGt.cz + bGt.h / 2;
    if (hienTruoc()) {
      nhom.add(H.hopTruoc(bT));
      nhom.add(H.muiTen([bT.cx, bT.cy, nocGt + 0.65], bT.yaw, 2.0, 0x64748b));
    }
    if (hienSau()) {
      nhom.add(taoHop(ctx, b, 'de_xuat', { fill: true }));
      nhom.add(H.muiTen([b.cx, b.cy, nocGt + 0.4], b.yaw, 2.0, 0xe5484d));
    }
    nhom.add(H.muiTen([bGt.cx, bGt.cy, nocGt + 0.9], bGt.yaw, 2.0, 0x1f9d55));
    capNhatChuGiai(hopVong(k - 1), hopVong(k), `Xe ví dụ (${CV.nguon && CV.nguon.scene ? CV.nguon.scene : 'scene-0061'})`);
    if (!hienSau()) return;
    const a = bT;
    if (k === 2) {
      // B1: nới từ mặt neo (gần cảm biến) ra phía xa
      nhom.add(H.doan([[[a.cx, a.cy, a.cz + a.h / 2 + 0.1], [b.cx + (b.cx - a.cx) * 1.6, b.cy + (b.cy - a.cy) * 1.6, b.cz + b.h / 2 + 0.1]]], 0xc98200, { tren: true }));
      nhom.add(ctx.taoNhan('B1: neo mặt gần, nới ra xa', [b.cx + 1.2, b.cy - 1.2, b.cz + b.h / 2 + 0.3], { uu_tien: 2, kieu: 'minh_hoa' }));
    } else if (k === 3) {
      nhom.add(ctx.taoNhan('C2/C4/C1b không kích hoạt — hộp như V2', [b.cx, b.cy - 1.5, b.cz + b.h / 2 + 0.3], { uu_tien: 2, kieu: 'minh_hoa' }));
    } else if (k === 4) {
      // hai cạnh chữ L ở góc gần cảm biến
      const c = Math.cos(b.yaw), s = Math.sin(b.yaw), z = b.cz - b.h / 2 + 0.05;
      const goc = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([i, j]) => [b.cx + i * b.l / 2 * c - j * b.w / 2 * s, b.cy + i * b.l / 2 * s + j * b.w / 2 * c, z, i, j]);
      const gan = goc.reduce((m, q) => (Math.hypot(q[0], q[1]) < Math.hypot(m[0], m[1]) ? q : m));
      const k1 = goc.find(q => q[3] !== gan[3] && q[4] === gan[4]), k2 = goc.find(q => q[3] === gan[3] && q[4] !== gan[4]);
      nhom.add(H.doan([[gan.slice(0, 3), k1.slice(0, 3)], [gan.slice(0, 3), k2.slice(0, 3)]], 0xc98200, { tren: true }));
      nhom.add(ctx.taoNhan('Chữ L ở góc gần cảm biến', [gan[0], gan[1] - 0.8, z + 0.3], { uu_tien: 2, kieu: 'minh_hoa' }));
    } else if (k === 5) {
      const n5 = CV.xe_vd.v5;
      // E_mặt: đoạn lệch r_i dọc tia (đỏ) + tia mảnh từ cảm biến
      nhom.add(H.doan(n5.tia_mat.map(t => [n5.sensor, t.p]), 0x94a3b8, { mo: 0.25 }));
      nhom.add(H.doan(n5.tia_mat.filter(t => t.r > 0.02).map(t => [t.q, t.p]), 0xe5484d, { tren: true }));
      nhom.add(H.diem(n5.tia_mat.map(t => t.p), 0x12aeb8, 0.24));
      // E_trống: tia xuyên hộp của giả thuyết sai V1
      const v1n = hopVong(1).nang_luong;
      if (v1n.tia_xuyen.length) {
        nhom.add(H.hopTruoc(hopTu(hopVong(1))));
        nhom.add(H.doan(v1n.tia_xuyen.map(t => [t.vao, t.ra]), 0xf97316, { tren: true }));
        const t0 = v1n.tia_xuyen[0];
        nhom.add(ctx.taoNhan(`Giả thuyết V1: ${v1n.so_tia_xuyen} tia xuyên hộp`, t0.ra, { uu_tien: 2, kieu: 'minh_hoa' }));
      }
      // lưới mặt đất 1 m
      const L = n5.luoi_dat, canh = [];
      const Z = (i, j) => L.z[i * L.ny + j];
      for (let i = 0; i < L.nx; i++) for (let j = 0; j < L.ny; j++) {
        if (i + 1 < L.nx) canh.push([[L.x0 + i, L.y0 + j, Z(i, j)], [L.x0 + i + 1, L.y0 + j, Z(i + 1, j)]]);
        if (j + 1 < L.ny) canh.push([[L.x0 + i, L.y0 + j, Z(i, j)], [L.x0 + i, L.y0 + j + 1, Z(i, j + 1)]]);
      }
      nhom.add(H.doan(canh, 0x64748b, { mo: 0.3 }));
      // trừ lệch dọc tia: từ hộp trước hiệu chỉnh tới hộp cuối
      const tr = n5.hop_truoc_lech;
      nhom.add(H.doan([[[tr.cx, tr.cy, b.cz + b.h / 2 + 0.15], [b.cx, b.cy, b.cz + b.h / 2 + 0.15]]], 0x7c3aed, { tren: true }));
    }
  }

  // ca minh hoạ ở scene khác: dời về chỗ xe ví dụ; nâng z để đáy hộp GT và điểm thấp nhất nằm trên mặt nền
  // (mặt nền của cảnh ở z = 0, nhiều vật có đáy âm theo địa hình nên bị nền che mất phần dưới)
  function lechCa(ca) {
    const zs = ca.hop.gt.goc.map(q => q[2]);
    for (let i = 2; i < ca.diem.length; i += 3) zs.push(ca.diem[i]);
    return [lech[0], lech[1], 0.03 - Math.min(0, Math.min(...zs))];
  }

  // chiNen: chỉ vẽ điểm, LiDAR và GT (hoạt ảnh tự vẽ hộp các vòng); trả dữ liệu cho kịch bản
  function veCa(n, laSai, chiNen = false) {
    anTheGioi(ctx, true);
    const ca = caSo(n);
    const d = lechCa(ca);
    const doi = (arr, i) => [arr[i] + d[0], arr[i + 1] + d[1], arr[i + 2] + d[2]];
    const xyz = [];
    for (let i = 0; i < ca.diem.length; i += 3) xyz.push(doi(ca.diem, i));
    const zs = xyz.map(q => q[2]);
    const z0 = Math.min(...zs), z1 = Math.max(...zs);
    const mau = xyz.map(q => {
      const t = (q[2] - z0) / Math.max(z1 - z0, 1e-6);
      return new T.Color().setHSL(0.55 - 0.45 * t, 0.75, 0.45).getHex();
    });
    nhom.add(H.diem(xyz, mau, 0.2));
    const sw = [];
    for (let i = 0; i < ca.sweep.length; i += 3) sw.push(doi(ca.sweep, i));
    nhom.add(H.diem(sw, 0xb6c2d1, 0.09));
    nhom.add(H.diem([doi(ca.lidar, 0)], 0xf59e0b, 0.5));
    const goc = q => q.map(v => [v[0], v[1], v[2] + d[2]]);
    nhom.add(H.hopGoc(goc(ca.hop.gt.goc), lech, 0x1f9d55, false));
    const hT = ca.hop[k - 1], hS = ca.hop[k];
    if (!chiNen && hienTruoc() && hT) nhom.add(H.hopGoc(goc(hT.goc), lech, 0x64748b, true));
    if (!chiNen && hienSau() && hS) nhom.add(H.hopGoc(goc(hS.goc), lech, 0xe5484d, true));
    const lechGt = h => h && Math.hypot(tamGoc(h.goc)[0] - tamGoc(ca.hop.gt.goc)[0], tamGoc(h.goc)[1] - tamGoc(ca.hop.gt.goc)[1]);
    capNhatChuGiai({ iou3d: hT ? hT.iou : null, tam_m: lechGt(hT) }, { iou3d: hS ? hS.iou : null, tam_m: lechGt(hS) }, `${ca.ten}${laSai ? ' — ca còn sai' : ''}`);
    return { ca, lidar: doi(ca.lidar, 0), doiGoc: q => q.map(v => [v[0] + d[0], v[1] + d[1], v[2] + d[2]]) };
  }

  // chú giải ở khung điều khiển: mỗi màu hộp kèm IoU của chính hộp đó, không dùng nhãn nổi
  function capNhatChuGiai(hT, hS, ten) {
    const el = document.getElementById('cv_chu_giai');
    if (!el) return;
    const muc = (mau, ky, chu, hien) => `<span class="cv_muc${hien ? '' : ' cv_muc--an'}" style="color:${mau}">${ky} ${chu}</span>`;
    el.innerHTML = `<div class="cv_dang_xem">Đang xem: <b>${ten}</b></div>
      <div class="cv_hang_chu_giai">
        ${muc('#1f9d55', '▭', 'Nhãn chuẩn GT', true)}
        ${muc('#64748b', '┅', `V${k - 1}: ${chuIoU(hT.iou3d, hT.tam_m)}`, hienTruoc())}
        ${muc('#e5484d', '┅', `V${k}: ${chuIoU(hS.iou3d, hS.tam_m)}`, hienSau())}
      </div>
      <div class="cv_ghi_nho">✓ đạt khi IoU 3D ≥ 0,5 (xe) · ≥ 0,3 (người đi bộ, 2 bánh)</div>`;
  }

  // camera: giữ hướng của góc nhìn đang chọn, lùi theo kích thước vật (xe buýt 11 m cần xa hơn xe con)
  function datCamera() {
    const g = GN_XE[gocHienTai] || GN_XE[0];
    if (vat === 'vd') { ctx.tweenCamera(g.cam, g.nhin, TINH ? 0 : 0.8); return; }
    const ca = caSo(vat === 'sua' ? ch.ca_sua[caSua % ch.ca_sua.length] : ch.ca_sai);
    // khung nhìn bao GT và mọi hộp đang hiện (hộp chọn nhầm cụm có thể cách GT hơn 10 m)
    const goc = [ca.hop.gt, hienTruoc() && ca.hop[k - 1], hienSau() && ca.hop[k]].filter(Boolean).flatMap(h => h.goc);
    const dz = lechCa(ca)[2];
    const zs = goc.map(q => q[2]);
    const mid = i => (Math.min(...goc.map(q => q[i])) + Math.max(...goc.map(q => q[i]))) / 2;
    const tam = [lech[0] + mid(0), lech[1] + mid(1), (Math.min(...zs) + Math.max(...zs)) / 2 + dz];
    const coMax = Math.max(...[0, 1, 2].map(i => Math.max(...goc.map(q => q[i])) - Math.min(...goc.map(q => q[i]))));
    const dv = [0, 1, 2].map(i => g.cam[i] - g.nhin[i]);
    const n = Math.hypot(...dv);
    const xa = Math.max(9, 2.4 * coMax + 3);
    ctx.tweenCamera(dv.map((v, i) => tam[i] + v / n * xa), tam, TINH ? 0 : 0.8);
  }
  doiGoc = idx => { gocHienTai = idx; datCamera(); };

  // ---------- hoạt ảnh "▶ Chạy thuật toán" (kịch bản ở cac_vong_chay.js) ----------
  const nhomChay = new T.Group();
  nhomChay.userData.hop = 'chay';
  lop.add(nhomChay);
  let rafChay = 0;
  function donNhomChay() {
    nhomChay.traverse(o => {
      if (typeof o.xoa === 'function') o.xoa();
      // ArrowHelper dùng chung hình học cho mọi mũi tên: chỉ bỏ vật liệu
      if (o.geometry && !(o.parent && o.parent.type === 'ArrowHelper')) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    nhomChay.clear();
  }
  function dungChay() {
    if (rafChay) cancelAnimationFrame(rafChay);
    rafChay = 0;
    donNhomChay();
    const nut = document.getElementById('cv_nut_chay');
    if (nut) nut.textContent = `▶ Chạy thuật toán V${k}`;
    const el = document.getElementById('cv_chay');
    if (el) el.innerHTML = `<div class="cv_chay_goi">Bấm ▶ để xem V${k} chạy từng bước${k === 3 ? ' (trên ca sửa được: xe ví dụ không kích hoạt luật nào của V3)' : ''}.</div>`;
  }
  const veDoThiV4 = conTro => {
    const el = document.getElementById('cv_do_thi_v4');
    if (el) el.innerHTML = svgDoThi({ theta: V1.theta_do, giaTri: V1.A, mau: '#e5484d', thetaChon: V1.theta_A_min_do, thetaGt: V1.gt_yaw_do % 90, nhan: 'V1 A min', giaTri2: V1.closeness, theta2: V1.theta4_do, mau2: '#c98200', thetaChon2: V1.theta_C_max_do, nhan2: 'V4 closeness max', caoPx: 116, conTro });
  };

  function chayThuatToan(buocDen = 0) {
    // V3 không đổi gì trên xe ví dụ → chạy trên ca sửa được
    if (k === 3 && vat === 'vd') vat = 'sua';
    ts = 'ca_hai';
    ve();
    xoaNhom(nhom);
    let tren = 'vd';
    if (vat === 'vd') {
      nhom.add(taoHop(ctx, bGt, 'gt', { fill: false }));
      moDiemTheGioi(ctx, 0.3);
    } else {
      tren = veCa(vat === 'sua' ? ch.ca_sua[caSua % ch.ca_sua.length] : ch.ca_sai, vat === 'sai', true);
    }
    const kb = kichBan(k, ctx, H, tren, veDoThiV4);
    const el = document.getElementById('cv_chay');
    const nut = document.getElementById('cv_nut_chay');
    if (!kb || !el) return;
    const hien = i => {
      el.innerHTML = `<div class="cv_chay_dau">Bước ${i + 1}/${kb.length} · ${kb[i].ten}</div><div>${kb[i].chu}</div><div id="cv_chay_dong" class="cv_chay_dong"></div>`;
    };
    const datChu = html => { const e = document.getElementById('cv_chay_dong'); if (e) e.innerHTML = html; };
    const veKhung = (i, t) => { donNhomChay(); kb[i].ve(t, nhomChay, datChu); veLai(ctx); };
    if (TINH) {
      // chụp kiểm / giảm chuyển động: nhảy tới khung cuối của bước được hỏi (mặc định bước cuối)
      const i = Math.min(kb.length, buocDen > 0 ? buocDen : kb.length) - 1;
      hien(i);
      veKhung(i, 1);
      return;
    }
    if (nut) nut.textContent = '■ Dừng';
    let i = 0, t0 = performance.now();
    hien(0);
    const khung = now => {
      const t = Math.min(1, (now - t0) / (kb[i].dai * 1000));
      veKhung(i, t);
      if (t >= 1) {
        if (i + 1 >= kb.length) { rafChay = 0; if (nut) nut.textContent = '↻ Chạy lại'; return; }
        i++;
        t0 = now;
        hien(i);
      }
      rafChay = requestAnimationFrame(khung);
    };
    rafChay = requestAnimationFrame(khung);
  }

  function ve() {
    dungChay();
    xoaNhom(nhom);
    if (vat === 'vd') moDiemTheGioi(ctx, 1);
    if (k === 4) veDoThiV4(undefined);
    datCamera();
    if (vat === 'vd') veXeVd();
    else if (vat === 'sua') veCa(ch.ca_sua[caSua % ch.ca_sua.length], false);
    else veCa(ch.ca_sai, true);
    const dk = document.getElementById('cv_dieu_khien');
    if (dk) {
      dk.querySelectorAll('[data-vat]').forEach(b => b.classList.toggle('active', b.dataset.vat === vat));
      dk.querySelectorAll('[data-ts]').forEach(b => b.classList.toggle('active', b.dataset.ts === ts));
      const nutSua = dk.querySelector('[data-vat="sua"]');
      if (nutSua && ch.ca_sua.length > 1) nutSua.textContent = `Ca sửa được ${(caSua % ch.ca_sua.length) + 1}/${ch.ca_sua.length}`;
    }
    veLai(ctx);
  }

  const nlS = hopVong(k).nang_luong;
  chenPanel('cv_panel_vong', `
    <div class="the_trang cv_the">
      ${daiBuoc(ch.doi)}
      <div class="cv_sai chu-the"><b>Sai ở V${k - 1}:</b> ${ch.sai_truoc}</div>
      <div class="cv_doi chu-the"><b>V${k} đổi gì:</b> ${ch.doi_gi}</div>
      ${dongSo(k - 1, k)}
      ${k === 4 ? `<div id="cv_do_thi_v4">${svgDoThi({ theta: V1.theta_do, giaTri: V1.A, mau: '#e5484d', thetaChon: V1.theta_A_min_do, thetaGt: V1.gt_yaw_do % 90, nhan: 'V1 A min', giaTri2: V1.closeness, theta2: V1.theta4_do, mau2: '#c98200', thetaChon2: V1.theta_C_max_do, nhan2: 'V4 closeness max', caoPx: 116 })}</div>` : ''}
      ${k === 5 ? `<div class="cv_ghi chu-the">Hộp V1: E<sub>mặt</sub> ${so(hopVong(1).nang_luong.e_mat, 2)}, ${hopVong(1).nang_luong.so_tia_xuyen} tia xuyên → V5: ${so(nlS.e_mat, 2)}, ${nlS.so_tia_xuyen} tia. Kiểm định chéo scene: <b>${pct(CV.v5.cv.nam_bo_gt)}</b> GT · <b>${pct(CV.v5.cv.nam_bo_yolo)}</b> YOLO.</div>` : ''}
      <div class="cv_con chu-the"><b>Còn sai:</b> ${ch.con_sai}</div>
    </div>`);

  const dk = chenDieuKhien(`
    <div class="cv_dk_hang">
      <button class="cv_nut" data-vat="vd">Xe ví dụ</button>
      <button class="cv_nut" data-vat="sua">Ca sửa được</button>
      <button class="cv_nut" data-vat="sai">Ca còn sai</button>
    </div>
    <div class="cv_dk_hang">
      <span class="cv_nhan_hang">Hộp:</span>
      <button class="cv_nut" data-ts="truoc">Chỉ V${k - 1}</button>
      <button class="cv_nut" data-ts="sau">Chỉ V${k}</button>
      <button class="cv_nut" data-ts="ca_hai">Cả hai</button>
    </div>
    <div id="cv_chu_giai" class="cv_chu_giai"></div>`);
  // khung hoạt ảnh ở góc dưới phải (vùng trống dưới vật), tách khỏi khung điều khiển phía trên
  const khungChay = document.createElement('div');
  khungChay.id = 'cv_chay_khung';
  khungChay.className = 'cv_chay_khung';
  khungChay.innerHTML = `<button class="cv_nut cv_nut--chay" id="cv_nut_chay">▶ Chạy thuật toán V${k}</button><div id="cv_chay" class="cv_chay"></div>`;
  dk.parentNode.appendChild(khungChay);
  dk.querySelectorAll('[data-vat]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.vat === 'sua' && vat === 'sua') caSua++;
    vat = b.dataset.vat; ve();
  }));
  dk.querySelectorAll('[data-ts]').forEach(b => b.addEventListener('click', () => { ts = b.dataset.ts; ve(); }));
  khungChay.querySelector('#cv_nut_chay').addEventListener('click', () => {
    if (rafChay) { ve(); return; }
    chayThuatToan();
  });
  ve();
  // ?chay=1 (kèm &buoc_chay=n khi chụp kiểm) mở thẳng hoạt ảnh
  if (p.get('chay')) chayThuatToan(parseInt(p.get('buoc_chay') || '0', 10));
  return () => { dungChay(); xoaNhom(nhom); };
}

// =====================================================================
const GN_XE = [
  { ten: 'Bên phải, nhìn từ trên', cam: [27.6, -9.8, 11.0], nhin: [24.3, 3.1, 1.0] },
  { ten: 'Từ trên (BEV)', cam: [24.3, 3.1, 15.0], nhin: [24.3, 3.1, 1.0] },
  { ten: 'Phía cảm biến', cam: [14.0, -1.0, 5.0], nhin: [24.3, 3.1, 1.0] }
];
let dungHoatAnh = null;
let doiGoc = null;
const raChung = ctx => {
  if (dungHoatAnh) { dungHoatAnh(); dungHoatAnh = null; }
  doiGoc = null;
  goPanel();
  anTheGioi(ctx, false);
  // trả lại mô hình xe ví dụ cho các slide sau (deck chỉ đặt lại từng xe con, không đặt lại cả nhóm)
  if (ctx.theGioi.nhomVat) ctx.theGioi.nhomVat.visible = true;
};

function slideVong(k, tieu_de, ml) {
  return {
    id: `vong-${k}`,
    phu_luc: true,
    vat_chinh: 'vd',
    muc: `Giải pháp · V${k}`,
    tieu_de,
    y: '',
    cong_thuc: [CAU_HINH[k].cong_thuc],
    so: [],
    ml,
    goc_nhin: GN_XE,
    vao(ctx) {
      dungHoatAnh = dungSlideVong(ctx, ctx.lop(), k);
    },
    doiGocNhin(ctx, idx) { if (doiGoc) doiGoc(idx); },
    ra: raChung
  };
}

const t = (k, nguon = 'gt') => pct(tong(k, nguon).dat);

export const SLIDES_CAC_VONG = [
  {
    id: 'luong-chinh',
    vat_chinh: 'vd',
    muc: 'Giải pháp · Luồng chính (V1)',
    tieu_de: 'Luồng chính của nhóm: 8 bước từ khung 2D tới hộp 3D',
    y: `Bấm từng bước để xem luồng chính (Frustum Studio) làm gì trên xe ví dụ, và vì sao hộp ra sai.`,
    cong_thuc: [String.raw`\theta^* = \arg\min_{\theta \in [0^\circ, 90^\circ)} A(\theta), \qquad A(\theta) = \prod_{k=1}^{2}\big(q_{99{,}5\%} - q_{0{,}5\%}\big)_k`],
    so: [],
    ml: 'Một pipeline hình học thuần: không học tham số, mọi ngưỡng đặt tay.',
    goc_nhin: GN_XE,
    vao(ctx) {
      const b = parseInt(thamSo().get('buoc') || '8', 10);
      moDiemTheGioi(ctx, 0.35);
      anTheGioi(ctx, false);
      dungHoatAnh = dungLuongChinh(ctx, ctx.lop(), b >= 1 && b <= 8 ? b : 8);
    },
    ra: raChung
  },
  slideVong(2, `V2: hộp đủ kích thước, vật xa vẫn ra hộp — đạt ${t(1)} → ${t(2)}`,
    'Thêm prior kích thước theo lớp, như prior trong học máy.'),
  slideVong(3, `V3: sửa trục và hộp dự phòng — đạt ${t(2)} → ${t(3)}`,
    'Luật cho ca biên chỉ giữ khi tập phụ cũng tăng.'),
  slideVong(4, `V4: fit chữ L đúng hướng — đạt ${t(3)} → ${t(4)}`,
    'Cùng dữ liệu, đổi hàm mục tiêu là đổi nghiệm.'),
  slideVong(5, `V5: đặt hộp bằng cực tiểu năng lượng — đạt ${t(4)} → ${t(5)}`,
    'Học tham số như huấn luyện: tách train/test theo scene.')
];

export const slideLuongChinh = SLIDES_CAC_VONG[0];
export const slideVong2 = SLIDES_CAC_VONG[1];
export const slideVong3 = SLIDES_CAC_VONG[2];
export const slideVong4 = SLIDES_CAC_VONG[3];
export const slideVong5 = SLIDES_CAC_VONG[4];
