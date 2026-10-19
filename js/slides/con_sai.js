// Slide "Vòng cuối: đạt gì, còn sai gì" (Task T86)
// Dữ liệu từ data/vong_that.js (khoá con_sai) và case study mục 5

import { VONG_THAT } from '../../data/vong_that.js';
import { taoXemCa } from '../xem_ca.js';

const so = (v, n = 1) => Number(v).toFixed(n).replace('.', ',');
const CO_WINDOW = typeof window !== 'undefined';
const thamSo = () => new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

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

function goPhanTu(dsId) {
  dsId.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

function anTheGioi(ctx, an) {
  const tg = ctx.theGioi;
  if (!tg) return;
  if (tg.diem) tg.diem.visible = !an;
  if (tg.nhomVat) tg.nhomVat.visible = !an;
  if (tg.ego) tg.ego.visible = !an;
}

const cs = VONG_THAT.con_sai || {};
const GIAI_THICH_CON_SAI = {
  sai_cum: {
    ten: 'Chọn nhầm cụm',
    ly_do: 'Chủ yếu là vật xa thưa điểm, lẫn với vật phía sau. Cần gộp điểm qua nhiều khung hình (theo dõi vật).'
  },
  sai_truc: {
    ten: 'Sai trục (≥ 45°)',
    ly_do: 'Rải rác, không có nguyên nhân chung đủ lớn.'
  },
  lech_tam: {
    ten: 'Lệch tâm nhỏ',
    ly_do: 'Rải rác, không có nguyên nhân chung đủ lớn.'
  },
  khac: {
    ten: 'Khác (kích thước, trượt nhẹ)',
    ly_do: 'Rải rác, không có nguyên nhân chung đủ lớn.'
  },
  lat_dat: {
    ten: `Đạt IoU nhưng lật 180° trước chọn đầu xe (${cs.lat_dat ? cs.lat_dat.n : 176}); sau chọn đầu còn ngược chiều ${cs.lat_dat ? so(cs.lat_dat.lat_pct_sau, 1) : '35,3'} %`,
    ly_do: 'Mọi bước dựng hộp gốc chỉ xác định hướng sai khác 180°. Đã giải quyết cho vật đang chạy bằng 9 sweep quá khứ; vật đứng yên vẫn cần người bấm C.'
  },
  xa_35_50: {
    ten: 'Vật xa 35–50 m',
    ly_do: `Quá ít điểm; V6 còn làm nhóm này tụt so với V5 (${cs.xa_35_50 ? so(cs.xa_35_50.v5_dat_pct, 1) : '61,9'} % → ${cs.xa_35_50 ? so(cs.xa_35_50.v6_dat_pct, 1) : '47,6'} % trên ${cs.xa_35_50 ? cs.xa_35_50.n_tong : 21} vật).`
  },
  hai_banh: {
    ten: 'Xe hai bánh',
    ly_do: `Quá ít mẫu để kết luận (${cs.hai_banh ? cs.hai_banh.n_tong : 10} vật ở 5 bộ, đạt ${cs.hai_banh ? so(cs.hai_banh.dat_pct, 1) : '40,0'} %). Quan trọng nếu dùng ở Việt Nam.`
  },
  yolo_sot: {
    ten: 'YOLO bỏ sót vật',
    ly_do: 'Giới hạn của bước 2D, nằm ngoài bước dựng 3D.'
  },
  can_bam_c: {
    ten: `Cần bấm C (${cs.can_bam_c ? cs.can_bam_c.n : 161} = ${cs.can_bam_c ? cs.can_bam_c.dung_yen : 149} đứng yên + ${cs.can_bam_c ? cs.can_bam_c.chay : 12} đang chạy)`,
    ly_do: 'Vật đứng yên không có tín hiệu vận tốc quét qua các frame, cần người bấm phím C để lật 180° nếu ngược.'
  }
};

export const slideConSai = {
  id: 'con-sai',
  phu_luc: true,
  vat_chinh: 'none',
  muc: 'Giải pháp · Vòng cuối: còn sai gì',
  tieu_de: 'Vòng cuối: đạt gì, còn sai gì',
  y: '',
  ml: 'Phân loại các ca còn sai ở vòng cuối: nguyên nhân vì sao chưa sửa và giới hạn phương pháp.',
  goc_nhin: [
    { ten: 'Góc nhìn 3D vật', cam: [34.0, -8.0, 6.0], nhin: [24.4, 3.1, 1.1] },
    { ten: 'Nhìn từ trên cao', cam: [24.4, 3.1, 20.0], nhin: [24.4, 3.1, 0.0] }
  ],
  vao(ctx) {
    anTheGioi(ctx, true);
    const T = ctx.THREE;
    const lop = ctx.lop();
    const nhom = new T.Group();
    nhom.userData.hop = 'con_sai';
    lop.add(nhom);

    const q = thamSo();
    const danhSachKhoa = [
      'sai_cum',
      'sai_truc',
      'lech_tam',
      'khac',
      'lat_dat',
      'xa_35_50',
      'hai_banh',
      'yolo_sot',
      'can_bam_c'
    ];

    let mucChon = q.get('muc') || 'sai_cum';
    if (!danhSachKhoa.includes(mucChon)) mucChon = 'sai_cum';

    let cheDoAnh = q.get('anh') === 'ca' ? 'ca' : 'phong';

    const xemCa = taoXemCa(ctx, { elAnh: '#con_sai_khung_2d', nhom });

    function capNhat() {
      const conSaiData = VONG_THAT.con_sai || {};
      const curItem = conSaiData[mucChon] || {};
      const curCa = curItem.ca || null;
      const curGt = curCa ? curCa.gt : null;
      const batMuiTen = mucChon === 'lat_dat';

      const dv6 = VONG_THAT.dat_v6 || { nam_bo: { n_dat: 239, n: 289 }, phu: { n_dat: 86, n: 108 } };
      const pctNb = (VONG_THAT.vong && VONG_THAT.vong['6'] && VONG_THAT.vong['6'].dat_pct) ? VONG_THAT.vong['6'].dat_pct.nam_bo.gt : 82.7;
      const pctPhu = (VONG_THAT.vong && VONG_THAT.vong['6'] && VONG_THAT.vong['6'].dat_pct) ? VONG_THAT.vong['6'].dat_pct.phu.gt : 79.6;

      // Sinh danh sách 9 nút bấm gọn gàng
      const dsNutHtml = danhSachKhoa.map(k => {
        const d = conSaiData[k] || {};
        const info = GIAI_THICH_CON_SAI[k] || { ten: k, ly_do: '' };
        const laChon = k === mucChon;
        const nStr = (k === 'can_bam_c' || k === 'lat_dat' || d.n === undefined) ? '' : ` (${d.n})`;
        return `
          <button class="cv_nut${laChon ? ' active' : ''}" data-muc="${k}" style="padding:2px 8px; font-size:18px; margin:1px;">
            ${info.ten}${nStr}
          </button>
        `;
      }).join('');

      const infoCur = GIAI_THICH_CON_SAI[mucChon] || { ten: mucChon, ly_do: '' };
      const curData = conSaiData[mucChon] || {};
      let phuCurStr = '';
      if (mucChon === 'lat_dat' && curData.lat_pct_sau !== undefined) phuCurStr = ` · Lật sau chọn đầu ${so(curData.lat_pct_sau, 1)}%`;
      if (mucChon === 'xa_35_50' && curData.v6_dat_pct !== undefined) phuCurStr = ` · Đạt V5 ${so(curData.v5_dat_pct, 1)}% → V6 ${so(curData.v6_dat_pct, 1)}%`;
      if (mucChon === 'hai_banh' && curData.dat_pct !== undefined) phuCurStr = ` · Đạt ${so(curData.dat_pct, 1)}%`;

      const tieuDeCur = (mucChon === 'can_bam_c' || mucChon === 'lat_dat' || curData.n === undefined)
        ? `${infoCur.ten}${phuCurStr}`
        : `${infoCur.ten} (n=${curData.n})${phuCurStr}`;

      chenPanel('con_sai_panel', `
        <div class="the_trang" style="padding:4px 8px; margin-bottom:2px; font-size:18px; line-height:1.2; background:#f0fdf4; border:1px solid #bbf7d0; color:#166534;">
          <b>V6 đạt (khung GT):</b> ${dv6.nam_bo.n_dat}/${dv6.nam_bo.n} (${so(pctNb, 1)}%) ở 5 bộ · ${dv6.phu.n_dat}/${dv6.phu.n} (${so(pctPhu, 1)}%) ở tập phụ
        </div>

        <div class="the_trang" style="padding:3px 6px; margin-bottom:2px;">
          <div style="display:flex; flex-wrap:wrap; gap:2px;">
            ${dsNutHtml}
          </div>
        </div>

        <div class="the_trang" style="padding:4px 8px; margin-bottom:2px; border-left:4px solid #ef4444; font-size:18px; line-height:1.2;">
          <div style="font-weight:700; color:#dc2626;">
            ${tieuDeCur}
          </div>
          <div style="color:#334155; margin-top:2px;">
            ${infoCur.ly_do}
          </div>
        </div>

        <div class="kq_vat_khung_2d" id="con_sai_khung_2d"></div>

        ${curCa ? `
          <div class="cv_ghi_nho" style="margin-top:2px; font-size:18px;">
            Ca minh hoạ: <b>${curCa.lop}</b> · ${so(curCa.kc, 1)} m · ${curCa.so_diem} điểm LiDAR · IoU V6: <b>${curCa.vong['6'].gt.hop ? so(curCa.vong['6'].gt.iou, 2) : '—'}</b>
          </div>
        ` : ''}

        <div class="the_trang" style="padding:3px 6px; margin-top:2px; background:#f8fafc; border:1px solid #e2e8f0; font-size:18px; line-height:1.2; color:#334155;">
          <b>Nguyên tắc thiết kế:</b> Công cụ đề xuất để người duyệt và sửa, không thay người.
        </div>
      `);

      if (curCa) {
        xemCa.hien(curCa, {
          vong: new Set([6]),
          nguon: 'gt',
          sweep: false,
          cheDoAnh,
          datCam: true,
          muiTen: batMuiTen
        });
      } else {
        xemCa.xoa();
      }

      // Gắn sự kiện bấm vào từng dòng mục
      const pnlEl = document.getElementById('con_sai_panel');
      if (pnlEl) {
        pnlEl.querySelectorAll('[data-muc]').forEach(el => el.addEventListener('click', () => {
          mucChon = el.dataset.muc;
          if (CO_WINDOW) {
            const u = new URL(window.location);
            u.searchParams.set('muc', mucChon);
            window.history.replaceState(null, '', u);
          }
          capNhat();
        }));

        pnlEl.querySelectorAll('[data-che-do]').forEach(btn => btn.addEventListener('click', () => {
          cheDoAnh = btn.dataset.cheDo;
          capNhat();
        }));
      }
    }

    capNhat();
  },
  ra(ctx) {
    anTheGioi(ctx, false);
    goPhanTu(['con_sai_panel']);
  }
};
