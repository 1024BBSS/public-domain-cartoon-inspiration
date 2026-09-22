# 美国超级 IP 在线库

网站首页 `index.html` 是美国超级 IP 与权利机会库。原公版视觉灵感库保留为 `visual.html`，关系结构是“角色 / 主体 → 作品 → 画面”，同时提供场景与节日入口。旧链接 `super-ip.html` 会保留查询条件并转入首页。

`calendar.html` 是美国消费力日历。默认从打开当天看未来 90 天，每个节点先显示美元口径，再展开最近五年同口径实绩 / 调查预期、增长趋势、本年度模型预估区间、品类切片与来源。节日计划消费、线上销售、核心零售、捐赠、人群经济盘和退税现金流不跨口径相加；无统一报告的节点明确留空；冬季礼赠总盘作为父级，光明节、圣诞节等相关节日作为各自拥有独立时间轴的子级，不重复显示总盘金额，并明示“本节点无单独金额”。页面同时保留消费季甘特、BLS 发薪周期脉冲、商品运营倒排、现有 IP / 视觉题材与未来 12 周服装气候需求。天气层把 NOAA 2021–2025 每日观测汇总为最近五个完整自然年的历史均值，按 9 个运营气候区和 13 个代表站估计换季节奏，再映射为 5 级服装需求；它不是天气预报。客户地区、货代所说的“美东”和仓配运费分成三层，`约 80% 在美东` 在接入真实州 / ZIP 订单前保持待核。Agent 使用 `data/consumer-calendar.json`，超级 IP 详情可反向进入相关消费节点。

当前另有 `albums.html`：以 200 张近 70 年经典封面为母库，可按封面或艺人进入，并按年代、音乐类型与视觉方法检索；另保留公版历史封面、“鹰翼摇滚”和“西部乡村”专题。现代封面只作研究，不作公版素材。

`memes.html` 是美国 Meme 图谱。当前收录 315 个合并后的 Meme 家族：265 个现代模板研究记录、50 个来自现有视觉库的具体公版改编底图。可从“Meme 家族”找表达结构，也可从“来源人物 / 作品”集中查看同一人物、影视、角色或历史母题下的相关画面。Imgflip 排名与 caption 数只作当前平台活跃信号，Memegen 收录只证明目录存在；二者都不是美国人口知名度或授权证明。关联超级 IP 的调查百分比只属于来源人物 / 作品，不属于 Meme 本身。现代原图默认只供研究；只有标明“公版具体版本”的历史图像进入可复用池，且仍需检查后期表达、商标和商品来源误认。

首页当前包含 6,864 个美区高知名候选，其中 6,520 个文娱文化候选、6,251 个美国全民级候选、6,242 个 `100M+ 认知等效`、3 个 `100M+ 直接人数`，以及 284 个体育赛事、联盟、球队或运动员。文娱层覆盖角色动画、影视电视、演员与主持、音乐、游戏、书籍、舞台、媒体、播客、网络创作者与艺术活动。认知等效使用 YouGov Fame 百分比乘以 2020 美国成年人口，仅用于全国认知筛选，不是独立观众、销量或商业授权。

首页按“主类 → 领域 / 类型 → 题材 / 身份”逐级展开：一次点击主类，一次点击领域，一次点击题材，三次以内进入关键结果。影视按作品形态与 19 类题材检索；人物按 11 个职业领域与 40 种身份检索；音乐、体育、游戏、书籍、宗教神话等使用各自的专业分类。跨类型对象可出现在多个相关入口，卡片优先显示当前入口路径，并保留主路径。结果每批加载 48 条，滚动接近底部自动追加，也可手动继续加载。

分类不是版权结论。5,491 / 6,258 个调查主体已匹配 Wikidata 的作品类型、流派、职业或运动字段，命中率 87.7%；未命中项使用本库人工规则。每条记录都带 `taxonomyPaths`、`taxonomySource`、`taxonomyConfidence` 和 `taxonomyEvidence`，Agent 可回读多入口关系与分类依据。

6,864 条记录现已全部有主图，共关联 7,144 件视觉来源。70 个宗教 / 神话母题各保留 5 件独立历史视觉，并至少覆盖 3 位艺术家 / 创作者；绘画、壁画、版画 / 手稿、雕塑、镶嵌等媒介分别标注，不强行把同一主题压成一种“标准形象”。卡片显示主图，详情横向查看作品谱系、作者、年代、媒介、许可和原始来源。现代角色、人物、球队和品牌的识别参考只能帮助确认研究对象，不能作为生产素材。

## 公开边界

- 收录：已确认的期限届满、未续期、公共领域、开放馆藏或 CC0 版本。
- 排除：`未续期待复核`、`公版线索 · 待复核`、仍受保护版本、Eagle 本地路径和内部证据附件。
- 公版结论属于具体作品和具体版本，不自动覆盖后期角色造型、现代修复、商标、演员肖像或平台规则。

## 人的入口

- `角色 / 主体`：一次查看同一角色的相关作品、版本、画面、艺术线索与共同出现角色。
- `作品`：查看作品内全部画面、角色、版权路径与来源。
- `画面`：直接检索具体视觉。
- `场景 / 题材`、`节日`：从使用场景进入画面池。
- `幽灵、鬼屋与通灵`：聚合白布幽灵、文学亡灵、通灵摄影、舞台幻术、早期动画与东亚幽魂。
- `音乐视觉`：按封面或艺人浏览；点击艺人可获得其全部已收录封面，并保留可分享的筛选链接。

## Agent 的入口

- `data/relations.json`：角色、作品、场景、节日及它们的稳定 ID 和关系。
- `data/entities/<entity-id>.json`：单个角色 / 主体的完整工作包。
- `data/works/<work-id>.json`：单个作品及其画面记录。
- `data/catalog.json`：全部具体画面、来源链接和逐条版权路径。
- `manifest.json`：构建版本、文件校验与数量。
- `data/albums.json`：200 张经典封面、公版封面及专题脉络，含年代、类型、艺人关系、经典理由、视觉结构、可转化方向和版权门。
- `data/super-ip-us.json`：美国高知名角色、作品、体育、音乐人与文化母题候选，含三层分类、多入口标签、分类证据、权利路由、视觉线索、认知调查与直接人数证据状态。
- `data/consumer-calendar.json`：节日与消费季、13 套消费金额档案及趋势预估、运营倒排、发薪脉冲、9 个气候区的月常态、12 周服装需求，以及客户地区和仓配成本的待接数据口径。
- `data/memes.json`：Meme 家族、来源人物 / 作品、表达机制、文字槽位、平台活跃信号、关联超级 IP、版权 / 肖像 / 商标边界和 Agent 改编提示。

网页与 Agent JSON 共用同一份构建数据，页面深链可直接定位角色、作品和画面。

当前公版视觉目录含 905 条记录、854 张去重图片。首批“历史形象演变”补充把 Alice、The Wonderful Wizard of Oz 与 Pinocchio 连接到 6 个具体出版版本、50 张来源可回查的画面；角色页按“母 IP → 画家 / 版本 → 多张画面”呈现，现代影视改编继续单独排除。

万圣节内容不设独立趋势页，也不在主导航增加专题跳转。它作为“图素”进入现有的 `画面`、`场景 / 题材` 和 `节日` 入口：前台先显示实际图像，来源链接和趋势证据只放在详情或源数据中。完整标准见 `source/halloween-visual-elements-requirements.md`。

## 更新

源资料更新后，在本机运行：

```bash
node tools/build.mjs
node tools/rebuild-album-canon.mjs
node tools/build-albums.mjs
node tools/validate-album-canon.mjs
node tools/refresh-yougov-fame.mjs
node tools/refresh-wikidata-taxonomy.mjs
node tools/refresh-super-ip-visual-sources.mjs
node tools/build-super-ip.mjs
node tools/validate-super-ip.mjs
node tools/refresh-apparel-weather.mjs
node tools/build-consumer-calendar.mjs
node tools/validate-consumer-calendar.mjs
node tools/build-memes.mjs --refresh
node tools/validate-memes.mjs
```

构建会从 Eagle 事实源读取图片、生成 960px WebP 预览、重建公开目录与关系数据，并重新复制指定设计系统的 `tokens.css` 与 `components.css`。

`source/cartoon-ip-supplement.json`、`source/ghost-commercial-supplement.json` 与 `source/halloween-classics-supplement.json` 保存已核验作品、风险边界和 Eagle item ID。`source/halloween-trend-watchlist.json` 仅作后台趋势证据，不生成前台专题页。`source/album-canon-seed.psv` 保存 200 张母库的人工定款；`source/album-license-only.json` 保存补齐图源后的现代需授权研究记录；`source/album-public-domain.json` 保存公版历史封面；`source/eagle-rock-lineage.json` 与 `source/western-country-lineage.json` 分别保存鹰翼摇滚、西部乡村专题。

`source/meme-template-sources.json` 保存 Memegen 与 Imgflip 的目录快照；`tools/build-memes.mjs` 将同一叙事模板的服务别名合并为家族，并把现代研究图缓存为本地 WebP。缓存图不是权利转移，也不进入生产素材池。新增 Meme 必须分别记录原始来源、表达机制、活跃证据、版权、肖像 / 人格权、商标 / 来源误认和安全改编路线。

`source/super-ip-us-seed.json` 是人工定款候选源；`source/yougov-us-fame.json` 是覆盖 25 个文娱类型的可刷新认知快照；`source/wikidata-taxonomy.json` 是 CC0 结构化分类快照；`source/super-ip-visual-profiles.json` 是人工视觉 DNA；`source/super-ip-visual-sources.json` 保存开放图源、作者、年代、媒介、逐图许可与来源页。S / A 只是美区筛选层，不是调查百分比。`100M+ 认知等效` 与 `100M+ 直接人数` 永远分栏：前者来自 YouGov Fame × 美国成年人口，后者只接收公开、可复核且口径明确的美国人数资料。快捷条件可与三层分类组合，URL 会保留 `category`、`subcategory`、`topic`、权利和知名度条件。新增条目必须保留来源、视觉图类型、分类来源、权利入口和证据状态，不能把“高知名”“识别参考图”或“图片开放许可”改写成“角色可商用”。

`source/apparel-weather-normals.json` 是 NOAA 2021–2025 每日观测的月度汇总快照，可由 `tools/refresh-apparel-weather.mjs` 重建。脚本只纳入日观测覆盖率达到 80% 的站点月份，并要求每月至少有 4 个可用年份。气候区覆盖 50 州与 DC，但只用于服装换季规划；实时天气、客户占比和实际运费仍分别需要天气服务、订单州 / ZIP、仓库 ZIP、承运商、服务和包裹重量。

`source/consumer-spending.json` 保存消费金额事实源、五年序列、目标年、来源、口径、可信度、事件映射与明确空值。构建器仅对至少 3 个历史点做线性趋势估计；默认使用 5 个同口径年份，预测区间是方向性误差带，不是统计置信区间。2026 万圣节等尚未发布当年调查的节点，发布后必须用官方报告替换模型值。

幽灵图源位于 Eagle 的 `04｜幽灵与通灵｜A证据`，公版封面源流位于 `05｜专辑封面｜公版源流与授权研究`。图片原件仍以 Eagle 为事实源；补充文件只描述关系与证据，不保存第二份原图。新的 Grok 调研包先用 `node tools/import-grok-intake.mjs /解包根目录` 去重、核验和写入 Eagle，再进入公开构建。
