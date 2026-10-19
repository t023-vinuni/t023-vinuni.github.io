// Slide kết: Cảm ơn & Tài liệu (slide Hiện trạng 15/10 đã bỏ ngày 19/10)
import { taoHop, hopGT } from '../hop.js';

export const SLIDES_LO_TRINH = [
  // --- S18: Kết thúc & Tài liệu (T36) ---
  {
    id: 'ket',
    vat_chinh: 'vd',
    muc: 'Định hướng · Kết thúc',
    tieu_de: 'Cảm ơn mọi người đã lắng nghe',
    y: 'Nhóm T023 cảm ơn mentor Đỗ Danh Phương đã hướng dẫn nhóm trong Build phase.',
    goc_nhin: [
      { ten: 'Toàn cảnh xe ví dụ & hộp GT', cam: [33.0, -7.0, 6.0], nhin: [24.3, 3.1, 1.2] },
      { ten: 'Toàn cảnh từ trên', cam: [24.3, 3.1, 16.0], nhin: [24.3, 3.1, 1.2] }
    ],
    vao(ctx) {
      const lop = ctx.lop();

      ctx.theGioi.toMau('do_cao');

      // Hộp cuboid nhãn chuẩn GT cho xe ví dụ
      const bGt = hopGT(ctx.theGioi);
      if (bGt) {
        const grp = taoHop(ctx, bGt, 'gt');
        lop.add(grp);

        const nhan = ctx.taoNhan(
          'Đề tài N1-01B · Nhóm T023<br><span style="color:#1f9d55; font-weight:700;">Build phase VinUni 2026</span>',
          [bGt.cx, bGt.cy, bGt.cz + bGt.h / 2 + 0.8],
          { uu_tien: 1, kieu: 'cum' }
        );
        lop.add(nhan);
      }

      // DOM cột trái: bài báo tham khảo
      const elY = document.getElementById('slide_y');
      if (elY) {
        let cardEl = document.getElementById('s18_card');
        if (!cardEl) {
          cardEl = document.createElement('div');
          cardEl.id = 's18_card';
          cardEl.className = 'fade-in';
          cardEl.style.marginTop = '4px';

          const BAI_BAO = [
            'Frustum PointNets — Qi và cộng sự, CVPR 2018',
            'FGR — Wei và cộng sự, ICRA 2021',
            'Efficient L-shape fitting — Zhang và cộng sự, IEEE IV 2017',
            'LATTE — Wang và cộng sự, 2019'
          ];

          cardEl.innerHTML = `
            <div class="the_trang chu-the" style="display:flex; flex-direction:column; gap:8px; padding:10px 14px;">
              <div>
                <div style="font-weight:700; color:var(--mau-chu); margin-bottom:3px; font-size:18px;">Dữ liệu:</div>
                <div style="color:var(--mau-chu-phu); font-size:18px; line-height:1.4;">
                  nuScenes v1.0-mini — Caesar và cộng sự, CVPR 2020 (giấy phép CC BY-NC-SA 4.0)
                </div>
              </div>

              <div style="border-top:1px solid #f1f5f9; padding-top:6px;">
                <div style="font-weight:700; color:var(--mau-chu); margin-bottom:3px; font-size:18px;">Bài báo tham khảo:</div>
                <div style="color:var(--mau-chu-phu); display:flex; flex-direction:column; gap:3px; line-height:1.4; font-size:18px;">
                  ${BAI_BAO.map(b => `<div>• ${b}</div>`).join('')}
                </div>
              </div>
            </div>
          `;
          elY.parentNode.insertBefore(cardEl, elY.nextSibling);
        }
      }
    },
    ra() {
      const cardEl = document.getElementById('s18_card');
      if (cardEl) cardEl.remove();
    }
  }
];
