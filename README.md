# 公版卡通灵感在线版

给同事和 Agent 共用的静态视觉索引。关系结构是“角色 / 主体 → 作品 → 画面”，同时提供场景与节日入口。

当前另有 `albums.html`：以 200 张近 70 年经典封面为母库，可按封面或艺人进入，并按年代、音乐类型与视觉方法检索；另保留公版历史封面、“鹰翼摇滚”和“西部乡村”专题。现代封面只作研究，不作公版素材。

`super-ip.html` 是美国超级 IP 与权利机会库。当前包含 6,864 个美区高知名候选，其中 6,520 个文娱文化候选、6,251 个美国全民级候选、6,242 个 `100M+ 认知等效`、3 个 `100M+ 直接人数`，以及 284 个体育赛事、联盟、球队或运动员。文娱层覆盖角色动画、影视电视、演员与主持、音乐、游戏、书籍、舞台、媒体、播客、网络创作者与艺术活动。认知等效使用 YouGov Fame 百分比乘以 2020 美国成年人口，仅用于全国认知筛选，不是独立观众、销量或商业授权。

页面提供 6,264 张视觉参考：32 张来自站内逐素材标注的公版图库，6,232 张来自 YouGov 的外部识别参考。外部识别参考只能帮助确认研究对象，不能作为生产素材；其余候选显示统一的扁平视觉 DNA，包括典型元素、色板和构图提示。

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
- `data/super-ip-us.json`：美国高知名角色、作品、体育、音乐人与文化母题候选，含权利路由、视觉线索、认知调查与直接人数证据状态。

网页与 Agent JSON 共用同一份构建数据，页面深链可直接定位角色、作品和画面。

万圣节内容不设独立趋势页，也不在主导航增加专题跳转。它作为“图素”进入现有的 `画面`、`场景 / 题材` 和 `节日` 入口：前台先显示实际图像，来源链接和趋势证据只放在详情或源数据中。完整标准见 `source/halloween-visual-elements-requirements.md`。

## 更新

源资料更新后，在本机运行：

```bash
node tools/build.mjs
node tools/rebuild-album-canon.mjs
node tools/build-albums.mjs
node tools/validate-album-canon.mjs
node tools/refresh-yougov-fame.mjs
node tools/build-super-ip.mjs
node tools/validate-super-ip.mjs
```

构建会从 Eagle 事实源读取图片、生成 960px WebP 预览、重建公开目录与关系数据，并重新复制指定设计系统的 `tokens.css` 与 `components.css`。

`source/cartoon-ip-supplement.json`、`source/ghost-commercial-supplement.json` 与 `source/halloween-classics-supplement.json` 保存已核验作品、风险边界和 Eagle item ID。`source/halloween-trend-watchlist.json` 仅作后台趋势证据，不生成前台专题页。`source/album-canon-seed.psv` 保存 200 张母库的人工定款；`source/album-license-only.json` 保存补齐图源后的现代需授权研究记录；`source/album-public-domain.json` 保存公版历史封面；`source/eagle-rock-lineage.json` 与 `source/western-country-lineage.json` 分别保存鹰翼摇滚、西部乡村专题。

`source/super-ip-us-seed.json` 是人工定款候选源；`source/yougov-us-fame.json` 是覆盖 25 个文娱类型的可刷新认知快照；`source/super-ip-visual-profiles.json` 是人工视觉 DNA。S / A 只是美区筛选层，不是调查百分比。`100M+ 认知等效` 与 `100M+ 直接人数` 永远分栏：前者来自 YouGov Fame × 美国成年人口，后者只接收公开、可复核且口径明确的美国人数资料。快捷入口会清空旧筛选，避免隐藏条件把全民级候选压成少数结果。新增条目时必须保留来源、视觉图类型、权利入口和证据状态，不能把“高知名”或“识别参考图”改写成“可商用”。

幽灵图源位于 Eagle 的 `04｜幽灵与通灵｜A证据`，公版封面源流位于 `05｜专辑封面｜公版源流与授权研究`。图片原件仍以 Eagle 为事实源；补充文件只描述关系与证据，不保存第二份原图。新的 Grok 调研包先用 `node tools/import-grok-intake.mjs /解包根目录` 去重、核验和写入 Eagle，再进入公开构建。
