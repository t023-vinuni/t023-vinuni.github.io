// Các slide S11–S13: Fit hộp L-shape, Bù che frustum, Xác định đầu/đuôi

import { taoSvgFitTheta } from '../bieu_do.js';
import { iou } from '../toan_loi.js';
import { taoHop, hopGT, hienChuGiaiHop, anChuGiaiHop } from '../hop.js';
import { VONG_THAT } from '../../data/vong_that.js';
import { SO } from '../../data/so_lieu.js';

function rectAt(Q, th) {
  const c = Math.cos(th), s = Math.sin(th), n = Q.length;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i < n; i++) {
    const x = Q[i][0] * c + Q[i][1] * s, y = -Q[i][0] * s + Q[i][1] * c;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { th, c, s, x0, x1, y0, y1, Lx: x1 - x0, Ly: y1 - y0 };
}

const v6H = VONG_THAT.vong["6"].huong;
const v6TruocDung = Number(v6H.truoc.dung_pct).toFixed(1).replace('.', ',');
const v6SauDung = Number(v6H.sau.dung_pct).toFixed(1).replace('.', ',');
const v6ChayTruocLat = Number(v6H.chay.truoc.lat_pct).toFixed(1).replace('.', ',');
const v6ChaySauLat = Number(v6H.chay.sau.lat_pct).toFixed(1).replace('.', ',');
const v6BamC = v6H.can_bam_c;
const v6ChayBamC = v6H.chay.so_hop_can_bam_c;
const v6DungBamC = v6BamC - v6ChayBamC;
const v6CoXanhN = VONG_THAT.co_3_muc.xanh.n;
const v6CoXanhPct = Number(VONG_THAT.co_3_muc.xanh.dung_pct).toFixed(0);
const v6CoVangN = VONG_THAT.co_3_muc.vang.n;
const v6CoDoN = VONG_THAT.co_3_muc.do.n;

export const SLIDES_HOP_HUONG = [
  // --- S11: Fit hướng L-shape ---
  {
    id: 'l-shape',
    phu_luc: true,
    vat_chinh: 'vd',
    muc: 'Giải pháp · Toán: Fit hướng L-shape',
    tieu_de: 'Tìm hướng: quét θ, ba tiêu chí Zhang và hàm f của FGR',
    y: '<div class="nhan-minh-hoa" style="display:inline-block; font-size:18px; font-weight:700; color:#b45309; background:#fef3c7; padding:1px 6px; border-radius:4px; margin-bottom:2px;">Minh hoạ nguyên lý theo FGR, không phải pipeline nhóm</div><div style="font-size:18px; line-height:1.25;">Quét góc θ ∈ [0°, 90°) bước 0,5° tìm hướng khớp cụm L-shape. FGR tối ưu hàm f(θ) góc phần tư thay vì variance của Zhang.</div><div style="font-size:18px; color:var(--mau-chu-phu); border-left:2px solid #1f5fc4; padding-left:6px; margin-top:2px;"><b>Pipeline nhóm:</b> V1 diện tích nhỏ nhất; V4 closeness; V5 năng lượng</div>',
    cong_thuc: [
      String.raw`f(\theta) = \frac{|Q_0|}{|Q|}, \quad \gamma_{\text{var}} = -\sigma^2(e_1) - \sigma^2(e_2)`
    ],
    so: ['f_0', 'f_30', 'zhang_var'],
    ml: 'Tối ưu θ bằng grid search trên hàm mục tiêu; chọn tiêu chí = chọn loss; không phân biệt đầu/đuôi xe.',
    goc_nhin: [
      { ten: 'Từ trên nhìn L-shape (BEV)', cam: [24.3, 3.1, 15.0], nhin: [24.3, 3.1, 0.97] },
      { ten: 'Góc nghiêng toàn cảnh hộp', cam: [33.0, -7.0, 6.0], nhin: [24.3, 3.1, 1.1] }
    ],
    vao(ctx) {
      const lop = ctx.lop();
      const toan = ctx.theGioi.toan;
      if (!toan || !toan.fit || !toan.M) return;

      if (ctx.theGioi.diem && ctx.theGioi.diem.material) {
        ctx.theGioi.diem.material.size = 0.22;
      }

      // Tô màu cụm xanh lá
      ctx.theGioi.toMau('cum');

      const D = ctx.theGioi.D;
      const M = toan.M;
      const Q = M.map(i => [D.PE[3 * i], D.PE[3 * i + 1]]);
      const zmid = (toan.zb + toan.zt) / 2;
      const hBox = toan.zt - toan.zb;

      const groupFit = new ctx.THREE.Group();
      lop.add(groupFit);

      function dungHopTheta(thRad) {
        groupFit.clear();
        const r = rectAt(Q, thRad);
        const loc2w = (x, y) => [x * r.c - y * r.s, x * r.s + y * r.c];

        const c1 = loc2w(r.x0, r.y0);
        const c2 = loc2w(r.x1, r.y0);
        const c3 = loc2w(r.x1, r.y1);
        const c4 = loc2w(r.x0, r.y1);

        const zb = toan.zb;
        const zt = toan.zt;

        // 12 cạnh của hộp 3D tại góc theta
        const ptsHop = [
          // Đáy
          ctx.S([c1[0], c1[1], zb]), ctx.S([c2[0], c2[1], zb]),
          ctx.S([c2[0], c2[1], zb]), ctx.S([c3[0], c3[1], zb]),
          ctx.S([c3[0], c3[1], zb]), ctx.S([c4[0], c4[1], zb]),
          ctx.S([c4[0], c4[1], zb]), ctx.S([c1[0], c1[1], zb]),
          // Nắp trên
          ctx.S([c1[0], c1[1], zt]), ctx.S([c2[0], c2[1], zt]),
          ctx.S([c2[0], c2[1], zt]), ctx.S([c3[0], c3[1], zt]),
          ctx.S([c3[0], c3[1], zt]), ctx.S([c4[0], c4[1], zt]),
          ctx.S([c4[0], c4[1], zt]), ctx.S([c1[0], c1[1], zt]),
          // 4 cột đứng
          ctx.S([c1[0], c1[1], zb]), ctx.S([c1[0], c1[1], zt]),
          ctx.S([c2[0], c2[1], zb]), ctx.S([c2[0], c2[1], zt]),
          ctx.S([c3[0], c3[1], zb]), ctx.S([c3[0], c3[1], zt]),
          ctx.S([c4[0], c4[1], zb]), ctx.S([c4[0], c4[1], zt])
        ];
        const lineGeo = new ctx.THREE.BufferGeometry().setFromPoints(ptsHop);
        const lineMat = new ctx.THREE.LineBasicMaterial({ color: 0x1f5fc4, linewidth: 2.5 });
        const lineMesh = new ctx.THREE.LineSegments(lineGeo, lineMat);
        groupFit.add(lineMesh);
      }

      // Khởi tạo ở góc tối ưu FGR: 20.5° (iF = 41)
      const thOptDeg = toan.fit.rows[toan.fit.iF].th * 180 / Math.PI;
      dungHopTheta(toan.fit.rows[toan.fit.iF].th);

      // Thêm bảng điều khiển góc θ và đồ thị SVG cột trái
      const elY = document.getElementById('slide_y');
      if (elY) {
        const fOptVal = toan.fit.rows[toan.fit.iF].f.toFixed(3).replace('.', ',');
        const thOptStr = thOptDeg.toFixed(1).replace('.', ',');
        let panelEl = document.getElementById('s11_panel');
        if (!panelEl) {
          panelEl = document.createElement('div');
          panelEl.id = 's11_panel';
          panelEl.className = 'fade-in';
          panelEl.style.marginTop = '4px';
          panelEl.innerHTML = `
            <div class="the_trang chu-the" style="padding:8px 12px; margin-bottom:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span>Góc θ: <b id="val_th" style="color:var(--mau-xanh);">${thOptStr}°</b></span>
                <span style="color:var(--cum-xanh); font-weight:700;">θ* = ${thOptStr}° (f = ${fOptVal})</span>
              </div>
              <input type="range" id="rng_th" min="0" max="90" step="0.5" value="${thOptDeg.toFixed(1)}" style="width:100%; cursor:pointer;">
              <div class="chu-nho" style="display:flex; justify-content:space-between; color:var(--mau-chu-phu); margin-top:1px;">
                <span>0°</span><span>20,5° (tối ưu)</span><span>45°</span><span>90°</span>
              </div>
              <div style="display:flex; gap:6px; margin-top:4px;">
                <button id="btn_th_opt" class="nut_phu" style="flex:1; padding:3px 6px;">Về θ* tối ưu (20,5°)</button>
                <button id="btn_th_0" class="nut_phu" style="flex:1; padding:3px 6px;">Thử θ = 0°</button>
                <button id="btn_th_45" class="nut_phu" style="flex:1; padding:3px 6px;">Thử θ = 45°</button>
              </div>
            </div>
            <div id="s11_chart">${taoSvgFitTheta(toan.fit.rows, thOptDeg, 440, 105)}</div>
          `;
          elY.parentNode.insertBefore(panelEl, elY.nextSibling);

          const rng = panelEl.querySelector('#rng_th');
          const valTh = panelEl.querySelector('#val_th');
          const chartBox = panelEl.querySelector('#s11_chart');

          function capNhatTheta(deg) {
            valTh.textContent = `${deg.toFixed(1).replace('.', ',')}°`;
            rng.value = deg;
            dungHopTheta(deg * Math.PI / 180);
            chartBox.innerHTML = taoSvgFitTheta(toan.fit.rows, deg, 360, 120);
            if (ctx.canh && ctx.canh.chup) ctx.canh.veMotLan();
          }

          rng.addEventListener('input', e => capNhatTheta(parseFloat(e.target.value)));
          panelEl.querySelector('#btn_th_opt').addEventListener('click', () => capNhatTheta(thOptDeg));
          panelEl.querySelector('#btn_th_0').addEventListener('click', () => capNhatTheta(0));
          panelEl.querySelector('#btn_th_45').addEventListener('click', () => capNhatTheta(45));
        }
      }
    },
    ra(ctx) {
      if (ctx && ctx.theGioi && ctx.theGioi.diem && ctx.theGioi.diem.material) {
        ctx.theGioi.diem.material.size = 0.08;
      }
      const panelEl = document.getElementById('s11_panel');
      if (panelEl) panelEl.remove();
    }
  },

  // --- S12: Bù che bằng tia biên frustum ---
  {
    id: 'bu-che',
    phu_luc: true,
    vat_chinh: 'vd',
    muc: 'Giải pháp · Toán: Bù che frustum',
    tieu_de: 'Bù phần bị che bằng giao cạnh với tia biên frustum',
    y: '<div class="nhan-minh-hoa" style="display:inline-block; font-size:18px; font-weight:700; color:#b45309; background:#fef3c7; padding:1px 6px; border-radius:4px; margin-bottom:2px;">Minh hoạ nguyên lý theo FGR, không phải pipeline nhóm</div><div style="font-size:18px; line-height:1.25;">LiDAR chỉ thấy 2 mặt L-shape. Kéo dài 2 cạnh hộp tới khi giao 2 tia biên frustum 2D để khôi phục đủ kích thước xe.</div><div style="font-size:18px; color:var(--mau-chu-phu); border-left:2px solid #1f5fc4; padding-left:6px; margin-top:2px;"><b>Pipeline nhóm:</b> V1 không bù; V2 kích thước mẫu; V5 năng lượng + E_2d</div>',
    cong_thuc: [
      String.raw`V + t e = P_0 + s u \implies t = \frac{(V - P_0) \times u}{u \times e}`,
      String.raw`\operatorname{IoU}_{\text{3D}}: \; 0{,}242 \longrightarrow 0{,}724 \quad (\Delta\text{IoU} = +0{,}482)`
    ],
    so: ['bu_che_demo'],
    ml: 'Dùng prior hình học (khung amodal); khi khung không amodal, thay bằng prior thống kê (kích thước trung vị theo class).',
    goc_nhin: [
      { ten: 'Từ trên nhìn hai tia biên (BEV)', cam: [24.3, 3.1, 15.0], nhin: [24.3, 3.1, 0.97] },
      { ten: 'Góc nghiêng toàn cảnh hộp', cam: [33.0, -7.0, 6.0], nhin: [24.3, 3.1, 0.97] }
    ],
    vao(ctx) {
      const lop = ctx.lop();
      const toan = ctx.theGioi.toan;
      if (!toan || !toan.lines || !toan.ext || !toan.boxObs || !toan.box) return;

      // Tô màu điểm cụm
      ctx.theGioi.toMau('cum');

      const zmid = (toan.zb + toan.zt) / 2;

      // 1. Hai tia biên frustum trên mặt phẳng ngang zmid (màu xanh dương đậm)
      toan.lines.forEach((ln, idx) => {
        const P0 = [ln.P0[0], ln.P0[1], zmid];
        // Kéo dài tia 32 mét
        const P1 = [ln.P0[0] + ln.u[0] * 32, ln.P0[1] + ln.u[1] * 32, zmid];

        const lineGeo = new ctx.THREE.BufferGeometry().setFromPoints([
          ctx.S(P0),
          ctx.S(P1)
        ]);
        const lineMat = new ctx.THREE.LineBasicMaterial({ color: 0x1f5fc4, linewidth: 2 });
        const tia = new ctx.THREE.Line(lineGeo, lineMat);
        lop.add(tia);

        const nhanTia = ctx.taoNhan(`Tia biên ${idx + 1}`, [P1[0] - 2, P1[1] - 0.5, zmid], { uu_tien: 2, kieu: 'thuong' });
        lop.add(nhanTia);
      });

      // 2. Hộp quan sát (hổ phách) - trước bù che
      const bObs = toan.boxObs;
      const grpObs = taoHop(ctx, bObs, 'quan_sat');
      lop.add(grpObs);

      // 3. Hộp sau bù che (đỏ san hô nét đứt) - đề xuất pipeline
      const bFin = toan.box;
      const grpFin = taoHop(ctx, bFin, 'de_xuat');
      lop.add(grpFin);

      // 4. Hộp nhãn chuẩn GT (xanh lá liền) - bao trọn xe ví dụ
      const bGt = hopGT(ctx.theGioi) || toan.gt;
      const grpGt = taoHop(ctx, bGt, 'gt');
      lop.add(grpGt);

      // Hiển thị chú giải vai hộp ở góc dưới phải vùng 3D
      hienChuGiaiHop(['gt', 'de_xuat', 'quan_sat']);

      // 5. Hai điểm giao cắt với tia biên frustum (quả cầu nhỏ màu xanh ngọc)
      const V = toan.fit.V;
      toan.ext.forEach((arm, i) => {
        if (arm.hit) {
          const pGiao = [V[0] + arm.e[0] * arm.t, V[1] + arm.e[1] * arm.t, zmid];
          const sphGeo = new ctx.THREE.SphereGeometry(0.12, 16, 16);
          const sphMat = new ctx.THREE.MeshBasicMaterial({ color: 0x0f8a8a });
          const sphMesh = new ctx.THREE.Mesh(sphGeo, sphMat);
          sphMesh.position.copy(ctx.S(pGiao));
          lop.add(sphMesh);

          // Đường nối từ cạnh quan sát tới điểm giao (đoạn bù che)
          const pDau = [V[0] + arm.e[0] * arm.Lobs, V[1] + arm.e[1] * arm.Lobs, zmid];
          const segGeo = new ctx.THREE.BufferGeometry().setFromPoints([ctx.S(pDau), ctx.S(pGiao)]);
          const segMat = new ctx.THREE.LineDashedMaterial({ color: 0xe5484d, dashSize: 0.2, gapSize: 0.1, linewidth: 2 });
          const segLine = new ctx.THREE.Line(segGeo, segMat);
          segLine.computeLineDistances();
          lop.add(segLine);
        }
      });

      // Bảng so sánh IoU trước và sau bù che bên cột trái (màu sắc khớp với vai hộp)
      const elY = document.getElementById('slide_y');
      if (elY) {
        let cardEl = document.getElementById('s12_card');
        if (!cardEl) {
          cardEl = document.createElement('div');
          cardEl.id = 's12_card';
          cardEl.className = 'fade-in';
          cardEl.innerHTML = `
            <div class="the_trang chu-the" style="padding:10px 14px; margin-bottom:4px;">
              <div class="chu-the" style="font-weight:700; margin-bottom:6px; color:var(--mau-chu);">Hiệu quả bù che hình học (Amodal Prior)</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:6px;">
                <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:6px 10px;">
                  <div class="chu-the" style="color:#b45309; font-weight:700; margin-bottom:2px;">1. Trước bù che</div>
                  <div class="chu-the" style="color:var(--mau-chu-phu);">Kích thước: <b>1,72 × 1,54 m</b></div>
                  <div class="chu-the" style="font-weight:800; color:#b45309; margin-top:2px;">IoU 3D = ${toan.iouObs.iou3d.toFixed(3).replace('.', ',')}</div>
                </div>
                <div style="background:#fff5f5; border:1px solid #fed7d7; border-radius:8px; padding:6px 10px;">
                  <div class="chu-the" style="color:#e5484d; font-weight:700; margin-bottom:2px;">2. Sau bù che</div>
                  <div class="chu-the" style="color:var(--mau-chu-phu);">Kích thước: <b>4,22 × 1,99 m</b></div>
                  <div class="chu-the" style="font-weight:800; color:#e5484d; margin-top:2px;">IoU 3D = ${toan.iou.iou3d.toFixed(3).replace('.', ',')}</div>
                </div>
              </div>
              <div class="chu-the" style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:4px;">
                <span>Hộp GT: <b style="color:#1f9d55;">4,73 × 1,91 m</b></span>
                <span class="chu-the" style="color:#1f9d55; font-weight:800;">ΔIoU = +0,482</span>
              </div>
            </div>
          `;
          elY.parentNode.insertBefore(cardEl, elY.nextSibling);
        }
      }
    },
    ra() {
      const cardEl = document.getElementById('s12_card');
      if (cardEl) cardEl.remove();
      anChuGiaiHop();
    }
  },

  // --- S14: Đầu / đuôi xe bằng vận tốc ---
  {
    id: 'dau-duoi',
    phu_luc: true,
    vat_chinh: 'vd',
    muc: 'Giải pháp · Toán: Xác định đầu và đuôi',
    tieu_de: 'Đầu/đuôi xe bằng vận tốc; xe đứng yên cần người lật',
    y: '<div style="font-size:18px; line-height:1.25;">Hộp chữ L đối xứng 180° nên không biết đâu là đầu xe. Xe đang chạy: vận tốc ước từ 9 sweep quá khứ chỉ ra đầu xe. Xe đứng yên: không có vận tốc, hộp được gắn cờ để người bấm C lật.</div>',
    cong_thuc: [
      String.raw`C(v) = \sum_{k=1}^{9} \sum_{s \in S_k} \min\big(d(s + v\,k\,\Delta t\,u,\ \text{cụm}),\ \tau\big)^2 + 10^{-4}|v|,\quad v \in [-15, 15]\ \text{m/s (bước 0,25)},\ \Delta t = 0{,}05\ \text{s},\ \tau = 0{,}3\ \text{m}`,
      String.raw`v^* = \arg\min C(v);\quad |v^*| \ge 0{,}5 \land C(v^*) \le C(0) \Rightarrow \text{đầu theo chiều } v^* \text{ (} v^* < 0 \text{: xoay } 180^\circ\text{)};\ \text{không thì cờ, người bấm C}`
    ],
    so: ['v6_huong_sau', 'v6_lat_chay_sau', 'v6_bam_c'],
    ml: 'Vận tốc là đặc trưng thời gian phá đối xứng 180°; ca thiếu tín hiệu để người quyết (human-in-the-loop).',
    goc_nhin: [
      { ten: 'Toàn cảnh xe và vector vận tốc', cam: [32.0, -6.0, 6.5], nhin: [24.3, 3.1, 1.2] },
      { ten: 'Từ trên cao kiểm tra hướng', cam: [24.3, 3.1, 14.0], nhin: [24.3, 3.1, 1.0] }
    ],
    vao(ctx) {
      const lop = ctx.lop();
      const toan = ctx.theGioi.toan;
      if (!toan || !toan.box) return;

      ctx.theGioi.toMau('cum');

      const b = toan.box;
      const bGt = hopGT(ctx.theGioi) || toan.gt;
      let daLat = false;

      // 1. Hộp đề xuất (vai de_xuat, đỏ san hô nét đứt) và Hộp GT (vai gt, xanh lá chỉ khung)
      const grpHop = taoHop(ctx, b, 'de_xuat', { fill: true });
      lop.add(grpHop);

      const grpGt = taoHop(ctx, bGt, 'gt', { fill: false });
      lop.add(grpGt);

      // Hiển thị chú giải vai hộp ở góc dưới phải vùng 3D
      hienChuGiaiHop(['gt', 'de_xuat']);

      // 2. Độ cao nóc xe: zNoc = max(đỉnh hộp GT, đỉnh hộp đề xuất)
      const zNoc = Math.max(bGt.cz + bGt.h / 2, b.cz + b.h / 2);
      const lThan = 0.7 * b.l;

      // 3. Mũi tên HƯỚNG HỘP (màu de_xuat: đỏ san hô 0xe5484d) ở zNoc + 0.35 m
      const muiTenGroup = new ctx.THREE.Group();
      const thanGeo = new ctx.THREE.CylinderGeometry(0.07, 0.07, lThan, 32);
      thanGeo.rotateZ(-Math.PI / 2);
      const nonGeo = new ctx.THREE.ConeGeometry(0.2, 0.5, 32);
      nonGeo.rotateZ(-Math.PI / 2);
      nonGeo.translate(lThan / 2 + 0.25, 0, 0);

      const muiMat = new ctx.THREE.MeshBasicMaterial({
        color: 0xe5484d,
        depthTest: false,
        depthWrite: false
      });
      const thanMesh = new ctx.THREE.Mesh(thanGeo, muiMat);
      const nonMesh = new ctx.THREE.Mesh(nonGeo, muiMat);
      thanMesh.renderOrder = 30;
      nonMesh.renderOrder = 30;
      muiTenGroup.add(thanMesh);
      muiTenGroup.add(nonMesh);
      muiTenGroup.position.copy(ctx.S([b.cx, b.cy, zNoc + 0.35]));
      muiTenGroup.rotation.y = b.yaw;
      lop.add(muiTenGroup);

      // Nhãn 3D cho mũi tên hướng
      let nhanHuong = ctx.taoNhan('Hướng hộp θ', [b.cx + 0.8, b.cy - 0.8, zNoc + 0.35], { uu_tien: 1, kieu: 'de_xuat' });
      lop.add(nhanHuong);

      // 4. Mũi tên VẬN TỐC v [G] (màu tím 0x6e56cf) ở zNoc + 0.95 m
      const vGroup = new ctx.THREE.Group();
      const vThanGeo = new ctx.THREE.CylinderGeometry(0.07, 0.07, lThan, 32);
      vThanGeo.rotateZ(-Math.PI / 2);
      const vNonGeo = new ctx.THREE.ConeGeometry(0.2, 0.5, 32);
      vNonGeo.rotateZ(-Math.PI / 2);
      vNonGeo.translate(lThan / 2 + 0.25, 0, 0);

      const vMat = new ctx.THREE.MeshBasicMaterial({
        color: 0x6e56cf,
        depthTest: false,
        depthWrite: false
      });
      const vThanMesh = new ctx.THREE.Mesh(vThanGeo, vMat);
      const vNonMesh = new ctx.THREE.Mesh(vNonGeo, vMat);
      vThanMesh.renderOrder = 30;
      vNonMesh.renderOrder = 30;
      vGroup.add(vThanMesh);
      vGroup.add(vNonMesh);
      vGroup.position.copy(ctx.S([b.cx, b.cy, zNoc + 0.95]));
      vGroup.rotation.y = b.yaw;
      lop.add(vGroup);

      const nhanV = ctx.taoNhan('Vận tốc v [G]', [b.cx + 0.8, b.cy + 0.8, zNoc + 0.95], { uu_tien: 1, kieu: 'minh_hoa' });
      lop.add(nhanV);

      // Hàm lật hướng
      function thucHienLat() {
        daLat = !daLat;
        grpHop.rotation.y = b.yaw + (daLat ? Math.PI : 0);
        muiTenGroup.rotation.y = b.yaw + (daLat ? Math.PI : 0);

        if (nhanHuong && nhanHuong.element) {
          nhanHuong.element.textContent = daLat ? 'Hướng hộp θ + 180°' : 'Hướng hộp θ';
        }

        // Cập nhật giao diện
        const lblTrangThai = document.getElementById('s13_trang_thai');
        const badgeLat = document.getElementById('s13_badge');
        if (lblTrangThai) {
          lblTrangThai.innerHTML = daLat
            ? '<b style="color:#e5484d;">Đã lật 180°</b>'
            : '<b style="color:var(--cum-xanh);">Hướng ban đầu</b>';
        }
        if (badgeLat) {
          badgeLat.textContent = daLat
            ? 'Hộp minh hoạ · đã lật 180° (IoU không đổi = 1,000)'
            : 'Hộp minh hoạ · hướng ban đầu';
        }

        if (ctx.canh && ctx.canh.chup) ctx.canh.veMotLan();
      }

      // Đọc tuỳ chọn ?lat=1 trên URL để chụp trạng thái đã lật (T39)
      const params = typeof window !== 'undefined' && window.location ? new URLSearchParams(window.location.search) : null;
      if (params && params.get('lat') === '1') {
        thucHienLat();
      }

      // Xử lý phím tắt C
      const xuLyPhim = e => {
        if (e.key === 'c' || e.key === 'C') {
          thucHienLat();
        }
      };
      window.addEventListener('keydown', xuLyPhim);
      ctx._s13_xuLyPhim = xuLyPhim;

      // Bảng điều khiển lật bên cột trái
      const elY = document.getElementById('slide_y');
      if (elY) {
        let panelEl = document.getElementById('s13_panel');
        if (!panelEl) {
          panelEl = document.createElement('div');
          panelEl.id = 's13_panel';
          panelEl.className = 'fade-in';
          panelEl.innerHTML = `
            <div class="the_trang_lon chu-the" style="margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>Trạng thái: <span id="s13_trang_thai"><b style="color:var(--cum-xanh);">Hướng ban đầu</b></span></span>
                <button id="btn_lat_180" class="cv_nut" style="padding:4px 12px; font-size:18px;">
                  ↺ Lật 180° (phím C)
                </button>
              </div>
              <div class="chu-nho" style="margin-top:6px; color:var(--mau-chu-phu); line-height:1.2; background:#f8fafc; padding:4px 8px; border-radius:6px; border:1px solid #e2e8f0; font-size:18px;">
                <b>Lưu ý:</b> hộp lật 180° vẫn có IoU = 1,000 và e₁₈₀ = 0°; chỉ e₃₆₀ > 90° mới bắt được lật.
              </div>
            </div>
          `;
          elY.parentNode.insertBefore(panelEl, elY.nextSibling);

          panelEl.querySelector('#btn_lat_180').addEventListener('click', thucHienLat);
        }
      }
    },
    ra(ctx) {
      if (ctx._s13_xuLyPhim) {
        window.removeEventListener('keydown', ctx._s13_xuLyPhim);
        delete ctx._s13_xuLyPhim;
      }
      const panelEl = document.getElementById('s13_panel');
      if (panelEl) panelEl.remove();
      anChuGiaiHop();
    }
  }
];
