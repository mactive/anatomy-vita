import { writeFileSync } from "node:fs";
import { t, LANG_SRC, LANG_CSS, LANG_BUTTON } from "./bio/bio.mjs";
const B = (zh, en) => t(zh, en, "div");
const demos = [
  // n, zh, en, scale, object (zh), batch, file, object (en)
  ["01","DNA 复制叉","DNA replication fork","2 nm","三根支架上的双螺旋拉链机：解旋酶环剥开、两台聚合酶跟进、后随链留下冈崎缺口",1,"01-dna.html","A double-helix zipper on three stands: the helicase ring splits it, two polymerases follow, the lagging strand leaves Okazaki gaps"],
  ["02","ATP 合酶","ATP synthase","10 nm","膜片上的水车：质子驱动 c8 转子，γ 轴每转 120° 压出一个 ATP；拉低 Δp 到 ~145 mV 以下会反转",1,"02-atp-synthase.html","A water wheel in a membrane patch: protons turn the c8 rotor, every 120° of the γ shaft presses out one ATP; drop Δp below ~145 mV and it runs backwards"],
  ["03","有丝分裂","Mitosis","20 µm","玻片上的一个细胞：从 G2 到胞质分裂，一个细胞真正拓扑地变成两个",1,"03-mitosis.html","One cell on a slide, from G2 to cytokinesis — one cell topologically becomes two"],
  ["04","神经元动作电位","Action potential","1 mm","盖玻片上的 GFP 神经元 + 记录放大器：跳跃传导 40 m/s 对比无髓鞘 2 m/s",1,"04-neuron.html","A GFP neuron on a coverslip with a recording amplifier: saltatory conduction at 40 m/s vs 2 m/s unmyelinated"],
  ["05","核糖体翻译","Ribosome translation","25 nm","读带机：mRNA 磁带三个一读（真实 GFP 基因），齿高编码嘌呤/嘧啶，错配 tRNA 被弹回，肽链从出口隧道吐出",2,"05-ribosome.html","A tape reader: the mRNA tape (the real GFP gene) is read three at a time, tooth height encodes purine/pyrimidine, mismatched tRNAs bounce off, the peptide leaves through the exit tunnel"],
  ["06","驱动蛋白行走","Kinesin walking","8 nm","微管轨道上的双足步行器 + 导轨上的力钳弹簧：每步 8 nm、每步一个 ATP，~6 pN 失速",2,"06-kinesin.html","A two-legged walker on a microtubule track pulling a force-clamp spring: 8 nm and one ATP per step, stalls near 6 pN"],
  ["07","钠钾泵与细胞膜","Na⁺/K⁺ pump","10 nm","双门气闸：3 Na⁺ 出、2 K⁺ 进，离子守恒可数；漏通道 + 乌本苷开关，阻断后梯度消散",2,"07-na-k-pump.html","A two-door airlock: 3 Na⁺ out, 2 K⁺ in, every ion conserved and countable; leak channels plus an ouabain switch — block it and the gradient runs down"],
  ["08","线粒体全貌","Mitochondrion","1 µm","纵剖的线粒体教学模型：双层膜切面、15 片板状嵴、嵴缘的 ATP 合酶排；ADP 需求驱动 state 4 → state 3",2,"08-mitochondrion.html","A mitochondrion teaching model cut lengthwise: double-membrane section, 15 lamellar cristae, ATP synthase rows on their rims; ADP demand drives state 4 → state 3"],
  ["09","卵裂与囊胚","Cleavage → blastocyst","100 µm","握持针下透明带里的人类胚胎：1→2→4→8→致密化桑椹胚→囊胚（近半切开）；体积守恒，分裂逐渐不同步",3,"09-cleavage.html","A human embryo in its zona on a holding pipette: 1→2→4→8→compacted morula→blastocyst (half cut away); volume is conserved and divisions drift out of step"],
  ["10","细胞分化 · Waddington 景观","Differentiation","day 5–28","声明的隐喻：层板拼成的沃丁顿地形板，12 个 Oct4-GFP 细胞越过闸门滚进 6 条命运山谷（神经元、皮肤、血液、心肌、肠、肝）",3,"10-differentiation.html","A declared metaphor: Waddington's landscape as a sliced plywood board; 12 Oct4-GFP cells pass a gate and roll into six fate valleys (neuron, skin, blood, heart, gut, liver)"],
  ["11","突触传递","Synapse","1 µm","剖开的海马突触 + 刺激/记录双电极：Ca²⁺ 进入、囊泡按 [Ca²⁺]⁴ 概率融合、谷氨酸跨过间隙打开 AMPA，EPSP 上升；低钙时出现失败",3,"11-synapse.html","A cut-open hippocampal synapse with stimulating and recording pipettes: Ca²⁺ enters, vesicles fuse with probability ∝ [Ca²⁺]⁴, glutamate crosses the cleft and opens AMPA receptors, the EPSP rises; at low calcium it fails"],
  ["12","肌节收缩","Sarcomere","2.5 µm","滑尺式肌节：Z 盘装在带弹簧的滑车上，128 个肌球蛋白头按 Ca²⁺ 结合、划桨、脱离；肌节从 2.50 缩到约 2.1 µm",3,"12-sarcomere.html","A slide-rule sarcomere: Z discs on sprung carriages, 128 myosin heads binding, stroking and letting go as Ca²⁺ arrives; the sarcomere shortens from 2.50 to about 2.1 µm"],
  ["13","膝关节","Knee joint","10 cm","教学骨骼模型 + 量角器：交叉四连杆的 ACL/PCL 自然产生股骨后滚；各束随角度绷紧或松弛；可切换 ACL / PCL 断裂",4,"13-knee.html","A teaching skeleton with a goniometer: the cruciates as a crossed four-bar produce the femur's roll-back; each bundle goes taut or slack with angle; switch to a torn ACL or PCL"],
  ["14","心脏","Heart","12 cm","冠状面剖开的四腔教学模型 + 双传感器导管与监护仪：一个弹性腔-Windkessel 模型驱动瓣膜开合、房室平面下移、血流点计数（1 点 = 5 mL）和 Wiggers 压力曲线",4,"14-heart.html","A four-chamber teaching model cut in the frontal plane, with a dual-sensor catheter and a monitor: one elastance–Windkessel model drives the valves, the descending AV plane, counted blood (1 dot = 5 mL) and a Wiggers pressure trace"],
  ["15","肺泡与呼吸","Alveolus","200 µm","赤道剖开的人肺泡模型 + 血氧仪：红细胞沿毛细血管排队通过，按 Hill 曲线从 deoxy 染成 oxy；运动缩短通过时间，纤维化加厚屏障，出口血氧下降",4,"15-alveolus.html","A human alveolus cut at its equator with an oximeter: red cells file through the capillary and turn from deoxy to oxy along the Hill curve; exercise shortens transit, fibrosis thickens the barrier and the outflow desaturates"],
  ["16","肾单位","Nephron","5 cm","过滤与回收管路：肾小球筛、亨利袢逆流倍增",4,null,"Filter-and-reclaim plumbing: the glomerular sieve and the loop of Henle's countercurrent multiplier"],
  ["17","反射弧 / 神经网络","Reflex arc","1 m","膝跳反射：感受器 → 脊髓 → 效应器，一条真实时序",5,null,"The knee-jerk: receptor → spinal cord → effector on a true timeline"],
  ["18","循环系统","Circulation","1.7 m","双回路管网：体循环与肺循环，一滴血走完一圈",5,null,"Two-loop pipework: systemic and pulmonary circuits, one drop of blood makes the round"],
  ["19","免疫应答","Immune response","10 µm","克隆选择：抗原挑中一个 B 细胞，然后它被复制成一支军队",5,null,"Clonal selection: an antigen picks one B cell, which is copied into an army"],
  ["20","人体系统总装","The whole body","1.7 m","Epic：把 13–19 装进一个可剖开的人体模型（需先确认）",5,null,"Epic: 13–19 assembled into one human model you can open (to be confirmed first)"],
  ["21","生态系统碳循环","Carbon cycle","10 km","星球尺度：光合—呼吸—沉积三条管路，碳量守恒",6,null,"Planet scale: photosynthesis, respiration and burial as three pipelines, carbon conserved"],
  ["22","地球生物圈 · Daisyworld","Daisyworld","12,700 km","黑白雏菊调节行星温度的反馈机器",6,null,"A feedback machine where black and white daisies regulate a planet's temperature"],
];
const batchName = {1:["第 1 批 · 分子→细胞（已完成）","Batch 1 · molecule → cell (done)"],2:["第 2 批 · 分子机器（已完成）","Batch 2 · molecular machines (done)"],3:["第 3 批 · 细胞→组织（已完成）","Batch 3 · cell → tissue (done)"],4:["第 4 批 · 器官（13–15 已上线）","Batch 4 · organs (13–15 live)"],5:["第 5 批 · 系统","Batch 5 · systems"],6:["第 6 批 · 星球（可选）","Batch 6 · planet (optional)"]};
const done = demos.filter(d => d[6]);
const rows = demos.map(d => `<tr class="${d[6]?"is-done":""}"><td class="mono">${d[0]}</td><td>${d[6]?`<a href="demos/${d[6]}">${t(d[1],d[2])}</a>`:t(d[1],d[2])}<small>${t(d[2],d[1])}</small></td><td class="mono">${d[3]}</td><td>${t(d[4],d[7])}</td><td class="mono">${d[6]?t("● 已上线","● live"):t("○ 第 "+d[5]+" 批","○ batch "+d[5])}</td></tr>`).join("\n");
const ruler = demos.filter((d,i,a)=>a.findIndex(x=>x[3]===d[3])===i && d[3]!=="—").map(d=>`<span><b>${d[3]}</b>${t(d[1],d[2])}</span>`).join("");

// What Vita adds to Anatomy, and what it does better: [zh title, zh body, en title, en body]
const extensions = [
  ["题材：从机械到生命","原 Anatomy 画的是机器。Vita 把同一条信条推进到分子 → 细胞 → 组织 → 器官 → 系统 → 星球，规划 22 张图，已上线 8 张。","Subject: from machines to life","Anatomy draws machines. Vita carries the same creed through molecule → cell → tissue → organ → system → planet: 22 figures planned, 8 live."],
  ["bio 层，kit 零修改","所有扩展都在 <code>bio/bio.mjs</code>；<code>kit/</code> 与 <code>scripts/</code> 原样复用，随时可以和上游同步。","A bio layer, kit untouched","Every extension lives in <code>bio/bio.mjs</code>; <code>kit/</code> and <code>scripts/</code> are reused verbatim, so upstream can be merged at any time."],
  ["染色系统","13 种真实染料 / 荧光蛋白（DAPI、GFP、RFP、伊红、苏木精、ATP、髓鞘、氧合/脱氧血、Na⁺、K⁺、tRNA、胞质）。<code>color-mix</code> 把四朝向色调推向染料色，明暗保留，图例色块直接引用染料名。","A stain system","13 real dyes and fluorescent proteins (DAPI, GFP, RFP, eosin, haematoxylin, ATP, myelin, oxy/deoxy blood, Na⁺, K⁺, tRNA, cytosol). <code>color-mix</code> pushes the four facing tones toward the dye, keeping the shading; legend swatches name the dye directly."],
  ["看得进去的膜","<code>shellOf</code>：前后两半的半透明膜壳，先画后半、再画内容、最后画前半，加高光——原 kit 只有不透明实心体。","Membranes you can see into","<code>shellOf</code>: a translucent shell in two halves — back half, contents, front half with a gleam. The original kit only has opaque solids."],
  ["标本语法","<code>plinth</code> / <code>standRod</code>：带校准刻度尺、铭牌、螺丝的底座与支架杆。细胞以上的对象像实验室里那样放在玻片、支架、教学模型上，而不是硬套机器隐喻。","Specimen grammar","<code>plinth</code> / <code>standRod</code>: bases with a calibrated scale, name plate and screws, plus stand rods. Above the cell, things sit on slides, stands and teaching-model bases as they would in a lab, instead of being forced into a machine metaphor."],
  ["种子化变异","<code>rng(seed)</code>：没有两个细胞一样，但每次构建都一样——生物的不规则性与可复现的构建同时成立。","Seeded variation","<code>rng(seed)</code>: no two cells alike, yet every build identical — biological irregularity and reproducible output at once."],
  ["几何在浏览器里活着","<code>liveScript()</code> 把 iso-kit / lathe / tube 内联为页面里的 K / G / T，几何可逐帧重建，于是能表达生长、形变和拓扑变化（一个细胞的截面并集轮廓变成两个）。","Geometry alive in the browser","<code>liveScript()</code> inlines iso-kit / lathe / tube as K / G / T inside the page, so geometry can be rebuilt every frame — growth, deformation, even topology change (one cell's cross-section union becoming two)."],
  ["深度收集器","<code>scene(P)</code>：粒子、管段、零件带深度放进来，<code>svg()</code> 一次从后往前画，让成百个离子和管段正确遮挡。","A depth collector","<code>scene(P)</code>: particles, tube pieces and parts go in with their depth; <code>svg()</code> paints back to front once, so hundreds of ions and tube segments occlude correctly."],
  ["七条生命法则","标尺即真相、染色代替配色、时间承认被改写、粒子守恒、拓扑可以变、标本而非卡通、隐喻需要声明——在原绘图语法之上新增的生命专用规则。","Seven laws of life","Scale is truth, stains not palettes, admit the time warp, conserve particles, let topology change, specimens not cartoons, declare metaphors — rules for living things on top of the original drawing grammar."],
];
const improvements = [
  ["统一运行时","<code>vitaLoop()</code>：每张图同样的离屏暂停、闲置巡演、指针 / 点击 / 键盘、减少动态时静止，不再每张图各写一遍循环。","One shared runtime","<code>vitaLoop()</code>: every figure pauses offscreen, tours when idle, answers pointer / click / keys and stands still under reduced motion the same way — no per-figure loop code."],
  ["时间缩放写在读数里","µs 到小时的过程都在读数里标明“放慢 N×”或“加速 N×”，不再假装是实时。","Time scaling in the readout","Processes from µs to hours state “slowed N×” or “sped up N×” in the readout instead of pretending to be real time."],
  ["守恒可验证","钠钾泵里 Na⁺、K⁺ 各 25 个，泵、漏、阻断全程守恒；乌本苷阻断后梯度消散已用 Playwright 驱动验证（Na⁺in 2→12、K⁺in 20→13）。","Conservation you can check","The pump keeps 25 Na⁺ and 25 K⁺ through pumping, leaking and blocking; the gradient collapse after ouabain was verified by driving the page with Playwright (Na⁺in 2→12, K⁺in 20→13)."],
  ["真实数据驱动","核糖体读的是真实 GFP 基因（238 aa + UAA）；驱动蛋白按 v(F) = 800·(1−(F/6.2)^1.4) nm/s；钠钾泵走 Post–Albers 六态；线粒体按 state 3 / state 4 耗氧比。","Driven by real data","The ribosome reads the real GFP gene (238 aa + UAA); kinesin follows v(F) = 800·(1−(F/6.2)^1.4) nm/s; the pump steps through the six Post–Albers states; the mitochondrion uses measured state 3 / state 4 ratios."],
  ["事实栏","每页卡片下有一行真实数值（尺寸、速率、电位、能耗），与图中读数出自同一模型。","A facts strip","Every page ends with a row of true numbers (size, rate, potential, energy cost) from the same model that drives the readout."],
  ["可嵌入的长文站点","<code>vitaPage()</code> 页面外壳 + <code>?embed</code> / <code>#embed</code> 嵌入模式：同一页面既能全屏打开，也能嵌进首页长文；首页带尺度标尺、路线表和工具层说明。","An essay site with embeds","<code>vitaPage()</code> shell plus <code>?embed</code> / <code>#embed</code>: each page opens full screen or sits inside the essay; the home page adds a scale ruler, roadmap and toolkit notes."],
  ["双语（v3）","站点外壳、首页长文、各页副标题与事实栏都有中英两版；默认英文，中文浏览器自动显示中文；导航里可切换，记住选择，嵌入的图同步切换；也可用 <code>?lang=en</code> / <code>?lang=zh</code> 直接指定。","Bilingual (v3)","Shell, essay, page subtitles and facts strips exist in English and Chinese; English by default, Chinese for Chinese-language browsers; switch in the nav, the choice is remembered and embedded figures follow; <code>?lang=en</code> / <code>?lang=zh</code> pick one directly."],
  ["一键部署（v3）","<code>wrangler deploy</code> 把 <code>site/</code> 作为静态资源发布到 Cloudflare Workers。","One-command deploy (v3)","<code>wrangler deploy</code> publishes <code>site/</code> as static assets on Cloudflare Workers."],
];
const list = (items) => `<ol class="laws">${items.map(([zt,zb,et,eb])=>`<li>${t(`<b>${zt}。</b>${zb}`,`<b>${et}.</b> ${eb}`)}</li>`).join("\n")}</ol>`;

// The seven laws, and the bio-layer call that enforces each one: [zh, en, API, zh body, en body]
const laws = [
  ["标尺即真相","Scale is truth","plinth({ scale })","每张图的底座上都有一把校准过的刻度尺，标出真实尺寸。","Every base carries a calibrated ruler marked in real units."],
  ["染色代替配色","Stains, not palettes","stain(name, svg)","颜色只来自真实的染料或荧光蛋白：DNA 是 DAPI 蓝，神经元是 GFP 绿，质子是 RFP 红。","Colour comes only from real dyes or fluorescent proteins: DNA is DAPI blue, neurons GFP green, protons RFP red."],
  ["承认时间被改写","Admit the time warp","vitaSay(\"slowed N×\")","动作电位以 µs 计、细胞分裂以小时计；读数永远写明“放慢 2000×”。","Action potentials take µs, cell division takes hours; the readout always says “slowed 2000×”."],
  ["粒子守恒","Conserve particles","scene(P).put(ion)","质子、离子、dNTP 做布朗运动，但数量可数且守恒。","Protons, ions and dNTPs jiggle, but they are countable and conserved."],
  ["拓扑可以变","Topology may change","liveScript() · union","一个细胞真的变成两个：膜轮廓是截面并集，而非两个圆叠在一起。","One cell really becomes two: the membrane is a union of cross-sections, not two overlapping circles."],
  ["标本，而非卡通","Specimens, not cartoons","plinth · standRod · shellOf","细胞以上的对象放在玻片、盖玻片、支架或教学模型底座上，像实验室里真实摆放的那样。","Anything above a cell sits on a slide, coverslip, stand or teaching-model base, as it would in a lab."],
  ["隐喻需要声明","Declare metaphors","caption: \"metaphor\"","只有无实体的过程（分化景观、反馈）才发明机器，并在图注里说明这是隐喻。","Only processes with no body (fate landscapes, feedback) get an invented machine, and the caption says so."],
];

// A UML class diagram: Anatomy ◁— bio layer, which realizes the seven «law» interfaces.
function uml(lang) {
  const zh = lang === "zh", esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const T = (x, y, s, cls = "", anchor = "start") => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(s)}</text>`;
  const box = (x, y, w, h, cls = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" class="u-box ${cls}"/>`;
  const hr = (x, y, w) => `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" class="u-rule"/>`;
  const tri = (x, y, dir) => { // hollow UML triangle whose tip is at (x, y)
    const p = { up: [[x - 7, y + 12], [x + 7, y + 12]], left: [[x + 12, y - 7], [x + 12, y + 7]], right: [[x - 12, y - 7], [x - 12, y + 7]] }[dir];
    return `<path d="M${x} ${y}L${p[0][0]} ${p[0][1]}L${p[1][0]} ${p[1][1]}Z" class="u-tri"/>`;
  };
  const out = [];
  // Anatomy (upstream)
  const ax = 250, ay = 8, aw = 260;
  out.push(box(ax, ay, aw, 100), T(ax + aw / 2, ay + 17, zh ? "«上游 · MIT»" : "«upstream · MIT»", "u-stereo", "middle"), T(ax + aw / 2, ay + 35, "Anatomy", "u-name", "middle"), hr(ax, ay + 44, aw));
  out.push(T(ax + 12, ay + 62, zh ? "物体本身就是解释" : "The object is the explanation", "u-creed"));
  out.push(T(ax + 12, ay + 79, "+ iso-kit · lathe · tube", "u-op"), T(ax + 12, ay + 95, "+ audit · lines · capture", "u-op"));
  // Inheritance
  out.push(`<line x1="380" y1="150" x2="380" y2="120" class="u-line"/>`, tri(380, ay + 100, "up"));
  out.push(T(392, 140, zh ? "«extends» kit 零修改" : "«extends» kit untouched", "u-note"));
  // Bio layer
  const bx = 250, by = 150, bw = 260, bh = 300;
  const ops = ["+ STAINS : 13 dyes", "+ stain(name, svg, k)", "+ shellOf(c, r, P)", "+ plinth(PLATE, P, {scale})", "+ standRod(x, y, z, P)", "+ rng(seed)", "+ byDepth(points, P)", "+ scene(P).put / tube / svg", "+ liveScript() → K · G · T", "+ vitaLoop({ frame, pointer })", "+ vitaPage({ facts })", "+ t(zh, en)"];
  out.push(box(bx, by, bw, bh, "u-lit"), T(bx + bw / 2, by + 17, zh ? "«bio 层»" : "«bio layer»", "u-stereo", "middle"), T(bx + bw / 2, by + 35, "Anatomy Vita", "u-name", "middle"), hr(bx, by + 44, bw));
  ops.forEach((o, i) => out.push(T(bx + 12, by + 64 + i * 19.5, o, "u-op")));
  // Laws: four on the left, three on the right, each realized by the bio layer
  laws.forEach((l, i) => {
    const left = i < 4, x = left ? 0 : 560, y = left ? 150 + i * 78 : 189 + (i - 4) * 78, w = 200, h = 66;
    out.push(box(x, y, w, h), T(x + 10, y + 16, `«${zh ? "法则" : "law"}» 0${i + 1}`, "u-stereo"), T(x + 10, y + 34, zh ? l[0] : l[1], "u-law"), T(x + 10, y + 54, l[2], "u-op"));
    const cy = y + h / 2;
    out.push(left ? `<line x1="${bx}" y1="${cy}" x2="${x + w + 12}" y2="${cy}" class="u-line u-dash"/>${tri(x + w, cy, "left")}` : `<line x1="${bx + bw}" y1="${cy}" x2="${x - 12}" y2="${cy}" class="u-line u-dash"/>${tri(x, cy, "right")}`);
  });
  out.push(T(225, 140, zh ? "«实现»" : "«realizes»", "u-note", "end"), T(535, 140, zh ? "«实现»" : "«realizes»", "u-note"));
  return `<svg viewBox="-2 0 764 456" class="uml" role="img" aria-label="${zh ? "UML：bio 层继承 Anatomy 并实现七条生命法则" : "UML: the bio layer extends Anatomy and realizes the seven laws of life"}">${out.join("")}</svg>`;
}

const thumb = d => `<a class="card" href="#fig-${d[0]}"><img src="thumbs/${d[6].replace(".html", ".png")}" alt="" loading="lazy"><span class="card-n">Fig. ${d[0]} · ${d[3]}</span><b>${t(d[1], d[2])}</b></a>`;
const detail = d => `<section class="figure" id="fig-${d[0]}">
<div class="sec-head"><h3>${t(`Fig. ${d[0]} · ${d[1]}`, `Fig. ${d[0]} · ${d[2]}`)}</h3><span class="mono">${d[3]}</span></div>
${t(`<p>${d[4]}</p>`, `<p>${d[7]}</p>`, "div")}
<iframe src="demos/${d[6]}#embed" loading="lazy" title="${d[2]}" scrolling="no"></iframe>
<p class="fig-links"><a href="demos/${d[6]}">${t("打开全屏 →", "Open full screen →")}</a><a href="#gallery">${t("↑ 回到图集", "↑ Back to gallery")}</a></p>
</section>`;

const sections = [
  ["adds", "Vita 新增了什么", "What Vita adds"],
  ["laws", "生命法则", "Laws of life"],
  ["gallery", "图集", "Gallery"],
  ["figures", "逐图详解", "Figures"],
  ["roadmap", "路线图", "Roadmap"],
  ["toolkit", "bio 工具层", "The bio toolkit"],
  ["install", "安装", "Install"],
];
const secNo = Object.fromEntries(sections.map(([id], i) => [id, String(i + 1).padStart(2, "0")]));
const H = (id) => { const s = sections.find((x) => x[0] === id); return `<div class="sec-head"><h2>${t(s[1], s[2])}</h2><span class="mono">${secNo[id]}</span></div>`; };
const side = `<aside class="side"><a class="brand" href="#top">Anatomy Vita</a><span class="brand-sub">${t("生命科学的 Anatomy", "Anatomy for life science")}</span>
<ol>${sections.map(([id, zh, en]) => `<li><a href="#${id}" data-spy="${id}"><span class="mono">${secNo[id]}</span>${t(zh, en)}</a>${id === "figures" ? `<ol class="sub">${done.map((d) => `<li><a href="#fig-${d[0]}" data-spy="fig-${d[0]}"><span class="mono">${d[0]}</span>${t(d[1], d[2])}</a></li>`).join("")}</ol>` : ""}</li>`).join("")}</ol>
<div class="side-foot">${LANG_BUTTON}<a href="https://github.com/mactive/anatomy-vita">GitHub ↗</a></div></aside>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anatomy Vita</title>
<meta name="description" content="A Claude Code skill that draws living processes as live isometric specimens — built on the Anatomy skill (MIT). 基于 Anatomy skill 扩展的生命科学交互图集。">
<script>${LANG_SRC}</script>
<style>
:root{--paper:#fafaf9;--ink:#1c1c1a;--muted:#77756f;--faint:#a6a39c;--line:#e4e1da;--accent:#d9480f;--card:#ffffff;--code:#f0eee8;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--serif:"Iowan Old Style","Songti SC","Noto Serif CJK SC",Georgia,serif}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}html,body{background:var(--paper);color:var(--ink)}
body{margin:0;font:15px/1.65 -apple-system,"Inter","PingFang SC","Noto Sans SC","Helvetica Neue",Arial,sans-serif}
.mono{font-family:var(--mono)}
a{color:inherit;text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:3px}a:hover{text-decoration-color:var(--accent)}
.layout{display:grid;grid-template-columns:232px minmax(0,1fr);max-width:1080px;margin:0 auto;gap:56px;padding:0 24px}
.side{position:sticky;top:0;align-self:start;height:100vh;overflow:auto;padding:44px 0 24px;font-size:13px}
.brand{display:block;font-weight:600;text-decoration:none;font-size:14px}.brand-sub{display:block;color:var(--muted);margin-bottom:26px}
.side ol{list-style:none;margin:0;padding:0}.side li{margin:0}
.side a[data-spy]{display:flex;gap:10px;padding:4px 8px;margin-left:-8px;border-radius:4px;text-decoration:none;color:var(--muted)}
.side a[data-spy] .mono{font-size:11px;color:var(--faint);padding-top:2px;min-width:16px}
.side a[data-spy]:hover{color:var(--ink);background:var(--code)}
.side a[data-spy].on{color:var(--ink);background:var(--code)}.side a[data-spy].on .mono{color:var(--accent)}
.side .sub{margin:2px 0 6px 18px;padding-left:8px;border-left:1px solid var(--line)}.side .sub a[data-spy]{padding:2px 8px;font-size:12px}
.side-foot{display:flex;gap:12px;align-items:center;margin-top:26px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font:12px var(--mono)}
.side-foot .vita-lang{margin-left:0}
main{max-width:720px;padding:44px 0 120px;min-width:0}
.top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:14px}
.top b{font-weight:600}.top span{color:var(--muted)}
.tagline{font-size:15px;margin:14px 0 0;padding-bottom:22px;border-bottom:1px solid var(--line)}
.tagline em,.serif{font-family:var(--serif);font-style:italic;font-size:1.06em}
.meta{font-size:13px;color:var(--muted);padding:14px 0;border-bottom:1px solid var(--line);margin-bottom:28px}.meta a{color:var(--muted)}
.meta i{font-style:normal;color:var(--faint);margin:0 7px}
p{margin:0 0 14px}
.sec-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin:64px 0 14px}
.sec-head h2{font-size:15px;font-weight:600;margin:0}.sec-head h3{font-size:15px;font-weight:600;margin:0}
.sec-head>.mono{font-size:12px;color:var(--faint)}
section.figure .sec-head{margin-top:52px}
h4{font-size:13px;font-weight:600;margin:28px 0 8px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
code{font:12.5px var(--mono);background:var(--code);padding:1px 5px;border-radius:3px}
pre{font:13px/1.6 var(--mono);background:var(--code);padding:12px 14px;border-radius:5px;overflow-x:auto;margin:8px 0 16px}
.laws{counter-reset:law;list-style:none;padding:0;margin:0}
.laws li{counter-increment:law;position:relative;padding:0 0 12px 34px}
.laws li::before{content:counter(law,decimal-leading-zero);position:absolute;left:0;top:3px;font:11px var(--mono);color:var(--accent)}
.laws li code{font-size:11.5px}
.diagram{margin:18px 0 26px;padding:18px 14px 10px;background:var(--card);border:1px solid var(--line);border-radius:6px;overflow-x:auto}
.diagram figcaption{font-size:12.5px;color:var(--muted);padding:10px 4px 0}
.uml{display:block;width:100%;min-width:620px;height:auto;font-family:-apple-system,"Inter","PingFang SC",sans-serif}
.u-box{fill:var(--card);stroke:var(--ink);stroke-width:1}.u-lit{fill:#fff7f2;stroke:var(--accent)}
.u-rule{stroke:var(--ink);stroke-width:.8}.u-line{stroke:var(--ink);stroke-width:1;fill:none}.u-dash{stroke-dasharray:5 4}.u-tri{fill:var(--card);stroke:var(--ink);stroke-width:1}
.u-stereo{font-size:10.5px;fill:var(--muted)}.u-name{font-size:14px;font-weight:600;fill:var(--ink)}.u-law{font-size:13px;font-weight:600;fill:var(--ink)}
.u-op{font:11px var(--mono);fill:#3d3b37}.u-creed{font:italic 13px var(--serif);fill:var(--ink)}.u-note{font-size:10.5px;fill:var(--accent)}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0 8px}
.card{display:flex;flex-direction:column;text-decoration:none;background:var(--card);border:1px solid var(--line);border-radius:6px;overflow:hidden;transition:border-color .15s,transform .15s}
.card:hover{border-color:var(--accent);transform:translateY(-2px)}
.card img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#fbfbfa;border-bottom:1px solid var(--line)}
.card-n{font:10.5px var(--mono);color:var(--faint);padding:8px 10px 0}.card b{font-size:13px;font-weight:600;padding:2px 10px 10px;line-height:1.4}
section.figure iframe{display:block;width:100%;height:720px;border:1px solid var(--line);border-radius:6px;background:#fff;margin-top:6px}
.fig-links{display:flex;justify-content:space-between;font-size:13px;margin-top:8px}.fig-links a{color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.5;margin:10px 0 8px}
th,td{text-align:left;vertical-align:top;padding:8px 6px;border-bottom:1px solid var(--line)}
th{font:11px var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:400}
td small{display:block;color:var(--muted);font-size:12px}tr.is-done td:last-child{color:var(--accent)}
.scroll{overflow-x:auto}
.ruler{display:flex;overflow-x:auto;margin:6px 0 26px;border-top:2px solid var(--ink);padding-top:8px}
.ruler span{flex:1 0 82px;font-size:11.5px;color:var(--muted);border-left:1px solid var(--line);padding:0 7px}.ruler b{display:block;font:500 13px var(--mono);color:var(--ink)}
footer{margin-top:80px;padding-top:16px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}
@media(max-width:900px){
  html{scroll-padding-top:64px}
  .layout{display:block;padding:0 16px}
  .side{position:sticky;top:0;z-index:5;height:auto;padding:10px 0;background:var(--paper);border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;overflow-x:auto;white-space:nowrap}
  .brand-sub,.side .sub,.side-foot a{display:none}.side>ol{display:flex;gap:2px}.side-foot{margin:0;padding:0;border:0;order:3}
  .side a[data-spy]{margin-left:0}
  main{padding-top:20px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}section.figure iframe{height:560px}
}
${LANG_CSS}
</style></head><body id="top"><div class="layout">
${side}
<main>
<div class="top"><div><b>Anatomy Vita</b> <span>· ${t("Claude Code 的一个 skill", "a skill for Claude Code")}</span></div><a class="mono" style="font-size:12px;color:var(--muted)" href="https://github.com/mactive/anatomy-vita">GitHub ↗</a></div>
<p class="tagline">${t("用一句话说出一个生命过程，Claude 会画出<em>做这件事的标本</em>。", "Name a living process in one line, and Claude draws <em>the specimen</em> that does it.")}</p>
<div class="meta"><code>/anatomy-vita</code><i>·</i><a href="#gallery">${t(`${done.length} 张图，全部可交互`, `${done.length} figures, all live`)}</a><i>·</i>${t(`基于 <a href="https://skills.wheresryan.sh/anatomy">Anatomy</a>`, `built on <a href="https://skills.wheresryan.sh/anatomy">Anatomy</a>`)}<i>·</i>${t("2026 年 11 月 4 日", "4 November 2026")}<i>·</i><a href="#install">${t("安装 ↓", "Install ↓")}</a></div>

${B(`<p><a href="https://skills.wheresryan.sh/anatomy">Anatomy</a> 的信条是 <b>“物体本身就是解释”</b>——不画方框、箭头和浮动标签，而是发明一台真实的机器，让它的运动本身就是概念。它画的是机器：锁、绘图仪、抽屉柜。</p>
<p>Anatomy Vita 把这条信条推进到<span class="serif">生命</span>。分子本来就是机器，照原样画；细胞、组织、器官则改用标本、教学模型和记录仪器的语言来画。为此它在 Anatomy 之上加了一层 bio 层，并立了七条新法则。kit 本身一行未改。</p>`,
`<p><a href="https://skills.wheresryan.sh/anatomy">Anatomy</a>'s creed is <b>“the object is the explanation”</b> — no boxes, arrows or floating labels; invent a real machine whose motion is the concept. It draws machines: locks, plotters, chests of drawers.</p>
<p>Anatomy Vita carries that creed into <span class="serif">life</span>. Molecules really are machines, so they are drawn as such; cells, tissues and organs are drawn in the language of specimens, teaching models and recording instruments. To do that it adds a bio layer on top of Anatomy and seven new laws. The kit itself is untouched.</p>`)}
<div class="ruler">${ruler}</div>

<section id="adds">${H("adds")}
<h4>${t("扩充", "Extensions")}</h4>
${list(extensions)}
<h4>${t("改进", "Improvements")}</h4>
${list(improvements)}
</section>

<section id="laws">${H("laws")}
${B("<p>每条法则都由 bio 层里一个具体的调用来执行，所以它不是口号，是代码。下图是这层关系的 UML 类图：bio 层继承 Anatomy，并实现七个「法则」接口。</p>", "<p>Each law is enforced by a specific call in the bio layer, so it is code, not a slogan. The UML class diagram below shows the relationship: the bio layer extends Anatomy and realizes seven «law» interfaces.</p>")}
<figure class="diagram">${t(uml("zh"), uml("en"), "div")}<figcaption>${t("实线空心三角 = 继承；虚线空心三角 = 实现。每个法则框的最后一行是执行它的调用。", "Solid line, hollow triangle = extends; dashed line, hollow triangle = realizes. The last line of each law box is the call that enforces it.")}</figcaption></figure>
<ol class="laws">${laws.map((l) => `<li>${t(`<b>${l[0]}。</b>${l[3]} <code>${l[2]}</code>`, `<b>${l[1]}.</b> ${l[4]} <code>${l[2]}</code>`)}</li>`).join("\n")}</ol>
</section>

<section id="gallery">${H("gallery")}
${B("<p>第 1–3 批与第 4 批的 13–15，从 2 nm 到 10 cm。点一张图跳到它的详解，那里有可交互的完整图。</p>", "<p>Batches 1–3 plus 13–15 from batch 4, from 2 nm to 10 cm. Click a figure to jump to its section, where the full interactive figure lives.</p>")}
<div class="grid">${done.map(thumb).join("\n")}</div>
</section>

<section id="figures">${H("figures")}
${B("<p>悬停、点击或键盘都能驱动；离开视口自动暂停，系统设置“减少动态”时停在关键帧。图内卡片文字为英文。</p>", "<p>Drive them by hover, click or keyboard; they pause offscreen and hold a key frame under reduced motion.</p>")}
${done.map(detail).join("\n")}
</section>

<section id="roadmap">${H("roadmap")}
<div class="scroll"><table><thead><tr><th>#</th><th>${t("主题","Subject")}</th><th>${t("尺度","Scale")}</th><th>${t("发明的物体","The invented object")}</th><th>${t("状态","Status")}</th></tr></thead><tbody>
${rows}
</tbody></table></div>
${Object.entries(batchName).map(([b,n])=>`<p class="mono" style="font-size:12px;margin:3px 0;color:var(--muted)">${t(n[0]+"：",n[1]+": ")}${demos.filter(d=>d[5]==b).map(d=>d[0]).join(" · ")}</p>`).join("")}
</section>

<section id="toolkit">${H("toolkit")}
<div class="scroll"><table><thead><tr><th>API</th><th>${t("作用","What it does")}</th></tr></thead><tbody>
<tr><td><code>liveScript()</code></td><td>${t("把 iso-kit / lathe / tube 内联为 K、G、T，让几何在浏览器里逐帧重建","Inlines iso-kit / lathe / tube as K, G, T so geometry can be rebuilt per frame in the browser")}</td></tr>
<tr><td><code>rng(seed)</code></td><td>${t("线性同余种子随机：可复现的生物变异","Seeded LCG random: reproducible biological variation")}</td></tr>
<tr><td><code>stain(name, svg, k)</code></td><td>${t("给任意实心体上染料，保持四朝向色调","Stains any solid while keeping its four facing tones")}</td></tr>
<tr><td><code>shellOf(c, r, P)</code></td><td>${t("前后两半的半透明膜壳，可以看进细胞内部","A translucent two-half membrane shell you can see into")}</td></tr>
<tr><td><code>plinth()</code> / <code>standRod()</code></td><td>${t("标本底座（带刻度尺与铭牌）与支架杆","Specimen base (with ruler and name plate) and stand rod")}</td></tr>
<tr><td><code>byDepth()</code></td><td>${t("粒子 / 细胞的画家排序","Painter ordering for particles and cells")}</td></tr>
<tr><td><code>scene(P)</code></td><td>${t("深度收集器：<code>put / at / tube</code> 收进来，<code>svg()</code> 从后往前画","Depth collector: <code>put / at / tube</code> in, <code>svg()</code> paints back to front")}</td></tr>
<tr><td><code>vitaLoop()</code></td><td>${t("共享运行时：离屏暂停、闲置巡演、指针 / 点击 / 键盘、减少动态时静止","Shared runtime: offscreen pause, idle tour, pointer / click / keys, still under reduced motion")}</td></tr>
<tr><td><code>vitaPage()</code></td><td>${t("页面外壳：导航、卡片、事实栏、<code>#embed</code> 嵌入模式","Page shell: nav, card, facts strip, <code>#embed</code> mode")}</td></tr>
<tr><td><code>soft.mjs</code></td><td>${t("<code>blobOf</code> 平滑融合体（分裂中的细胞、分叶器官）；<code>clusterOf</code> 堆积细胞团，<code>press</code> 让接触面压平（致密化）；<code>packSpheres</code> 把细胞松弛装进容器","<code>blobOf</code> smooth merged bodies (dividing cells, lobed organs); <code>clusterOf</code> packed cell masses, with <code>press</code> flattening contacts (compaction); <code>packSpheres</code> relaxes cells into a container")}</td></tr>
<tr><td><code>branch.mjs</code></td><td>${t("<code>treeOf / treeItems</code>：按 Murray 定律分叉变细的树（树突、血管、气道、根）","<code>treeOf / treeItems</code>: trees that taper by Murray's law at each fork (dendrites, vessels, airways, roots)")}</td></tr>
<tr><td><code>check.mjs</code></td><td>${t("生命法则检查器：无报错、读数在动、键盘可用、减少动态时静止、390 px 不溢出、图注有标尺与时间缩放、染料合法、事实栏","Life-law checker: no errors, a moving readout, keyboard use, still under reduced motion, no overflow at 390 px, captions with scale and time scaling, legal stains, a facts strip")}</td></tr>
<tr><td><code>t(zh, en)</code></td><td>${t("双语：两种语言同时写进页面，<code>html[data-lang]</code> 决定显示哪种","Bilingual: both languages in the page, <code>html[data-lang]</code> decides which shows")}</td></tr>
</tbody></table></div>
</section>

<section id="install">${H("install")}
${B("<p>Anatomy Vita 是一个开源的 Claude Code skill。用 skills CLI 一行装好：</p>", "<p>Anatomy Vita is an open-source Claude Code skill. Install it with the skills CLI in one line:</p>")}
<pre>npx skills add mactive/anatomy-vita</pre>
${B("<p>或者手动克隆到 Claude 的 skills 目录：</p>", "<p>Or clone it into Claude's skills folder yourself:</p>")}
<pre>git clone https://github.com/mactive/anatomy-vita ~/.claude/skills/anatomy-vita</pre>
${B("<p>然后用一句话描述一个生命过程：</p>", "<p>Then name a living process in one line:</p>")}
<pre>/anatomy-vita explain how a sarcomere contracts, interactive
/anatomy-vita a synapse releasing one vesicle, on a specimen plinth, interactive</pre>
${B("<p>需要 Node.js 20.10+；验证截图需要本机的 Chrome 或 Chromium。</p>", "<p>Needs Node.js 20.10+; the screenshot checks need Chrome or Chromium on the machine.</p>")}
</section>

<footer>${t(`Anatomy Vita 建立在 <a href="https://github.com/wheresryan22/anatomy">Anatomy</a>（Ryan · @wheresryan22，MIT License）之上，kit 与脚本原样复用。生物学数值为教学近似，见各图事实栏。源码：<a href="https://github.com/mactive/anatomy-vita">github.com/mactive/anatomy-vita</a>。`,
`Anatomy Vita is built on <a href="https://github.com/wheresryan22/anatomy">Anatomy</a> (Ryan · @wheresryan22, MIT License); the kit and scripts are reused unchanged. Biological numbers are teaching approximations; see each figure's facts strip. Source: <a href="https://github.com/mactive/anatomy-vita">github.com/mactive/anatomy-vita</a>.`)}</footer>
</main></div>
<script>
const frames=()=>document.querySelectorAll("section.figure iframe");
frames().forEach(f=>f.addEventListener("load",()=>{try{f.contentWindow.vitaLang&&f.contentWindow.vitaLang(document.documentElement.dataset.lang);const h=f.contentDocument.documentElement.scrollHeight;if(h>200)f.style.height=h+"px"}catch(e){}}));
// Frames read the saved choice on load and follow the storage event; this also covers browsers that block storage.
const setLang=window.vitaLang;window.vitaLang=(l,save)=>{setLang(l,save);frames().forEach(f=>{try{f.contentWindow.vitaLang&&f.contentWindow.vitaLang(l)}catch(e){}})};
// Scrollspy: the nav entry for the section nearest the top of the viewport is marked.
const spy=[...document.querySelectorAll("[data-spy]")].map(a=>[a,document.getElementById(a.dataset.spy)]).filter(x=>x[1]);
let tick=0;const mark=()=>{tick=0;let cur=null;for(const [a,el] of spy){if(el.getBoundingClientRect().top<140)cur=a}
  // a figure entry wins over its parent section
  spy.forEach(([a])=>a.classList.toggle("on",a===cur||(cur&&cur.closest(".sub")&&a.dataset.spy==="figures")));
  if(cur&&matchMedia("(max-width:900px)").matches)cur.scrollIntoView({block:"nearest",inline:"nearest"});};
addEventListener("scroll",()=>{if(!tick)tick=requestAnimationFrame(mark)},{passive:true});mark();
</script></body></html>`;
writeFileSync(new URL("./site/index.html", import.meta.url), html);
console.log("ok", html.length);
