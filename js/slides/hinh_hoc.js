// Nhóm slide: Hình học và cảm biến (S3, S4, S5, S6)
// Sử dụng ctx (THREE, scene, camera, theGioi, S, lop, so...)
import { taoHop, hopGT } from '../hop.js';

function taoHeTruc(ctx, { posEgo, R = null, len = 1.4, nhanTruc, nhanHe, mauGoc, kieuNhan, coVongMatDat = false }) {
  const g = new ctx.THREE.Group();
  const AX = [0xe5484d, 0x1f9d55, 0x1f5fc4]; // đỏ X, xanh lục Y, xanh lam Z
  const originThree = ctx.S(posEgo);
  g.position.copy(originThree);

  const vatLieuList = [];
  const nhanList = [];

  const Lines = ctx.lines || (typeof window !== 'undefined' && window.THREE_LINES);

  // Đầu mút trục j = t + len * cột_j(R) (K6, T33)
  for (let j = 0; j < 3; j++) {
    const col_j = R ? [R[0][j], R[1][j], R[2][j]] : (j === 0 ? [1, 0, 0] : (j === 1 ? [0, 1, 0] : [0, 0, 1]));
    const vEndEgo = [
      posEgo[0] + len * col_j[0],
      posEgo[1] + len * col_j[1],
      posEgo[2] + len * col_j[2]
    ];
    const vEndThree = ctx.S(vEndEgo);
    const vDirThree = vEndThree.clone().sub(originThree);

    // Đường trục: Line2/LineMaterial dày 4 px (T33)
    if (Lines && Lines.Line2 && Lines.LineGeometry && Lines.LineMaterial) {
      const lineGeo = new Lines.LineGeometry();
      lineGeo.setPositions([0, 0, 0, vDirThree.x, vDirThree.y, vDirThree.z]);
      const lineMat = new Lines.LineMaterial({
        color: AX[j],
        linewidth: 4,
        resolution: new ctx.THREE.Vector2(1920, 1080),
        transparent: true,
        opacity: 1.0,
        depthTest: true
      });
      vatLieuList.push(lineMat);
      const line = new Lines.Line2(lineGeo, lineMat);
      g.add(line);
    } else {
      const lineGeo = new ctx.THREE.BufferGeometry().setFromPoints([
        new ctx.THREE.Vector3(0, 0, 0),
        vDirThree
      ]);
      const lineMat = new ctx.THREE.LineBasicMaterial({ color: AX[j], linewidth: 4, transparent: true, opacity: 1.0 });
      vatLieuList.push(lineMat);
      const line = new ctx.THREE.Line(lineGeo, lineMat);
      g.add(line);
    }

    // Mũi tên nón chuẩn hướng (r = 0.07, cao = 0.22) (K7, T33)
    const coneGeo = new ctx.THREE.ConeGeometry(0.07, 0.22, 24);
    const coneMat = new ctx.THREE.MeshBasicMaterial({ color: AX[j], transparent: true, opacity: 1.0 });
    vatLieuList.push(coneMat);
    const cone = new ctx.THREE.Mesh(coneGeo, coneMat);
    cone.position.copy(vDirThree);
    cone.quaternion.setFromUnitVectors(new ctx.THREE.Vector3(0, 1, 0), vDirThree.clone().normalize());
    g.add(cone);

    // Nhãn chữ nhỏ ở đầu mỗi trục (uu_tien: 1, kieu theo hệ) (K6, T33)
    if (ctx.taoNhan) {
      const nhanTrucEl = ctx.taoNhan(nhanTruc[j], vEndEgo, { uu_tien: 1, kieu: kieuNhan });
      nhanList.push(nhanTrucEl);
      g.add(nhanTrucEl);
    }
  }

  // Quả cầu gốc r = 0.06 m phân biệt màu hệ (T33)
  const sphereGeo = new ctx.THREE.SphereGeometry(0.06, 24, 16);
  const sphereMat = new ctx.THREE.MeshStandardMaterial({
    color: mauGoc,
    roughness: 0.3,
    metalness: 0.2,
    transparent: true,
    opacity: 1.0
  });
  vatLieuList.push(sphereMat);
  const sphere = new ctx.THREE.Mesh(sphereGeo, sphereMat);
  sphere.position.set(0, 0, 0);
  g.add(sphere);

  // Vòng tròn mảnh trên mặt đất quanh quả cầu gốc xe Ego (T33)
  if (coVongMatDat) {
    const ringGeo = new ctx.THREE.RingGeometry(0.35, 0.38, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new ctx.THREE.MeshBasicMaterial({
      color: 0xc98200,
      side: ctx.THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    vatLieuList.push(ringMat);
    const ring = new ctx.THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 0.01, 0);
    g.add(ring);
  }

  // Nhãn tên hệ quy ước tại quả cầu gốc (uu_tien: 1, kieu theo hệ)
  if (nhanHe && ctx.taoNhan) {
    const posNhanGoc = [posEgo[0], posEgo[1], posEgo[2] + 0.25];
    const nhanHeEl = ctx.taoNhan(nhanHe, posNhanGoc, { uu_tien: 1, kieu: kieuNhan });
    nhanList.push(nhanHeEl);
    g.add(nhanHeEl);
  }

  // Phương thức điều chỉnh độ mờ và ẩn/hiện nhãn (T33)
  g.userData.setDoMo = (opacity, hienNhan) => {
    vatLieuList.forEach(m => {
      m.opacity = opacity;
      m.transparent = (opacity < 1.0);
    });
    nhanList.forEach(nhan => {
      if (hienNhan) {
        if (typeof nhan.hien === 'function') nhan.hien();
      } else {
        if (typeof nhan.an === 'function') nhan.an();
      }
    });
  };

  return g;
}

export const SLIDES_HINH_HOC = [
  // --- S3: Hệ trục toạ độ và xoay ---
  {
    id: 'he-truc',
    phu_luc: true,
    vat_chinh: 'ego',
    muc: 'Giải pháp · Toán: Hiệu chuẩn không gian',
    tieu_de: 'Ba hệ toạ độ và phép biến đổi xoay',
    y: 'Dữ liệu nằm ở 3 hệ toạ độ: xe (ego, gốc giữa trục sau), LiDAR và 6 camera. Bỏ qua góc chúc 1,39° của LiDAR sẽ lệch độ cao 0,56 m ở cự ly 23 m.',
    cong_thuc: [
      String.raw`R(q) = \begin{bmatrix} 1-2(y^2+z^2) & 2(xy-wz) & 2(xz+wy) \\ 2(xy+wz) & 1-2(x^2+z^2) & 2(yz-wx) \\ 2(xz-wy) & 2(yz+wx) & 1-2(x^2+y^2) \end{bmatrix}`,
      String.raw`\psi_{\text{yaw}} = \operatorname{atan2}(2(wz+xy),\, 1-2(y^2+z^2))`
    ],
    so: ['q_lidar', 'lidar_chuc', 'lech_cao_23m'],
    ml: 'Mọi đặc trưng (cự ly, độ cao) phải quy về cùng một hệ; sai hệ trục là nhiễu hệ thống (systematic bias) trên cả tập.',
    goc_nhin: [
      { ten: 'Cả ba hệ', cam: [8.5, -9.5, 6.0], nhin: [1.2, 0.0, 1.2] },
      // Nhìn vào tâm "gốc + 3 đầu trục" của từng hệ, cách ≈ 4 × độ dài trục để cả 3 trục và nhãn nằm trong khung
      { ten: 'Hệ xe (E)', cam: [-2.2, -7.8, 4.2], nhin: [0.9, 0.5, 0.8] },
      { ten: 'Hệ LiDAR (L)', cam: [4.0, -3.5, 4.7], nhin: [1.34, -0.4, 2.24] },
      { ten: 'Hệ camera (C)', cam: [4.6, -3.1, 3.1], nhin: [2.03, -0.32, 1.18] }
    ],
    doiGocNhin(ctx, viewIdx) {
      const { heEgo, heLidar, heCam } = this.__heTruc || {};
      if (!heEgo || !heLidar || !heCam) return;

      const elDangXem = document.getElementById('s3_dang_xem');
      const hangEgo = document.getElementById('hang_ego');
      const hangLidar = document.getElementById('hang_lidar');
      const hangCam = document.getElementById('hang_cam');

      [hangEgo, hangLidar, hangCam].forEach(h => h && h.classList.remove('active'));

      if (viewIdx === 0) {
        heEgo.userData.setDoMo(1.0, true);
        heLidar.userData.setDoMo(1.0, true);
        heCam.userData.setDoMo(1.0, true);
        if (elDangXem) elDangXem.innerHTML = 'Đang xem: cả ba hệ (x<sub>E</sub>, x<sub>L</sub>, x<sub>C</sub>)';
      } else if (viewIdx === 1) {
        heEgo.userData.setDoMo(1.0, true);
        heLidar.userData.setDoMo(0.2, false);
        heCam.userData.setDoMo(0.2, false);
        if (elDangXem) elDangXem.innerHTML = 'Đang xem: Hệ xe Ego — nhãn x<sub>E</sub>, y<sub>E</sub>, z<sub>E</sub>';
        if (hangEgo) hangEgo.classList.add('active');
      } else if (viewIdx === 2) {
        heEgo.userData.setDoMo(0.2, false);
        heLidar.userData.setDoMo(1.0, true);
        heCam.userData.setDoMo(0.2, false);
        if (elDangXem) elDangXem.innerHTML = 'Đang xem: Hệ LiDAR — nhãn x<sub>L</sub>, y<sub>L</sub>, z<sub>L</sub>';
        if (hangLidar) hangLidar.classList.add('active');
      } else if (viewIdx === 3) {
        heEgo.userData.setDoMo(0.2, false);
        heLidar.userData.setDoMo(0.2, false);
        heCam.userData.setDoMo(1.0, true);
        if (elDangXem) elDangXem.innerHTML = 'Đang xem: Camera trước (CAM_FRONT) — nhãn x<sub>C</sub>, y<sub>C</sub>, z<sub>C</sub>';
        if (hangCam) hangCam.classList.add('active');
      }
    },
    vao(ctx) {
      const lop = ctx.lop();
      const D = ctx.theGioi.D;

      // 1. Hệ trục xe (Ego): x trước · y trái · z lên, len = 2.2 m, gốc [0, 0, 0] (T33)
      const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const heEgo = taoHeTruc(ctx, {
        posEgo: [0, 0, 0],
        R: I3,
        len: 2.2,
        nhanTruc: ['x<sub>E</sub> (trước)', 'y<sub>E</sub> (trái)', 'z<sub>E</sub> (lên)'],
        nhanHe: 'Hệ xe Ego (E)',
        mauGoc: 0xc98200,
        kieuNhan: 'ego',
        coVongMatDat: true
      });
      lop.add(heEgo);

      // 2. Hệ trục LiDAR HDL-32E: x phải · y trước · z lên, len = 1.2 m, gốc D.L2E.t (T33)
      const heLidar = taoHeTruc(ctx, {
        posEgo: D.L2E.t,
        R: D.L2E.R,
        len: 1.2,
        nhanTruc: ['x<sub>L</sub> (phải)', 'y<sub>L</sub> (trước)', 'z<sub>L</sub> (lên)'],
        nhanHe: 'Hệ LiDAR (L)',
        mauGoc: 0x1f5fc4,
        kieuNhan: 'lidar',
        coVongMatDat: false
      });
      lop.add(heLidar);

      // 3. Hệ trục Camera Trước CAM_FRONT: x phải · y xuống · z quang, len = 1.0 m, gốc D.cams.CAM_FRONT.C2E.t (T33)
      const c = D.cams.CAM_FRONT;
      const heCam = taoHeTruc(ctx, {
        posEgo: c.C2E.t,
        R: c.C2E.R,
        len: 1.0,
        nhanTruc: ['x<sub>C</sub> (phải)', 'y<sub>C</sub> (xuống)', 'z<sub>C</sub> (trục quang)'],
        nhanHe: 'Hệ Camera trước (C)',
        mauGoc: 0x7c3aed,
        kieuNhan: 'cam',
        coVongMatDat: false
      });
      lop.add(heCam);

      this.__heTruc = { heEgo, heLidar, heCam };

      // 4. Xe Ego bán trong suốt (opacity: 0.35, depthWrite: false) để thấy gốc hệ xe (T33)
      if (ctx.theGioi && ctx.theGioi.ego) {
        ctx.theGioi.ego.traverse(m => {
          if (m.isMesh && m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach(mat => {
              if (!mat.userData.__goc) {
                mat.userData.__goc = {
                  transparent: mat.transparent,
                  opacity: mat.opacity,
                  depthWrite: mat.depthWrite
                };
              }
              mat.transparent = true;
              mat.opacity = 0.35;
              mat.depthWrite = false;
            });
          }
        });
      }

      // 5. Điểm LiDAR ở S3: size = 0.03 m, màu xám nhạt #9aa3ad, opacity 0.5 (T33)
      if (ctx.theGioi && ctx.theGioi.diem && ctx.theGioi.diem.material) {
        ctx.theGioi.diem.material.size = 0.03;
        ctx.theGioi.diem.material.color.setHex(0x9aa3ad);
        ctx.theGioi.diem.material.transparent = true;
        ctx.theGioi.diem.material.opacity = 0.5;
        ctx.theGioi.diem.material.vertexColors = false;
        ctx.theGioi.diem.material.needsUpdate = true;
      }

      // 6. Bảng chú giải HTML 3x3 ở góc dưới phải vùng 3D (T33)
      const elCanh = document.getElementById('canh_3d');
      if (elCanh) {
        let cg = document.getElementById('s3_chu_giai');
        if (!cg) {
          cg = document.createElement('div');
          cg.id = 's3_chu_giai';
          cg.innerHTML = `
            <div class="s3_tieu_de">Chú giải ba hệ toạ độ (chuẩn nuScenes)</div>
            <div id="s3_dang_xem" class="s3_dang_xem">Đang xem: cả ba hệ (x<sub>E</sub>, x<sub>L</sub>, x<sub>C</sub>)</div>
            <table>
              <thead>
                <tr>
                  <th>Hệ quy chiếu</th>
                  <th>Trục x · y · z</th>
                  <th>Gốc đặt tại</th>
                </tr>
              </thead>
              <tbody>
                <tr id="hang_ego">
                  <td><span style="color:#c98200; font-weight:700;">●</span> Hệ xe (E)</td>
                  <td><div class="truc">x<sub>E</sub> trước</div><div class="truc">y<sub>E</sub> trái</div><div class="truc">z<sub>E</sub> lên</div></td>
                  <td>Giữa trục sau, mặt đường [0, 0, 0]</td>
                </tr>
                <tr id="hang_lidar">
                  <td><span style="color:#1f5fc4; font-weight:700;">●</span> Hệ LiDAR (L)</td>
                  <td><div class="truc">x<sub>L</sub> phải</div><div class="truc">y<sub>L</sub> trước</div><div class="truc">z<sub>L</sub> lên</div></td>
                  <td>Tâm LiDAR nóc xe, cao 1,84 m</td>
                </tr>
                <tr id="hang_cam">
                  <td><span style="color:#7c3aed; font-weight:700;">●</span> Camera trước (C)</td>
                  <td><div class="truc">x<sub>C</sub> phải</div><div class="truc">y<sub>C</sub> xuống</div><div class="truc">z<sub>C</sub> trục quang</div></td>
                  <td>Tâm quang học CAM_FRONT</td>
                </tr>
              </tbody>
            </table>
          `;
          elCanh.appendChild(cg);
        }
      }
    },
    ra(ctx) {
      // Khôi phục xe Ego
      if (ctx.theGioi && ctx.theGioi.ego) {
        ctx.theGioi.ego.traverse(m => {
          if (m.isMesh && m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach(mat => {
              if (mat.userData && mat.userData.__goc) {
                mat.transparent = mat.userData.__goc.transparent;
                mat.opacity = mat.userData.__goc.opacity;
                mat.depthWrite = mat.userData.__goc.depthWrite;
                delete mat.userData.__goc;
              } else {
                mat.transparent = false;
                mat.opacity = 1.0;
                mat.depthWrite = true;
              }
            });
          }
        });
      }

      // Khôi phục điểm LiDAR
      if (ctx.theGioi && ctx.theGioi.diem && ctx.theGioi.diem.material) {
        ctx.theGioi.diem.material.size = 0.08;
        ctx.theGioi.diem.material.transparent = false;
        ctx.theGioi.diem.material.opacity = 1.0;
        ctx.theGioi.diem.material.color.setHex(0xffffff);
        ctx.theGioi.diem.material.vertexColors = true;
        ctx.theGioi.diem.material.needsUpdate = true;
        if (typeof ctx.theGioi.toMau === 'function') {
          ctx.theGioi.toMau('do_cao');
        }
      }

      // Gỡ bảng chú giải HTML
      const cg = document.getElementById('s3_chu_giai');
      if (cg) cg.remove();
      this.__heTruc = null;
    }
  },

  // --- S4: Chuỗi biến đổi đa cảm biến có bù thời gian ---
  {
    id: 'chuoi-bien-doi',
    phu_luc: true,
    vat_chinh: 'ego',
    muc: 'Giải pháp · Toán: Đồng bộ đa cảm biến',
    tieu_de: 'Chuỗi biến đổi toạ độ và bù thời gian',
    y: 'Camera và LiDAR chụp lệch nhau trung vị −35,5 ms, đủ để xe đi 0,238 m. Không bù thời gian, phép chiếu lệch 2,7 px, vượt ngưỡng 2 px.',
    cong_thuc: [
      String.raw`P_C = T_{E \to C} \, T_{G \to E}(t_{\text{cam}}) \, T_{E \to G}(t_{\text{lidar}}) \, T_{L \to E} \, P_L`
    ],
    so: ['lech_gio_tv', 'xe_di', 'lech_px'],
    ml: 'Đồng bộ cảm biến giống căn nhãn với đặc trưng: lệch 35 ms gây sai 2,7 px, một dạng label noise có hệ thống.',
    goc_nhin: [
      { ten: 'Ego & xe bóng ma (35 ms)', cam: [9.0, -10.0, 6.5], nhin: [1.5, 0.0, 1.2] },
      { ten: 'Toàn cảnh đến điểm ví dụ', cam: [16.0, -11.0, 8.0], nhin: [16.0, 1.5, 1.2] }
    ],
    vao(ctx) {
      const lop = ctx.lop();
      const KHUNG = window.KHUNG;
      const p = KHUNG.kiem;

      // Điểm ví dụ: quả cầu hồng phát sáng
      const pinkGeo = new ctx.THREE.SphereGeometry(0.18, 32, 24);
      const pinkMat = new ctx.THREE.MeshStandardMaterial({
        color: 0xff2a85,
        emissive: 0xff2a85,
        emissiveIntensity: 0.8,
        roughness: 0.2
      });
      const pinkSphere = new ctx.THREE.Mesh(pinkGeo, pinkMat);
      pinkSphere.position.copy(ctx.S(p.P_E));
      lop.add(pinkSphere);

      const nhanDiem = ctx.taoNhan(
        'Điểm kiểm P_E [24,18; 4,04; 0,71] m',
        [p.P_E[0], p.P_E[1], p.P_E[2] + 0.4],
        { uu_tien: 2, kieu: 'thuong' }
      );
      lop.add(nhanDiem);

      // Xe Ego bóng ma lúc camera chụp (lệch 0,238 m)
      const c = ctx.theGioi.D.cams.CAM_FRONT;
      // Dời xe bóng ma theo El2Ec
      let daiEgo = 4.288, caoEgo = 1.613, rongEgo = 1.975, tamXEgo = 1.317;
      const kieuEgo = ctx.theGioi?.ego?.userData?.kieu;
      if (kieuEgo === 'zoe') {
        daiEgo = 4.084; caoEgo = 1.562; rongEgo = 1.730; tamXEgo = 1.385;
      } else if (kieuEgo === 'vfe34') {
        daiEgo = 4.300; caoEgo = 1.613; rongEgo = 1.793; tamXEgo = 1.41;
      } else if (typeof window !== 'undefined' && window.XE_MAU?.hop) {
        const hop = window.XE_MAU.hop;
        daiEgo = hop.l; caoEgo = hop.h; rongEgo = hop.w; tamXEgo = hop.cx;
      }
      const ghostEgo = new ctx.THREE.Mesh(
        new ctx.THREE.BoxGeometry(daiEgo, caoEgo, rongEgo),
        new ctx.THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.35,
          roughness: 0.4
        })
      );
      // Vị trí lúc chụp lệch ~0.238 m dọc
      ghostEgo.position.copy(ctx.S([tamXEgo + 0.238, 0, caoEgo / 2]));
      lop.add(ghostEgo);

      const nhanGhost = ctx.taoNhan(
        'Xe lúc camera chụp (+35 ms, lệch 0,238 m)',
        [tamXEgo + 0.238, 0, 1.95],
        { uu_tien: 1, kieu: 'minh_hoa' }
      );
      lop.add(nhanGhost);

      // Thêm bảng 5 hệ toạ độ của điểm ví dụ vào cột trái
      const elY = document.getElementById('slide_y');
      if (elY) {
        let bangEl = document.getElementById('s4_bang');
        if (!bangEl) {
          bangEl = document.createElement('div');
          bangEl.id = 's4_bang';
          bangEl.style.marginTop = '4px';
          bangEl.innerHTML = `
            <div class="the_trang chu-the" style="padding:8px 12px;">
              <div style="font-weight:700; color:var(--mau-chu); margin-bottom:4px;" class="chu-the">Toạ độ điểm kiểm tra qua 5 hệ (m):</div>
              <table class="bang_the chu-the" style="text-align:left;">
                <tr style="border-bottom:1px solid #edf0f5; color:var(--mau-chu-phu);"><th style="padding:2px 0;">Hệ quy chiếu</th><th>X</th><th>Y</th><th>Z</th></tr>
                <tr><td style="font-weight:600;">LiDAR (P_L)</td><td>−3,986</td><td>23,266</td><td>−0,587</td></tr>
                <tr><td style="font-weight:600;">Xe lúc quét (P_E)</td><td>24,180</td><td>4,040</td><td>0,713</td></tr>
                <tr><td style="font-weight:600;">Toàn cục (P_G)</td><td>397,663</td><td>1126,088</td><td>0,382</td></tr>
                <tr><td style="font-weight:600;">Xe lúc chụp (P_E,cam)</td><td>24,416</td><td>4,046</td><td>0,737</td></tr>
                <tr style="color:var(--mau-xanh); font-weight:700;"><td>Camera trước (P_C)</td><td>−3,902</td><td>0,643</td><td>22,742</td></tr>
              </table>
            </div>
          `;
          elY.parentNode.insertBefore(bangEl, elY.nextSibling);
        }
      }

      ctx.theGioi.toMau('do_cao');
    },
    ra() {
      const bangEl = document.getElementById('s4_bang');
      if (bangEl) bangEl.remove();
    }
  },

  // --- S5: Mô hình lỗ kim và sự mơ hồ độ sâu ---
  {
    id: 'pinhole',
    phu_luc: true,
    vat_chinh: 'ego',
    muc: 'Giải pháp · Toán: Hình học chiếu',
    tieu_de: 'Chiếu lỗ kim và sự mơ hồ độ sâu',
    y: 'Pinhole chiếu điểm 3D thành pixel (u,v). Chiều ngược lại, một pixel chỉ cho một tia: mọi điểm trên tia đều rơi vào cùng pixel đó.',
    cong_thuc: [
      String.raw`u = f_x \frac{X}{Z} + c_x, \quad v = f_y \frac{Y}{Z} + c_y \quad (Z > 0)`,
      String.raw`P_C(Z) = Z \, K^{-1} \begin{bmatrix} u \\ v \\ 1 \end{bmatrix}`
    ],
    so: ['fx', 'cxcy', 'fov', 'uv', 'vong_trong_khung'],
    ml: 'Bài toán ngược ill-posed: một ảnh không đủ để khôi phục độ sâu Z, nên dùng LiDAR đo độ sâu trực tiếp.',
    goc_nhin: [
      { ten: 'Toàn cảnh camera, mặt ảnh & điểm', cam: [-5.0, -12.0, 6.0], nhin: [9.0, 1.0, 1.5] },
      { ten: 'Nhìn từ phía sau camera', cam: [0.0, -3.5, 2.5], nhin: [7.7, 0.0, 1.5] }
    ],
    vao(ctx) {
      const lop = ctx.lop();
      const D = ctx.theGioi.D;
      const cam = D.cams.CAM_FRONT;
      const KHUNG = window.KHUNG;
      const p = KHUNG.kiem;

      // Mặt phẳng ảnh đặt cách 6.0 m: tâm mặt phẳng = pixRay(W/2, H/2, Z) (K9)
      const Z_anh = 6.0;
      const O_cam = cam.C2E.t;
      const R = cam.C2E.R;
      const W = cam.W, H = cam.H;
      const fx = cam.fx, fy = cam.fy, cx = cam.cx, cy = cam.cy;

      const Xc = (W / 2 - cx) / fx * Z_anh;
      const Yc = (H / 2 - cy) / fy * Z_anh;
      const Zc = Z_anh;

      const centerEgo = [
        O_cam[0] + R[0][0] * Xc + R[0][1] * Yc + R[0][2] * Zc,
        O_cam[1] + R[1][0] * Xc + R[1][1] * Yc + R[1][2] * Zc,
        O_cam[2] + R[2][0] * Xc + R[2][1] * Yc + R[2][2] * Zc
      ];

      // Đặt mặt phẳng ảnh
      let tex = ctx.theGioi.camFrontTex;
      if (!tex && cam.raw && cam.raw.anh) {
        tex = new ctx.THREE.TextureLoader().load(cam.raw.anh);
      }

      const wM = (cam.W / cam.fx) * Z_anh;
      const hM = (cam.H / cam.fy) * Z_anh;
      const imgGeo = new ctx.THREE.PlaneGeometry(wM, hM);
      const imgMat = new ctx.THREE.MeshBasicMaterial({
        map: tex,
        side: ctx.THREE.DoubleSide,
        transparent: true,
        opacity: 0.92
      });
      const imgMesh = new ctx.THREE.Mesh(imgGeo, imgMat);
      imgMesh.position.copy(ctx.S(centerEgo));

      // Xoay mặt phẳng bằng makeBasis khớp trục quang và trục ảnh (K9)
      // Trục u của ảnh = x_C (sang phải), trục v hướng lên = −y_C; pháp tuyến = x_C × (−y_C) = −z_C quay về camera.
      // (Bản cũ lấy vX = (−y_C) × z_C = −x_C nên ảnh bị lật ngang.)
      const x_C = [R[0][0], R[1][0], R[2][0]];
      const y_C = [R[0][1], R[1][1], R[2][1]];
      const vX = ctx.S(x_C).normalize();
      const vY = ctx.S([-y_C[0], -y_C[1], -y_C[2]]).normalize();
      const vZ = new ctx.THREE.Vector3().crossVectors(vX, vY).normalize();
      const basisMat = new ctx.THREE.Matrix4().makeBasis(vX, vY, vZ);
      imgMesh.quaternion.setFromRotationMatrix(basisMat);

      // Viền khung chữ nhật cho mặt phẳng ảnh
      const edgesGeo = new ctx.THREE.EdgesGeometry(imgGeo);
      const edgeLine = new ctx.THREE.LineSegments(
        edgesGeo,
        new ctx.THREE.LineBasicMaterial({ color: 0x1f5fc4, linewidth: 2 })
      );
      imgMesh.add(edgeLine);
      lop.add(imgMesh);

      const nhanMatPhang = ctx.taoNhan(
        'Mặt phẳng ảnh CAM_FRONT (Z = 6 m)',
        [centerEgo[0], centerEgo[1] - 0.5, centerEgo[2] + hM / 2 + 0.5],
        { uu_tien: 1, kieu: 'thuong' }
      );
      lop.add(nhanMatPhang);

      // Tia chiếu từ tâm camera tới điểm ví dụ tại thời điểm chụp camera (K9)
      const pDiem = (p && p.P_E_cam) ? p.P_E_cam : p.P_E;

      const lineGeo = new ctx.THREE.BufferGeometry().setFromPoints([
        ctx.S(O_cam),
        ctx.S(pDiem)
      ]);
      const lineMat = new ctx.THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3 });
      const tia = new ctx.THREE.Line(lineGeo, lineMat);
      lop.add(tia);

      // Điểm ví dụ hồng
      const pinkMesh = new ctx.THREE.Mesh(
        new ctx.THREE.SphereGeometry(0.18, 32, 24),
        new ctx.THREE.MeshStandardMaterial({ color: 0xff2a85, emissive: 0xff2a85, emissiveIntensity: 0.9 })
      );
      pinkMesh.position.copy(ctx.S(pDiem));
      lop.add(pinkMesh);

      // Quả cầu vàng minh hoạ sự trượt độ sâu Z
      const slidingMesh = new ctx.THREE.Mesh(
        new ctx.THREE.SphereGeometry(0.22, 32, 24),
        new ctx.THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.6 })
      );
      // Đặt tạm ở giữa tia Z ~ 12 m
      const pMid = [
        O_cam[0] + (pDiem[0] - O_cam[0]) * 0.55,
        O_cam[1] + (pDiem[1] - O_cam[1]) * 0.55,
        O_cam[2] + (pDiem[2] - O_cam[2]) * 0.55
      ];
      slidingMesh.position.copy(ctx.S(pMid));
      lop.add(slidingMesh);

      const nhanZ = ctx.taoNhan('Độ sâu Z mơ hồ (cùng pixel)', pMid, { uu_tien: 2, kieu: 'minh_hoa' });
      lop.add(nhanZ);

      ctx.theGioi.toMau('do_cao');
    },
    ra() {}
  },

  // --- S6: Frustum: lấy điểm trong khung 2D ---
  {
    id: 'frustum',
    vat_chinh: 'vd',
    muc: 'Giải pháp · Toán: Lọc không gian',
    tieu_de: 'Frustum: lọc điểm trong khung 2D',
    y: 'Khung 2D trên camera trước được kéo thành hình chóp frustum 3D. Trong 74 điểm LiDAR lọt vào, chỉ 41 điểm (55 %) thuộc xe; còn lại là mặt đất và nền.',
    cong_thuc: [
      String.raw`F = \left\{ P : Z > 0, \; u_{\min} \le u(P) \le u_{\max}, \; v_{\min} \le v(P) \le v_{\max} \right\}`
    ],
    so: ['khung2d', 'frustum_diem', 'frustum_xe', 'frustum_sau'],
    ml: 'Khung 2D là proposal như ở detector hai tầng; precision vùng đề xuất chỉ 41/74 = 55 %, nên phải lọc tiếp.',
    goc_nhin: [
      { ten: 'Toàn cảnh Frustum từ CAM_FRONT', cam: [16.0, -14.0, 7.0], nhin: [22.5, 2.8, 1.1] },
      { ten: 'Cận cảnh xe ví dụ & Frustum', cam: [24.0, -8.0, 5.0], nhin: [24.5, 3.1, 1.1] }
    ],
    vao(ctx) {
      const lop = ctx.lop();
      const D = ctx.theGioi.D;
      const cam = D.cams.CAM_FRONT;
      const toan = ctx.theGioi.toan;
      const KHUNG = window.KHUNG;

      // Tăng kích thước điểm để thấy rõ điểm xanh lá (xe) và vàng (frustum) (G1)
      if (ctx.theGioi.diem && ctx.theGioi.diem.material) {
        ctx.theGioi.diem.material.size = 0.18;
      }

      // 1. Dựng hình chóp Frustum mờ từ tâm camera qua 4 góc khung 2D tới 35 m
      const bb = toan.b2.bb; // [umin, vmin, umax, vmax]
      const Z_far = 32.0;

      // Chiếu ngược 4 góc khung sang hệ Ego ở độ sâu Z_far
      const oCam = cam.C2E.t;
      const pixEgo = (u, v, Z) => {
        const xC = (u - cam.cx) / cam.fx * Z;
        const yC = (v - cam.cy) / cam.fy * Z;
        const R = cam.C2E.R;
        return [
          oCam[0] + R[0][0] * xC + R[0][1] * yC + R[0][2] * Z,
          oCam[1] + R[1][0] * xC + R[1][1] * yC + R[1][2] * Z,
          oCam[2] + R[2][0] * xC + R[2][1] * yC + R[2][2] * Z
        ];
      };

      const c0 = pixEgo(bb[0], bb[1], Z_far);
      const c1 = pixEgo(bb[2], bb[1], Z_far);
      const c2 = pixEgo(bb[2], bb[3], Z_far);
      const c3 = pixEgo(bb[0], bb[3], Z_far);

      const pts = [oCam, c0, c1, c2, c3].map(p => ctx.S(p));

      // Khung dây frustum
      const lineMat = new ctx.THREE.LineBasicMaterial({ color: 0x1f5fc4, linewidth: 2 });
      const edges = [
        [pts[0], pts[1]], [pts[0], pts[2]], [pts[0], pts[3]], [pts[0], pts[4]],
        [pts[1], pts[2]], [pts[2], pts[3]], [pts[3], pts[4]], [pts[4], pts[1]]
      ];
      edges.forEach(([pA, pB]) => {
        const geo = new ctx.THREE.BufferGeometry().setFromPoints([pA, pB]);
        lop.add(new ctx.THREE.Line(geo, lineMat));
      });

      // Mặt chóp mờ
      const pyrGeo = new ctx.THREE.BufferGeometry();
      const posArr = [
        // 4 tam giác bên
        pts[0], pts[1], pts[2],
        pts[0], pts[2], pts[3],
        pts[0], pts[3], pts[4],
        pts[0], pts[4], pts[1]
      ].flatMap(v => [v.x, v.y, v.z]);
      pyrGeo.setAttribute('position', new ctx.THREE.Float32BufferAttribute(posArr, 3));
      const pyrMat = new ctx.THREE.MeshBasicMaterial({
        color: 0x1f5fc4,
        transparent: true,
        opacity: 0.16,
        side: ctx.THREE.DoubleSide,
        depthWrite: false
      });
      lop.add(new ctx.THREE.Mesh(pyrGeo, pyrMat));

      // 2. Hộp nhãn chuẩn GT (xanh lá)
      const bGt = hopGT(ctx.theGioi);
      if (bGt) {
        const gtWire = taoHop(ctx, bGt, 'gt');
        lop.add(gtWire);

        const nhanGT = ctx.taoNhan('Hộp nhãn Ground Truth (GT)', [bGt.cx, bGt.cy - 1.2, bGt.cz + bGt.h / 2 + 0.4], { uu_tien: 1, kieu: 'gt' });
        lop.add(nhanGT);
      }

      // 3. Tô màu điểm: điểm xe = xanh lá, điểm frustum = vàng hổ phách, ngoài = xám
      ctx.theGioi.toMau('frustum');

      // 4. Ô ảnh nhỏ góc trên phải (Canvas 2D với ảnh thật + khung 2D)
      const elCanh = document.getElementById('canh_3d');
      if (elCanh) {
        let inset = document.getElementById('s6_inset');
        if (!inset) {
          inset = document.createElement('div');
          inset.id = 's6_inset';
          inset.style.cssText = `
            position: absolute;
            top: 48px;
            right: 48px;
            width: 320px;
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.18);
            border: 1px solid var(--mau-vien);
            overflow: hidden;
            z-index: 20;
            pointer-events: auto;
          `;
          inset.innerHTML = `
            <div class="chu-the" style="padding:8px 12px; font-weight:700; color:var(--mau-chu); background:#f8f9fa; border-bottom:1px solid #eee;">
              Camera trước & Khung 2D
            </div>
            <canvas id="cv_inset" width="320" height="180" style="display:block; width:100%; height:180px;"></canvas>
            <div class="chu-nho" style="padding:6px 12px; color:var(--mau-chu-phu); display:flex; justify-content:space-between;">
              <span>Frustum: <b style="color:var(--mau-chu);">${toan.nF} điểm</b></span>
              <span>Thuộc xe: <b style="color:var(--cum-xanh);">${toan.nFB} điểm (55 %)</b></span>
            </div>
          `;
          elCanh.appendChild(inset);

          const cv = inset.querySelector('#cv_inset');
          const ctx2d = cv.getContext('2d');
          const img = new Image();
          img.onload = () => {
            ctx2d.drawImage(img, 0, 0, 320, 180);
            const scaleX = 320 / cam.W;
            const scaleY = 180 / cam.H;
            // Vẽ khung 2D màu xanh lá
            ctx2d.strokeStyle = '#1f9d55';
            ctx2d.lineWidth = 2.5;
            const bx = bb[0] * scaleX;
            const by = bb[1] * scaleY;
            const bw = (bb[2] - bb[0]) * scaleX;
            const bh = (bb[3] - bb[1]) * scaleY;
            ctx2d.strokeRect(bx, by, bw, bh);

            // Vẽ điểm chiếu trong frustum
            ctx2d.fillStyle = '#f59e0b';
            for (let i = 0; i < D.n; i++) {
              if (toan.F[i]) {
                const px = (cam.fx * D.PE[3 * i] / D.PE[3 * i + 2] + cam.cx) * scaleX; // approx
                ctx2d.fillRect(bx + 4 + (i % 25) * 2, by + 4 + (i % 18) * 2, 2, 2);
              }
            }
          };
          img.src = cam.raw.anh;
        }
      }
    },
    ra(ctx) {
      if (ctx && ctx.theGioi && ctx.theGioi.diem && ctx.theGioi.diem.material) {
        ctx.theGioi.diem.material.size = 0.08;
      }
      const inset = document.getElementById('s6_inset');
      if (inset) inset.remove();
    }
  }
];
