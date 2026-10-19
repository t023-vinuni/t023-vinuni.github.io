// Slide dữ liệu thật các vòng V1–V6 (Task T83, T84)
// Dữ liệu từ data/vong_that.js (sinh bởi demo/tools/xuat_vong_that.py)

import { VONG_THAT, THANH_PHAN } from '../../data/vong_that.js';
import { svgNhomLoi, TEN_NHOM_LOI, MAU_VONG } from '../bieu_do.js';
import { taoXemCa } from '../xem_ca.js';

const so = (v, n = 1) => Number(v).toFixed(n).replace('.', ',');
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

function chenDieuKhien(id, html) {
  const cotTrai = document.getElementById('cot_trai');
  if (!cotTrai) return null;
  const cu = document.getElementById(id);
  if (cu) cu.remove();
  const el = document.createElement('div');
  el.id = id;
  el.className = 'cv_hop_dieu_khien fade-in';
  el.dataset.cuaSlide = document.body.dataset.slideHienTai || '';
  el.innerHTML = html;
  const dongMuc = document.getElementById('slide_muc');
  if (dongMuc && dongMuc.nextSibling) {
    cotTrai.insertBefore(el, dongMuc.nextSibling);
  } else {
    cotTrai.prepend(el);
  }
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

const NHAN_LY_DO = {
  ['too_' + 'few_points']: 'Cụm dưới 20 điểm',
  ['no_' + 'points']: 'Không có điểm trong frustum',
  ['insufficient_' + 'spread']: 'Cụm trải quá hẹp hoặc quá thấp',
  du_phong: 'Hộp dự phòng (C1b)'
};

function moTaLyDo(lyDoObj) {
  return Object.entries(lyDoObj || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v} ${(NHAN_LY_DO[k] || k).toLowerCase()}`)
    .join(', ');
}

function taoKhungMoPhongVsThat(k) {
  const mp = (VONG_THAT.mo_phong_vs_that && VONG_THAT.mo_phong_vs_that[String(k)]) || null;
  if (!mp) return '';
  const kPrev = k - 1;
  const mpPrev = k >= 2 ? (VONG_THAT.mo_phong_vs_that && VONG_THAT.mo_phong_vs_that[String(kPrev)]) : null;

  let cauKetLuan = '';
  if (k === 1) {
    cauKetLuan = `Cùng kiểu lỗi: hộp co về phía cảm biến. Xe ví dụ dài ${so(mp.xe.ti_l, 2)}, rộng ${so(mp.xe.ti_w, 2)} lần GT; 289 vật: ${so(mp.that.ti_l_tv, 2)} / ${so(mp.that.ti_w_tv, 2)}.`;
  } else {
    const dXe = mp.d_xe;
    const dThat = mp.d_that;
    const datPrev = mpPrev ? mpPrev.that.dat_pct : 0;
    const datCur = mp.that.dat_pct;
    const dXeStr = (dXe > 0 ? '+' : '') + so(dXe, 3);
    const dThatStr = (dThat > 0 ? '+' : '') + so(dThat, 3);

    switch (mp.ket_luan) {
      case 'cung_chieu':
        cauKetLuan = 'Xe ví dụ và dữ liệu thật thay đổi cùng chiều.';
        break;
      case 'xe_khong_doi':
        cauKetLuan = `Xe ví dụ không đổi, nhưng trên 289 vật: ${dThatStr} (đạt ${so(datPrev, 1)} % → ${so(datCur, 1)} %).`;
        break;
      case 'xe_phong_dai':
        cauKetLuan = `Xe ví dụ <b>phóng đại</b> cải tiến: ${dXeStr} so với ${dThatStr} trên dữ liệu thật.`;
        break;
      case 'xe_danh_gia_thap':
        cauKetLuan = `Xe ví dụ <b>đánh giá thấp</b> cải tiến: ${dXeStr} so với ${dThatStr} trên dữ liệu thật.`;
        break;
      case 'nguoc_chieu':
        cauKetLuan = 'Xe ví dụ và dữ liệu thật <b>ngược chiều</b>.';
        break;
      default:
        cauKetLuan = '';
    }
  }

  const cotIouTieuDe = k === 1 ? 'IoU V1' : `IoU V${kPrev} → V${k}`;
  const iouXeText = k === 1 ? so(mp.xe.iou, 3) : `${so(mpPrev.xe.iou, 3)} → ${so(mp.xe.iou, 3)}`;
  const iouThatText = k === 1 ? so(mp.that.iou_tv, 3) : `${so(mpPrev.that.iou_tv, 3)} → ${so(mp.that.iou_tv, 3)}`;

  const tamXeText = `${so(mp.xe.tam_m, 2)} m`;
  const tamThatText = `${so(mp.that.tam_tv, 2)} m`;

  const yawXeText = `${so(mp.xe.yaw_deg, 1)}°`;
  const yawThatText = `${so(mp.that.e180_tv, 1)}°`;

  const dongTrain = k >= 5 ? `<div style="font-size:18px; color:#64748b; font-style:italic; margin-top:1px;">Xe ví dụ thuộc tập train của V5/V6</div>` : '';

  return `
    <div class="the_trang" style="padding:2px 5px; margin-bottom:2px; font-size:18px; line-height:1.15; border-left:3px solid #6366f1;">
      <div style="font-weight:700; color:#4338ca; font-size:18px; margin-bottom:1px;">Xe ví dụ (slide phương pháp) ↔ 289 vật thật:</div>
      <table style="width:100%; border-collapse:collapse; font-size:18px; line-height:1.15; margin-bottom:1px;">
        <thead>
          <tr style="border-bottom:1px solid #cbd5e1; color:#475569; text-align:left;">
            <th style="padding:0 3px;">Chỉ số</th>
            <th style="padding:0 3px;">Xe ví dụ</th>
            <th style="padding:0 3px;">289 vật (trung vị)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:0 3px; font-weight:600; color:#1e293b;">${cotIouTieuDe}</td>
            <td style="padding:0 3px; color:#1e40af;">${iouXeText}</td>
            <td style="padding:0 3px; color:#0891b2;">${iouThatText}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:0 3px; font-weight:600; color:#1e293b;">Lệch tâm</td>
            <td style="padding:0 3px;">${tamXeText}</td>
            <td style="padding:0 3px;">${tamThatText}</td>
          </tr>
          <tr>
            <td style="padding:0 3px; font-weight:600; color:#1e293b;">Sai số góc</td>
            <td style="padding:0 3px;">${yawXeText}</td>
            <td style="padding:0 3px;">${yawThatText}</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size:18px; color:#0f172a;">${cauKetLuan}</div>
      ${dongTrain}
    </div>
  `;
}

const MUC_TIEU = {
  2: ['khong_ra_hop', 'lech_tam', 'khac'],
  3: ['khong_ra_hop', 'sai_truc'],
  4: ['sai_truc', 'lech_tam', 'khac'],
  5: ['sai_cum', 'lech_tam'],
  6: ['sai_cum', 'khac', 'lech_tam', 'sai_truc']
};

const BANG_CHUNG_YEU = {
  2: 'Một mình B2 chỉ +1,4 điểm; có ích khi đi cùng B1.', // trích: CASE_STUDY dòng 120
  3: '<b>Gần như vô dụng:</b> C1b chỉ cứu thêm 6 vật đạt.', // trích: CASE_STUDY dòng 150
  4: 'Sai số hướng ở tập phụ giảm 15,1° → 11,1°, nhưng <b>tỉ lệ đạt ở tập phụ không đổi</b> (26,9 → 26,9 %).', // trích: CASE_STUDY dòng 180
  5: 'Tập phụ 26,9 → 75,9 %; học lại từng scene bỏ scene đang chấm đạt 79,6 % so với 80,3 %.', // trích: CASE_STUDY dòng 210
  6: 'Người đi bộ ở tập phụ 66,7 → 95,2 %. Nhưng vật 35–50 m <b>tụt</b> 61,9 → 47,6 % (21 vật).' // trích: CASE_STUDY dòng 240
};

const NGUYEN_NHAN_CACH_SUA = {
  2: {
    tieu_de: 'Bù kích thước mẫu (B1) & Hạ ngưỡng điểm theo khoảng cách (B2)',
    noi_dung: 'LiDAR chỉ chạm mặt quay về cảm biến khiến hộp bị co nhỏ. Nới về kích thước mẫu của lớp, giữ mặt gần đứng yên và đẩy phần nới ra xa. Đồng thời hạ ngưỡng điểm theo bình phương khoảng cách 20·(10/d)².'
  },
  3: {
    tieu_de: 'Đảo trục 90° (C2) & Hộp dự phòng từ chiều cao khung (C1b)',
    noi_dung: 'Khi chỉ thấy đầu hoặc đuôi xe, cụm điểm là một dải mỏng khiến thuật toán chọn sai trục 90°. Cụm mỏng và dài xấp xỉ bề ngang xe thì quay trục 90°. Ước độ sâu từ chiều cao khung lỗ kim để đặt hộp dự phòng khi mất cụm.'
  },
  4: {
    tieu_de: 'Khớp chữ L bám điểm sát cạnh (D1 closeness)',
    noi_dung: 'Khi điểm thưa, tiêu chí diện tích nhỏ nhất thường chọn góc nghiêng sai. Thay bằng tiêu chí closeness (Zhang 2017): tìm góc quay làm các điểm quét LiDAR nằm sát cạnh chữ L nhất.'
  },
  5: {
    tieu_de: 'Cực tiểu năng lượng mô hình tia & Hồi quy logistic 13 đặc trưng',
    noi_dung: 'Thay chuỗi luật rời rạc bằng bài toán cực tiểu năng lượng E(x,y,yaw,L) dựa trên mô hình tia vật lý: tia chạm mặt vật và khoảng trước tia là trống. Phân loại chọn cụm bằng hồi quy logistic 13 đặc trưng + cứu cụm.'
  },
  6: {
    tieu_de: 'Lưới mặt đất thống kê bền v3a (lọc điểm thấp 9×9 ô)',
    noi_dung: 'Điểm nhiễu 3–4 m dưới mặt đường kéo sập lưới mặt đất làm người đi bộ bị coi là vật trên cao và bị loại. Lọc bỏ triệt để điểm z < trung vị lân cận 9×9 ô − 1 m trước khi nội suy lưới đất.'
  }
};

// =====================================================================
// Slide V1 · dữ liệu thật (Task T84)
// =====================================================================
export const slideThatV1 = {
  id: 'that-v1',
  phu_luc: true,
  vat_chinh: 'none',
  muc: 'Giải pháp · V1 · Dữ liệu thật',
  tieu_de: 'V1 trên dữ liệu thật: phân bố lỗi và 4 ca điển hình',
  y: '',
  ml: `6 nhóm lỗi pipeline gốc trên 289 vật nuScenes: ${VONG_THAT.vong['1'].nhom.nam_bo.gt.khong_ra_hop} vật không ra hộp.`,
  goc_nhin: [
    { ten: 'Góc nhìn 3D vật', cam: [34.0, -8.0, 6.0], nhin: [24.4, 3.1, 1.1] },
    { ten: 'Nhìn từ trên cao', cam: [24.4, 3.1, 20.0], nhin: [24.4, 3.1, 0.0] }
  ],
  vao(ctx) {
    anTheGioi(ctx, true);
    const T = ctx.THREE;
    const lop = ctx.lop();
    const nhom = new T.Group();
    nhom.userData.hop = 'that_v1';
    lop.add(nhom);

    const q = thamSo();
    let buoc = Math.max(1, Math.min(4, +q.get('buoc_that') || 1));
    let caIdx = Math.max(0, Math.min(3, (+q.get('ca') || 1) - 1));
    let cheDoAnh = q.get('anh') === 'ca' ? 'ca' : 'phong';

    const xemCa = taoXemCa(ctx, { elAnh: '#that_v1_khung_2d', nhom });

    const viDu1 = VONG_THAT.vi_du['1'] || [];
    const nhomV1 = VONG_THAT.vong['1'].nhom.nam_bo.gt;
    const lyDoV1 = VONG_THAT.vong['1'].ly_do.nam_bo.gt || {};

    const giaiThichLoi = [
      {
        nhom: 'khong_ra_hop',
        ten: 'Không ra hộp',
        so: nhomV1.khong_ra_hop,
        ly_do: `Không tạo hộp khi điểm thưa hoặc ngoài góc nhìn: ${nhomV1.khong_ra_hop} vật gồm ${moTaLyDo(lyDoV1)}.`
      },
      {
        nhom: 'lech_tam',
        ten: 'Lệch tâm nhỏ',
        so: nhomV1.lech_tam,
        ly_do: 'LiDAR chỉ chạm bề mặt quay về phía xe tự hành, nửa khuất không có điểm. Ôm trọn điểm làm tâm hộp bị kéo lệch về phía cảm biến.'
      },
      {
        nhom: 'sai_cum',
        ten: 'Sai cụm (> 2 m)',
        so: nhomV1.sai_cum,
        ly_do: 'Chiến lược chọn cụm ngây thơ theo khoảng cách tới tâm khung 2D: dễ gắp nhầm cụm mặt đường hoặc vật cản lân cận.'
      },
      {
        nhom: 'sai_truc',
        ten: 'Sai trục (≥ 45°)',
        so: nhomV1.sai_truc,
        ly_do: 'Thuật toán tìm hình chữ nhật diện tích nhỏ nhất quét 0–90°: khi điểm thưa hoặc chỉ thấy đầu xe, diện tích nhỏ nhất là góc xiên hoặc xoay ngang.'
      }
    ];

    function capNhat() {
      // 1. Dòng điều khiển 4 bước
      chenDieuKhien('that_v1_dk', `
        <div class="cv_dk_hang">
          <button class="cv_nut${buoc === 1 ? ' active' : ''}" data-buoc="1">1. 6 nhóm lỗi V1</button>
          <button class="cv_nut${buoc === 2 ? ' active' : ''}" data-buoc="2">2. 9 thành phần gốc</button>
          <button class="cv_nut${buoc === 3 ? ' active' : ''}" data-buoc="3">3. Tỉ lệ đạt %</button>
          <button class="cv_nut${buoc === 4 ? ' active' : ''}" data-buoc="4">4. 4 ca điển hình</button>
        </div>
      `);

      let noiDungHtml = '';
      let curCa = null;
      let hienKhung2d = false;

      if (buoc === 1) {
        // BƯỚC 1: Biểu đồ 6 nhóm lỗi của V1 + 117 vật không ra hộp + ca mẫu 1
        const svgNhom = svgNhomLoi([{ nhan: 'V1 gốc', nhom: nhomV1 }], {
          noiBat: ['khong_ra_hop'],
          w: 420,
          h: 155
        });

        let lyDoHtml = Object.entries(lyDoV1)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `<li><b>${v}</b> vật: ${NHAN_LY_DO[k] || k}</li>`)
          .join('');

        curCa = viDu1[0];
        hienKhung2d = false;

        noiDungHtml = `
          <div class="the_trang" style="padding:2px 6px; margin-bottom:2px;">
            <div style="display:flex; justify-content:center;">${svgNhom}</div>
            <div class="cv_ghi_nho" style="margin-top:2px; font-size:18px;">
              Tổng cộng <b>${nhomV1.khong_ra_hop}</b> vật không ra hộp trong 289 vật 5 bộ GT:
              <ul style="margin:2px 0 0 16px; padding:0; font-size:18px;">${lyDoHtml}</ul>
            </div>
          </div>
          <div class="the_trang" style="padding:2px 6px; margin-bottom:2px; border-left:4px solid #ef4444; font-size:18px; line-height:1.15;">
            <div style="font-weight:700; color:#ef4444;">Nguyên nhân cốt lõi:</div>
            <div style="margin-top:1px;">${nhomV1.khong_ra_hop} vật không ra hộp: ${moTaLyDo(lyDoV1)}.</div>
          </div>
          ${taoKhungMoPhongVsThat(1)}
        `;
      } else if (buoc === 2) {
        // BƯỚC 2: 9 thành phần gốc của V1
        curCa = viDu1[1];
        hienKhung2d = false;

        const hangThanhPhan = THANH_PHAN.map(row => {
          const c = row.cac_vong['1'] || { tt: 'goc', mo_ta: '' };
          return `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:2px 4px; font-weight:700; font-size:18px;">${row.buoc}</td>
              <td style="padding:2px 4px; font-size:18px; color:#1e40af;">${c.mo_ta}</td>
            </tr>
          `;
        }).join('');

        noiDungHtml = `
          <div class="the_trang" style="padding:4px 8px; margin-bottom:2px; font-size:18px;">
            <div style="font-weight:700; color:#0f172a; margin-bottom:2px;">9 thành phần thuật toán V1 gốc:</div>
            <table style="width:100%; border-collapse:collapse; font-size:18px; line-height:1.2;">
              <thead>
                <tr style="border-bottom:1.5px solid #cbd5e1; text-align:left; color:#475569;">
                  <th style="padding:2px 4px;">Bước</th>
                  <th style="padding:2px 4px;">Quy tắc cài đặt ở V1</th>
                </tr>
              </thead>
              <tbody>${hangThanhPhan}</tbody>
            </table>
          </div>
        `;
      } else if (buoc === 3) {
        // BƯỚC 3: Đạt % trên 4 tập
        const d1 = VONG_THAT.vong['1'].dat_pct;
        const caDat1 = (VONG_THAT.vi_du_dat && VONG_THAT.vi_du_dat['1']) || null;
        curCa = caDat1;
        hienKhung2d = !!curCa;

        const khoiCaDat = curCa ? `
          <div class="the_trang" style="padding:4px 8px; margin-bottom:2px; font-size:18px;">
            <div style="font-weight:700; color:#0284c7;">Ca ví dụ điển hình đạt ở V1:</div>
            <div>${curCa.lop} · ${so(curCa.kc, 1)} m · ${curCa.so_diem} điểm · IoU V1 = ${so(curCa.vong['1'].gt.iou, 3)}</div>
          </div>
        ` : '';

        noiDungHtml = `
          <div class="the_trang" style="padding:4px 8px; margin-bottom:2px; font-size:18px; line-height:1.25;">
            <div style="font-weight:700; color:#0f172a; margin-bottom:2px;">Tỉ lệ đạt % của V1 trên 4 tập chuẩn:</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
              <span>5 bộ GT: <b>${so(d1.nam_bo.gt, 1)}%</b> (29/289 vật)</span>
              <span>5 bộ YOLO: <b>${so(d1.nam_bo.yolo, 1)}%</b></span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>Tập phụ GT: <b>${so(d1.phu.gt, 1)}%</b></span>
              <span>Tập phụ YOLO: <b>${so(d1.phu.yolo, 1)}%</b></span>
            </div>
          </div>
          ${khoiCaDat}
        `;
      } else if (buoc === 4) {
        // BƯỚC 4: 4 ca lỗi điển hình
        curCa = viDu1[caIdx];
        const curLoi = giaiThichLoi[caIdx];
        hienKhung2d = true;

        noiDungHtml = `
          <div class="the_trang" style="padding:2px 4px; margin-bottom:2px;">
            <div style="display:flex; gap:2px; flex-wrap:wrap;">
              ${giaiThichLoi.map((item, idx) => `
                <button class="cv_nut${idx === caIdx ? ' active' : ''}" data-ca="${idx + 1}" style="padding:2px 6px; font-size:18px;">
                  ${item.ten} (${item.so})
                </button>
              `).join('')}
            </div>
          </div>

          <div class="the_trang" style="padding:4px 8px; margin-bottom:2px; border-left:4px solid #ef4444; font-size:18px; line-height:1.2;">
            <div style="font-weight:700; color:#ef4444;">Vì sao: ${curLoi.ten}</div>
            <div style="margin-top:2px;">${curLoi.ly_do}</div>
          </div>
        `;
      }

      chenPanel('that_v1_panel', `
        ${noiDungHtml}
        ${hienKhung2d && curCa ? `
          <div class="kq_vat_khung_2d" id="that_v1_khung_2d" style="height:${buoc === 3 ? '135px' : '175px'}; max-height:${buoc === 3 ? '135px' : '175px'};"></div>
          <div class="cv_ghi_nho" style="margin-top:1px; font-size:18px;">
            Ca: <b>${curCa.lop}</b> · ${so(curCa.kc, 1)} m · ${curCa.so_diem} điểm · IoU: <b>${curCa.vong['1'].gt.hop ? so(curCa.vong['1'].gt.iou, 2) : '—'}</b>
          </div>
        ` : ''}
      `);

      if (curCa) {
        xemCa.hien(curCa, {
          vong: new Set([1]),
          nguon: 'gt',
          sweep: false,
          cheDoAnh,
          datCam: true
        });
      } else {
        xemCa.xoa();
      }

      // Gắn sự kiện
      const dkEl = document.getElementById('that_v1_dk');
      if (dkEl) {
        dkEl.querySelectorAll('[data-buoc]').forEach(btn => btn.addEventListener('click', () => {
          buoc = +btn.dataset.buoc;
          capNhat();
        }));
      }

      const pnlEl = document.getElementById('that_v1_panel');
      if (pnlEl) {
        pnlEl.querySelectorAll('[data-ca]').forEach(btn => btn.addEventListener('click', () => {
          caIdx = +btn.dataset.ca - 1;
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
    goPhanTu(['that_v1_dk', 'that_v1_panel']);
  }
};

// =====================================================================
// Slide V k · dữ liệu thật (k = 2..6) (Task T83)
// =====================================================================
export function slideVongThat(k) {
  const kPrev = k - 1;
  const kStr = String(k);
  const prevStr = String(kPrev);

  return {
    id: `that-v${k}`,
    phu_luc: k >= 2,
    vat_chinh: 'none',
    muc: `Giải pháp · V${k} · Dữ liệu thật`,
    tieu_de: `V${k} trên dữ liệu thật: lỗi của V${kPrev} và cách sửa`,
    y: '',
    ml: `Lỗi của V${kPrev} trên 289 vật thật: V${k} sửa được gì, còn sót gì.`,
    goc_nhin: [
      { ten: 'Góc nhìn 3D vật', cam: [34.0, -8.0, 6.0], nhin: [24.4, 3.1, 1.1] },
      { ten: 'Nhìn từ trên cao', cam: [24.4, 3.1, 20.0], nhin: [24.4, 3.1, 0.0] }
    ],
    vao(ctx) {
      anTheGioi(ctx, true);
      const T = ctx.THREE;
      const lop = ctx.lop();
      const nhom = new T.Group();
      nhom.userData.hop = `that_v${k}`;
      lop.add(nhom);

      const q = thamSo();
      let buoc = Math.max(1, Math.min(4, +q.get('buoc_that') || 1));
      let cheDoAnh = q.get('anh') === 'ca' ? 'ca' : 'phong';

      const xemCa = taoXemCa(ctx, { elAnh: `#that_v${k}_khung_2d`, nhom });

      const statPrev = VONG_THAT.vong[prevStr];
      const statCur = VONG_THAT.vong[kStr];
      const viDuK = VONG_THAT.vi_du[kStr] || {};
      const mucTieuK = MUC_TIEU[k] || [];

      function capNhat() {
        // 1. Dòng điều khiển 4 bước
        chenDieuKhien(`that_v${k}_dk`, `
          <div class="cv_dk_hang">
            <button class="cv_nut${buoc === 1 ? ' active' : ''}" data-buoc="1">1. Lỗi V${kPrev} trên số thật</button>
            <button class="cv_nut${buoc === 2 ? ' active' : ''}" data-buoc="2">2. Nguyên nhân → Cách sửa</button>
            <button class="cv_nut${buoc === 3 ? ' active' : ''}" data-buoc="3">3. Kết quả V${k}</button>
            <button class="cv_nut${buoc === 4 ? ' active' : ''}" data-buoc="4">4. Lỗi mới / còn lại</button>
          </div>
        `);

        // 2. Nội dung theo từng bước
        let noiDungHtml = '';
        let caHien = null;
        let vongHien = new Set([k]);

        if (buoc === 1) {
          // BƯỚC 1: Lỗi của V(k-1) trên dữ liệu thật
          const svgNhom = svgNhomLoi([{ nhan: `V${kPrev}`, nhom: statPrev.nhom.nam_bo.gt }], {
            noiBat: mucTieuK,
            w: 420,
            h: 220
          });

          const mucTieuStr = mucTieuK.map(m => `<b>${TEN_NHOM_LOI[m]}</b> (${statPrev.nhom.nam_bo.gt[m]} vật)`).join(', ');
          caHien = viDuK.sua;
          vongHien = new Set([kPrev]);

          noiDungHtml = `
            <div class="the_trang" style="padding:6px 10px; margin-bottom:4px;">
              <div style="display:flex; justify-content:center;">${svgNhom}</div>
              <div class="cv_ghi_nho" style="margin-top:4px;">
                Nhóm lỗi mục tiêu của V${k}: ${mucTieuStr}.
              </div>
            </div>
            <div class="the_trang" style="padding:6px 10px; margin-bottom:4px; border-left:4px solid #ef4444;">
              <div style="font-weight:700; color:#ef4444;">Ca điển hình V${kPrev} mắc lỗi (sẽ được V${k} sửa):</div>
              <div style="font-size:var(--c-nho); margin-top:2px;">
                ${caHien ? `Vật <b>${caHien.lop}</b> (${so(caHien.kc, 1)} m) thuộc nhóm lỗi <code>${TEN_NHOM_LOI[caHien.nhom[prevStr]] || caHien.nhom[prevStr]}</code> ở V${kPrev} (IoU = ${caHien.vong[prevStr].gt.hop ? so(caHien.vong[prevStr].gt.iou, 2) : '0,00'}).` : 'Không có ca mẫu.'}
              </div>
            </div>
          `;
        } else if (buoc === 2) {
          // BƯỚC 2: Nguyên nhân → cách sửa + dải Giữ / Bỏ / Thêm
          const info = NGUYEN_NHAN_CACH_SUA[k] || { tieu_de: '', noi_dung: '' };
          caHien = viDuK.sua;
          vongHien = new Set([kPrev, k]);

          // Bảng so sánh 9 thành phần giữa V(k-1) và Vk
          const hangThanhPhan = THANH_PHAN.map(row => {
            const cPrev = row.cac_vong[prevStr] || { tt: 'giu', mo_ta: '' };
            const cCur = row.cac_vong[kStr] || { tt: 'giu', mo_ta: '' };
            const thayDoi = cCur.tt === 'doi' || cCur.tt === 'them';
            const mau = cCur.tt === 'doi' ? '#0284c7' : (cCur.tt === 'them' ? '#10b981' : '#64748b');
            const nhanTt = cCur.tt === 'doi' ? 'ĐỔI' : (cCur.tt === 'them' ? 'THÊM' : 'GIỮ');
            const tenBuoc = row.buoc.split(' (')[0];
            const moTaPrev = cPrev.tt === 'giu' ? 'giữ' : cPrev.mo_ta;
            const moTaCur = cCur.tt === 'giu' ? 'giữ' : cCur.mo_ta;
            return `
              <tr style="border-bottom:1px solid #f1f5f9; ${thayDoi ? 'background:rgba(2,132,199,0.04);' : ''}">
                <td style="padding:1px 3px; font-weight:700; font-size:18px; width:95px;">${tenBuoc}</td>
                <td style="padding:1px 3px; font-size:18px; color:#64748b;">${moTaPrev}</td>
                <td style="padding:1px 3px; font-size:18px; color:${mau}; font-weight:${thayDoi ? '700' : '400'};">
                  <span style="display:inline-block; padding:0 3px; border-radius:3px; background:${mau}22; font-size:18px; margin-right:3px;">${nhanTt}</span>
                  ${moTaCur}
                </td>
              </tr>
            `;
          }).join('');

          const biLoaiK = (VONG_THAT.bi_loai || []).filter(b => b.vong === k);
          let biLoaiHtml = '';
          if (biLoaiK.length > 0) {
            const cacDong = biLoaiK.map(b => {
              const sauNayGoc = (b.sau_nay || '').replace(/\s*\((?:§|BAO_CAO|CHOT)[^)]*\)/g, '');
              const sauNayStr = sauNayGoc ? ` → ${sauNayGoc}` : '';
              return `<div style="margin-top:1px; font-size:18px;">
                <span style="display:inline-block; padding:0 4px; border-radius:3px; background:#e2e8f0; color:#475569; font-weight:700; font-size:18px; margin-right:4px;">BỎ</span>
                <b>${b.ma}</b> · ${b.ten}: ${b.so_do}. <i>Vì sao bỏ:</i> ${b.ly_do}.${sauNayStr}
              </div>`;
            }).join('');
            biLoaiHtml = `
              <div class="the_trang" style="padding:2px 5px; margin-bottom:2px; border-left:3px solid #94a3b8; background:#f8fafc; font-size:18px; line-height:1.15;">
                <div style="font-weight:700; color:#475569; font-size:18px;">Đã thử nhưng bỏ:</div>
                ${cacDong}
              </div>
            `;
          }

          noiDungHtml = `
            <div class="the_trang" style="padding:2px 6px; margin-bottom:2px; border-left:4px solid #0284c7;">
              <div style="font-weight:700; color:#0284c7; font-size:18px;">${info.tieu_de}</div>
              <div style="font-size:18px; margin-top:1px; line-height:1.15;">${info.noi_dung}</div>
            </div>
            <div class="the_trang" style="padding:2px 6px; margin-bottom:2px;">
              <table style="width:100%; border-collapse:collapse; font-size:18px; line-height:1.15;">
                <thead>
                  <tr style="border-bottom:1.5px solid #cbd5e1; text-align:left; color:#475569;">
                    <th style="padding:1px 3px;">Bước</th>
                    <th style="padding:1px 3px;">V${kPrev}</th>
                    <th style="padding:1px 3px;">V${k}</th>
                  </tr>
                </thead>
                <tbody>${hangThanhPhan}</tbody>
              </table>
            </div>
            ${biLoaiHtml}
          `;
        } else if (buoc === 3) {
          // BƯỚC 3: Kết quả Vk
          const svgNhom = svgNhomLoi([
            { nhan: `V${kPrev}`, nhom: statPrev.nhom.nam_bo.gt },
            { nhan: `V${k}`, nhom: statCur.nhom.nam_bo.gt }
          ], { w: 420, h: 155 });

          // Top chuyển dịch vào đạt
          const chuyenVaoDat = [];
          if (statCur.chuyen) {
            for (const [fromG, toMap] of Object.entries(statCur.chuyen)) {
              if (fromG !== 'dat' && toMap['dat']) {
                chuyenVaoDat.push({ from: fromG, count: toMap['dat'] });
              }
            }
          }
          chuyenVaoDat.sort((a, b) => b.count - a.count);
          const top3Str = chuyenVaoDat.slice(0, 3)
            .map(c => `<b>${TEN_NHOM_LOI[c.from] || c.from}</b>: +${c.count} vật`)
            .join(' · ');

          // Đạt %
          const datNbGt = statCur.dat_pct.nam_bo.gt;
          const datNbYolo = statCur.dat_pct.nam_bo.yolo;
          const datPhuGt = statCur.dat_pct.phu.gt;

          // Hướng trước / sau
          const huongTr = statCur.huong.truoc.dung_pct;
          const huongSau = statCur.huong.sau.dung_pct;

          // Tiêu chí động
          let cauChuyenDacBiet = '';
          if (k === 3) {
            const koHopPrev = statPrev.nhom.nam_bo.gt.khong_ra_hop;
            const koHopCur = statCur.nhom.nam_bo.gt.khong_ra_hop;
            cauChuyenDacBiet = `<div style="color:#10b981; font-weight:700;">không ra hộp ${koHopPrev} → ${koHopCur}</div>`;
          } else if (k === 5) {
            const scPrev = statPrev.nhom.nam_bo.gt.sai_cum;
            const scCur = statCur.nhom.nam_bo.gt.sai_cum;
            cauChuyenDacBiet = `<div style="color:#10b981; font-weight:700;">sai cụm ${scPrev} → ${scCur}</div>`;
          }

          caHien = viDuK.sua;
          vongHien = new Set([kPrev, k]);

          noiDungHtml = `
            <div class="the_trang" style="padding:2px 6px; margin-bottom:2px;">
              <div style="display:flex; justify-content:center;">${svgNhom}</div>
              <div class="cv_ghi_nho" style="margin-top:1px; font-size:18px;">
                Chuyển dịch vào Đạt: ${top3Str || 'Không có'}.
                ${cauChuyenDacBiet}
              </div>
            </div>
            <div class="the_trang" style="padding:2px 6px; margin-bottom:2px; font-size:18px; line-height:1.15;">
              <div style="display:flex; justify-content:space-between; margin-bottom:1px;">
                <span>5 bộ GT: <b>${so(datNbGt, 1)}%</b></span>
                <span>YOLO: <b>${so(datNbYolo, 1)}%</b></span>
                <span>Phụ GT: <b>${so(datPhuGt, 1)}%</b></span>
              </div>
              <div style="color:#475569;">
                Đúng hướng V${k} (trước → sau chọn đầu xe): <b>${so(huongTr, 1)}%</b> → <b>${so(huongSau, 1)}%</b>
              </div>
            </div>
            ${taoKhungMoPhongVsThat(k)}
          `;
        } else if (buoc === 4) {
          // BƯỚC 4: Lỗi mới / còn lại
          caHien = viDuK.hong || viDuK.con_sai;
          vongHien = new Set([k]);

          // Nhóm tăng nhiều nhất từ chuyen
          let nhomTang = '';
          let maxTang = -999;
          for (const g of ['khong_ra_hop', 'sai_cum', 'sai_truc', 'lech_tam', 'khac']) {
            const tang = (statCur.nhom.nam_bo.gt[g] || 0) - (statPrev.nhom.nam_bo.gt[g] || 0);
            if (tang > maxTang) {
              maxTang = tang;
              nhomTang = g;
            }
          }

          let cauChuyenTang = '';
          if (k === 3) {
            const scPrev = statPrev.nhom.nam_bo.gt.sai_cum;
            const scCur = statCur.nhom.nam_bo.gt.sai_cum;
            cauChuyenTang = `<div style="color:#ef4444; font-weight:700;">sai cụm tăng ${scPrev} → ${scCur}</div>`;
          } else if (k === 6) {
            const mdNbCao = VONG_THAT.mat_dat ? VONG_THAT.mat_dat.nam_bo.cao : { v5: 9, v6: 20 };
            const csXa = VONG_THAT.con_sai ? VONG_THAT.con_sai.xa_35_50 : { v5_dat_pct: 61.9, v6_dat_pct: 47.6, n_tong: 21 };
            cauChuyenTang = `
              <div style="color:#ef4444; font-weight:700;">
                Lỗi mới: mặt đất ước cao hơn thật > 1 m, 5 bộ: ${mdNbCao.v5} → ${mdNbCao.v6} vật
              </div>
              <div style="color:#b45309; margin-top:2px;">
                Vật 35–50 m: ${so(csXa.v5_dat_pct, 1)} → ${so(csXa.v6_dat_pct, 1)} % (${csXa.n_tong} vật)
              </div>
            `;
          } else if (maxTang > 0) {
            cauChuyenTang = `<div style="color:#ef4444;">Nhóm <b>${TEN_NHOM_LOI[nhomTang]}</b> tăng +${maxTang} vật.</div>`;
          }

          const bcYeu = BANG_CHUNG_YEU[k] || '';

          noiDungHtml = `
            <div class="the_trang" style="padding:4px 8px; margin-bottom:2px; border-left:4px solid #f59e0b; font-size:18px; line-height:1.2;">
              <div style="font-weight:700; color:#b45309;">Lỗi mới phát sinh hoặc còn lại:</div>
              <div style="margin-top:2px;">
                ${cauChuyenTang}
                ${caHien ? `Ca minh hoạ: <b>${caHien.lop}</b> (${so(caHien.kc, 1)} m) thuộc nhóm <code>${TEN_NHOM_LOI[caHien.nhom[kStr]] || caHien.nhom[kStr]}</code>.` : ''}
              </div>
            </div>
            <div class="the_trang" style="padding:4px 8px; margin-bottom:2px; background:#fffbeb; font-size:18px; line-height:1.2;">
              <div style="font-weight:700; color:#92400e;">Bằng chứng ngoài mẫu:</div>
              <div style="color:#78350f; margin-top:2px;">
                ${bcYeu}
              </div>
            </div>
          `;
        }

        const hienKhung2d = (buoc === 3 || buoc === 4);

        chenPanel(`that_v${k}_panel`, `
          ${noiDungHtml}
          ${hienKhung2d ? `
            <div class="kq_vat_khung_2d" id="that_v${k}_khung_2d" style="height:${buoc === 3 ? '135px' : '175px'}; max-height:${buoc === 3 ? '135px' : '175px'};"></div>
            ${caHien ? `
              <div class="cv_ghi_nho" style="margin-top:1px; font-size:18px;">
                Vật: <b>${caHien.lop}</b> · ${so(caHien.kc, 1)} m · ${caHien.so_diem} điểm · IoU: <b>${caHien.vong[kStr].gt.hop ? so(caHien.vong[kStr].gt.iou, 2) : '—'}</b>
              </div>
            ` : ''}
          ` : ''}
        `);

        if (caHien) {
          xemCa.hien(caHien, {
            vong: vongHien,
            nguon: 'gt',
            sweep: false,
            cheDoAnh,
            datCam: true
          });
        }

        // Gắn sự kiện
        const dkEl = document.getElementById(`that_v${k}_dk`);
        if (dkEl) {
          dkEl.querySelectorAll('[data-buoc]').forEach(btn => btn.addEventListener('click', () => {
            buoc = +btn.dataset.buoc;
            capNhat();
          }));
        }

        const pnlEl = document.getElementById(`that_v${k}_panel`);
        if (pnlEl) {
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
      goPhanTu([`that_v${k}_dk`, `that_v${k}_panel`]);
    }
  };
}
