// Chương "Kết quả đánh giá" (đợt 12, Task T63–T65; đợt 14, Task T71–T73): IoU 3D các vòng trên dữ liệu thật nuScenes
// Dữ liệu từ data/ket_qua.js và data/lidar_kq.js, sinh bởi script demo/tools/xuat_ket_qua.py và demo/tools/xuat_lidar.py
import { KET_QUA } from '../../data/ket_qua.js';
import { LIDAR_KQ } from '../../data/lidar_kq.js';
import { MAU_VONG, svgTiLeDat, svgCotNhom } from '../bieu_do.js';
import { taoHop, anChuGiaiHop } from '../hop.js';
import { taoDiemLidar } from '../diem_lidar.js';
import { taoXemCa } from '../xem_ca.js';
import { htmlPhanTrang, catTrang, trangTuUrl } from '../phan_trang.js';

const so = (v, n = 1) => Number(v).toFixed(n).replace('.', ',');
const thamSo = () => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const CO_WINDOW = typeof window !== 'undefined';
const CHUP = CO_WINDOW && thamSo().has('chup');
const TINH = CHUP || (CO_WINDOW && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const veLai = ctx => { if (CHUP && ctx && ctx.canh && typeof ctx.canh.veMotLan === 'function') ctx.canh.veMotLan(); };

const MAU_VONG_HEX = {
  1: 0x3b82f6,
  2: 0x8b5cf6,
  3: 0xec4899,
  4: 0xf59e0b,
  5: 0x10b981,
  6: 0x0891b2
};

let xemCaVat = null, khoiPhucVat = null, khoiPhucCanh = null, khoiPhucPb = null;

function chenPanel(id, html) {
  const elY = document.getElementById('slide_y');
  if (!elY) return null;
  const cu = document.getElementById(id);
  if (cu) cu.remove();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'fade-in kq_panel';
  el.dataset.cuaSlide = document.body.dataset.slideHienTai || '';
  el.innerHTML = html;
  elY.parentNode.insertBefore(el, elY.nextSibling);
  return el;
}

function chenDieuKhien(id, html) {
  const cu = document.getElementById(id);
  if (cu) cu.remove();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'cv_dieu_khien';
  el.dataset.cuaSlide = document.body.dataset.slideHienTai || '';
  el.innerHTML = html;
  (document.getElementById('canh_3d') || document.body).appendChild(el);
  return el;
}

function goPhanTu(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

function anTheGioi(ctx, an) {
  const tg = ctx.theGioi;
  if (!tg) return;
  if (tg.diem) tg.diem.visible = !an;
  if (tg.nhomVat) tg.nhomVat.visible = !an;
  if (tg.ego) tg.ego.visible = true;
}

// ngược của ctx.S (x, y, z) → (x, z, −y): tweenCamera nhận toạ độ ego và tự gọi S, không truyền điểm đã đổi trục
const veEgo = v => [v.x, -v.z, v.y];

function xoaNhom(nhom) {
  if (!nhom) return;
  nhom.traverse(o => {
    if (typeof o.xoa === 'function') o.xoa();
    if (o.geometry && !(o.parent && o.parent.type === 'ArrowHelper')) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
      else o.material.dispose();
    }
  });
  nhom.clear();
}

/**
 * Cấu hình 4 nút "Màu điểm" ở góc trái dưới cho các slide kết quả (T72)
 */
function caiDatNutMauSlide(loaiSlide, cheDoMacDinh) {
  if (typeof document === 'undefined') return () => {};
  const nutMau = document.querySelectorAll('.cham_mau');
  if (nutMau.length < 4) return () => {};

  const goc = [
    { cheDo: nutMau[0].dataset.cheDo, title: nutMau[0].title },
    { cheDo: nutMau[1].dataset.cheDo, title: nutMau[1].title },
    { cheDo: nutMau[2].dataset.cheDo, title: nutMau[2].title },
    { cheDo: nutMau[3].dataset.cheDo, title: nutMau[3].title }
  ];

  nutMau[0].dataset.cheDo = 'do_cao';
  nutMau[0].title = 'Theo độ cao Z';

  nutMau[1].dataset.cheDo = 'cuong_do';
  nutMau[1].title = 'Theo cường độ phản xạ (nén log)';

  if (loaiSlide === 'vat') {
    nutMau[2].dataset.cheDo = 'frustum';
    nutMau[2].title = 'Điểm trong hộp GT (xanh lá) & trong Frustum (hổ phách)';
  } else {
    nutMau[2].dataset.cheDo = 'trong_hop';
    nutMau[2].title = 'Điểm trong hộp GT (xanh lá)';
  }

  nutMau[3].dataset.cheDo = 'xam';
  nutMau[3].title = 'Màu đơn';

  nutMau.forEach(b => {
    if (b.dataset.cheDo === cheDoMacDinh) b.classList.add('active');
    else b.classList.remove('active');
  });

  return function khoiPhuc() {
    nutMau.forEach((b, i) => {
      b.dataset.cheDo = goc[i].cheDo;
      b.title = goc[i].title;
    });
  };
}

/**
 * Dựng toàn cảnh keyframe (dùng chung cho S20 và S22 theo T65, T73)
 */
function dungCanhKeyframe(ctx, nhom, bo, vong, nguon, coSweep = false) {
  const kf = KET_QUA.khung[bo - 1];
  if (!kf) return { cam: [0.1, 0, 78], nhin: [0, 0, 0], diem: null };

  // 1. Điểm LiDAR thật từ LIDAR_KQ (đĩa tròn taoDiscSprite, sizeAttenuation, size 0.08 / 0.06)
  const lk = LIDAR_KQ ? LIDAR_KQ[kf.bo] : null;
  let diemObj = null;
  if (lk) {
    diemObj = taoDiemLidar(ctx, {
      xyz: lk.kf.xyz,
      cuongDo: lk.kf.cuong_do,
      swXyz: lk.sw.xyz,
      swK: lk.sw.k
    }, {
      coSweep,
      danhSachGt: kf.vat.map(v => v.gt)
    });
    nhom.add(diemObj);
  }

  // 2. Hộp GT đạt (gt) và GT trượt (gt_truot), cùng hộp pipeline (pipeline) (T65, T69: netDay >= 3px)
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;

  for (const v of kf.vat) {
    const vRes = v.vong && v.vong[String(vong)] ? v.vong[String(vong)][nguon] : null;
    const dat = vRes ? vRes.dat : false;

    if (v.gt.cx < minX) minX = v.gt.cx;
    if (v.gt.cx > maxX) maxX = v.gt.cx;
    if (v.gt.cy < minY) minY = v.gt.cy;
    if (v.gt.cy > maxY) maxY = v.gt.cy;

    const vaiGt = dat ? 'gt' : 'gt_truot';
    const hopGtObj = taoHop(ctx, v.gt, vaiGt, { fill: true, netDay: true });
    nhom.add(hopGtObj);

    if (vRes && vRes.hop) {
      const hopPrObj = taoHop(ctx, vRes.hop, 'pipeline', { fill: false, color: 0xc98200, netDut: true, netDay: true });
      nhom.add(hopPrObj);
    }
  }

  // Camera nghiêng bao cụm vật gần ego
  const gan = kf.vat.filter(v => Math.hypot(v.gt.cx, v.gt.cy) <= 30);
  const cum = gan.length >= 3 ? gan : kf.vat;
  const xs = cum.map(v => v.gt.cx), ys = cum.map(v => v.gt.cy);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 12);
  const d = Math.min(60, Math.max(18, span * 1.15));
  const huong = [-0.62, -0.42, 0.66];
  const n = Math.hypot(...huong);
  return {
    cam: huong.map((h, i) => [cx, cy, 0][i] + h / n * d),
    nhin: [cx, cy, 0],
    diem: diemObj
  };
}

// =====================================================================
// Slide 1: ket-qua-canh (Toàn cảnh keyframe)
// =====================================================================
const t1Tong = KET_QUA.tong && KET_QUA.tong.gt ? KET_QUA.tong.gt['1'] : 10.0;
const t5Tong = KET_QUA.tong && KET_QUA.tong.gt ? KET_QUA.tong.gt['5'] : 80.3;
const t6Tong = KET_QUA.tong && KET_QUA.tong.gt ? KET_QUA.tong.gt['6'] : 82.7;

export const slideKetQuaCanh = {
  id: 'ket-qua-canh',
  phu_luc: true,
  vat_chinh: 'none',
  muc: 'Tính khả thi · Kết quả: Toàn cảnh',
  tieu_de: `Cả keyframe: V1 ${so(t1Tong, 1)} % → V5 ${so(t5Tong, 1)} % · V6 ${so(t6Tong, 1)} % (khung GT, 289 vật)`,
  y: '',
  ml: 'Chấm trên mọi vật của keyframe, không chọn ca đẹp: mỗi vật một IoU 3D, đạt khi ≥ 0,5 (xe) hoặc ≥ 0,3 (người, 2 bánh).',
  goc_nhin: [
    { ten: 'Từ trên xuống', cam: [8.1, 0, 46], nhin: [8, 0, 0] },
    { ten: 'Nghiêng sau xe ego', cam: [-14, -12, 16], nhin: [10, 2, 0] }
  ],
  vao(ctx) {
    anTheGioi(ctx, true);
    anChuGiaiHop();

    const T = ctx.THREE;
    const lop = ctx.lop();
    const nhom = new T.Group();
    nhom.userData.hop = 'ket_qua';
    lop.add(nhom);

    const nhomChon = new T.Group();
    nhomChon.userData.hop = 'ket_qua';
    lop.add(nhomChon);

    // Đọc trạng thái ban đầu từ URL
    const q = thamSo();
    let bo = Math.max(1, Math.min(5, +q.get('bo') || 1));
    let vong = Math.max(1, Math.min(5, +q.get('vong') || 5));
    let nguon = q.get('nguon') === 'yolo' ? 'yolo' : 'gt';
    let coSweep = q.get('sweep') === '10';
    let cheDoMau = q.get('mau') || 'do_cao';
    let vatChonIdx = -1;
    let diemHienTai = null;

    khoiPhucCanh = caiDatNutMauSlide('toan_canh', cheDoMau);
    ctx.toMauSlide = (cd) => {
      cheDoMau = cd;
      if (diemHienTai) diemHienTai.toMau(cd);
    };

    // datCam = false: chỉ vẽ lại hộp, giữ góc người xem đã xoay (đổi vòng / nguồn / sweep); chỉ đổi bộ mới đặt lại góc
    function capNhatCanh(datCam = true) {
      xoaNhom(nhom);
      xoaNhom(nhomChon);
      const giuChon = datCam ? -1 : vatChonIdx;
      vatChonIdx = -1;

      const ketQuaDung = dungCanhKeyframe(ctx, nhom, bo, vong, nguon, coSweep);
      diemHienTai = ketQuaDung.diem;
      if (diemHienTai) diemHienTai.toMau(cheDoMau);

      if (datCam) ctx.tweenCamera(ketQuaDung.cam, ketQuaDung.nhin, TINH ? 0 : 0.6);
      else if (giuChon >= 0) chonVat(giuChon, false);
      veLai(ctx);
    }

    function capNhatGiaoDien() {
      const kf = KET_QUA.khung[bo - 1];
      if (!kf) return;

      const soDat = kf.vat.filter(v => {
        const res = v.vong && v.vong[String(vong)] ? v.vong[String(vong)][nguon] : null;
        return res && res.dat;
      }).length;
      const soVat = kf.vat.length;
      const pctDat = soVat > 0 ? ((soDat / soVat) * 100).toFixed(1).replace('.', ',') : '0,0';

      // 1. Khung điều khiển (thêm công tắc sweep T73)
      chenDieuKhien('kq_dieu_khien', `
        <div class="cv_dk_hang">
          ${[1, 2, 3, 4, 5].map(b => `<button class="cv_nut${b === bo ? ' active' : ''}" data-bo="${b}">Bộ ${b}</button>`).join('')}
        </div>
        <div class="cv_dk_hang">
          ${[1, 2, 3, 4, 5, 6].map(v => `<button class="cv_nut${v === vong ? ' active' : ''}" data-vong="${v}">V${v}</button>`).join('')}
        </div>
        <div class="cv_dk_hang">
          <button class="cv_nut${nguon === 'gt' ? ' active' : ''}" data-nguon="gt">Khung GT</button>
          <button class="cv_nut${nguon === 'yolo' ? ' active' : ''}" data-nguon="yolo">YOLO</button>
        </div>
        <div class="cv_dk_hang">
          <button class="cv_nut${!coSweep ? ' active' : ''}" data-sweep="1">1 sweep (keyframe)</button>
          <button class="cv_nut${coSweep ? ' active' : ''}" data-sweep="10">+9 sweep quanh vật (như V5)</button>
        </div>
        <div class="cv_chu_giai">
          <div class="cv_hang_chu_giai">
            <span style="color:#1f9d55">▭ GT đạt</span>
            <span style="color:#e5484d">▭ GT trượt</span>
            <span style="color:#c98200">┅ hộp pipeline</span>
          </div>
          <div class="cv_ghi_nho">✓ đạt khi IoU 3D ≥ 0,5 (xe) · ≥ 0,3 (người đi bộ, 2 bánh) · – = không ra hộp</div>
        </div>
      `);

      // Gắn sự kiện khung điều khiển
      const dkEl = document.getElementById('kq_dieu_khien');
      if (dkEl) {
        dkEl.querySelectorAll('[data-bo]').forEach(btn => btn.addEventListener('click', () => {
          bo = +btn.dataset.bo;
          if (CO_WINDOW) {
            const u = new URL(window.location);
            u.searchParams.delete('trang');
            window.history.replaceState(null, '', u);
          }
          capNhatCanh();
          capNhatGiaoDien();
        }));
        dkEl.querySelectorAll('[data-vong]').forEach(btn => btn.addEventListener('click', () => {
          vong = +btn.dataset.vong;
          capNhatCanh(false);
          capNhatGiaoDien();
        }));
        dkEl.querySelectorAll('[data-nguon]').forEach(btn => btn.addEventListener('click', () => {
          nguon = btn.dataset.nguon;
          capNhatCanh(false);
          capNhatGiaoDien();
        }));
        dkEl.querySelectorAll('[data-sweep]').forEach(btn => btn.addEventListener('click', () => {
          const swMoi = btn.dataset.sweep === '10';
          if (coSweep === swMoi) return;
          coSweep = swMoi;
          if (CO_WINDOW) {
            const u = new URL(window.location);
            if (coSweep) u.searchParams.set('sweep', '10');
            else u.searchParams.delete('sweep');
            window.history.replaceState(null, '', u);
          }
          capNhatCanh(false); // đổi công tắc không đặt lại camera
          capNhatGiaoDien();
        }));
      }

      // 2. Cột trái: phân trang 7 vật
      const p = thamSo();
      const moiTrang = 7;
      const tongTrang = Math.ceil(kf.vat.length / moiTrang);
      let trang;
      if (p.has('trang')) {
        trang = trangTuUrl();
      } else {
        trang = Math.floor(vatChonIdx / moiTrang) + 1;
      }
      if (trang < 1) trang = 1;
      if (trang > tongTrang) trang = tongTrang;

      const vatTrang = catTrang(kf.vat.map((v, i) => ({ v, idx: i })), trang, moiTrang);

      const dongHtml = vatTrang.map(({ v, idx }) => {
        const oVong = [1, 2, 3, 4, 5, 6].map(k => {
          const res = v.vong && v.vong[String(k)] ? v.vong[String(k)][nguon] : null;
          const chonK = k === vong ? ' kq_o_chon_vong' : '';
          if (!res || !res.hop) return `<td class="kq_o_khong${chonK}">—</td>`;
          const iouStr = res.iou.toFixed(2).replace('.', ',');
          const lopMau = res.dat ? 'kq_o_dat' : 'kq_o_truot';
          return `<td><span class="kq_o_iou ${lopMau}${chonK}">${iouStr}</span></td>`;
        }).join('');

        const nutXemHtml = idx === vatChonIdx
          ? `<a class="kq_nut_xem_2d3d tuong_tac" href="?slide=ket-qua-vat&bo=${bo}&vat=${idx + 1}&v=${vong}&nguon=${nguon}" data-link-vat="${idx + 1}">Xem 2D + 3D ▶</a>`
          : '';

        return `
          <tr class="kq_dong${idx === vatChonIdx ? ' chon' : ''}" data-idx="${idx}">
            <td style="text-align:left; font-weight:600;">${v.lop} · ${so(v.kc, 1)} m · ngưỡng ${so(v.nguong, 1)}${nutXemHtml}</td>
            ${oVong}
          </tr>
        `;
      }).join('');

      chenPanel('kq_panel', `
        <div class="the_trang kq_tom_tat">
          Bộ ${bo} · ${kf.scene} · kf ${kf.kf} — <b>${kf.mo_ta}</b>: đạt <b>${soDat}/${soVat}</b> vật (${pctDat} %) ở V${vong}
        </div>
        <div style="margin-top:2px;">
          <div class="kq_bang_cuon" style="border-radius:8px; height:auto; overflow:visible;">
            <table class="kq_bang">
              <thead>
                <tr>
                  <th style="text-align:left;">Lớp · Khoảng cách · Ngưỡng</th>
                  <th>V1</th><th>V2</th><th>V3</th><th>V4</th><th>V5</th><th>V6</th>
                </tr>
              </thead>
              <tbody>
                ${dongHtml}
              </tbody>
            </table>
          </div>
        </div>
        ${htmlPhanTrang('ket_qua_canh', trang, tongTrang)}
        <div class="chu-nho" style="color:var(--mau-chu-phu); line-height:1.4; margin-top:4px;">
          Bấm vào dòng để phóng to vật; bấm "Xem 2D + 3D ▶" để xem ảnh camera thật và hộp 3D chi tiết.
        </div>
      `);

      // Gắn sự kiện chọn dòng trong bảng
      const pnlEl = document.getElementById('kq_panel');
      if (pnlEl) {
        pnlEl.querySelectorAll('.kq_dong').forEach(tr => tr.addEventListener('click', (e) => {
          if (e.target.closest('.kq_nut_xem_2d3d')) return;
          const idx = +tr.dataset.idx;
          chonVat(idx);
        }));

        pnlEl.querySelectorAll('.thanh_phan_trang button[data-trang]').forEach(btn => {
          btn.addEventListener('click', () => {
            const t = parseInt(btn.dataset.trang, 10);
            if (!isNaN(t) && t >= 1 && t <= tongTrang) {
              if (CO_WINDOW) {
                const u = new URL(window.location);
                u.searchParams.set('trang', t);
                window.history.replaceState(null, '', u);
              }
              capNhatGiaoDien();
            }
          });
        });

        pnlEl.querySelectorAll('[data-link-vat]').forEach(a => a.addEventListener('click', (e) => {
          e.preventDefault();
          const targetVat = a.dataset.linkVat;
          const newUrl = `?slide=ket-qua-vat&bo=${bo}&vat=${targetVat}&v=${vong}&nguon=${nguon}`;
          if (typeof window !== 'undefined') {
            window.history.pushState(null, '', newUrl);
            if (window.chuyenSlideTheoId) window.chuyenSlideTheoId('ket-qua-vat');
            else window.location.search = newUrl;
          }
        }));
      }
    }

    function chonVat(idx, datCam = true) {
      vatChonIdx = idx;
      xoaNhom(nhomChon);

      const kf = KET_QUA.khung[bo - 1];
      if (!kf || !kf.vat[idx]) return;
      const v = kf.vat[idx];

      capNhatGiaoDien();

      // Cuộn bảng để dòng được chọn hiện ra (T69)
      const trChon = document.querySelector(`.kq_dong[data-idx="${idx}"]`);
      if (trChon) trChon.scrollIntoView({ block: 'nearest', behavior: TINH ? 'instant' : 'smooth' });

      // Nổi bật hộp GT và hộp pipeline của vật này (T65, T69: netDay >= 3px)
      const vRes = v.vong && v.vong[String(vong)] ? v.vong[String(vong)][nguon] : null;
      const dat = vRes ? vRes.dat : false;

      const hopGtChon = taoHop(ctx, v.gt, dat ? 'gt' : 'gt_truot', { fill: true, netDay: true, fillOpacity: 0.35 });
      nhomChon.add(hopGtChon);

      if (vRes && vRes.hop) {
        const hopPrChon = taoHop(ctx, vRes.hop, 'pipeline', { fill: false, color: 0xc98200, netDut: true, netDay: true });
        nhomChon.add(hopPrChon);
      }

      if (!datCam) { veLai(ctx); return; }
      const g = v.gt;
      const xa = Math.max(9, 2.4 * Math.max(g.l, g.w, g.h) + 3);
      const r = Math.hypot(g.cx, g.cy) || 1;
      const huong = [g.cx / r * 0.55, g.cy / r * 0.55, 0.62];
      const n = Math.hypot(...huong);
      ctx.tweenCamera([g.cx - huong[0] / n * xa, g.cy - huong[1] / n * xa, g.cz + huong[2] / n * xa], [g.cx, g.cy, g.cz], TINH ? 0 : 0.8);
      veLai(ctx);
    }

    capNhatCanh();
    capNhatGiaoDien();
    // &chon=n: mở sẵn vật thứ n của keyframe (liên kết thẳng, và để chup.py kiểm camera khi bấm dòng)
    const chon = +q.get('chon');
    if (chon >= 1 && KET_QUA.khung[bo - 1] && chon <= KET_QUA.khung[bo - 1].vat.length) chonVat(chon - 1);
  },
  ra(ctx) {
    delete ctx.toMauSlide;
    if (typeof khoiPhucCanh === 'function') { khoiPhucCanh(); khoiPhucCanh = null; }
    anTheGioi(ctx, false);
    goPhanTu(['kq_dieu_khien', 'kq_panel']);
  }
};

// =====================================================================
// Slide 2: ket-qua-vat (Ca nuScenes thật: 2D và 3D - T64 làm lại hoàn toàn)
// =====================================================================
export const slideKetQuaVat = {
  id: 'ket-qua-vat',
  vat_chinh: 'none',
  muc: 'Tính khả thi · Kết quả: Từng vật thật',
  tieu_de: 'Ca nuScenes thật: ảnh camera 2D và cảnh 3D',
  y: '',
  ml: 'Xem từng vật trên ảnh camera thật và đám điểm LiDAR: bật/tắt V1–V6 độc lập để so với GT.',
  goc_nhin: [
    { ten: 'Nghiêng bao quanh vật', cam: [28.2, 5.8, 4.4], nhin: [24.3, 3.1, 0.9] },
    { ten: 'Từ trên nhìn xuống', cam: [24.3, 3.1, 9.5], nhin: [24.3, 3.1, 0.9] }
  ],
  vao(ctx) {
    anTheGioi(ctx, true);
    anChuGiaiHop();

    const T = ctx.THREE;
    const lop = ctx.lop();
    const nhom = new T.Group();
    nhom.userData.hop = 'ket_qua_vat';
    lop.add(nhom);

    // Đọc trạng thái từ URL
    const q = thamSo();
    let bo = Math.max(1, Math.min(5, +q.get('bo') || 1));
    let vatIdx = Math.max(1, +q.get('vat') || 1) - 1; // 0-indexed nội bộ
    let nguon = q.get('nguon') === 'yolo' ? 'yolo' : 'gt';
    let cheDoAnh = q.get('anh') === 'ca' ? 'ca' : 'phong'; // 'phong' (mặc định) hoặc 'ca'
    let coSweep = q.get('sweep') === '10';
    let cheDoMau = q.get('mau') || 'frustum';
    let hienTaiDiem = null;

    khoiPhucVat = caiDatNutMauSlide('vat', cheDoMau);
    ctx.toMauSlide = (cd) => {
      cheDoMau = cd;
      if (hienTaiDiem) hienTaiDiem.toMau(cd);
    };

    // Ô tích chọn V1..V6 (Set các số từ 1..6, mặc định chỉ có 5)
    let vChon = new Set([5]);
    if (q.has('v')) {
      const vArr = q.get('v').split(',').map(Number).filter(n => n >= 1 && n <= 6);
      if (vArr.length > 0) vChon = new Set(vArr);
    }

    xemCaVat = taoXemCa(ctx, { elAnh: '#kq_vat_khung_2d', nhom });

    function layDiemKhung(kf, v) {
      const lk = LIDAR_KQ ? LIDAR_KQ[kf.bo] : null;
      if (!lk) return null;
      const camData = lk.cam[v.camera];
      const bboxVao = (nguon === 'yolo' && v.vong['1'] && v.vong['1'].yolo && v.vong['1'].yolo.bbox_vao)
        ? v.vong['1'].yolo.bbox_vao
        : v.bbox_gt;
      return {
        xyz: lk.kf.xyz,
        cuongDo: lk.kf.cuong_do,
        swXyz: lk.sw.xyz,
        swK: lk.sw.k,
        cam: camData,
        bboxVao
      };
    }

    function capNhatCanh3D(datCam = true) {
      const kf = KET_QUA.khung[bo - 1];
      if (!kf || kf.vat.length === 0) return;
      if (vatIdx >= kf.vat.length) vatIdx = 0;
      const v = kf.vat[vatIdx];
      const anhKey = `bo${bo}/${v.camera}`;
      v.anh = KET_QUA.anh && KET_QUA.anh[anhKey] ? KET_QUA.anh[anhKey] : `assets/nuscenes/bo${bo}_${v.camera}.jpg`;

      const diemKhung = layDiemKhung(kf, v);
      hienTaiDiem = xemCaVat.hien(v, {
        vong: vChon,
        nguon,
        sweep: coSweep,
        cheDoAnh,
        datCam,
        diemKhung,
        cheDoMau
      });
    }

    function capNhatGiaoDien() {
      const kf = KET_QUA.khung[bo - 1];
      if (!kf || kf.vat.length === 0) return;
      if (vatIdx >= kf.vat.length) vatIdx = 0;
      const v = kf.vat[vatIdx];
      const tongVat = kf.vat.length;

      // 1. Dòng điều khiển trên cùng (có thêm công tắc sweep T73)
      chenDieuKhien('kq_vat_dieu_khien', `
        <div class="cv_dk_hang">
          ${[1, 2, 3, 4, 5].map(b => `<button class="cv_nut${b === bo ? ' active' : ''}" data-bo="${b}">Bộ ${b}</button>`).join('')}
        </div>
        <div class="cv_dk_hang">
          <button class="cv_nut" id="kq_btn_prev">◀ Vật trước</button>
          <span style="font-size:var(--c-nut); font-weight:700; color:var(--mau-chu); padding:0 6px;">Vật ${vatIdx + 1}/${tongVat}</span>
          <button class="cv_nut" id="kq_btn_next">Vật sau ▶</button>
        </div>
        <div class="cv_dk_hang">
          <button class="cv_nut${nguon === 'gt' ? ' active' : ''}" data-nguon="gt">Khung GT</button>
          <button class="cv_nut${nguon === 'yolo' ? ' active' : ''}" data-nguon="yolo">YOLO</button>
        </div>
        <div class="cv_dk_hang">
          <button class="cv_nut${!coSweep ? ' active' : ''}" data-sweep="1">1 sweep (keyframe)</button>
          <button class="cv_nut${coSweep ? ' active' : ''}" data-sweep="10">+9 sweep quanh vật (như V5)</button>
        </div>
      `);

      // Bảng so sánh IoU 2D/3D dưới ảnh (T68: mỗi dòng <= 34px, tích >= 3 vòng thì 2 cột)
      const soVongTich = vChon.size;
      const lopKhungSoSanh = soVongTich >= 3 ? 'kq_so_sanh_grid' : 'kq_so_sanh_don';
      let danhSachSoSanhHtml = '';
      for (const k of [1, 2, 3, 4, 5, 6]) {
        if (!vChon.has(k)) continue;
        const vRes = v.vong && v.vong[String(k)] ? v.vong[String(k)][nguon] : null;
        const mauK = MAU_VONG[k];

        if (!vRes || !vRes.hop) {
          danhSachSoSanhHtml += `
            <div class="kq_so_sanh_item">
              <span style="display:flex; align-items:center; gap:6px;">
                <b style="color:${mauK};">V${k}</b>
                <span style="color:#94a3b8;">không ra hộp</span>
              </span>
              <span class="kq_o_iou kq_o_truot" style="padding:1px 6px;">—</span>
            </div>
          `;
        } else {
          const iou2dStr = so(vRes.iou2d, 2);
          const iou3dStr = so(vRes.iou, 2);
          const dat = vRes.dat;
          const datKyHieu = dat ? '✓ đạt' : '✗ trượt';
          const lopMau3d = dat ? 'kq_o_dat' : 'kq_o_truot';
          const chuGoc = (vRes.goc2d === null) ? ' <small style="color:#e5484d;">(sau cam)</small>' : '';

          danhSachSoSanhHtml += `
            <div class="kq_so_sanh_item">
              <span style="display:flex; align-items:center; gap:6px;">
                <b style="color:${mauK};">V${k}</b>
                <span style="color:#475569;">2D: ${iou2dStr}${chuGoc}</span>
              </span>
              <span class="kq_o_iou ${lopMau3d}" style="padding:1px 6px;">3D: ${iou3dStr} ${datKyHieu}</span>
            </div>
          `;
        }
      }

      // Ô tích chọn V1..V6
      const oTichHtml = [1, 2, 3, 4, 5, 6].map(k => {
        const daTich = vChon.has(k);
        const mauK = MAU_VONG[k];
        return `
          <label class="kq_o_tich_item" style="border-color:${mauK};">
            <input type="checkbox" data-tich-v="${k}" ${daTich ? 'checked' : ''}/>
            <span style="color:${mauK}; font-weight:700;">V${k}</span>
          </label>
        `;
      }).join('');

      // Lấy dữ liệu điểm LiDAR từ LIDAR_KQ cho dòng số T73
      const lk = LIDAR_KQ ? LIDAR_KQ[kf.bo] : null;
      const vatLidar = (lk && lk.vat) ? lk.vat[v.gt_id] : null;
      const nKfHop = vatLidar ? vatLidar.so_diem_hop : 0;
      const nSwHop = vatLidar ? (vatLidar.so_diem_hop_sw - vatLidar.so_diem_hop) : 0;
      const nNusc = v.so_diem;
      const nFrustum = (vatLidar && vatLidar.so_frustum && vatLidar.so_frustum[nguon] !== undefined)
        ? vatLidar.so_frustum[nguon]
        : 0;

      chenPanel('kq_vat_panel', `
        <div class="the_trang kq_vat_hop_dk" style="padding:4px 8px; margin-bottom:2px;">
          <div class="kq_vat_ten_ca">
            Bộ ${bo} · ${kf.scene} · ${v.camera} · <b>${v.lop}</b> · ${so(v.kc, 1)} m · ngưỡng <b>${so(v.nguong, 1)}</b>
          </div>
          <div class="kq_tich_hang" style="margin-top:2px;">
            <span class="chu-the" style="font-weight:700;">Vòng so với GT:</span>
            ${oTichHtml}
          </div>
        </div>

        <div class="kq_vat_khung_2d" id="kq_vat_khung_2d"${soVongTich >= 4 ? ' style="max-height:310px;"' : ''}></div>

        <div class="kq_ghi_cong">
          Ảnh/LiDAR: nuScenes v1.0-mini (Motional), CC BY-NC-SA 4.0
        </div>

        <div class="the_trang" style="padding:4px 8px; margin-top:2px;">
          <div class="${lopKhungSoSanh}">
            ${danhSachSoSanhHtml}
          </div>
          <div class="cv_ghi_nho" style="margin-top:2px; font-size:var(--c-nho); color:var(--mau-chu); line-height:1.2; white-space:nowrap;">
            Điểm LiDAR trong GT: kf <b>${nKfHop}</b> · +9 sweep <b>${nSwHop}</b> · nuScenes <b>${nNusc}</b> · frustum <b>${nFrustum}</b>
          </div>
          <div class="cv_ghi_nho" style="margin-top:2px; line-height:1.2;">
            ✓ đạt khi IoU 3D ≥ 0,5 (xe) · ≥ 0,3 (người đi bộ, 2 bánh)
          </div>
        </div>
      `);

      const anhKey = `bo${bo}/${v.camera}`;
      v.anh = KET_QUA.anh && KET_QUA.anh[anhKey] ? KET_QUA.anh[anhKey] : `assets/nuscenes/bo${bo}_${v.camera}.jpg`;
      const diemKhung = layDiemKhung(kf, v);
      xemCaVat.hien(v, {
        vong: vChon,
        nguon,
        sweep: coSweep,
        cheDoAnh,
        datCam: false,
        diemKhung,
        cheDoMau
      });


      // Gắn sự kiện
      const dkEl = document.getElementById('kq_vat_dieu_khien');
      if (dkEl) {
        dkEl.querySelectorAll('[data-bo]').forEach(btn => btn.addEventListener('click', () => {
          bo = +btn.dataset.bo;
          vatIdx = 0;
          capNhatCanh3D();
          capNhatGiaoDien();
        }));
        document.getElementById('kq_btn_prev').addEventListener('click', () => {
          vatIdx = vatIdx > 0 ? vatIdx - 1 : tongVat - 1;
          capNhatCanh3D();
          capNhatGiaoDien();
        });
        document.getElementById('kq_btn_next').addEventListener('click', () => {
          vatIdx = vatIdx < tongVat - 1 ? vatIdx + 1 : 0;
          capNhatCanh3D();
          capNhatGiaoDien();
        });
        dkEl.querySelectorAll('[data-nguon]').forEach(btn => btn.addEventListener('click', () => {
          nguon = btn.dataset.nguon;
          capNhatCanh3D(false);
          capNhatGiaoDien();
        }));
        dkEl.querySelectorAll('[data-sweep]').forEach(btn => btn.addEventListener('click', () => {
          const swMoi = btn.dataset.sweep === '10';
          if (coSweep === swMoi) return;
          coSweep = swMoi;
          if (CO_WINDOW) {
            const u = new URL(window.location);
            if (coSweep) u.searchParams.set('sweep', '10');
            else u.searchParams.delete('sweep');
            window.history.replaceState(null, '', u);
          }
          capNhatCanh3D(false); // đổi công tắc không đặt lại camera
          capNhatGiaoDien();
        }));
      }

      const pnlEl = document.getElementById('kq_vat_panel');
      if (pnlEl) {
        pnlEl.querySelectorAll('[data-che-do]').forEach(btn => btn.addEventListener('click', () => {
          cheDoAnh = btn.dataset.cheDo;
          capNhatGiaoDien();
        }));
        pnlEl.querySelectorAll('[data-tich-v]').forEach(chk => chk.addEventListener('change', () => {
          const vNum = +chk.dataset.tichV;
          if (chk.checked) vChon.add(vNum);
          else vChon.delete(vNum);
          capNhatCanh3D(false);
          capNhatGiaoDien();
        }));
      }
    }

    capNhatCanh3D();
    capNhatGiaoDien();
  },
  ra(ctx) {
    delete ctx.toMauSlide;
    if (typeof khoiPhucVat === 'function') { khoiPhucVat(); khoiPhucVat = null; }
    if (xemCaVat) { xemCaVat.xoa(); xemCaVat = null; }
    anTheGioi(ctx, false);
    goPhanTu(['kq_vat_dieu_khien', 'kq_vat_panel']);
  }
};

// =====================================================================
// Slide 3: ket-qua-phan-bo (Phân bố trên 289 vật)
// =====================================================================
export const slideKetQuaPhanBo = {
  id: 'ket-qua-phan-bo',
  phu_luc: true,
  vat_chinh: 'none',
  muc: 'Tính khả thi · Kết quả: Phân bố',
  tieu_de: 'Phân bố IoU 3D trên 289 vật: tỉ lệ đạt và so sánh phân nhóm',
  y: '',
  ml: 'Tỉ lệ vật đạt của từng vòng trên 289 vật thật, đọc tại ngưỡng đạt của từng lớp.',
  goc_nhin: [
    { ten: 'Từ trên nhìn xuống (bao các hộp GT)', cam: [8.5, 0, 52], nhin: [8.5, 0, 0] },
    { ten: 'Nghiêng góc nhìn toàn cảnh', cam: [-28, -22, 30], nhin: [12, 0, 0] }
  ],
  vao(ctx) {
    anTheGioi(ctx, true);
    anChuGiaiHop();

    const T = ctx.THREE;
    const lop = ctx.lop();
    const nhom = new T.Group();
    nhom.userData.hop = 'ket_qua_phan_bo';
    lop.add(nhom);

    const q = thamSo();
    let nguon = q.get('nguon') === 'yolo' ? 'yolo' : 'gt';
    let tab = q.get('tab') === 'kc' ? 'kc' : 'lop';
    let tabNhomVat = 'xe'; // 'xe' (ngưỡng 0.5) hoặc 'nguoi' (ngưỡng 0.3)
    let cheDoMau = q.get('mau') || 'do_cao';
    let hienTaiDiem = null;

    khoiPhucPb = caiDatNutMauSlide('toan_canh', cheDoMau);
    ctx.toMauSlide = (cd) => {
      cheDoMau = cd;
      if (hienTaiDiem) hienTaiDiem.toMau(cd);
    };

    // Cảnh 3D: toàn cảnh keyframe Bộ 1 ở V5 nhìn từ trên xuống (T65, T69, T73: dùng chung dungCanhKeyframe với S20)
    function capNhatCanh3D(datCam = true) {
      xoaNhom(nhom);
      const ketQuaDung = dungCanhKeyframe(ctx, nhom, 1, 5, nguon, false);
      hienTaiDiem = ketQuaDung.diem;
      if (hienTaiDiem) hienTaiDiem.toMau(cheDoMau);

      if (datCam) {
        const kf1 = KET_QUA.khung[0];
        if (kf1 && kf1.vat.length > 0) {
          const xs = kf1.vat.map(v => v.gt.cx), ys = kf1.vat.map(v => v.gt.cy);
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
          const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.10;
          const camZ = Math.max(48, span * 1.25);
          ctx.tweenCamera([cx, cy, camZ], [cx, cy, 0], TINH ? 0 : 0.6);
        }
      }
      veLai(ctx);
    }

    function capNhatGiaoDien() {
      const pbNguon = KET_QUA.phan_bo && KET_QUA.phan_bo[nguon] ? KET_QUA.phan_bo[nguon] : {};

      // Tạo dữ liệu cho tab xe / người
      const pbDuLieu = {};
      const cacVongKey = ['1', '2', '3', '4', '5', '6'];
      cacVongKey.forEach(k => {
        const item = pbNguon[k] || { xe: [], nguoi: [] };
        pbDuLieu[k] = (tabNhomVat === 'xe') ? item.xe : item.nguoi;
      });

      const nXe = pbNguon['1'] && pbNguon['1'].xe ? pbNguon['1'].xe.length : 180;
      const nNguoi = pbNguon['1'] && pbNguon['1'].nguoi ? pbNguon['1'].nguoi.length : 109;
      const nguongTab = (tabNhomVat === 'xe') ? 0.5 : 0.3;

      const svgPhanBo = svgTiLeDat(pbDuLieu, {
        vong: [1, 2, 3, 4, 5, 6],
        nguong: nguongTab,
        w: 820,
        h: 185
      });

      const duLieuNhom = tab === 'lop' ? KET_QUA.theo_lop : KET_QUA.theo_kc;
      const svgNhom = svgCotNhom(duLieuNhom, { nguon, w: 820, h: 155 });

      // Dòng tổng phía trên từ KET_QUA.tong (T63)
      const t = KET_QUA.tong && KET_QUA.tong[nguon] ? KET_QUA.tong[nguon] : {};
      const dongTong = `Tỉ lệ đạt (ngưỡng theo lớp): V1 ${so(t['1'] || 0, 1)} % → V2 ${so(t['2'] || 0, 1)} % → V3 ${so(t['3'] || 0, 1)} % → V4 ${so(t['4'] || 0, 1)} % → V5 ${so(t['5'] || 0, 1)} % → V6 ${so(t['6'] || 0, 1)} %`;

      chenPanel('kq_pb_panel', `
        <div class="the_trang chu-the" style="padding:6px 12px; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="chu-the" style="font-weight:700;">${dongTong}</div>
            <div class="cv_dk_hang">
              <button class="cv_nut${nguon === 'gt' ? ' active' : ''}" data-nguon="gt">Khung GT</button>
              <button class="cv_nut${nguon === 'yolo' ? ' active' : ''}" data-nguon="yolo">YOLO</button>
            </div>
          </div>

          <div class="kq_tabs" style="margin-top:2px; margin-bottom:2px;">
            <button class="kq_tab_nut${tabNhomVat === 'xe' ? ' active' : ''}" data-nhom-vat="xe">Xe (ngưỡng 0,5, n=${nXe})</button>
            <button class="kq_tab_nut${tabNhomVat === 'nguoi' ? ' active' : ''}" data-nhom-vat="nguoi">Người & 2 bánh (ngưỡng 0,3, n=${nNguoi})</button>
          </div>

          <div style="display:flex; justify-content:center;">${svgPhanBo}</div>

          <div class="kq_tabs" style="margin-top:2px;">
            <button class="kq_tab_nut${tab === 'lop' ? ' active' : ''}" data-tab="lop">Theo lớp</button>
            <button class="kq_tab_nut${tab === 'kc' ? ' active' : ''}" data-tab="kc">Theo khoảng cách</button>
          </div>

          <div style="display:flex; justify-content:center;">${svgNhom}</div>

          <div class="kq_chu_thich" style="margin-top:2px;">
            ✓ đạt khi IoU 3D ≥ 0,5 (xe) · ≥ 0,3 (người đi bộ, 2 bánh)
          </div>
        </div>
      `);

      const pnlEl = document.getElementById('kq_pb_panel');
      if (pnlEl) {
        pnlEl.querySelectorAll('[data-nguon]').forEach(btn => btn.addEventListener('click', () => {
          nguon = btn.dataset.nguon;
          capNhatCanh3D(false);
          capNhatGiaoDien();
        }));
        pnlEl.querySelectorAll('[data-nhom-vat]').forEach(btn => btn.addEventListener('click', () => {
          tabNhomVat = btn.dataset.nhomVat;
          capNhatGiaoDien();
        }));
        pnlEl.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
          tab = btn.dataset.tab;
          capNhatGiaoDien();
        }));
      }

      veLai(ctx);
    }

    capNhatCanh3D();
    capNhatGiaoDien();
  },
  ra(ctx) {
    delete ctx.toMauSlide;
    if (typeof khoiPhucPb === 'function') { khoiPhucPb(); khoiPhucPb = null; }
    anTheGioi(ctx, false);
    goPhanTu(['kq_pb_panel']);
  }
};

export const SLIDES_KET_QUA = [slideKetQuaCanh, slideKetQuaVat, slideKetQuaPhanBo];
