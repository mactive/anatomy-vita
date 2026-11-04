# agent.md — Anatomy Vita 迭代记录

> 给接手这个项目的 agent（以及未来的自己）看的工作手册：项目是什么、内核怎么拆、约定是什么、做到哪了、下一步做什么。
> 每次迭代结束，在文末「迭代日志」追加一条。

---

## 0. 一句话

Anatomy Vita = 在 [Anatomy skill](https://github.com/wheresryan22/anatomy)（Ryan · @wheresryan22，MIT）之上加一层 **bio 层**，
把「发明一台真实的机器，让它的运动本身就是概念」这条信条，从机械推广到**生命**：分子 → 细胞 → 组织 → 器官 → 系统 → 星球。
产物是一个静态网站（`site/`），每张图是一个独立、可交互的等轴测 SVG 页面。

---

## 1. 原版 Anatomy 内核拆解（读 SKILL.md 后的结论）

三层：**信条 → 绘图语法 → 可验证工具链**。

### 1.1 信条
- **The object is the explanation.** 不画方框、箭头、浮动标签；发明一台映射一一对应的真实机器。
- **Truth first.** 一个小而纯的模型同时驱动运动、读数、图注、无障碍文本。图上每个数字都是真的。
- **Every creation is highly detailed.** 1× 看是一台清楚的机器，4× 看每个角落都有真实零件。
- 两种失败：太抽象（漂浮的板子+标签）/ 太平淡（一块大板几条线）。

### 1.2 十步流程
1. 定尺寸：Figure 40–80 零件 / Hero 80–150 / Epic（先问用户）
2. Truth first：收集真实数值，写成纯模型
3. 发明物体：一句话说清「什么在动、这个运动代表什么」
4. 零件清单 ≥40：底座 / 结构 / 机构 / 控件 / 唯一被点亮的主体
5. 规划世界：世界单位≈真实 1px，x/y 地面 z 向上，方位角 45°（35–60°），仰角 30°，`fitProjection`
6. 一次性生成静态几何；动件用 `translateAlong`；只有形变的部件逐帧重建
7. 画家算法：从后往前、从下往上；`depthOf` 排序；包裹体拆前后两半；复杂时用 `audit.mjs` 证明
8. 装卡片：Fig n / 标题 / 交互提示 / 实时读数；图例 + 真实图注在卡片下
9. 让它活：指数跟随或真实弹簧、闲置巡演、指针+键盘、离屏暂停、减少动态时静止
10. 像评论家一样验证：截图、驱动、line-ends 检查、4× 特写

### 1.3 绘图语法（craft rules）
- 实心体不是线框；kit 负责四朝向色调 + 顶面
- 色调层级：底座 `lo`、结构 `mid`、主体 `hi`、**恰好一个** `lit` 强调；颜色只用在颜色本身是主题时
- 细节有出处：0.4–1.6 倒角、内缩 3–5 的槽、0.4–0.55 的螺丝点、滚花、4–5 单位刻度
- 线必须「落地」：每条线终止于面、线或端点圆点
- 管线不穿模；交叉按真实深度排序；曲面平滑着色（无色阶台阶）
- 纹理在真实边缘结束或渐隐

### 1.4 工具链（kit/，原样复用，勿改）
| 文件 | 作用 |
|---|---|
| `kit/iso-kit.mjs` | 相机、实心体、零件库、SVG 渲染器、卡片/页面、CSS |
| `kit/lathe.mjs` | 任意轴回转体、`sphereOf`、`prismOf`（任意轴棱柱）、`fillet`、`resample` |
| `kit/tube.mjs` | 管/缆切成可排序的段：`tubePieces` + `tubeSvg` |
| `kit/audit.mjs` | 几何证明（间隙、端点、深度序……）|
| `kit/gl.mjs` | WebGL 层（火、水、光） |
| `kit/turn*.mjs` | 3D 模式（beta）|
| `scripts/*` | 截图、驱动、线端检查、打印、发布 |

---

## 2. Vita 新增了什么（bio 层，`bio/bio.mjs`）

### 2.1 生命法则（写在首页第二节）
1. **标尺即真相**：每个底座有校准刻度尺，标真实尺寸（nm / µm / mm / cm）
2. **染色代替配色**：颜色只来自真实染料/荧光蛋白（DAPI 蓝、GFP 绿、RFP 红……）
3. **时间要承认被改写**：读数写明「放慢 N×」或「加速 N×」
4. **粒子守恒**：离子、质子、dNTP 可数且守恒
5. **拓扑可以变**：一个细胞真的变成两个（截面并集轮廓）
6. **标本，而非卡通**：细胞以上的对象放在玻片、支架、教学模型底座上
7. **隐喻需要声明**：只有无实体过程（分化景观、反馈）才发明机器，并在图注里说明

### 2.2 API
| API | 作用 |
|---|---|
| `liveScript()` | 把 iso-kit / lathe / tube 内联为页面里的 `K` / `G` / `T`，几何可逐帧重建 |
| `rng(seed)` / `RNG_SRC` | 种子化变异：没有两个细胞一样，但每次构建都一样 |
| `STAINS` + `stain(name, svg, k)` | 染色：`color-mix` 把四个色调往染料色推，保留明暗 |
| `shellOf(c, r, P)` | 前后两半的半透明膜壳（back 先画，内容，front 后画） |
| `plinth()` / `standRod()` | 标本底座（脚、螺丝、刻度尺、铭牌）/ 支架杆 |
| `byDepth()` | 粒子/细胞的画家排序 |
| `vitaPage()` | 页面外壳：导航、卡片、事实栏、`?embed` 嵌入模式 |
| `scene(P)` *(v2)* | 深度收集器：`put(depth, html)` / `tube(...)` / `svg()` |
| `LOOP_SRC` *(v2)* | 共享运行时：`vitaLoop({...})` 统一 rAF、离屏暂停、闲置巡演、指针/键盘、减少动态 |

---

## 3. 约定

- 目录：`demos/<slug>/build.mjs` → 写 `site/demos/NN-name.html`；`node build-index.mjs` → `site/index.html`
- 每个 build 文件头注释三行：对象是什么 / 什么在动 / 运动代表什么
- 图页：`vitaPage({ n, title, zh, en, body, script, facts })`；`facts` 为 `[值, 中文说明, English label]`，必须是真实数值；值本身不要含中文
- 卡片文字（标题、提示、读数、图注）用英文（沿用原版排版）；站点外壳、首页长文、副标题、事实栏中英双语，用 `t(zh, en)` 写
- 图注必须包含：比例尺说明（1 tick = ?）、关键真实数值、时间缩放倍数
- 不改 `kit/`、`scripts/`（上游代码）；所有扩展进 `bio/`
- 新 demo 登记在 `build-index.mjs` 的 `demos` 数组（第 7 列填文件名即「已上线」）

### 构建与验证
```bash
for d in demos/*/; do node $d/build.mjs; done && node build-index.mjs
# 截图（云端工作区用 Playwright）：桌面 820 宽、手机 390 宽、动画中间帧各一张，逐张看
```

### 部署
`/opt/homebrew/bin/wrangler deploy`（`wrangler.jsonc`：Workers 静态资源，目录 `site/`）→ https://anatomy-vita.mactive.workers.dev/

`site/` 是纯静态目录（index + demos/*.html，每页自包含）。也可：
- 发布为 claude.ai Artifact（多文件），或
- `npx vercel site` / `npx netlify deploy --dir site` / GitHub Pages

---

## 4. 路线图（22 张图，6 批）

| # | 主题 | 尺度 | 发明的物体 | 批 | 状态 |
|---|---|---|---|---|---|
| 01 | DNA 复制叉 | 2 nm | 三支架上的双螺旋拉链机 | 1 | ✅ |
| 02 | ATP 合酶 | 10 nm | 膜片上的水车，c8 转子 | 1 | ✅ |
| 03 | 有丝分裂 | 20 µm | 玻片上一个细胞一分为二 | 1 | ✅ |
| 04 | 动作电位 | 1 mm | GFP 神经元 + 记录放大器 | 1 | ✅ |
| 05 | 核糖体翻译 | 21 nm | 读带机：GFP 基因磁带，齿形配对 | 2 | ✅ v2 |
| 06 | 驱动蛋白行走 | 8 nm | 微管轨道上的双足步行器 + 光镊负载 | 2 | ✅ v2 |
| 07 | 钠钾泵 | 10 nm | 双门气闸：3 Na⁺ 出、2 K⁺ 进 | 2 | ✅ v2 |
| 08 | 线粒体 | 1 µm | 剖开的线粒体教学模型 | 2 | ✅ v2 |
| 09 | 卵裂与囊胚 | 100 µm | 透明带里的 1→2→…→囊胚 | 3 | |
| 10 | 细胞分化 | — | Waddington 景观（声明隐喻） | 3 | |
| 11 | 突触传递 | 1 µm | 囊泡停靠、融合、受体开门 | 3 | |
| 12 | 肌节收缩 | 2.5 µm | 粗细丝滑行 | 3 | |
| 13 | 膝关节 | 10 cm | 教学骨骼模型 0–135° | 4 | |
| 14 | 心脏 | 12 cm | 四腔剖面 + Wiggers 曲线 | 4 | |
| 15 | 肺泡 | 200 µm | 气囊与毛细血管网 | 4 | |
| 16 | 肾单位 | 5 cm | 过滤与回收管路 | 4 | |
| 17 | 反射弧/神经网络 | 1 m | 膝跳反射时序 | 5 | |
| 18 | 循环系统 | 1.7 m | 双回路管网 | 5 | |
| 19 | 免疫应答 | 10 µm | 克隆选择 | 5 | |
| 20 | 人体系统总装 | 1.7 m | Epic（先确认） | 5 | |
| 21 | 碳循环 | 10 km | 星球尺度三管路 | 6 | |
| 22 | Daisyworld | 12,700 km | 雏菊调温反馈机器 | 6 | |

---

## 5. 已知问题 / 待办

- 每页内联整个 kit（K/G/T），单页 170–420 KB；可接受，后续可抽成共享 `site/kit.js`（需改 `vitaPage`）
- 03 有丝分裂细节偏少（细胞内只有染色体和纺锤体），可补：中心体、线粒体、内质网碎片、细胞骨架
- 尚未跑原版 `audit.mjs` / `lines.mjs`（需要 Chrome 端口脚本），目前靠截图人工检查
- 第 3 批起需要新原语：**细胞团堆积**（种子化球堆积 + 接触面压扁）、**可形变轮廓**（2D 截面并集已在 03 局部实现，应提进 bio）

---

## 6. 迭代日志

### v1（上一会话）
- 移植 kit/scripts；写 bio 层（stain、shellOf、plinth、standRod、liveScript、vitaPage）
- 第 1 批：01 DNA、02 ATP 合酶、03 有丝分裂、04 神经元；首页长文（内核拆解 + 生命法则 + 22 图路线图）

### v2（2026-11-04）
- 新建本文件 agent.md（内核拆解、约定、路线图、日志）
- bio 层加深：`scene(P)` 深度收集器；`LOOP_SRC` → `vitaLoop()` 共享运行时（离屏暂停 / 闲置巡演 / 指针·点击·键盘 / 减少动态）+ `vitaSay()`；
  新染料 `na` `k` `trna` `cyt`；图例色块可直接用染料名（`mark: "na"`）；新 CSS `.bio-lumen` `.bio-cavity` `.bio-rim`
- 第 2 批上线（均 Figure 级，Playwright 截图 820/390 宽 + 4× 特写检查，无控制台错误）：
  - **05 核糖体**：读带机。mRNA 齿带（嘌呤高齿/嘧啶矮齿，tRNA 反密码子齿互补才合缝）；真实 GFP 基因（238 aa + UAA），
    每个氨基酸取一个大肠杆菌常用密码子；1/3 概率先来一个近同源 tRNA 被弹回；EF-Tu 球、释放因子；肽链从出口隧道长出。
    交互：悬停 = 带电 tRNA 供给 → 2–20 aa/s。时间放慢 40×。mRNA 画成 ~3× 拉伸（图注已声明）
  - **06 驱动蛋白**：微管（13 原纤维、8 nm 二聚体缝）架在两个托架上；双头手拉手走顶上一根原纤维；颈连接体是唯一点亮件（动力冲程）；
    前方导轨上的力钳小车 + 弹簧提供恒定负载。v(F) = 800·(1−(F/6.2)^1.4) nm/s，失速后缓慢后退。放慢 60×
  - **07 钠钾泵**：膜片缺口里的双门气闸（两门永不同时开，门在导轨上滑动）；Post–Albers 六态；离子守恒（Na⁺ 25、K⁺ 25 个）；
    两个漏通道按梯度漏回；点击 = 乌本苷卡死 E2-P → 梯度约 35 s 内消散（已用 Playwright 验证 Na⁺in 2→12、K⁺in 20→13）。放慢 600×
  - **08 线粒体**：纵剖教学模型（下半壳 = 整个胶囊 lathe + 「上弧以下」clipPath；腔内容再裁到内膜体育场轮廓）；
    双膜切面、15 片板状嵴（`G.prismOf` 半圆片）、嵴缘 ATP 合酶点列、mtDNA 拟核、基质颗粒；
    悬停 = ADP 需求：state 4（Δψ≈180 mV）↔ state 3（O₂ ×5–8，Δψ≈150 mV），ATP/O = 2.5
- 首页：第 2 批嵌图、路线表状态、bio 工具层表加入 v2 API
- 站点发布为 claude.ai Artifact（多文件：index + demos/*.html）：https://claude.ai/artifact/U5Qcv6dRxevqZK2SyrFiam
- 嵌入模式改为同时支持 `?embed` 和 `#embed`（artifact 只透传 hash）；首页 iframe 用 `#embed`

### v3（2026-11-04）
- 双语：bio 新增 `t(zh, en)`、`LANG_SRC`（`?lang=`/`#lang=` → localStorage `vita-lang` → 浏览器语言）、`LANG_CSS`、`LANG_BUTTON`；
  `html[data-lang]` 决定显示哪种；首页切换时同步嵌入的 iframe（storage 事件 + 直接调用 `vitaLang`）
- `vitaPage` 新增 `en` 副标题，facts 第三列英文；8 个 demo 已补齐
- 首页全文英译；新增第三节「对 Anatomy 的扩充与改进」（9 条扩充 + 8 条改进）
- 部署改为 Cloudflare Workers：`wrangler.jsonc` + `wrangler deploy`，已验证线上中英切换、iframe 同步、无控制台错误

### 下一步（v4 建议）
- 第 3 批（细胞→组织）：09 卵裂与囊胚、10 Waddington 景观、11 突触、12 肌节。先在 bio 里做两个新原语：
  `packCells(seed, n, bounds)`（种子化球堆积 + 接触面压扁的截面）和 `blobOutline(circles)`（03 里的截面并集提成公共函数）
- 03 有丝分裂补细节（中心体、线粒体、内质网碎片、细胞骨架）
- 接入原版 `scripts/lines.mjs` 线端检查（需要本机 Chrome）
