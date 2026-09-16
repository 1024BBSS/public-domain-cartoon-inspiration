# 公版卡通灵感在线版

给同事和 Agent 共用的静态视觉索引。关系结构是“角色 / 主体 → 作品 → 画面”，同时提供场景与节日入口。

当前另有 `albums.html`：分层展示公版历史封面、近 70 年需授权经典，以及“鹰翼摇滚”“西部乡村”两条专辑/周边/公版母题脉络，不把现代专辑或官方周边误作公版素材。

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
- `音乐视觉`：按艺术路径浏览历史封面、现代经典和专题脉络；现代缩略图只作研究。

## Agent 的入口

- `data/relations.json`：角色、作品、场景、节日及它们的稳定 ID 和关系。
- `data/entities/<entity-id>.json`：单个角色 / 主体的完整工作包。
- `data/works/<work-id>.json`：单个作品及其画面记录。
- `data/catalog.json`：全部具体画面、来源链接和逐条版权路径。
- `manifest.json`：构建版本、文件校验与数量。
- `data/albums.json`：公版封面、需授权经典及专题脉络，含视觉结构、市场信号、可转化方向和版权门。

网页与 Agent JSON 共用同一份构建数据，页面深链可直接定位角色、作品和画面。

## 更新

源资料更新后，在本机运行：

```bash
node tools/build.mjs
node tools/build-albums.mjs
```

构建会从 Eagle 事实源读取图片、生成 960px WebP 预览、重建公开目录与关系数据，并重新复制指定设计系统的 `tokens.css` 与 `components.css`。

`source/cartoon-ip-supplement.json` 与 `source/ghost-commercial-supplement.json` 保存已核验作品、风险边界和 Eagle item ID。`source/album-public-domain.json` 保存公版历史封面；`source/album-license-only.json` 保存现代需授权研究线索；`source/eagle-rock-lineage.json` 与 `source/western-country-lineage.json` 分别保存鹰翼摇滚、西部乡村专题的商品、专辑和公版母题分层记录。

幽灵图源位于 Eagle 的 `04｜幽灵与通灵｜A证据`，公版封面源流位于 `05｜专辑封面｜公版源流与授权研究`。图片原件仍以 Eagle 为事实源；补充文件只描述关系与证据，不保存第二份原图。新的 Grok 调研包先用 `node tools/import-grok-intake.mjs /解包根目录` 去重、核验和写入 Eagle，再进入公开构建。
