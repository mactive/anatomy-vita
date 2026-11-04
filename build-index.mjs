import { writeFileSync } from "node:fs";
const demos = [
  // n, zh, en, scale, object, batch, file
  ["01","DNA 复制叉","DNA replication fork","2 nm","三根支架上的双螺旋拉链机：解旋酶环剥开、两台聚合酶跟进、后随链留下冈崎缺口",1,"01-dna.html"],
  ["02","ATP 合酶","ATP synthase","10 nm","膜片上的水车：质子驱动 c8 转子，γ 轴每转 120° 压出一个 ATP；拉低 Δp 到 ~145 mV 以下会反转",1,"02-atp-synthase.html"],
  ["03","有丝分裂","Mitosis","20 µm","玻片上的一个细胞：从 G2 到胞质分裂，一个细胞真正拓扑地变成两个",1,"03-mitosis.html"],
  ["04","神经元动作电位","Action potential","1 mm","盖玻片上的 GFP 神经元 + 记录放大器：跳跃传导 40 m/s 对比无髓鞘 2 m/s",1,"04-neuron.html"],
  ["05","核糖体翻译","Ribosome translation","25 nm","读带机：mRNA 磁带三个一读（真实 GFP 基因），齿高编码嘌呤/嘧啶，错配 tRNA 被弹回，肽链从出口隧道吐出",2,"05-ribosome.html"],
  ["06","驱动蛋白行走","Kinesin walking","8 nm","微管轨道上的双足步行器 + 导轨上的力钳弹簧：每步 8 nm、每步一个 ATP，~6 pN 失速",2,"06-kinesin.html"],
  ["07","钠钾泵与细胞膜","Na⁺/K⁺ pump","10 nm","双门气闸：3 Na⁺ 出、2 K⁺ 进，离子守恒可数；漏通道 + 乌本苷开关，阻断后梯度消散",2,"07-na-k-pump.html"],
  ["08","线粒体全貌","Mitochondrion","1 µm","纵剖的线粒体教学模型：双层膜切面、15 片板状嵴、嵴缘的 ATP 合酶排；ADP 需求驱动 state 4 → state 3",2,"08-mitochondrion.html"],
  ["09","卵裂与囊胚","Cleavage → blastocyst","100 µm","握持针下透明带里的人类胚胎：1→2→4→8→致密化桑椹胚→囊胚（近半切开）；体积守恒，分裂逐渐不同步（bio/soft.mjs）",3,"09-cleavage.html"],
  ["10","细胞分化 · Waddington 景观","Differentiation","—","隐喻模式：弹珠在会变形的山谷里选择命运",3],
  ["11","突触传递","Synapse","1 µm","囊泡停靠、融合、递质跨过 20 nm 间隙打开受体",3],
  ["12","肌节收缩","Sarcomere","2.5 µm","粗细丝滑行：Z 线互相靠近，横桥逐个划桨",3],
  ["13","膝关节","Knee joint","10 cm","教学骨骼模型：0–135° 屈伸，ACL/PCL 交叉、半月板滑移",4],
  ["14","心脏","Heart","12 cm","四腔剖面模型：瓣膜开合、70 bpm、Wiggers 压力曲线读数",4],
  ["15","肺泡与呼吸","Alveolus","200 µm","气囊与毛细血管网：O₂/CO₂ 跨膜交换，血色从 deoxy 变 oxy",4],
  ["16","肾单位","Nephron","5 cm","过滤与回收管路：肾小球筛、亨利袢逆流倍增",4],
  ["17","反射弧 / 神经网络","Reflex arc","1 m","膝跳反射：感受器 → 脊髓 → 效应器，一条真实时序",5],
  ["18","循环系统","Circulation","1.7 m","双回路管网：体循环与肺循环，一滴血走完一圈",5],
  ["19","免疫应答","Immune response","10 µm","克隆选择：抗原挑中一个 B 细胞，然后它被复制成一支军队",5],
  ["20","人体系统总装","The whole body","1.7 m","Epic：把 13–19 装进一个可剖开的人体模型（需先确认）",5],
  ["21","生态系统碳循环","Carbon cycle","10 km","星球尺度：光合—呼吸—沉积三条管路，碳量守恒",6],
  ["22","地球生物圈 · Daisyworld","Daisyworld","12,700 km","黑白雏菊调节行星温度的反馈机器",6],
];
const batchName = {1:"第 1 批 · 分子→细胞（已完成）",2:"第 2 批 · 分子机器（已完成）",3:"第 3 批 · 细胞→组织（09 已上线）",4:"第 4 批 · 器官",5:"第 5 批 · 系统",6:"第 6 批 · 星球（可选）"};
const done = demos.filter(d => d[6]);
const fig = d => `<figure class="fig"><div class="fig-head"><span>Fig. ${d[0]}</span><a href="demos/${d[6]}">打开全屏 →</a></div>
<iframe src="demos/${d[6]}#embed" loading="lazy" title="${d[1]}" scrolling="no"></iframe>
<figcaption><b>${d[1]}</b> · ${d[2]} — ${d[4]}</figcaption></figure>`;
const rows = demos.map(d => `<tr class="${d[6]?"is-done":""}"><td class="mono">${d[0]}</td><td>${d[6]?`<a href="demos/${d[6]}">${d[1]}</a>`:d[1]}<small>${d[2]}</small></td><td class="mono">${d[3]}</td><td>${d[4]}</td><td class="mono">${d[6]?"● 已上线":"○ 第 "+d[5]+" 批"}</td></tr>`).join("\n");
const ruler = demos.filter((d,i,a)=>a.findIndex(x=>x[3]===d[3])===i && d[3]!=="—").map(d=>`<span><b>${d[3]}</b>${d[1]}</span>`).join("");

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anatomy Vita — 从分子到星球的生命解剖图</title>
<meta name="description" content="基于 Anatomy skill（MIT）扩展的生命科学交互图集：DNA、ATP 合酶、有丝分裂、神经元……从微观到宏观。">
<style>
:root{--paper:#f6f4ef;--ink:#1d1d1b;--muted:#6f6c66;--line:#d9d5cc;--accent:#d9480f;--card:#fbfaf7;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;--serif:"Iowan Old Style","Songti SC","Noto Serif CJK SC",Georgia,serif}
*{box-sizing:border-box}html,body{background:var(--paper);color:var(--ink)}
body{margin:0;font:17px/1.75 -apple-system,"PingFang SC","Noto Sans SC","Helvetica Neue",Arial,sans-serif}
main{max-width:760px;margin:0 auto;padding:56px 22px 120px}
.mono,.kicker,.fig-head,nav{font-family:var(--mono)}
nav{display:flex;justify-content:space-between;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:64px}
nav a{color:var(--ink);text-decoration:none}
h1{font:500 46px/1.15 var(--serif);letter-spacing:-.01em;margin:0 0 18px}
h1 em{font-style:normal;color:var(--accent)}
h2{font:500 26px/1.3 var(--serif);margin:72px 0 14px;padding-top:18px;border-top:1px solid var(--line)}
h3{font-size:17px;margin:34px 0 6px}
.kicker{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.lede{font-size:20px;line-height:1.65;color:#3a3936}
p{margin:0 0 16px}a{color:inherit;text-decoration-color:var(--accent);text-underline-offset:3px}
code{font:14px var(--mono);background:#ece8df;padding:1px 5px;border-radius:3px}
blockquote{margin:22px 0;padding:4px 0 4px 18px;border-left:3px solid var(--accent);font:20px/1.6 var(--serif)}
table{width:100%;border-collapse:collapse;font-size:14px;line-height:1.5;margin:14px 0 8px}
th,td{text-align:left;vertical-align:top;padding:9px 8px;border-bottom:1px solid var(--line)}
th{font:11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:400}
td small{display:block;color:var(--muted);font-size:12px}
tr.is-done td:last-child{color:var(--accent)}
.wide{margin-left:-60px;margin-right:-60px}@media(max-width:900px){.wide{margin-left:0;margin-right:0}.scroll{overflow-x:auto}}
.fig{margin:36px -60px;background:var(--card);border:1px solid var(--line);border-radius:6px;overflow:hidden}
@media(max-width:900px){.fig{margin:30px 0}}
.fig-head{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:10px 14px;border-bottom:1px solid var(--line)}
.fig-head a{color:var(--ink);text-decoration:none}
.fig iframe{display:block;width:100%;height:720px;border:0;background:#fff}
.fig figcaption{font-size:14px;line-height:1.6;color:var(--muted);padding:12px 14px;border-top:1px solid var(--line)}
.fig figcaption b{color:var(--ink);font-weight:600}
.ruler{display:flex;gap:0;overflow-x:auto;margin:22px 0;border-top:2px solid var(--ink);padding-top:8px}
.ruler span{flex:1 0 92px;font-size:12px;color:var(--muted);border-left:1px solid var(--line);padding:0 8px}
.ruler b{display:block;font:500 15px var(--mono);color:var(--ink)}
.laws{counter-reset:law;list-style:none;padding:0}
.laws li{counter-increment:law;position:relative;padding:0 0 14px 40px}
.laws li::before{content:counter(law,decimal-leading-zero);position:absolute;left:0;top:2px;font:12px var(--mono);color:var(--accent)}
footer{margin-top:90px;padding-top:18px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
</style></head><body><main>
<nav><a href="#">Anatomy Vita</a><span>基于 Anatomy · MIT</span></nav>
<div class="kicker">An extension of the Anatomy skill · 生命篇</div>
<h1>让机器<em>活</em>过来：<br>从 DNA 到星球的解剖图</h1>
<p class="lede">Anatomy 的信条是 <b>“物体本身就是解释”</b>——不画方框、箭头和浮动标签，而是发明一台真实的机器，让它的运动本身就是概念。Anatomy Vita 把这条信条推进到生命：分子是真正的机器，细胞和器官则用标本、教学模型和记录仪器的语言来画。</p>
<div class="ruler">${ruler}</div>

<h2>一 · 内核拆解：Anatomy 为什么好看</h2>
<p>把原 skill 拆开，它其实是三层：一条<b>信条</b>，一套<b>绘图语法</b>，一套让绘图可验证的<b>工具链</b>。</p>
<blockquote>Truth first。一个小而纯的模型同时驱动运动、读数、图注和无障碍文本——图上的每个数字都是真的。</blockquote>
<h3>十步流程</h3>
<p>定尺寸（Figure 40–80 个零件 / Hero 80–150 / Epic 需先询问）→ 写真相模型 → 发明物体 → ≥40 个零件清单（底座 / 结构 / 机构 / 控件 / 唯一被点亮的主体）→ 规划世界（等轴 45°/30°，fitProjection）→ 一次性生成几何 → 画家算法排序（depthOf、拆分包裹体、ray-cast 审计）→ 装进卡片（Fig 编号 / 标题 / 提示 / 实时读数）→ 让它活起来（指数跟随、弹簧、闲置巡演、指针与键盘、减少动态）→ 验证（截图、驱动、线条、4× 放大）。</p>
<h3>保留什么，改什么</h3>
<div class="scroll"><table><thead><tr><th>原 Anatomy</th><th>Vita 保留</th><th>Vita 改变 / 新增</th></tr></thead><tbody>
<tr><td>一个等轴相机、实心体、四个朝向色调</td><td>全部保留</td><td>同一相机贯穿 nm → km，靠刻度尺而不是透视表达尺度</td></tr>
<tr><td>只有刚性棱柱、车削体、管</td><td>kit 原样复用</td><td><code>shellOf</code> 半透明膜壳；截面并集轮廓（分裂中的细胞）；轮廓形变</td></tr>
<tr><td>单色 + 恰好一个点亮的强调色</td><td>“只点亮一个”规则</td><td>染色系统：dapi / gfp / rfp / eosin / hema / atp / myelin / oxy / deoxy，用 color-mix 保留四色调</td></tr>
<tr><td>一切都是机器隐喻</td><td>分子层面不变（它们本来就是机器）</td><td>组织 / 器官改用标本语法：底座、支架杆、玻片、记录仪；仅抽象过程（如分化）用隐喻</td></tr>
<tr><td>零件完全相同</td><td>—</td><td><code>rng(seed)</code> 种子化变异：没有两个细胞一样，但每次构建都一样</td></tr>
<tr><td>静态几何 + 变换</td><td>painter 排序</td><td>kit 内联到页面（K / G / T 命名空间），每帧重建几何以表达生长与拓扑变化</td></tr>
<tr><td>机器时间尺度</td><td>真实数字</td><td>µs → 小时：读数标注“放慢 N 倍”，相位时钟</td></tr>
</tbody></table></div>

<h2>二 · 新增的生命法则</h2>
<ol class="laws">
<li><b>标尺即真相。</b>每张图的底座上都有一把校准过的刻度尺，标出真实尺寸。</li>
<li><b>染色代替配色。</b>颜色只来自真实的染料或荧光蛋白：DNA 是 DAPI 蓝，神经元是 GFP 绿，质子是 RFP 红。</li>
<li><b>时间要承认被改写。</b>动作电位以 µs 计、细胞分裂以小时计；读数永远写明“放慢 2000×”。</li>
<li><b>粒子守恒。</b>质子、离子、dNTP 做布朗运动，但数量可数且守恒。</li>
<li><b>拓扑可以变。</b>一个细胞真的变成两个：膜轮廓是截面并集，而非两个圆叠在一起。</li>
<li><b>标本，而非卡通。</b>细胞以上的对象放在玻片、盖玻片、支架或教学模型底座上，像实验室里真实摆放的那样。</li>
<li><b>隐喻需要声明。</b>只有无实体的过程（分化景观、反馈）才发明机器，并在图注里说明这是隐喻。</li>
</ol>

<h2>三 · 已上线的图</h2>
<p>悬停、点击或键盘都能驱动；离开视口自动暂停，系统设置“减少动态”时停在关键帧。</p>
${done.map(fig).join("\n")}

<h2>四 · 从微观到宏观：全部 22 张图</h2>
<div class="wide scroll"><table><thead><tr><th>#</th><th>主题</th><th>尺度</th><th>发明的物体</th><th>状态</th></tr></thead><tbody>
${rows}
</tbody></table></div>
${Object.entries(batchName).map(([b,n])=>`<p class="mono" style="font-size:13px;margin:4px 0;color:var(--muted)">${n}：${demos.filter(d=>d[5]==b).map(d=>d[0]).join(" · ")}</p>`).join("")}

<h2>五 · bio 工具层</h2>
<div class="scroll"><table><thead><tr><th>API</th><th>作用</th></tr></thead><tbody>
<tr><td><code>liveScript()</code></td><td>把 iso-kit / lathe / tube 内联为 K、G、T，让几何在浏览器里逐帧重建</td></tr>
<tr><td><code>rng(seed)</code></td><td>线性同余种子随机：可复现的生物变异</td></tr>
<tr><td><code>stain(name, svg, k)</code></td><td>给任意实心体上染料，保持四朝向色调</td></tr>
<tr><td><code>shellOf(c, r, P)</code></td><td>前后两半的半透明膜壳，可以看进细胞内部</td></tr>
<tr><td><code>plinth()</code> / <code>standRod()</code></td><td>标本底座（带刻度尺与铭牌）与支架杆</td></tr>
<tr><td><code>byDepth()</code></td><td>粒子 / 细胞的画家排序</td></tr>
<tr><td><code>vitaPage()</code></td><td>页面外壳：导航、卡片、事实栏、<code>?embed</code> 嵌入模式</td></tr>
<tr><td><code>scene(P)</code> <small>v2</small></td><td>深度收集器：<code>put / at / tube</code> 收进来，<code>svg()</code> 从后往前画</td></tr>
<tr><td><code>LOOP_SRC</code> → <code>vitaLoop()</code> <small>v2</small></td><td>共享运行时：离屏暂停、闲置巡演、指针 / 点击 / 键盘、减少动态时静止，每张图行为一致</td></tr>
<tr><td><code>soft.mjs</code> <small>v3</small></td><td><code>blobOf</code> 平滑融合体（分裂中的细胞、分叶器官）；<code>clusterOf</code> 堆积细胞团：每个细胞按自己的球体着色、相邻处描出细胞膜，<code>press</code> 让接触面压平（致密化）；<code>packSpheres</code> 把细胞松弛装进容器</td></tr>
<tr><td><code>branch.mjs</code> <small>v3</small></td><td><code>treeOf / treeItems</code>：按 Murray 定律分叉变细的树（树突、血管、气道、根），每个分叉落在球形三通上</td></tr>
<tr><td><code>check.mjs</code> <small>v3</small></td><td>生命法则检查器：无报错、读数在动、键盘可用、减少动态时静止、390 px 不溢出、图注有标尺与时间缩放、染料合法、事实栏</td></tr>
<tr><td>染料 <code>na k trna cyt</code> <small>v2</small></td><td>钠、钾、tRNA、胞质染料；图例色块 <code>mark: "na"</code> 直接用染料色</td></tr>
</tbody></table></div>

<footer>Anatomy Vita 建立在 <a href="https://github.com/wheresryan22/anatomy">Anatomy</a>（Ryan · @wheresryan22，MIT License）之上，kit 与脚本原样复用。原站：<a href="https://skills.wheresryan.sh/anatomy">skills.wheresryan.sh/anatomy</a>。生物学数值为教学近似，见各图事实栏。</footer>
</main>
<script>
document.querySelectorAll(".fig iframe").forEach(f=>f.addEventListener("load",()=>{try{const h=f.contentDocument.documentElement.scrollHeight;if(h>200)f.style.height=h+"px"}catch(e){}}));
</script></body></html>`;
writeFileSync(new URL("./site/index.html", import.meta.url), html);
console.log("ok", html.length);
