import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const eagleBase = "http://127.0.0.1:41595/api";
const eagleFolderId = "MTQ0XCUZOVLNG";
const eagleImagesRoot = "/Users/wenshanchen/Pictures/idea.library/images";
const researchDate = "2026-09-19";
const intakeVersion = "halloween-visual-elements-2026-09-19-v1";
const outputPath = path.join(projectRoot, "source/halloween-visual-elements-supplement.json");
const receiptPath = path.join(projectRoot, "source/halloween-visual-elements-receipt.json");
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "halloween-visual-elements-"));

const commons = (id, commonsTitle, metadata) => ({ id, provider: "commons", sourceId: commonsTitle, ...metadata });
const aic = (id, sourceId, metadata) => ({ id, provider: "aic", sourceId, ...metadata });
const met = (id, sourceId, metadata) => ({ id, provider: "met", sourceId, ...metadata });

const candidates = [
  commons("pumpkinheads-heaven-1901", "File:PumpkinheadsHeaven1901.jpg", {
    title: "Pumpkinheads Heaven",
    year: "1901",
    assetType: "摄影式节庆明信片",
    motifs: ["南瓜头人物", "稻草堆", "乡野聚会"],
    actions: ["围坐", "阅读标牌", "群体叙事"],
    compositions: ["横向群像", "舞台式中央构图", "背部主图"],
    colors: ["旧纸黄", "南瓜橙", "草木褐"],
    productionUses: ["背部主图", "复古拼贴", "万圣节故事场景"],
    usage: "把南瓜头当作一组有社会关系的角色，而不是单个符号；可转译为乐队、读报会或乡野俱乐部。",
    avoid: "不要沿用明信片原句；避免把历史摄影误称现代电影或品牌角色。",
    styles: ["复古明信片", "乡野怪诞", "拟人群像"],
    scenes: ["万圣节贺卡与民俗图像", "南瓜灯与拟人角色"],
    characters: ["南瓜头群像"],
    tags: ["万圣节", "生活 / 节庆", "暗黑 / 怪诞"],
  }),
  commons("thrilling-halloween-cats-pumpkins-1910", "File:\"A Thrilling Hallowe'en.\" (Three black cats flying through the air with Jack-o-lanterns).jpg", {
    title: "A Thrilling Hallowe'en",
    year: "ca. 1910",
    assetType: "彩色万圣节明信片",
    motifs: ["飞行黑猫", "南瓜灯", "满月", "幽灵"],
    actions: ["猫群飞行", "幽灵抬举南瓜", "环形巡游"],
    compositions: ["纵向队列", "圆月徽章", "中心胸花"],
    colors: ["夜蓝", "南瓜橙", "黑", "月黄"],
    productionUses: ["中心胸花", "纵向背图", "角色队列"],
    usage: "飞行猫群与南瓜灯形成节奏队列；适合扁平化为三至五个重复动作。",
    avoid: "不要复制整张贺卡字排；避免套用现代黑猫角色、电影造型或品牌标识。",
    styles: ["彩色石印", "复古贺卡", "夜空巡游"],
    scenes: ["万圣节贺卡与民俗图像", "黑猫、南瓜灯与月夜"],
    characters: ["飞行黑猫群", "南瓜幽灵"],
    tags: ["万圣节", "动物 / 自然", "暗黑 / 怪诞"],
  }),
  commons("witch-pumpkin-cat-flight-1910", "File:\"Hallowe'en.\" (A Witch riding a broomstick being pulled by a jack-o-lantern with a black cat).jpg", {
    title: "Hallowe'en: Witch, Jack-o'-Lantern and Black Cat",
    year: "ca. 1910",
    assetType: "彩色万圣节明信片",
    motifs: ["女巫", "飞行南瓜灯", "黑猫", "扫帚", "月亮"],
    actions: ["女巫骑扫帚", "南瓜牵引", "黑猫同行"],
    compositions: ["横向飞行", "单一叙事带", "中心胸花"],
    colors: ["南瓜橙", "深绿", "夜蓝", "黑"],
    productionUses: ["横向胸花", "背部主图", "飞行剪影"],
    usage: "用牵引关系把女巫、南瓜和猫串成一个动作；比静态符号拼贴更有叙事。",
    avoid: "只取历史明信片中的动作机制；避开现代影视女巫、具体演员脸和品牌角色。",
    styles: ["彩色石印", "复古贺卡", "飞行叙事"],
    scenes: ["万圣节贺卡与民俗图像", "女巫飞行与黑猫"],
    characters: ["女巫", "黑猫", "南瓜灯"],
    tags: ["万圣节", "神话 / 魔法", "动物 / 自然"],
  }),
  commons("merry-halloween-pumpkin-choir-1910", "File:\"A Merry Halloween.\" (Girl blowing a horn with three Jack-o-Lanterns).jpg", {
    title: "A Merry Halloween: Three Jack-o'-Lanterns",
    year: "ca. 1910",
    assetType: "彩色万圣节明信片",
    motifs: ["三只南瓜灯", "黑猫", "新月", "号角"],
    actions: ["少女吹号", "南瓜合唱", "黑猫守候"],
    compositions: ["横向四主体", "舞台式队列", "背部主图"],
    colors: ["夜蓝", "南瓜橙", "稻草黄", "黑"],
    productionUses: ["南瓜角色组", "音乐主题", "复古横幅"],
    usage: "三只表情不同的南瓜灯可发展成乐队或合唱团；保留高低错落和表情差异。",
    avoid: "不要复制人物肖像与原文；避开后期影视南瓜角色和现代商标。",
    styles: ["复古贺卡", "拟人南瓜", "舞台群像"],
    scenes: ["万圣节贺卡与民俗图像", "南瓜灯与拟人角色"],
    characters: ["南瓜灯三人组", "黑猫"],
    tags: ["万圣节", "生活 / 节庆", "角色 / 卡通"],
  }),
  commons("jackolantern-car-1908", "File:\"You Auto Have a Happy Hallowe'en.\" (Jack-O-Lantern driving a car).jpg", {
    title: "You Auto Have a Happy Hallowe'en",
    year: "1908",
    assetType: "彩色万圣节明信片",
    motifs: ["南瓜头司机", "南瓜汽车", "手套"],
    actions: ["驾驶", "挥手", "向前冲"],
    compositions: ["纵向单主体", "徽章", "中心胸花"],
    colors: ["南瓜橙", "车身红", "黑", "奶油白"],
    productionUses: ["中心胸花", "车队系列", "幽默角色"],
    usage: "把南瓜灯变成有职业和动作的司机；可发展交通工具、快递或夜间巡游系列。",
    avoid: "不要复制原句；不要加入现代汽车品牌、车标或可识别车型。",
    styles: ["复古贺卡", "拟人交通工具", "幽默角色"],
    scenes: ["万圣节贺卡与民俗图像", "南瓜灯与拟人角色"],
    characters: ["南瓜头司机"],
    tags: ["万圣节", "角色 / 卡通", "生活 / 节庆"],
  }),
  commons("witch-cauldron-remembrance-1915", "File:1910s-Witch-Cauldron-Halloween-Postcard-I-Summon-Up-Remembrance-1152x1536.jpg", {
    title: "I Summon Up Remembrance of Things Past",
    year: "1915",
    assetType: "彩色万圣节明信片",
    motifs: ["女巫", "坩埚", "蒸汽", "小精灵边框"],
    actions: ["搅动坩埚", "召唤记忆", "围观"],
    compositions: ["画中画", "竖版徽章", "边框"],
    colors: ["南瓜橙", "鼠尾草绿", "黑", "旧纸白"],
    productionUses: ["竖版胸花", "塔罗牌式构图", "边框装饰"],
    usage: "画中画与上方小角色边框可拆成独立版式；坩埚蒸汽适合形成文字留白。",
    avoid: "不要照抄原句或签名；现代女巫品牌、魔法学校和影视道具不在范围内。",
    styles: ["复古贺卡", "画中画", "魔法仪式"],
    scenes: ["万圣节贺卡与民俗图像", "女巫、坩埚与仪式"],
    characters: ["坩埚女巫"],
    tags: ["万圣节", "神话 / 魔法", "版画 / 纹样"],
  }),
  commons("halloween-lantern-car-1914", "File:The Halloween Lantern car 1914.jpg", {
    title: "The Halloween Lantern Car",
    year: "1914",
    assetType: "彩色万圣节明信片",
    motifs: ["灯笼车", "南瓜乘客", "女巫", "猫头鹰", "边框"],
    actions: ["乘车巡游", "向前行驶", "动物陪伴"],
    compositions: ["横向车辆", "装饰边框", "长条胸花"],
    colors: ["奶油白", "南瓜橙", "灰绿", "酒红"],
    productionUses: ["横向胸花", "节庆巡游", "徽章边框"],
    usage: "车辆本身长着表情，乘客与车身形成多层角色；适合扁平化为万圣节巡游车。",
    avoid: "不要加入现代汽车品牌、影视角色或受保护的交通工具造型。",
    styles: ["复古贺卡", "拟人器物", "节庆巡游"],
    scenes: ["万圣节贺卡与民俗图像", "万圣节巡游与交通工具"],
    characters: ["灯笼车", "南瓜乘客", "女巫"],
    tags: ["万圣节", "器物 / 建筑", "角色 / 卡通"],
  }),
  commons("jolly-halloween-black-cat-procession", "File:A Jolly Halloween card Black Cats.jpg", {
    title: "A Jolly Halloween: Black Cat Procession",
    year: "ca. 1900–1916",
    assetType: "彩色万圣节明信片",
    motifs: ["尖帽黑猫", "南瓜提灯", "扫帚", "儿童"],
    actions: ["猫群列队", "提灯行进", "儿童布置"],
    compositions: ["横向队列", "重复角色", "背部主图"],
    colors: ["黑", "南瓜橙", "扫帚黄", "浅灰"],
    productionUses: ["角色队列", "重复纹样", "长条胸花"],
    usage: "黑猫以相同轮廓、不同提灯组成队列；适合做连续边饰或四到六只的行进图。",
    avoid: "不要复制贺卡标题；避免现代黑猫品牌角色和现成商品版式。",
    styles: ["复古贺卡", "角色队列", "儿童节庆"],
    scenes: ["万圣节贺卡与民俗图像", "黑猫、南瓜灯与月夜"],
    characters: ["尖帽黑猫队列"],
    tags: ["万圣节", "动物 / 自然", "角色 / 卡通"],
  }),
  commons("all-halloween-card-1911", "File:All Hallween Card 1911.jpg", {
    title: "All Hallowe'en Card",
    year: "1911",
    assetType: "彩色万圣节明信片",
    motifs: ["女巫", "扫帚", "月亮脸", "猫头鹰", "星空"],
    actions: ["女巫骑行", "猫头鹰守望", "月亮凝视"],
    compositions: ["竖版主角", "月亮徽章", "装饰字排"],
    colors: ["夜蓝", "月黄", "森林绿", "南瓜橙"],
    productionUses: ["竖版胸花", "月夜徽章", "女巫角色图"],
    usage: "月亮脸、猫头鹰与女巫形成上下三层结构；适合重构成纵向图章。",
    avoid: "不要沿用原诗文与整版排版；避开现代影视女巫和授权角色。",
    styles: ["复古贺卡", "月夜飞行", "装饰字排"],
    scenes: ["万圣节贺卡与民俗图像", "女巫飞行与黑猫"],
    characters: ["扫帚女巫", "月亮脸", "猫头鹰"],
    tags: ["万圣节", "神话 / 魔法", "动物 / 自然"],
  }),
  commons("black-cat-pumpkin-detail-1910", "File:Black cat with pumpkin art detail, \"A Merry Halloween.\" (cropped).jpg", {
    title: "Black Cat with Pumpkin — Detail",
    year: "ca. 1910",
    parentSourceId: "merry-halloween-pumpkin-choir-1910",
    assetType: "公版原图裁切图素",
    motifs: ["黑猫", "南瓜", "玉米秆"],
    actions: ["黑猫蹲坐", "回头凝视"],
    compositions: ["双主体", "方形图素", "中心胸花"],
    colors: ["黑", "南瓜橙", "玉米黄", "草绿"],
    productionUses: ["小胸花", "袖口图", "贴纸式图案"],
    usage: "黑猫与南瓜紧密重叠，天然适合小面积双主体图；轮廓可压缩成三到四色。",
    avoid: "裁切图仍需回溯整张明信片；不要误称独立原创，也不要叠加现代角色特征。",
    styles: ["复古明信片裁切", "双主体", "颗粒印刷"],
    scenes: ["黑猫、南瓜灯与月夜", "万圣节单体图素"],
    characters: ["黑猫", "南瓜"],
    tags: ["万圣节", "动物 / 自然", "图素裁切"],
  }),
  commons("crescent-moon-stars-detail-1910", "File:Crescent moon and stars art detail, from- \"A Merry Halloween.\" (cropped).jpg", {
    title: "Crescent Moon and Stars — Detail",
    year: "ca. 1910",
    parentSourceId: "merry-halloween-pumpkin-choir-1910",
    assetType: "公版原图裁切图素",
    motifs: ["新月", "星星", "夜空"],
    actions: ["新月悬浮"],
    compositions: ["单主体", "角落装饰", "重复散点"],
    colors: ["夜蓝", "月黄", "黑"],
    productionUses: ["口袋小图", "角落图素", "满版散点"],
    usage: "粗颗粒新月和不规则星点可以作为其他主角的环境底图，不必再叠加复杂场景。",
    avoid: "避免加入现代影视月亮脸、品牌星标或原贺卡文字。",
    styles: ["复古明信片裁切", "夜空图素", "颗粒印刷"],
    scenes: ["黑猫、南瓜灯与月夜", "万圣节单体图素"],
    characters: ["新月与星星"],
    tags: ["万圣节", "图素裁切", "版画 / 纹样"],
  }),
  commons("pumpkin-witch-cat-bat-postcard-1926", "File:Pumpkin, Witch, Black Cat postcard circa 1926.png", {
    title: "Pumpkin, Witch, Black Cat and Bats",
    year: "ca. 1926",
    assetType: "彩色万圣节明信片",
    motifs: ["南瓜灯队列", "黑猫", "女巫", "月亮", "蝙蝠"],
    actions: ["女巫飞行", "猫群聚集", "南瓜排列"],
    compositions: ["横向舞台", "角色清单", "长条胸花"],
    colors: ["浅蓝", "南瓜橙", "黑", "奶油白"],
    productionUses: ["长条胸花", "元素清单", "儿童友好万圣节"],
    usage: "同一画面把南瓜、猫、女巫、月亮和蝙蝠分层排布；适合拆成可组合的元素套件。",
    avoid: "不要复制原文；不要把任一元素改造成现代授权角色或影视标志物。",
    styles: ["复古贺卡", "扁平角色", "横向舞台"],
    scenes: ["万圣节贺卡与民俗图像", "黑猫、南瓜灯与月夜"],
    characters: ["女巫", "黑猫群", "南瓜灯队列", "蝙蝠"],
    tags: ["万圣节", "角色 / 卡通", "动物 / 自然"],
  }),
  aic("bat-pine-isso-19c", 41357, {
    title: "A Bat Flying near a Pine Tree",
    year: "19th century",
    assetType: "水墨动物画",
    motifs: ["飞行蝙蝠", "松枝", "留白"],
    actions: ["蝙蝠俯冲", "翼膜展开"],
    compositions: ["上下双主体", "大面积留白", "竖版胸花"],
    colors: ["墨黑", "旧纸白", "淡褐"],
    productionUses: ["单色印花", "竖版背图", "东方夜行意象"],
    usage: "蝙蝠翼膜与松针形成软硬线条对照；适合单色重绘，不必套用西方吸血鬼语义。",
    avoid: "尊重原作文化语境；避免直接叠加现代吸血鬼、Batman 或影视符号。",
    styles: ["日本水墨", "动物写生", "留白构图"],
    scenes: ["夜行动物与月夜", "万圣节单体图素"],
    characters: ["飞行蝙蝠"],
    tags: ["万圣节", "动物 / 自然", "经典艺术"],
  }),
  aic("bat-ornament-aldegrever-1550", 77421, {
    title: "Ornamental Design with a Bat in the Centre",
    year: "1550",
    assetType: "装饰版画",
    motifs: ["中央蝙蝠", "怪诞生物", "卷草", "对称边框"],
    actions: ["蝙蝠展翼", "怪诞生物环绕"],
    compositions: ["垂直对称", "徽章", "边框", "满版纹样"],
    colors: ["黑", "旧纸白"],
    productionUses: ["徽章", "背部主图", "装饰边框", "重复纹样"],
    usage: "蝙蝠是对称装饰的中心铰链；上下怪诞生物和卷草可拆成边框、徽章与满版三种层级。",
    avoid: "不要把历史装饰误称现代哥特品牌图案；避免直接照搬整版用于商标式识别。",
    styles: ["文艺复兴装饰版画", "怪诞纹样", "黑白线刻"],
    scenes: ["万圣节边框、徽章与纹样", "夜行动物与月夜"],
    characters: ["装饰蝙蝠"],
    tags: ["万圣节", "版画 / 纹样", "动物 / 自然"],
  }),
  met("great-indian-fruit-bat-1777", 456949, {
    title: "Great Indian Fruit Bat",
    year: "ca. 1777–82",
    assetType: "自然史动物画",
    motifs: ["果蝠", "展开单翼", "爪部结构"],
    actions: ["单翼展开", "正面凝视"],
    compositions: ["单主体", "横向展开", "中心胸花"],
    colors: ["炭黑", "棕褐", "旧纸白"],
    productionUses: ["中心胸花", "动物解剖感", "单体重绘"],
    usage: "一侧展翼形成不对称张力，毛发、爪和翼膜可分别简化为三层线面。",
    avoid: "不要混入现代超级英雄、吸血鬼影视或品牌符号；自然史来源不等于万圣节原生语境。",
    styles: ["自然史绘画", "动物写生", "不对称构图"],
    scenes: ["夜行动物与月夜", "万圣节单体图素"],
    characters: ["大果蝠"],
    tags: ["万圣节", "动物 / 自然", "经典艺术"],
  }),
  met("crow-moon-kyosai-1887", 54631, {
    title: "Crow and the Moon",
    year: "ca. 1887",
    assetType: "水墨动物画",
    motifs: ["乌鸦", "月亮", "枯枝"],
    actions: ["乌鸦驻足", "低头观察"],
    compositions: ["单主体", "对角枯枝", "竖版胸花"],
    colors: ["墨黑", "灰褐", "月白"],
    productionUses: ["单色印花", "竖版背图", "月夜徽章"],
    usage: "乌鸦和月亮依靠极少笔触建立气氛；适合低色数、强轮廓、留白型印花。",
    avoid: "不要添加现代乐队 Logo、影视乌鸦角色或品牌标记；保留作品来源。",
    styles: ["日本水墨", "月夜动物", "极简留白"],
    scenes: ["夜行动物与月夜", "乌鸦与哥特文学"],
    characters: ["月下乌鸦"],
    tags: ["万圣节", "动物 / 自然", "经典艺术"],
  }),
  aic("flying-raven-ex-libris-1875", 111363, {
    title: "Flying Raven: Ex Libris",
    year: "1875",
    assetType: "文学版画图素",
    motifs: ["飞行乌鸦", "书票字样", "留白"],
    actions: ["乌鸦展翼飞行"],
    compositions: ["横向单主体", "标志式剪影", "中心胸花"],
    colors: ["黑", "旧纸白"],
    productionUses: ["单色胸花", "书票徽章", "袖口图"],
    usage: "乌鸦近乎纯黑剪影，适合直接抽象成低色数飞行动作；可与月相或短文案组合。",
    avoid: "《乌鸦》原文可另行核对，但不要混入现代乐队、影视或商标识别。",
    styles: ["马奈石版画", "文学书票", "黑白剪影"],
    scenes: ["乌鸦与哥特文学", "万圣节单体图素"],
    characters: ["飞行乌鸦"],
    tags: ["万圣节", "版画 / 纹样", "动物 / 自然"],
  }),
  aic("raven-bust-pallas-1875", 111365, {
    title: "The Raven on the Bust of Pallas",
    year: "1875",
    assetType: "文学版画",
    motifs: ["乌鸦", "帕拉斯胸像", "门楣", "强阴影"],
    actions: ["乌鸦栖停", "室内凝视"],
    compositions: ["上下对峙", "竖版场景", "背部主图"],
    colors: ["黑", "旧纸白", "灰"],
    productionUses: ["背部主图", "哥特文学系列", "单色印花"],
    usage: "乌鸦位于高处、人物缩在低处，利用尺度差产生压迫感；可转译为极简室内阴影。",
    avoid: "避免照搬整段诗句、现代电影海报或乐队专辑包装；商品使用前另查文字商标。",
    styles: ["马奈石版画", "哥特文学", "表现性黑白"],
    scenes: ["乌鸦与哥特文学", "幽暗室内与烛光"],
    characters: ["帕拉斯胸像上的乌鸦"],
    tags: ["万圣节", "文学 / 童话", "暗黑 / 怪诞"],
  }),
  met("moon-final-quarter-mellan-1635", 359769, {
    title: "The Moon in its Final Quarter",
    year: "1635",
    assetType: "天文版画",
    motifs: ["残月", "月面纹理", "圆形留白"],
    actions: ["月相变化"],
    compositions: ["单一圆形焦点", "徽章", "满版重复"],
    colors: ["黑", "灰", "旧纸白"],
    productionUses: ["月相系列", "徽章", "袖口图", "重复纹样"],
    usage: "真实月面纹理比卡通月牙更有识别度；可扩展成月相序列、徽章或单一圆形焦点。",
    avoid: "不要叠加现代航天机构标志、影视月球画面或受保护字标。",
    styles: ["科学版画", "月相研究", "单色纹理"],
    scenes: ["夜行动物与月夜", "万圣节边框、徽章与纹样"],
    characters: ["残月"],
    tags: ["万圣节", "版画 / 纹样", "其他视觉"],
  }),
  met("sleep-of-reason-goya-1799", 338473, {
    title: "The Sleep of Reason Produces Monsters",
    year: "1799",
    assetType: "怪诞版画",
    motifs: ["蝙蝠群", "猫头鹰群", "山猫", "伏案人物"],
    actions: ["群鸟盘旋", "人物沉睡", "山猫警觉"],
    compositions: ["中心人物", "上方群飞", "三角形背图"],
    colors: ["黑", "灰", "旧纸白"],
    productionUses: ["背部主图", "群飞纹样", "怪诞文学题材"],
    usage: "上方动物群与下方沉睡人物形成理性/梦魇对照；可拆成蝙蝠群、猫头鹰脸与伏案轮廓。",
    avoid: "不要断言作品原意就是万圣节；不要复刻完整版画当作新图，也不要加入现代影视怪物。",
    styles: ["戈雅版画", "梦魇群像", "黑白蚀刻"],
    scenes: ["夜行动物与月夜", "梦魇、睡眠与怪诞"],
    characters: ["蝙蝠与猫头鹰群", "沉睡的人"],
    tags: ["万圣节", "经典艺术", "暗黑 / 怪诞"],
  }),
  aic("student-candlelight-rembrandt-1642", 49088, {
    title: "Student at a Table by Candlelight",
    year: "ca. 1642",
    assetType: "烛光版画",
    motifs: ["蜡烛", "桌前人物", "黑暗室内", "书本"],
    actions: ["阅读", "烛光照明", "独坐"],
    compositions: ["单点光源", "暗部包围", "竖版场景"],
    colors: ["炭黑", "烛火黄", "灰褐"],
    productionUses: ["哥特烛光场景", "单色背图", "文学主题"],
    usage: "单点烛光只照亮脸、书与桌面；适合用大黑块和极少暖色建立暗室氛围。",
    avoid: "不要把历史人物包装成现代影视角色；使用时重构姿态与光影，不照抄整幅。",
    styles: ["伦勃朗式明暗", "烛光版画", "暗室阅读"],
    scenes: ["幽暗室内与烛光", "哥特文学空间"],
    characters: ["烛光下的学生"],
    tags: ["万圣节", "经典艺术", "暗黑 / 怪诞"],
  }),
  aic("cemetery-galicia-lautrec-1897", 72411, {
    title: "A Cemetery in Galicia",
    year: "1897 / 1898",
    assetType: "墓园版画",
    motifs: ["墓碑", "十字架", "枯树", "空地"],
    actions: ["静置", "远景眺望"],
    compositions: ["横向低地平线", "多墓碑散点", "场景底图"],
    colors: ["灰黑", "旧纸白"],
    productionUses: ["墓园底景", "单色背图", "场景拼贴"],
    usage: "低地平线与稀疏墓碑提供可叠加角色的场景底图；适合留出大面积天空给主图或文字。",
    avoid: "墓地和宗教符号需保持尊重；不要与具体灾难、群体或现代影视角色混淆。",
    styles: ["石版画", "墓园风景", "留白场景"],
    scenes: ["墓园与哥特空间", "万圣节场景底图"],
    characters: ["墓园与枯树"],
    tags: ["万圣节", "器物 / 建筑", "暗黑 / 怪诞"],
  }),
  aic("full-moon-japanese-18c", 19048, {
    title: "The Full Moon",
    year: "18th century",
    assetType: "月夜人物画",
    motifs: ["满月", "人物", "书法", "夜色"],
    actions: ["仰望月亮"],
    compositions: ["纵向窄幅", "圆月背景", "单人物"],
    colors: ["墨黑", "月白", "肤色", "旧纸白"],
    productionUses: ["月夜窄幅图", "竖版背图", "月相系列"],
    usage: "圆月直接作为人物背光；可借用‘圆形光源+半身轮廓’机制，不必复制人物。",
    avoid: "尊重日本画语境；不要简单套成西方女巫或现代影视人物。",
    styles: ["日本版画", "满月背光", "窄幅构图"],
    scenes: ["夜行动物与月夜", "月下人物"],
    characters: ["月下人物"],
    tags: ["万圣节", "经典艺术", "人物 / 肖像"],
  }),
  aic("children-around-candle-isabey-1818", 121551, {
    title: "Group of Children Around a Candle",
    year: "1818",
    assetType: "烛光群像版画",
    motifs: ["蜡烛", "儿童群像", "手部", "围观"],
    actions: ["围绕烛火", "伸手遮光", "共同凝视"],
    compositions: ["环形群像", "中心光源", "徽章"],
    colors: ["黑", "灰", "烛火黄", "旧纸白"],
    productionUses: ["环形角色组", "怪谈场景", "背部主图"],
    usage: "所有视线和手势围绕中央烛火，适合转译成讲鬼故事、占卜或夜间聚会场景。",
    avoid: "不要把历史儿童肖像直接商品化；重构人物、服装与面貌，只保留环形光源机制。",
    styles: ["烛光版画", "环形群像", "明暗对比"],
    scenes: ["幽暗室内与烛光", "万圣节聚会与怪谈"],
    characters: ["烛火旁的儿童群像"],
    tags: ["万圣节", "人物 / 肖像", "生活 / 节庆"],
  }),
];

function stripHtml(value = "") {
  return String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString().replace(/\?$/, "").replace(/\/$/, "");
  } catch {
    return String(value || "").trim();
  }
}

async function fetchRetry(url, options = {}, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { "user-agent": "PublicDomainVisualResearch/1.0", ...(options.headers || {}) },
      });
      if (response.ok) return response;
      lastError = new Error(`${url}: HTTP ${response.status}`);
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after")) || attempt * 5;
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  throw lastError;
}

async function eagleJson(endpoint, options = {}) {
  const response = await fetchRetry(`${eagleBase}${endpoint}`, options);
  const payload = await response.json();
  if (payload.status !== "success") throw new Error(`${endpoint}: ${JSON.stringify(payload)}`);
  return payload.data;
}

async function discoverCommons(candidate) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("titles", candidate.sourceId);
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "2200");
  const payload = await (await fetchRetry(url)).json();
  const page = Object.values(payload.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`${candidate.id}: Commons file unavailable`);
  const meta = info.extmetadata || {};
  const license = stripHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value || "");
  if (!/public domain|no restrictions|cc0/i.test(license)) {
    throw new Error(`${candidate.id}: rejected Commons license ${license}`);
  }
  return {
    creator: stripHtml(meta.Artist?.value || "Unknown creator"),
    officialTitle: page.title.replace(/^File:/, ""),
    sourceUrl: info.descriptionurl,
    sourceImageUrl: info.thumburl || info.url,
    sourceOriginalUrl: info.url,
    sourceLabel: "Wikimedia Commons",
    license,
    licenseUrl: info.descriptionurl,
    copyrightRoute: `Wikimedia Commons · ${license}`,
    imageRights: `Commons 文件页标记 ${license}`,
    expectedWidth: Number(info.width) || 0,
    expectedHeight: Number(info.height) || 0,
  };
}

async function discoverAic(candidate) {
  const fields = "id,title,date_display,artist_display,image_id,is_public_domain";
  const response = await fetchRetry(`https://api.artic.edu/api/v1/artworks/${candidate.sourceId}?fields=${fields}`);
  const payload = await response.json();
  const item = payload.data;
  if (!item?.is_public_domain || !item.image_id) throw new Error(`${candidate.id}: AIC public-domain image unavailable`);
  return {
    creator: String(item.artist_display || "Unknown creator").replace(/\s+/g, " ").trim(),
    officialTitle: item.title,
    sourceUrl: `https://www.artic.edu/artworks/${item.id}`,
    sourceImageUrl: `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`,
    sourceOriginalUrl: `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`,
    sourceLabel: "Art Institute of Chicago",
    license: "CC0 Public Domain Designation",
    licenseUrl: "https://api.artic.edu/docs/",
    copyrightRoute: "AIC Open Access · CC0 Public Domain Designation",
    imageRights: "AIC API 标记 is_public_domain=true",
  };
}

async function discoverMet(candidate) {
  const response = await fetchRetry(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${candidate.sourceId}`);
  const item = await response.json();
  if (!item?.isPublicDomain || !item.primaryImageSmall) throw new Error(`${candidate.id}: The Met public-domain image unavailable`);
  return {
    creator: String(item.artistDisplayName || item.culture || "Unknown creator").replace(/\s+/g, " ").trim(),
    officialTitle: item.title,
    sourceUrl: item.objectURL,
    sourceImageUrl: item.primaryImage || item.primaryImageSmall,
    sourceOriginalUrl: item.primaryImage || item.primaryImageSmall,
    sourceLabel: "The Met",
    license: "Public Domain / Open Access",
    licenseUrl: "https://www.metmuseum.org/policies/image-resources",
    copyrightRoute: "The Met Open Access · Public Domain",
    imageRights: "The Met API 标记 isPublicDomain=true",
  };
}

async function discover(candidate) {
  if (candidate.provider === "commons") return discoverCommons(candidate);
  if (candidate.provider === "aic") return discoverAic(candidate);
  if (candidate.provider === "met") return discoverMet(candidate);
  throw new Error(`${candidate.id}: unknown provider ${candidate.provider}`);
}

function extensionFrom(bytes, contentType = "") {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (contentType.includes("webp") || bytes.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  throw new Error("unsupported image signature");
}

async function dimensionsOf(file) {
  const { stdout } = await execFileAsync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
  const width = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] || 0);
  const height = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1] || 0);
  if (!width || !height) throw new Error(`${file}: dimensions unavailable`);
  return { width, height };
}

async function download(candidate, discovered) {
  const response = await fetchRetry(discovered.sourceImageUrl);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 20_000) throw new Error(`${candidate.id}: image too small (${bytes.length} bytes)`);
  const ext = extensionFrom(bytes, response.headers.get("content-type") || "");
  const file = path.join(tempRoot, `${candidate.id}.${ext}`);
  await fs.writeFile(file, bytes);
  const dimensions = await dimensionsOf(file);
  if (Math.max(dimensions.width, dimensions.height) < 800 || Math.min(dimensions.width, dimensions.height) < 240) {
    throw new Error(`${candidate.id}: image dimensions too small (${dimensions.width}x${dimensions.height})`);
  }
  return {
    file,
    ext,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...dimensions,
  };
}

function annotationValue(annotation, label) {
  const prefix = `${label}：`;
  return String(annotation || "").split("\n").find((line) => line.startsWith(prefix))?.slice(prefix.length).trim() || "";
}

function discoveredFromExisting(candidate, item) {
  const commonsSource = candidate.provider === "commons";
  const aicSource = candidate.provider === "aic";
  return {
    creator: annotationValue(item.annotation, "作者/制作方") || "Unknown creator",
    officialTitle: annotationValue(item.annotation, "原始题名") || candidate.title,
    sourceUrl: item.url,
    sourceImageUrl: "",
    sourceOriginalUrl: annotationValue(item.annotation, "原图地址") || item.url,
    sourceLabel: commonsSource ? "Wikimedia Commons" : (aicSource ? "Art Institute of Chicago" : "The Met"),
    license: annotationValue(item.annotation, "图像权利") || (commonsSource ? "Public domain" : "Public Domain / Open Access"),
    licenseUrl: commonsSource
      ? item.url
      : (aicSource ? "https://api.artic.edu/docs/" : "https://www.metmuseum.org/policies/image-resources"),
    copyrightRoute: annotationValue(item.annotation, "版权路径") || (commonsSource
      ? "Wikimedia Commons · Public domain"
      : (aicSource ? "AIC Open Access · CC0 Public Domain Designation" : "The Met Open Access · Public Domain")),
    imageRights: annotationValue(item.annotation, "图像权利") || "Public Domain",
  };
}

async function localFileInfo(item) {
  const infoDir = path.join(eagleImagesRoot, `${item.id}.info`);
  const entries = await fs.readdir(infoDir);
  const preferred = path.join(infoDir, `${item.name}.${item.ext}`);
  let file = preferred;
  try {
    await fs.access(file);
  } catch {
    const fallback = entries.find((name) => name !== "metadata.json" && !name.includes("_thumbnail"));
    if (!fallback) throw new Error(`${item.id}: Eagle source file unavailable`);
    file = path.join(infoDir, fallback);
  }
  const bytes = await fs.readFile(file);
  const dimensions = await dimensionsOf(file);
  return {
    file,
    ext: item.ext,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...dimensions,
  };
}

function annotationFor(candidate, discovered, fileInfo) {
  return [
    `作品：${candidate.title}`,
    `原始题名：${discovered.officialTitle}`,
    `作者/制作方：${discovered.creator}`,
    `年代：${candidate.year}`,
    `图素类型：${candidate.assetType}`,
    `主体：${candidate.motifs.join("、")}`,
    `动作：${candidate.actions.join("、")}`,
    `构图：${candidate.compositions.join("、")}`,
    `色彩：${candidate.colors.join("、")}`,
    `可用场景：${candidate.productionUses.join("、")}`,
    `可转译：${candidate.usage}`,
    `避开：${candidate.avoid}`,
    `版权路径：${discovered.copyrightRoute}`,
    `图像权利：${discovered.imageRights}`,
    "证据等级：A",
    `来源页：${discovered.sourceUrl}`,
    `原图地址：${discovered.sourceOriginalUrl}`,
    `核验日期：${researchDate}`,
    `SHA256：${fileInfo.sha256}`,
    `像素：${fileInfo.width}×${fileInfo.height}`,
    candidate.parentSourceId ? `父图：${candidate.parentSourceId}` : "",
  ].filter(Boolean).join("\n");
}

function tagsFor(candidate, discovered) {
  return compact([
    "公版IP", "Halloween", "万圣节", "图素",
    `intake-id:${candidate.id}`,
    `import:${intakeVersion}`,
    "证据:A",
    `权利:${discovered.license}`,
    `来源:${discovered.sourceLabel}`,
    `图素类型:${candidate.assetType}`,
    ...candidate.motifs.map((value) => `主体:${value}`),
    ...candidate.compositions.map((value) => `构图:${value}`),
    ...candidate.productionUses.map((value) => `用途:${value}`),
    ...(candidate.tags || []),
  ]);
}

async function addToEagle(candidate, discovered, fileInfo) {
  const data = await eagleJson("/item/addFromPath", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path: fileInfo.file,
      name: `${candidate.title}｜${candidate.year}｜图素`,
      website: discovered.sourceUrl,
      annotation: annotationFor(candidate, discovered, fileInfo),
      tags: tagsFor(candidate, discovered),
      folderId: eagleFolderId,
      star: 5,
      notification: false,
    }),
  });
  const id = typeof data === "string" ? data : data?.id || data?.itemId;
  if (!id) throw new Error(`${candidate.id}: Eagle did not return an item id`);
  const readback = await eagleJson(`/item/info?id=${id}`);
  if (!readback?.id || readback.id !== id) throw new Error(`${candidate.id}: Eagle readback failed`);
  return id;
}

function toWork(candidate, discovered, fileInfo, eagleItemId) {
  return {
    id: candidate.id,
    title: candidate.title,
    subtitle: discovered.creator,
    year: candidate.year,
    rightsStatus: candidate.provider === "commons" ? "公版文件" : "公版 / 开放馆藏",
    copyrightRoute: discovered.copyrightRoute,
    evidenceLevel: "A",
    imageRights: discovered.imageRights,
    sourceUrl: discovered.sourceUrl,
    sourceImageUrl: discovered.sourceOriginalUrl,
    sourceLabel: discovered.sourceLabel,
    licenseUrl: discovered.licenseUrl,
    researchDate,
    assetType: candidate.assetType,
    motifs: candidate.motifs,
    actions: candidate.actions,
    compositions: candidate.compositions,
    colors: candidate.colors,
    productionUses: candidate.productionUses,
    parentSourceId: candidate.parentSourceId || "",
    sourceHash: fileInfo.sha256,
    sourcePixels: `${fileInfo.width}x${fileInfo.height}`,
    usage: candidate.usage,
    avoid: candidate.avoid,
    styles: candidate.styles,
    scenes: candidate.scenes,
    holidays: ["万圣节"],
    characters: candidate.characters,
    tags: candidate.tags,
    evidenceSources: compact([discovered.sourceUrl, discovered.licenseUrl]),
    riskFlags: ["现代影视与品牌造型排除", "商品使用前复核商标与平台规则"],
    frames: [{
      eagleItemId,
      subtitle: candidate.assetType,
      sourceHash: fileInfo.sha256,
    }],
  };
}

async function writeAtomic(file, value) {
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temp, file);
}

try {
  const existingItems = await eagleJson(`/item/list?folders=${eagleFolderId}&limit=1000`);
  const byIntake = new Map();
  const byUrl = new Map();
  for (const item of existingItems || []) {
    for (const tag of item.tags || []) {
      if (tag.startsWith("intake-id:")) byIntake.set(tag.slice("intake-id:".length), item.id);
    }
    if (item.url) byUrl.set(canonicalUrl(item.url), item.id);
  }

  const works = [];
  const receipt = {
    schemaVersion: "1.0",
    intakeVersion,
    researchDate,
    eagleFolderId,
    requested: candidates.length,
    imported: [],
    reused: [],
    rejected: [],
  };
  const hashes = new Map();

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    process.stdout.write(`[${index + 1}/${candidates.length}] ${candidate.id}\n`);
    try {
      const intakeExistingId = byIntake.get(candidate.id);
      const intakeExistingItem = intakeExistingId ? await eagleJson(`/item/info?id=${intakeExistingId}`) : null;
      const discovered = intakeExistingItem ? discoveredFromExisting(candidate, intakeExistingItem) : await discover(candidate);
      const urlExistingId = intakeExistingId || byUrl.get(canonicalUrl(discovered.sourceUrl));
      const urlExistingItem = urlExistingId
        ? (intakeExistingItem || await eagleJson(`/item/info?id=${urlExistingId}`))
        : null;
      const fileInfo = urlExistingItem ? await localFileInfo(urlExistingItem) : await download(candidate, discovered);
      if (hashes.has(fileInfo.sha256)) {
        throw new Error(`duplicate bytes with ${hashes.get(fileInfo.sha256)}`);
      }
      hashes.set(fileInfo.sha256, candidate.id);

      const existingId = urlExistingId;
      const eagleItemId = existingId || await addToEagle(candidate, discovered, fileInfo);
      const entry = {
        intakeId: candidate.id,
        eagleItemId,
        sourceUrl: discovered.sourceUrl,
        sha256: fileInfo.sha256,
        width: fileInfo.width,
        height: fileInfo.height,
      };
      if (existingId) receipt.reused.push(entry);
      else receipt.imported.push(entry);
      works.push(toWork(candidate, discovered, fileInfo, eagleItemId));
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (error) {
      receipt.rejected.push({ intakeId: candidate.id, error: String(error.message || error) });
      throw error;
    }
  }

  const supplement = {
    schemaVersion: "1.0",
    sourceVersion: intakeVersion,
    researchDate,
    scope: "可回溯的公版/开放馆藏万圣节视觉图素；现代影视、品牌与趋势截图不进入可用池。",
    works,
  };
  receipt.completed = works.length;
  receipt.sha256Unique = new Set(works.map((work) => work.sourceHash)).size;
  receipt.status = receipt.completed === candidates.length && !receipt.rejected.length ? "PASS" : "BLOCK";
  await writeAtomic(outputPath, supplement);
  await writeAtomic(receiptPath, receipt);
  process.stdout.write(`${JSON.stringify({ status: receipt.status, requested: receipt.requested, imported: receipt.imported.length, reused: receipt.reused.length, completed: receipt.completed }, null, 2)}\n`);
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
