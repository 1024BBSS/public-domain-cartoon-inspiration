import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const eagleBase = "http://127.0.0.1:41595/api";
const eagleFolderId = "MTQ0XCUZOVLNG";
const eagleImagesRoot = "/Users/wenshanchen/Pictures/idea.library/images";
const researchDate = "2026-09-19";
const intakeVersion = "halloween-cartoon-growth-2026-09-19-v1";
const outputPath = path.join(projectRoot, "source/halloween-cartoon-growth-supplement.json");
const receiptPath = path.join(projectRoot, "source/halloween-cartoon-growth-receipt.json");
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "halloween-cartoon-growth-"));

const ffmpegCandidates = [
  process.env.FFMPEG_PATH,
  "/opt/homebrew/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
  "/Applications/KeyShot Studio.app/Contents/MacOS/ffmpeg",
  "/Applications/KeyShot12.app/Contents/MacOS/ffmpeg",
].filter(Boolean);

const laneDefaults = {
  "旧动画群像": {
    styles: ["黑白橡皮管动画", "角色群像"],
    scenes: ["旧动画群像与叙事场景"],
    productionUses: ["洗水黑 T 背部主图", "复古动画拼贴"],
  },
  "骷髅动作": {
    styles: ["黑白橡皮管动画", "扁平骨架动作"],
    scenes: ["骷髅动作与身体变形"],
    productionUses: ["单色胸花", "动作角色组"],
  },
  "乐队 / 海报构图": {
    styles: ["黑白橡皮管动画", "舞台式群像"],
    scenes: ["骷髅乐队与怪诞舞台"],
    productionUses: ["乐队海报式背图", "宽幅角色队列"],
  },
  "幽灵追逐": {
    styles: ["黑白橡皮管动画", "超现实追逐"],
    scenes: ["幽灵追逐与变形"],
    productionUses: ["连续动作图", "故事型背部主图"],
  },
  "鬼屋变形": {
    styles: ["黑白橡皮管动画", "鬼屋空间变形"],
    scenes: ["幽灵、鬼屋与通灵"],
    productionUses: ["鬼屋场景主图", "高反差建筑图"],
  },
};

function frame(seconds, subtitle, lane, motifs, actions, compositions, characters, productionUses = []) {
  return {
    seconds,
    subtitle: `${subtitle} · ${seconds} 秒`,
    trendLane: lane,
    assetType: "公版动画原片抽帧",
    motifs,
    actions,
    compositions,
    characters,
    styles: laneDefaults[lane].styles,
    scenes: laneDefaults[lane].scenes,
    productionUses: [...laneDefaults[lane].productionUses, ...productionUses],
    colors: ["黑", "灰", "旧胶片白"],
    tags: ["万圣节", "早期动画", "增长线索", lane],
  };
}

const works = [
  {
    id: "skeleton-dance-1929-growth",
    sourceTitle: "File:The Skeleton Dance (1929).webm",
    title: "The Skeleton Dance",
    subtitle: "骷髅之舞 · 1929 原片增长画面",
    year: "1929",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Skeleton_Dance_(1929).webm",
    licenseUrl: "https://cspd.law.duke.edu/publicdomainday/2025/",
    copyrightRoute: "美国 1929 年作品 · 2025-01-01 期限届满",
    usage: "从猫、墓园、骷髅群舞和身体变乐器中提取动作关系，重画为扁平、低色数图案。",
    avoid: "只限 1929 原片具体表达；避开后期 Disney 造型、品牌标识、现代修复配色和现代录音。",
    characters: ["骷髅乐队"],
    riskFlags: ["Disney 商标", "后期版本", "现代配乐"],
    awarenessScore: 92,
    awarenessLevel: "美国高知名度",
    frames: [
      frame(55, "墓园钟声与黑猫", "旧动画群像", ["墓园", "黑猫", "钟"], ["黑猫警觉", "钟声启动"], ["横向夜景", "环境开场"], ["墓园黑猫"]),
      frame(65, "月下黑猫长嚎", "旧动画群像", ["满月", "黑猫", "树枝"], ["仰头长嚎"], ["圆月徽章", "单主体剪影"], ["月下黑猫"]),
      frame(85, "墓碑上的黑猫对峙", "旧动画群像", ["两只黑猫", "墓碑", "满月"], ["弓背对峙"], ["左右对称", "双主体"], ["墓园黑猫"]),
      frame(95, "骷髅从墓碑后升起", "骷髅动作", ["骷髅", "墓碑", "月夜"], ["从墓穴升起"], ["中心揭幕", "三墓碑框景"], ["墓园骷髅"]),
      frame(105, "骷髅头越过墓碑", "骷髅动作", ["骷髅头", "墓碑"], ["伸展手臂", "探出"], ["近景特写", "横向延展"], ["墓园骷髅"]),
      frame(145, "墓穴中的骷髅头", "骷髅动作", ["骷髅头", "墓穴", "墓碑"], ["从地下探出"], ["小主体留白", "斜向视线"], ["墓园骷髅"]),
      frame(155, "骷髅群从墓园登场", "乐队 / 海报构图", ["骷髅群", "墓碑", "枯树"], ["集体登场"], ["横向群像", "舞台开场"], ["骷髅乐队"]),
      frame(175, "四骷髅同步行进", "乐队 / 海报构图", ["四具骷髅"], ["同步行进", "抬腿"], ["重复队列", "宽幅横图"], ["骷髅乐队"]),
      frame(185, "双骷髅跳步", "骷髅动作", ["双骷髅"], ["跳跃", "镜像动作"], ["双主体", "高低节奏"], ["骷髅舞者"]),
      frame(195, "长腿骷髅与小骷髅", "骷髅动作", ["长腿骷髅", "小骷髅"], ["跨步", "高低互动"], ["极端比例", "垂直构图"], ["骷髅舞者"]),
      frame(205, "骷髅双人叠接", "骷髅动作", ["双骷髅", "骨骼"], ["叠接", "相互支撑"], ["三角构图", "双人互动"], ["骷髅舞者"]),
      frame(225, "肋骨木琴演奏", "乐队 / 海报构图", ["肋骨木琴", "骷髅"], ["击奏", "俯身演奏"], ["器乐横幅", "主奏者加乐器"], ["骷髅乐手"]),
      frame(255, "独舞骷髅正面姿态", "骷髅动作", ["单骷髅"], ["独舞", "摆臂"], ["正面单主体", "徽章式"], ["骷髅舞者"]),
      frame(265, "肋骨圆环旋转", "骷髅动作", ["骷髅", "肋骨圆环"], ["旋转", "环绕"], ["圆形动势", "中心动作"], ["骷髅舞者"]),
      frame(275, "骷髅挥舞骨棒", "骷髅动作", ["骷髅", "骨棒"], ["举手", "挥舞"], ["正面角色", "道具延长线"], ["骷髅舞者"]),
      frame(305, "骷髅群舞收束", "乐队 / 海报构图", ["骷髅群"], ["群体摆姿", "谢幕"], ["中心主角", "左右队列"], ["骷髅乐队"]),
    ],
  },
  {
    id: "haunted-house-1929-growth",
    sourceTitle: "File:The Haunted House (1929).webm",
    title: "The Haunted House",
    subtitle: "鬼屋 · 1929 原片增长画面",
    year: "1929",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Haunted_House_(1929).webm",
    licenseUrl: "https://cspd.law.duke.edu/publicdomainday/2025/",
    copyrightRoute: "美国 1929 年作品 · 2025-01-01 期限届满",
    usage: "取暴雨孤屋、黑暗眼睛、幽灵揭幕、骨架乐队和骨头乐器的空间机制。",
    avoid: "原片中的 1929 Mickey 版本与现代 Mickey 必须分开；避开 Disney 标识、后期造型和官方授权混淆。",
    characters: ["鬼屋骷髅乐队"],
    riskFlags: ["Mickey Mouse 商标与后期造型", "Disney 来源混淆"],
    awarenessScore: 78,
    awarenessLevel: "美国较高知名度",
    frames: [
      frame(25, "暴雨山丘上的孤屋", "鬼屋变形", ["鬼屋", "暴雨", "山丘"], ["闪电照亮"], ["远景剪影", "斜坡引导"], ["鬼屋"]),
      frame(85, "黑暗中的巨眼", "鬼屋变形", ["巨眼", "纯黑背景"], ["凝视"], ["双圆近景", "极简高反差"], ["黑暗巨眼"]),
      frame(125, "白布幽灵张开双手", "幽灵追逐", ["白布幽灵", "长手"], ["张手逼近"], ["正面单主体", "三角轮廓"], ["白布幽灵"]),
      frame(135, "幽灵面罩中的骷髅", "幽灵追逐", ["骷髅脸", "白布幽灵"], ["显露真面目"], ["面具式特写", "圆形脸部"], ["骷髅幽灵"]),
      frame(165, "骷髅从门后列队进入", "乐队 / 海报构图", ["骷髅队列", "门", "幽灵"], ["集体入场"], ["门框舞台", "纵深队列"], ["鬼屋骷髅乐队"]),
      frame(175, "幽灵与骷髅聚集", "旧动画群像", ["幽灵群", "骷髅群", "房间"], ["围拢", "起舞"], ["室内群像", "中心留白"], ["鬼屋幽灵群", "鬼屋骷髅乐队"]),
      frame(225, "骨头乐器独奏", "乐队 / 海报构图", ["骷髅", "骨头乐器"], ["击奏"], ["单人乐手", "器乐徽章"], ["骷髅乐手"]),
      frame(255, "骷髅打击乐动作", "乐队 / 海报构图", ["骷髅", "骨棒", "打击乐"], ["挥槌", "击奏"], ["斜向动作", "单人舞台"], ["骷髅乐手"]),
      frame(275, "双骷髅镜像起舞", "骷髅动作", ["双骷髅"], ["镜像舞步", "抬腿"], ["左右对称", "双主体"], ["骷髅舞者"]),
      frame(285, "双骷髅同步扭转", "骷髅动作", ["双骷髅"], ["扭转", "同步摆臂"], ["重复角色", "横向双人"], ["骷髅舞者"]),
      frame(295, "身体变成乐器", "乐队 / 海报构图", ["骷髅", "肋骨乐器"], ["身体演奏", "夸张变形"], ["人体乐器", "中心胸花"], ["骷髅乐手"]),
      frame(305, "骷髅正面独奏", "骷髅动作", ["单骷髅"], ["独奏", "举手"], ["正面单主体", "大轮廓"], ["骷髅乐手"]),
      frame(315, "双骷髅蹲步", "骷髅动作", ["双骷髅"], ["蹲步", "同步手势"], ["低重心双主体", "镜像"], ["骷髅舞者"]),
      frame(335, "三骷髅漂浮行进", "乐队 / 海报构图", ["三具骷髅"], ["漂浮", "列队"], ["三联角色", "宽幅队列"], ["骷髅乐队"]),
      frame(345, "四骷髅坐姿队列", "乐队 / 海报构图", ["四具骷髅"], ["坐姿摆腿", "同步节拍"], ["四人横排", "乐队宣传照式"], ["骷髅乐队"]),
      frame(355, "骨头整齐散落", "骷髅动作", ["骨头", "骨堆"], ["解体", "排列"], ["横向散点", "重复纹样"], ["骷髅残骨"]),
    ],
  },
  {
    id: "hells-bells-1929-growth",
    sourceTitle: "File:Hell's Bells (1929).webm",
    title: "Hell's Bells",
    subtitle: "地狱钟声 · 1929 原片增长画面",
    year: "1929",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Hell%27s_Bells_(1929).webm",
    licenseUrl: "https://cspd.law.duke.edu/publicdomainday/2025/",
    copyrightRoute: "美国 1929 年作品 · 2025-01-01 期限届满",
    usage: "提取恶魔乐队、骨头打击乐、火焰、坩埚、队列与强烈黑白剪影；适合红黑或黑米双色重绘。",
    avoid: "避开后期 Disney 包装、品牌标识与现代修复；宗教/恶魔题材需另行核验平台和市场接受度。",
    characters: ["地狱恶魔群"],
    riskFlags: ["Disney 商标", "宗教敏感", "现代修复"],
    awarenessScore: 68,
    awarenessLevel: "动画史知名",
    frames: [
      frame(25, "洞穴中的黑色怪物", "旧动画群像", ["洞穴", "黑色怪物", "火光"], ["潜行"], ["横向洞穴", "小主体留白"], ["地狱怪物"]),
      frame(35, "巨口洞穴特写", "鬼屋变形", ["巨口", "尖牙", "洞穴"], ["张口吞噬"], ["满幅特写", "黑白块面"], ["巨口怪物"]),
      frame(65, "长蛇穿过火焰洞穴", "幽灵追逐", ["长蛇", "洞穴", "火焰"], ["蜿蜒穿行"], ["S 形动势", "横向长图"], ["地狱长蛇"]),
      frame(85, "恶魔乐队全景", "乐队 / 海报构图", ["恶魔乐队", "舞台"], ["合奏"], ["舞台群像", "主唱加伴奏"], ["地狱恶魔乐队"]),
      frame(95, "恶魔乐手围合演奏", "乐队 / 海报构图", ["恶魔乐手", "骨头乐器"], ["围合演奏"], ["半圆群像", "演出海报"], ["地狱恶魔乐队"]),
      frame(105, "骨头打击乐", "乐队 / 海报构图", ["骨头", "打击乐", "恶魔"], ["敲击", "俯身演奏"], ["乐器特写", "横向动作"], ["恶魔乐手"]),
      frame(115, "长腿恶魔独舞", "骷髅动作", ["长腿恶魔", "尾巴"], ["独舞", "跨步"], ["单主体", "长线轮廓"], ["长腿恶魔"]),
      frame(135, "恶魔与巨大影子", "鬼屋变形", ["恶魔", "巨大影子"], ["投影", "夸张变形"], ["前后双层", "剪影对照"], ["影子恶魔"]),
      frame(155, "三只小恶魔行进", "乐队 / 海报构图", ["小恶魔三人组"], ["列队行进"], ["三联重复", "宽幅队列"], ["小恶魔三人组"]),
      frame(165, "三只小恶魔停步", "旧动画群像", ["小恶魔三人组"], ["同步停步", "摆姿"], ["三联角色", "正面群像"], ["小恶魔三人组"]),
      frame(175, "四恶魔牵手舞", "乐队 / 海报构图", ["恶魔队列"], ["牵手", "同步抬腿"], ["重复角色", "链式横图"], ["恶魔舞者"]),
      frame(185, "折线身体恶魔", "骷髅动作", ["折线恶魔"], ["弹跳", "身体折叠"], ["锯齿轮廓", "单主体"], ["折线恶魔"]),
      frame(205, "洞穴舞台中的恶魔", "乐队 / 海报构图", ["恶魔", "洞穴舞台"], ["指挥", "观看演出"], ["前景观众", "远景舞台"], ["地狱恶魔群"]),
      frame(225, "巨型恶魔俯视小角色", "旧动画群像", ["巨型恶魔", "小角色"], ["俯视", "对峙"], ["巨大比例差", "上下关系"], ["巨型恶魔", "小恶魔"]),
      frame(245, "恶魔抬坩埚巡游", "乐队 / 海报构图", ["坩埚", "恶魔队列", "火焰"], ["抬举", "巡游"], ["仪式队列", "横向长图"], ["坩埚恶魔队"]),
      frame(255, "恶魔守着坩埚", "旧动画群像", ["恶魔", "坩埚", "火焰"], ["守候", "观察"], ["主从比例", "舞台侧景"], ["坩埚恶魔"]),
    ],
  },
  {
    id: "swing-you-sinners-1930-growth",
    sourceTitle: "File:Swing You Sinners! (1930).webm",
    title: "Swing You Sinners!",
    subtitle: "罪人摇摆吧 · 1930 原片增长画面",
    year: "1930",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Swing_You_Sinners!_(1930).webm",
    licenseUrl: "https://cspd.law.duke.edu/publicdomainday/2026/",
    copyrightRoute: "美国 1930 年作品 · 2026-01-01 期限届满",
    usage: "从活墓碑、幽灵追逐、巨手、房间长脸、幽灵舞和鬼脸合唱提取超现实变形。",
    avoid: "避开现代重制、后期修复新增素材、现代录音与品牌包装。",
    characters: ["墓园幽灵群"],
    riskFlags: ["现代修复", "现代录音"],
    awarenessScore: 74,
    awarenessLevel: "动画史知名",
    frames: [
      frame(145, "墓碑群开始包围", "鬼屋变形", ["墓碑群", "墓园"], ["包围", "转向"], ["前景墓碑", "中心人物"], ["活墓碑群"]),
      frame(155, "活墓碑集体起身", "旧动画群像", ["活墓碑", "墓园"], ["起身", "追逐"], ["多主体包围", "环形动势"], ["活墓碑群"]),
      frame(175, "墓园怪脸群涌现", "旧动画群像", ["墓碑", "怪脸群", "月夜"], ["涌现", "逼近"], ["前后层叠", "密集群像"], ["墓园怪脸群"]),
      frame(185, "铁路上的幽灵阻截", "幽灵追逐", ["幽灵", "铁路", "墓园"], ["阻截", "追赶"], ["轨道透视", "横向追逐"], ["铁路幽灵"]),
      frame(205, "长脸幽灵从墓后探出", "幽灵追逐", ["长脸幽灵", "墓碑"], ["探出", "凝视"], ["大脸加小人物", "比例对照"], ["长脸幽灵"]),
      frame(215, "圆头幽灵近景", "幽灵追逐", ["圆头幽灵", "空洞眼"], ["逼近"], ["满幅脸部", "高反差"], ["圆头幽灵"]),
      frame(265, "巨手从墓园伸出", "幽灵追逐", ["巨型幽灵手", "墓碑"], ["抓取", "拦截"], ["对角巨手", "大小对照"], ["巨手幽灵"]),
      frame(275, "墓碑间的追逐", "幽灵追逐", ["墓碑", "追逐角色"], ["奔跑", "回头"], ["横向跑动", "连续动作"], ["墓园幽灵"]),
      frame(315, "蜡烛柱幽灵升起", "鬼屋变形", ["蜡烛柱幽灵", "墓园"], ["升起", "融化变形"], ["垂直单主体", "烛台轮廓"], ["蜡烛幽灵"]),
      frame(335, "房间长出眼睛", "鬼屋变形", ["房间眼睛", "干草堆", "门"], ["空间凝视", "物体活化"], ["室内舞台", "双眼焦点"], ["活房间"]),
      frame(345, "细长幽灵双人组", "旧动画群像", ["细长幽灵", "门廊"], ["伸长", "围堵"], ["高低双主体", "长线轮廓"], ["细长幽灵组"]),
      frame(365, "白布幽灵双人舞", "乐队 / 海报构图", ["白布幽灵双人组"], ["同步起舞", "摆臂"], ["镜像双主体", "舞台动作"], ["白布幽灵舞者"]),
      frame(385, "鬼脸三人组围合", "旧动画群像", ["鬼脸三人组"], ["围合", "合唱"], ["三角群像", "中心人物"], ["鬼脸合唱团"]),
      frame(415, "幽灵观众群围拢", "旧动画群像", ["幽灵观众群", "舞台"], ["围拢", "观看"], ["密集观众", "中心舞台"], ["幽灵观众群"]),
      frame(445, "鬼屋长脸合唱", "乐队 / 海报构图", ["长脸鬼屋", "鬼脸群"], ["合唱", "伸缩"], ["三联脸部", "海报式群像"], ["鬼脸合唱团"]),
      frame(455, "幽灵群像高潮", "乐队 / 海报构图", ["幽灵群", "怪脸"], ["集体涌入", "合唱"], ["密集群像", "中心扩散"], ["墓园幽灵群"]),
    ],
  },
];

function compact(values) {
  return [...new Set(values.filter(Boolean))];
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
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
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 800));
  }
  throw lastError;
}

async function eagleJson(endpoint, options = {}) {
  const response = await fetchRetry(`${eagleBase}${endpoint}`, options);
  const payload = await response.json();
  if (payload.status !== "success") throw new Error(`${endpoint}: ${JSON.stringify(payload)}`);
  return payload.data;
}

async function findFfmpeg() {
  for (const candidate of ffmpegCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next known runtime.
    }
  }
  throw new Error("ffmpeg unavailable; set FFMPEG_PATH before running this importer");
}

async function discoverVideo(work) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("prop", "imageinfo|videoinfo");
  url.searchParams.set("titles", work.sourceTitle);
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("viprop", "url|size|mime|derivatives");
  const payload = await (await fetchRetry(url)).json();
  const page = Object.values(payload.query?.pages || {})[0];
  const imageInfo = page?.imageinfo?.[0];
  const videoInfo = page?.videoinfo?.[0];
  if (!imageInfo || !videoInfo) throw new Error(`${work.id}: Commons video metadata unavailable`);
  const license = stripHtml(imageInfo.extmetadata?.LicenseShortName?.value || imageInfo.extmetadata?.UsageTerms?.value);
  if (!/public domain/i.test(license)) throw new Error(`${work.id}: rejected Commons license ${license}`);
  const derivatives = videoInfo.derivatives || [];
  const preferredKeys = ["1080p.vp9.webm", "720p.vp9.webm", "480p.vp9.webm", "360p.mpeg4.mov", "240p.vp9.webm"];
  const derivative = preferredKeys.map((key) => derivatives.find((item) => item.transcodekey === key)).find(Boolean);
  return {
    videoUrl: derivative?.src || videoInfo.url || imageInfo.url,
    videoVariant: derivative?.transcodekey || "original",
    license,
    creator: stripHtml(imageInfo.extmetadata?.Artist?.value || "Unknown creator"),
    sourceUrl: work.sourceUrl,
  };
}

async function downloadVideo(work, discovered) {
  const ext = discovered.videoUrl.includes(".mov") ? "mov" : "webm";
  const destination = path.join(tempRoot, `${work.id}.${ext}`);
  const response = await fetchRetry(discovered.videoUrl, {}, 5);
  if (!response.body) throw new Error(`${work.id}: empty video response`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
  const stat = await fs.stat(destination);
  if (stat.size < 1_000_000) throw new Error(`${work.id}: downloaded video is too small (${stat.size})`);
  return destination;
}

async function dimensionsOf(file) {
  const { stdout } = await execFileAsync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
  const width = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] || 0);
  const height = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1] || 0);
  if (!width || !height) throw new Error(`${file}: dimensions unavailable`);
  return { width, height };
}

async function fileInfo(file) {
  const bytes = await fs.readFile(file);
  return {
    file,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...(await dimensionsOf(file)),
  };
}

async function localEagleFileInfo(item) {
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
  return fileInfo(file);
}

async function extractFrame(ffmpeg, videoFile, work, item) {
  const destination = path.join(tempRoot, `${work.id}-${String(item.seconds).padStart(4, "0")}.jpg`);
  await execFileAsync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-ss", String(item.seconds), "-i", videoFile,
    "-map", "0:v:0", "-an", "-frames:v", "1", "-q:v", "2", "-y", destination,
  ], { maxBuffer: 8 * 1024 * 1024 });
  const info = await fileInfo(destination);
  if (Math.min(info.width, info.height) < 350) throw new Error(`${work.id}@${item.seconds}: extracted frame too small (${info.width}x${info.height})`);
  return info;
}

function intakeId(work, item) {
  return `${intakeVersion}:${work.id}:${item.seconds}s`;
}

function annotationFor(work, item, discovered, info) {
  return [
    `作品：${work.title}`,
    `画面：${item.subtitle}`,
    `时间点：${item.seconds} 秒`,
    `趋势路径：${item.trendLane}`,
    `主体：${item.motifs.join("、")}`,
    `动作：${item.actions.join("、")}`,
    `构图：${item.compositions.join("、")}`,
    `可用方向：${item.productionUses.join("、")}`,
    `角色：${item.characters.join("、")}`,
    `版权路径：${work.copyrightRoute}`,
    `图像权利：Wikimedia Commons 文件页标记 ${discovered.license}`,
    "素材属性：原片研究抽帧；适合研究与原创重画，不是生产级印花文件",
    `避开：${work.avoid}`,
    `来源页：${work.sourceUrl}`,
    `视频版本：${discovered.videoVariant}`,
    `作者/制作方：${discovered.creator}`,
    `核验日期：${researchDate}`,
    `SHA256：${info.sha256}`,
    `像素：${info.width}×${info.height}`,
  ].join("\n");
}

function tagsFor(work, item, discovered) {
  return compact([
    "公版IP", "Halloween", "万圣节", "早期动画", "增长线索", "证据:A",
    `intake-id:${intakeId(work, item)}`,
    `import:${intakeVersion}`,
    `权利:${discovered.license}`,
    "来源:Wikimedia Commons",
    `作品:${work.title}`,
    `趋势路径:${item.trendLane}`,
    ...item.motifs.map((value) => `主体:${value}`),
    ...item.actions.map((value) => `动作:${value}`),
    ...item.compositions.map((value) => `构图:${value}`),
    ...item.productionUses.map((value) => `用途:${value}`),
  ]);
}

async function addToEagle(work, item, discovered, info) {
  const data = await eagleJson("/item/addFromPath", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      path: info.file,
      name: `${work.title}｜${item.subtitle}`,
      website: work.sourceUrl,
      annotation: annotationFor(work, item, discovered, info),
      tags: tagsFor(work, item, discovered),
      folderId: eagleFolderId,
      star: 5,
      notification: false,
    }),
  });
  const id = typeof data === "string" ? data : data?.id || data?.itemId;
  if (!id) throw new Error(`${work.id}@${item.seconds}: Eagle did not return an item id`);
  const readback = await eagleJson(`/item/info?id=${id}`);
  if (readback?.id !== id) throw new Error(`${work.id}@${item.seconds}: Eagle readback failed`);
  if (!(readback.tags || []).includes(`intake-id:${intakeId(work, item)}`)) throw new Error(`${work.id}@${item.seconds}: intake tag missing after readback`);
  const stored = await localEagleFileInfo(readback);
  if (stored.sha256 !== info.sha256) throw new Error(`${work.id}@${item.seconds}: Eagle stored bytes differ from extracted frame`);
  return { id, info: stored };
}

async function writeAtomic(file, value) {
  const temp = `${file}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temp, file);
}

const receipt = {
  schemaVersion: "1.0",
  intakeVersion,
  researchDate,
  eagleFolderId,
  requested: works.reduce((sum, work) => sum + work.frames.length, 0),
  imported: [],
  reused: [],
  rejected: [],
};

try {
  const ffmpeg = await findFfmpeg();
  const existingItems = await eagleJson(`/item/list?folders=${eagleFolderId}&limit=1000`);
  const byIntake = new Map();
  for (const item of existingItems || []) {
    for (const tag of item.tags || []) {
      if (tag.startsWith("intake-id:")) byIntake.set(tag.slice("intake-id:".length), item.id);
    }
  }

  const discoveredPairs = await Promise.all(works.map(async (work) => [work.id, await discoverVideo(work)]));
  const discoveredByWork = new Map(discoveredPairs);
  const videoPairs = await Promise.all(works.map(async (work) => {
    const needsVideo = work.frames.some((item) => !byIntake.has(intakeId(work, item)));
    if (!needsVideo) return [work.id, ""];
    process.stdout.write(`Downloading ${work.title}\n`);
    return [work.id, await downloadVideo(work, discoveredByWork.get(work.id))];
  }));
  const videoByWork = new Map(videoPairs);

  const outputWorks = [];
  const seenHashes = new Map();
  let cursor = 0;
  for (const work of works) {
    const discovered = discoveredByWork.get(work.id);
    const outputFrames = [];
    for (const item of work.frames) {
      cursor += 1;
      process.stdout.write(`[${cursor}/${receipt.requested}] ${work.title} @ ${item.seconds}s\n`);
      try {
        const existingId = byIntake.get(intakeId(work, item));
        let eagleItemId;
        let info;
        if (existingId) {
          const readback = await eagleJson(`/item/info?id=${existingId}`);
          info = await localEagleFileInfo(readback);
          eagleItemId = existingId;
          receipt.reused.push({ intakeId: intakeId(work, item), eagleItemId, sha256: info.sha256, width: info.width, height: info.height });
        } else {
          const extracted = await extractFrame(ffmpeg, videoByWork.get(work.id), work, item);
          const added = await addToEagle(work, item, discovered, extracted);
          eagleItemId = added.id;
          info = added.info;
          receipt.imported.push({ intakeId: intakeId(work, item), eagleItemId, sha256: info.sha256, width: info.width, height: info.height });
        }
        if (seenHashes.has(info.sha256)) throw new Error(`duplicate frame bytes with ${seenHashes.get(info.sha256)}`);
        seenHashes.set(info.sha256, intakeId(work, item));
        outputFrames.push({
          ...item,
          eagleItemId,
          sourceHash: info.sha256,
          sourcePixels: `${info.width}x${info.height}`,
          sourceUrl: `${work.sourceUrl}#frame-${item.seconds}s`,
        });
      } catch (error) {
        receipt.rejected.push({ intakeId: intakeId(work, item), error: String(error.message || error) });
        throw error;
      }
    }
    outputWorks.push({
      id: work.id,
      title: work.title,
      subtitle: work.subtitle,
      year: work.year,
      rightsStatus: "期限届满",
      copyrightRoute: work.copyrightRoute,
      evidenceLevel: "A",
      imageRights: `Wikimedia Commons 文件页标记 ${discovered.license}`,
      sourceUrl: work.sourceUrl,
      sourceLabel: "Wikimedia Commons",
      licenseUrl: work.licenseUrl,
      researchDate,
      assetType: "公版动画原片抽帧",
      usage: work.usage,
      avoid: work.avoid,
      styles: ["黑白橡皮管动画", "增长信号回溯"],
      scenes: ["幽灵、鬼屋与通灵", "万圣节公版动画"],
      holidays: ["万圣节"],
      characters: work.characters,
      tags: ["万圣节", "早期动画", "怪诞 / 魔法", "增长线索"],
      awarenessScore: work.awarenessScore,
      awarenessLevel: work.awarenessLevel,
      evidenceSources: [work.sourceUrl, work.licenseUrl],
      riskFlags: work.riskFlags,
      frames: outputFrames,
    });
  }

  const supplement = {
    schemaVersion: "1.0",
    sourceVersion: intakeVersion,
    researchDate,
    recordMode: "frame-only",
    scope: "近 15 天 TikTok 画面信号回溯到已确认美国公版的 1929–1930 动画原片；现代角色截图不进入可用池。",
    evidenceBoundary: "增长信号来自登录态搜索与喜欢页定点样本，不代表全平台增长率或销量。抽帧仅作视觉研究与原创重画，不是生产级印花文件。",
    works: outputWorks,
  };
  receipt.completed = outputWorks.reduce((sum, work) => sum + work.frames.length, 0);
  receipt.sha256Unique = seenHashes.size;
  receipt.status = receipt.completed === receipt.requested && !receipt.rejected.length && receipt.sha256Unique === receipt.requested ? "PASS" : "BLOCK";
  await writeAtomic(outputPath, supplement);
  await writeAtomic(receiptPath, receipt);
  process.stdout.write(`${JSON.stringify({ status: receipt.status, requested: receipt.requested, imported: receipt.imported.length, reused: receipt.reused.length, completed: receipt.completed, sha256Unique: receipt.sha256Unique }, null, 2)}\n`);
} catch (error) {
  receipt.status = "BLOCK";
  receipt.fatalError = String(error.message || error);
  await writeAtomic(receiptPath, receipt);
  throw error;
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
