import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const API = process.env.EAGLE_API || "http://127.0.0.1:41595/api";
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ghostFolder = "MU3K31C2JW1H3";
const albumFolder = "MU3K31DE34CAY";
const intakeRoot = process.argv[2] || process.env.GROK_INTAKE_ROOT;
if (!intakeRoot) {
  throw new Error("请传入 Grok 解包根目录：node tools/import-grok-intake.mjs /path/to/grok-intake");
}
const ghostPreviewRoot = path.join(path.resolve(intakeRoot), "ghost", "previews");
const albumPreviewRoot = path.join(path.resolve(intakeRoot), "merge", "previews");
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pd-grok-intake-"));
const researchDate = "2026-09-16";
const intakeArchives = [
  { name: "GHOST-FINAL.tar.gz", sha256: "e126e7c5bba9ada64c81e6dc18effcbcb4d9b787ac96aa578b9b1a27e3aa77f4", role: "幽灵研究与预览" },
  { name: "MERGE-2026-09-16.tar.gz", sha256: "3584f3d718842015504c99bb75b93ba587e5a292cd4c950fbe080ce97c0eb3e3", role: "公版封面与现代授权研究" },
];
const deferredLeads = [
  { id: "ghost-aic-shoki-sword", reason: "AIC API 标记公版，但 IIIF 图像请求返回 403；没有可回读的本地原图，不进入公开页。" },
  { id: "ghost-aic-shoki-standing", reason: "AIC API 标记公版，但 IIIF 图像请求返回 403；没有可回读的本地原图，不进入公开页。" },
  { id: "ghost-aic-okiku", reason: "AIC API 标记公版，但 IIIF 图像请求返回 403；没有可回读的本地原图，不进入公开页。" },
  { id: "ghost-aic-laughing-demoness", reason: "AIC API 标记公版，但 IIIF 图像请求返回 403；没有可回读的本地原图，不进入公开页。" },
];
const excludedBrands = [
  { name: "Casper", reason: "现代角色与商品识别风险；本批不作为公版素材。" },
  { name: "Ghostbusters", reason: "电影、角色与商标受保护；排除。" },
  { name: "Disney Haunted Mansion", reason: "迪士尼角色、景点与商品体系受保护；排除。" },
];

const commonGhost = {
  rightsStatus: "公版 / 开放馆藏",
  copyrightRoute: "期限届满或机构开放馆藏",
  evidenceLevel: "A",
  imageRights: "来源页明确 Public Domain、CC0 或 No known restrictions",
  holidays: ["万圣节"],
  tags: ["万圣节", "怪诞 / 魔法"],
  scenes: ["幽灵、鬼屋与通灵"],
  avoid: "只取该具体历史作品的画面表达；避开 Casper、Ghostbusters、Disney Haunted Mansion、现代影视造型、品牌标志与现代修复配色。",
};

const ghosts = [
  { id:"ghost-stereoscope-1856", title:"立体镜中的幽灵", subtitle:"The Ghost in the Stereoscope", year:"ca. 1856", file:"eu_GE1-ghost-in-stereoscope.jpg", sourceUrl:"https://www.metmuseum.org/art/collection/search/302466", sourceLabel:"The Met", copyrightRoute:"Met Open Access · Public Domain", imageRights:"The Met 标记 Public Domain，可按开放政策商用", usage:"双联立体照、餐桌旁白布幽灵、人物惊吓关系。", styles:["维多利亚摄影", "手工上色"], characters:["白布幽灵"] },
  { id:"ghost-orphans-grave-1889", title:"孤儿在母亲墓前", subtitle:"The Orphans at Their Mother's Grave", year:"1889", file:"eu_GE2-orphans-mothers-grave.jpg", sourceUrl:"https://www.loc.gov/item/2004668383/", sourceLabel:"Library of Congress", copyrightRoute:"LOC · No known restrictions", imageRights:"LOC 权利栏：No known restrictions on publication", usage:"墓碑、儿童与半透明母亲灵体的三层叙事。", styles:["通灵摄影", "立体照片"], characters:["母亲幽灵"] },
  { id:"ghost-hallowell-composite-1901", title:"通灵会灵体合成照", subtitle:"Hallowell / Fallis Spirit Composite", year:"1901", file:"eu_GE4-hallowell-spirit-woman.jpg", sourceUrl:"https://www.loc.gov/item/91732576/", sourceLabel:"Library of Congress", copyrightRoute:"LOC · No known restrictions", imageRights:"LOC 权利栏：No known restrictions on publication", usage:"女性肖像、环绕灵体面孔、通灵会合成结构。", styles:["通灵摄影", "双重曝光"], characters:["通灵灵体"] },
  { id:"ghost-marley-leech-1843", title:"马利的幽灵", subtitle:"John Leech · A Christmas Carol", year:"1843", file:"ex_leech-marleys-ghost-1843.jpg", sourceUrl:"https://commons.wikimedia.org/wiki/File:Marley%27s_Ghost-John_Leech,_1843.jpg", sourceLabel:"Wikimedia Commons", copyrightRoute:"1843 初版插图 · 期限届满", imageRights:"Commons 标记公版；底层作品期限届满", usage:"锁链、账簿、睡帽与室内烛光；同时连接万圣节和圣诞节。", styles:["维多利亚插图", "手工上色"], characters:["Marley's Ghost"], holidays:["万圣节", "圣诞节"] },
  { id:"ghost-samuel-blake", title:"撒母耳的幽灵向扫罗显现", subtitle:"William Blake", year:"ca. 1800", file:"eu_GE8-blake-ghost-of-samuel.jpg", sourceUrl:"https://www.nga.gov/artworks/11498-ghost-samuel-appearing-saul", sourceLabel:"National Gallery of Art", copyrightRoute:"NGA Open Access", imageRights:"NGA 开放馆藏；底层作品期限届满", usage:"发光先知、跪伏人物与召灵仪式的纵向构图。", styles:["浪漫主义", "圣经异象"], characters:["Samuel"], scenes:["幽灵、鬼屋与通灵", "基督教 · 耶稣与圣像"], tags:["怪诞 / 魔法", "宗教 / 神话"] },
  { id:"ghost-marguerite-delacroix-1828", title:"玛格丽特的幽灵向浮士德显现", subtitle:"Eugène Delacroix · Faust", year:"1828", file:"eu_GE10-delacroix-marguerite-ghost.jpg", sourceUrl:"https://www.artic.edu/artworks/84499", sourceLabel:"Art Institute of Chicago", copyrightRoute:"AIC Open Access · CC0", imageRights:"AIC API 标记 is_public_domain=true", usage:"文学女幽灵、床边显现与黑白浪漫主义明暗。", styles:["浪漫主义版画", "文学幽灵"], characters:["Marguerite's Ghost"] },
  { id:"ghost-witchcraft-fantin-1899", title:"巫术", subtitle:"Henri Fantin-Latour", year:"1899", file:"eu_GE11-fantin-witchcraft.jpg", sourceUrl:"https://www.clevelandart.org/art/1921.68", sourceLabel:"Cleveland Museum of Art", copyrightRoute:"CMA Open Access · CC0", imageRights:"CMA API 标记 CC0", usage:"雾化召灵、漂浮人物和低对比灰阶气氛。", styles:["象征主义", "石版画"], characters:["召灵幻象"] },
  { id:"ghost-magician-roses-1892", title:"玫瑰魔术师与超自然生物", subtitle:"Calvert Lithograph", year:"1892", file:"eu_GE12-magician-roses-supernatural.jpg", sourceUrl:"https://www.loc.gov/item/2014636963/", sourceLabel:"Library of Congress", copyrightRoute:"LOC · No known restrictions", imageRights:"LOC 权利栏：No known restrictions on publication", usage:"舞台魔术师、花束与环绕灵体的彩色海报构图。", styles:["魔术海报", "彩色石版"], characters:["舞台灵体"] },
  { id:"ghost-thurston-1915", title:"灵魂会回来吗？", subtitle:"Thurston the Great Magician", year:"1915", file:"eu_GE13-thurston-spirits-come-back.jpg", sourceUrl:"https://www.loc.gov/item/2014636948/", sourceLabel:"Library of Congress", copyrightRoute:"LOC · No known restrictions", imageRights:"LOC 权利栏：No known restrictions on publication", usage:"巨大标题、漂浮头部、红黑蓝舞台魔术色盘。", styles:["魔术海报", "戏剧排版"], characters:["舞台灵体"] },
  { id:"ghost-joan-arc-1879", title:"圣女贞德与异象", subtitle:"Jules Bastien-Lepage", year:"1879", file:"eu_GE14-bastien-joan-arc-apparition.jpg", sourceUrl:"https://www.metmuseum.org/art/collection/search/435621", sourceLabel:"The Met", copyrightRoute:"Met Open Access · Public Domain", imageRights:"The Met API 标记 isPublicDomain=true", usage:"人物、花园与半透明圣者异象的层叠。", styles:["自然主义", "宗教异象"], characters:["Joan of Arc"], scenes:["幽灵、鬼屋与通灵", "基督教 · 耶稣与圣像"], tags:["怪诞 / 魔法", "宗教 / 神话"] },
  { id:"ghost-witchcraft-evening", title:"巫术场景：黄昏", subtitle:"Salvator Rosa", year:"c. 1645–49", file:"eu_GE15-rosa-witchcraft-evening.jpg", sourceUrl:"https://www.clevelandart.org/art/1977.37.3", sourceLabel:"Cleveland Museum of Art", copyrightRoute:"CMA Open Access · CC0", imageRights:"CMA API 标记 CC0", usage:"召灵者、骨骸幽灵和岩石火光的圆形聚焦。", styles:["巴洛克版画", "巫术场景"], characters:["召唤幽灵"] },
  { id:"ghost-christmas-frolic-1814", title:"幽灵：一场圣诞恶作剧", subtitle:"The Ghost — A Christmas Frolic", year:"1814", file:"ex_ghost-christmas-frolic-1814.jpg", sourceUrl:"https://www.loc.gov/item/2005676988/", sourceLabel:"Library of Congress", copyrightRoute:"1814 版画 · LOC No known restrictions", imageRights:"LOC 说明该馆藏许多作品为公版或无已知限制", usage:"烛台、白布幽灵、楼梯追逐和室内混乱群像。", styles:["讽刺版画", "白布幽灵"], characters:["白布幽灵"], holidays:["万圣节", "圣诞节"] },
  { id:"ghost-rackham-marley-1915", title:"马利的幽灵：拉克姆版", subtitle:"Arthur Rackham · A Christmas Carol", year:"1915", file:"ex_rackham-marley-ghost-1915.jpg", sourceUrl:"https://archive.org/details/christmascar00dick", sourceLabel:"Internet Archive", copyrightRoute:"1915 插图 · 期限届满", imageRights:"Internet Archive 扫描；底层作品期限届满", usage:"半透明锁链幽灵、维多利亚室内和蓝灰色调。", styles:["拉克姆插图", "文学幽灵"], characters:["Marley's Ghost"], holidays:["万圣节", "圣诞节"] },
  { id:"ghost-rackham-phantoms-1915", title:"空中挤满幽灵", subtitle:"Arthur Rackham · A Christmas Carol", year:"1915", file:"ex_rackham-phantoms-1915.jpg", sourceUrl:"https://archive.org/details/christmascar00dick", sourceLabel:"Internet Archive", copyrightRoute:"1915 插图 · 期限届满", imageRights:"Internet Archive 扫描；底层作品期限届满", usage:"锁链幽灵群、烟雾层次和垂直漂浮节奏。", styles:["拉克姆插图", "幽灵群像"], characters:["Chained Phantoms"], holidays:["万圣节", "圣诞节"] },
  { id:"ghost-buguet-1874", title:"布盖通灵摄影", subtitle:"Édouard Isidore Buguet", year:"1874", file:"ex_buguet-spirit-photo-1874.jpg", sourceUrl:"https://archive.org/details/edward-isidore-buguet-spiritualist-photograph-albumin-print-1874", sourceLabel:"Internet Archive", copyrightRoute:"1874 摄影 · 期限届满", imageRights:"来源标记 Public Domain；底层摄影期限届满", usage:"坐姿人物上方覆盖半透明披布灵体；可研究伪通灵摄影语法。", styles:["通灵摄影", "双重曝光"], characters:["披布灵体"] },
  { id:"ghost-underwood-1893", title:"休息的幽灵演奏者", subtitle:"Phantom Player Resting", year:"1893", file:"eu_GE23-underwood-phantom-player-1893.jpg", sourceUrl:"https://archive.org/details/stereoview-no.-1634-phantom-player-resting-littleton-underwood-and-underwood-1893", sourceLabel:"Internet Archive", copyrightRoute:"1893 摄影 · 期限届满", imageRights:"来源标记 Public Domain；底层摄影期限届满", usage:"客厅、乐器与半透明人物的横向立体照。", styles:["通灵摄影", "立体照片"], characters:["幽灵演奏者"] },
  { id:"ghost-oil-lamp-1810", title:"幽灵与油灯", subtitle:"Tani Bun'ichi", year:"1810", file:"eu_GE27-cma-ghost-oil-lamp.jpg", sourceUrl:"https://www.clevelandart.org/art/1992.71", sourceLabel:"Cleveland Museum of Art", copyrightRoute:"CMA Open Access · CC0", imageRights:"CMA API 标记 CC0", usage:"无脚白衣幽灵、长发、油灯与大面积留白。", styles:["日本幽灵画", "水墨"], characters:["Yūrei"], scenes:["幽灵、鬼屋与通灵", "妖怪、幽灵与民间护佑神"] },
  { id:"ghost-haunted-auto-1910", title:"闹鬼的汽车", subtitle:"Bryant Baker · Puck", year:"1910", file:"eu_GE26-haunted-auto-1910.jpg", sourceUrl:"https://www.loc.gov/item/2011647576/", sourceLabel:"Library of Congress", copyrightRoute:"LOC · No known restrictions", imageRights:"LOC 权利栏：No known restrictions on publication", usage:"透明动物幽灵围绕汽车；早期漫画式动态群像。", styles:["讽刺杂志封面", "动物幽灵"], characters:["动物幽灵群"] },
  { id:"ghost-newmann-1911", title:"Newmann 的灵体奇术", subtitle:"Wonderful Spirit Mysteries", year:"1911", file:"ex_ghost-newmann-spirits-2014636926.jpg", sourceUrl:"https://www.loc.gov/item/2014636926/", sourceLabel:"Library of Congress", copyrightRoute:"LOC · No known restrictions", imageRights:"LOC 权利栏：No known restrictions on publication", usage:"女性灵体、舞台拱门和高对比红黑海报。", styles:["魔术海报", "通灵舞台"], characters:["舞台灵体"] },
  { id:"ghost-haunted-lane-1889", title:"闹鬼的小路", subtitle:"The Haunted Lane", year:"1889", file:"eu_RECOVERED-l3-hall-haunted-lane-1889.jpg", sourceUrl:"https://www.loc.gov/item/2006686826/", sourceLabel:"Library of Congress", copyrightRoute:"LOC · No known restrictions", imageRights:"LOC 权利栏：No known restrictions on publication", usage:"树林小路、白衣灵体与立体摄影的深景。", styles:["通灵摄影", "鬼路场景"], characters:["白衣幽灵"] },
  { id:"ghost-hamlet-delacroix-1835", title:"哈姆雷特追随父亲幽灵", subtitle:"Eugène Delacroix", year:"1835", file:"ex_cma-hamlet-ghost-1835.jpg", sourceUrl:"https://www.clevelandart.org/art/1941.215.2", sourceLabel:"Cleveland Museum of Art", copyrightRoute:"CMA Open Access · CC0", imageRights:"CMA API 标记 CC0", usage:"城墙、披甲父王幽灵与追随动作。", styles:["浪漫主义版画", "文学幽灵"], characters:["Hamlet's Father"] },
  { id:"ghost-aic-shoki-sword", title:"钟馗磨剑", subtitle:"Okumura Masanobu", year:"c. 1725", imageUrl:"https://www.artic.edu/iiif/2/ee365ff0-1690-439b-4c6a-aaba0cfc9046/full/1200,/0/default.jpg", sourceUrl:"https://www.artic.edu/artworks/44164", sourceLabel:"Art Institute of Chicago", copyrightRoute:"AIC Open Access · CC0", imageRights:"AIC API 标记 is_public_domain=true", usage:"独立钟馗、长剑与柱绘窄幅剪影。", styles:["浮世绘", "柱绘"], characters:["钟馗"], scenes:["幽灵、鬼屋与通灵", "妖怪、幽灵与民间护佑神"] },
  { id:"ghost-aic-shoki-standing", title:"钟馗立像", subtitle:"Okumura Masanobu", year:"c. 1745", imageUrl:"https://www.artic.edu/iiif/2/fb9393a1-4c53-300b-70c4-e37969a63e53/full/1200,/0/default.jpg", sourceUrl:"https://www.artic.edu/artworks/44343", sourceLabel:"Art Institute of Chicago", copyrightRoute:"AIC Open Access · CC0", imageRights:"AIC API 标记 is_public_domain=true", usage:"长须钟馗、袍袖和纵向柱绘轮廓。", styles:["浮世绘", "柱绘"], characters:["钟馗"], scenes:["幽灵、鬼屋与通灵", "妖怪、幽灵与民间护佑神"] },
  { id:"ghost-aic-okiku", title:"皿屋敷：阿菊幽灵", subtitle:"Hokusai · One Hundred Ghost Tales", year:"1831–32", imageUrl:"https://www.artic.edu/iiif/2/0b59ff1e-d677-8eed-75ab-d5dad6fd1865/full/1200,/0/default.jpg", sourceUrl:"https://www.artic.edu/artworks/47407", sourceLabel:"Art Institute of Chicago", copyrightRoute:"AIC Open Access · CC0", imageRights:"AIC API 标记 is_public_domain=true", usage:"盘碟叠成的蛇形长颈幽灵；适合单一怪异焦点。", styles:["浮世绘", "百物语"], characters:["Okiku"], scenes:["幽灵、鬼屋与通灵", "妖怪、幽灵与民间护佑神"] },
  { id:"ghost-aic-laughing-demoness", title:"笑般若", subtitle:"Hokusai · One Hundred Ghost Tales", year:"1831–32", imageUrl:"https://www.artic.edu/iiif/2/6c474c5c-8acd-e41a-b78a-4e991dc96c64/full/1200,/0/default.jpg", sourceUrl:"https://www.artic.edu/artworks/47411", sourceLabel:"Art Institute of Chicago", copyrightRoute:"AIC Open Access · CC0", imageRights:"AIC API 标记 is_public_domain=true", usage:"角、蛇、扭转面孔和圆形火光；保留北斋原版线色关系。", styles:["浮世绘", "百物语"], characters:["Warai Hannya"], scenes:["幽灵、鬼屋与通灵", "妖怪、幽灵与民间护佑神"] },
  { id:"ghost-met-cat-demon", title:"冈崎猫妖怪谈", subtitle:"Utagawa Kuniyoshi", year:"ca. 1850", file:"uk_ghost-met-45282.jpg", sourceUrl:"https://www.metmuseum.org/art/collection/search/45282", sourceLabel:"The Met", copyrightRoute:"Met Open Access · Public Domain", imageRights:"The Met API 标记 isPublicDomain=true", usage:"巨猫面孔、室内夜戏与被压缩的人物空间。", styles:["浮世绘", "妖猫怪谈"], characters:["Cat Demon"], scenes:["幽灵、鬼屋与通灵", "妖怪、幽灵与民间护佑神"] },
  { id:"ghost-met-zhong-kui", title:"钟馗", subtitle:"Okumura Masanobu", year:"18th century", file:"uk_ghost-met-56722.jpg", sourceUrl:"https://www.metmuseum.org/art/collection/search/56722", sourceLabel:"The Met", copyrightRoute:"Met Open Access · Public Domain", imageRights:"The Met API 标记 isPublicDomain=true", usage:"长须、官帽、长剑和窄幅站姿。", styles:["浮世绘", "柱绘"], characters:["钟馗"], scenes:["幽灵、鬼屋与通灵", "妖怪、幽灵与民间护佑神"] },
  { id:"ghost-met-demon-drawings", title:"鬼怪素描", subtitle:"Kawanabe Kyōsai", year:"late 19th century", file:"uk_ghost-met-57231.jpg", sourceUrl:"https://www.metmuseum.org/art/collection/search/57231", sourceLabel:"The Met", copyrightRoute:"Met Open Access · Public Domain", imageRights:"The Met API 标记 isPublicDomain=true", usage:"多种鬼怪轮廓、动作速写与角色表情库。", styles:["日本素描", "鬼怪角色表"], characters:["Demons"], scenes:["幽灵、鬼屋与通灵", "妖怪、幽灵与民间护佑神"] },
  { id:"ghost-met-yoshihira-revenge", title:"义平幽灵复仇", subtitle:"Utagawa Yoshifusa", year:"1856", file:"uk_ghost-met-63378.jpg", sourceUrl:"https://www.metmuseum.org/art/collection/search/63378", sourceLabel:"The Met", copyrightRoute:"Met Open Access · Public Domain", imageRights:"The Met API 标记 isPublicDomain=true", usage:"瀑布、武者幽灵与横向戏剧叙事。", styles:["浮世绘", "复仇幽灵"], characters:["Yoshihira's Ghost"], scenes:["幽灵、鬼屋与通灵", "妖怪、幽灵与民间护佑神"] },
  { id:"ghost-met-shoki-banner", title:"鲤旗与钟馗旗", subtitle:"Kawanabe Kyōsai", year:"before 1870", file:"uk_ghost-met-754547.jpg", sourceUrl:"https://www.metmuseum.org/art/collection/search/754547", sourceLabel:"The Met", copyrightRoute:"Met Open Access · Public Domain", imageRights:"The Met API 标记 isPublicDomain=true", usage:"节庆旗幡、护佑钟馗与鲤鱼的垂直组合。", styles:["日本节庆画", "旗幡"], characters:["钟馗"], scenes:["幽灵、鬼屋与通灵", "妖怪、幽灵与民间护佑神"] },
].filter((item) => !item.imageUrl).map((item) => ({ ...commonGhost, ...item }));

const publicDomainCovers = [
  { id:"sheet-maple-leaf-rag-1899", title:"Maple Leaf Rag", year:"1899", file:"sheet_smpd-maple-leaf-rag-1899.jpg", sourceUrl:"https://commons.wikimedia.org/wiki/File:Maple_Leaf_Rag_1st_ed_b.jpg", sourceLabel:"Wikimedia Commons", rightsStatus:"期限届满", evidenceLevel:"A", visualType:"人物 + 字排", grammar:"装饰大字、双人舞步、上下留白", use:"舞步剪影、拉格泰姆字排、旧纸黑白线描", avoid:"避免沿用现代录音封套、厂牌标志与后期修复配色" },
  { id:"sheet-entertainer-1902", title:"The Entertainer", year:"1902", file:"sheet_smpd-the-entertainer-1902.jpg", sourceUrl:"https://commons.wikimedia.org/wiki/File:1902_The_Entertainer.jpg", sourceLabel:"Wikimedia Commons", rightsStatus:"期限届满", evidenceLevel:"A", visualType:"肖像 + 字排", grammar:"椭圆肖像、曲线标题、乐谱装饰框", use:"剧场肖像框、拉格泰姆标题与复古票券结构", avoid:"不要套用现代电影或录音版本包装" },
  { id:"sheet-cleopatra-rag-1915", title:"Cleopatra Rag", year:"1915", file:"sheet_smpd-cleopatra-rag-1915.jpg", sourceUrl:"https://commons.wikimedia.org/wiki/File:1915_Cleopatra_Rag.jpg", sourceLabel:"Wikimedia Commons", rightsStatus:"期限届满", evidenceLevel:"B", visualType:"人物 + 装饰", grammar:"中央人物、埃及边框、标题拱门", use:"历史东方主义字排与装饰结构；人物内容需敏感性复核", avoid:"不要沿用现代 Cleopatra 品牌或电影造型" },
  { id:"sheet-magnetic-rag-1914", title:"Magnetic Rag", year:"1914", file:"sheet_smpd-magnetic-rag-1914.jpg", sourceUrl:"https://commons.wikimedia.org/wiki/File:Magnetic_Rag.jpg", sourceLabel:"Wikimedia Commons", rightsStatus:"期限届满", evidenceLevel:"A", visualType:"纯字排", grammar:"巨大标题、细线装饰、留白", use:"单色复古标题、音符和细线花饰", avoid:"不复制现代 Scott Joplin 录音包装" },
  { id:"sheet-black-cat-rag-1905", title:"Black Cat Rag", year:"1905", file:"sheet_smpd-black-cat-rag-1905.jpg", sourceUrl:"https://commons.wikimedia.org/wiki/File:Black_Cat_Rag.jpg", sourceLabel:"Wikimedia Commons", rightsStatus:"期限届满", evidenceLevel:"A", visualType:"动物 + 字排", grammar:"黑猫主体、标题顶置、窄幅舞台", use:"黑猫、乐谱字排和万圣节跨题材", avoid:"避开现代黑猫品牌与已注册标识" },
  { id:"sheet-spaghetti-rag-1910", title:"Spaghetti Rag", year:"1910", file:"sheet_smpd-spaghetti-rag-1910.jpg", sourceUrl:"https://commons.wikimedia.org/wiki/File:Spaghetti_Rag.jpg", sourceLabel:"Wikimedia Commons", rightsStatus:"期限届满", evidenceLevel:"A", visualType:"人物 + 幽默", grammar:"夸张人物、食物动作、手写式标题", use:"食物喜剧、人物动作和餐馆海报结构", avoid:"人物刻板形象需内容复核；不直接照搬整版" },
  { id:"sheet-kismet-rag-1913", title:"Kismet Rag", year:"1913", file:"sheet_smpd-kismet-rag-1913.jpg", sourceUrl:"https://commons.wikimedia.org/wiki/File:1913_Kismet_Rag.jpg", sourceLabel:"Wikimedia Commons", rightsStatus:"期限届满", evidenceLevel:"A", visualType:"神话 + 字排", grammar:"狮身人面、沙漠地平线、装饰标题", use:"命运、神秘、几何边框与复古乐谱色盘", avoid:"历史东方主义语境需内容复核" },
  { id:"sheet-bloomer-waltz-1851", title:"Bloomer Waltz", year:"c. 1851", file:"sheet_smpd-bloomer-waltz-1851.jpg", sourceUrl:"https://www.loc.gov/item/95505065/", sourceLabel:"Library of Congress", rightsStatus:"期限届满", evidenceLevel:"A", visualType:"服饰人物", grammar:"多人物服装展示、标题横栏、手工上色", use:"历史服装、人物队列和时装图式", avoid:"不把历史服装图误称现代品牌联名" },
  { id:"sheet-black-cat-magazine-1895", title:"The Black Cat", year:"1895", file:"sheet_smpd-black-cat-magazine-1895.jpg", sourceUrl:"https://www.loc.gov/item/2015647207/", sourceLabel:"Library of Congress", rightsStatus:"期限届满", evidenceLevel:"A", visualType:"人物 + 黑猫", grammar:"少女坐月牙、黑猫、圆形花环", use:"万圣节、黑猫、新艺术风弧线与徽章构图", avoid:"先核同名现代商标；不暗示官方出版关联" },
  { id:"sheet-airship-trip-1904", title:"Come, Take a Trip in My Air Ship", year:"1904", file:"sheet_smpd-come-take-trip-airship-si.jpg", sourceUrl:"https://library.si.edu/digital-library/book/Cometaketripmya00Evan", sourceLabel:"Smithsonian Libraries", rightsStatus:"CC0 / 公版开放馆藏", evidenceLevel:"A", visualType:"交通 + 浪漫", grammar:"飞艇、男女邀约、斜向飞行", use:"复古未来、约会飞行和旅行海报结构", avoid:"不加入现代航空品牌或受保护标志" },
];

async function api(endpoint, options = {}) {
  const response = await fetch(`${API}${endpoint}`, options);
  if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.status !== "success") throw new Error(`${endpoint}: ${JSON.stringify(payload)}`);
  return payload.data;
}

async function existingByIntake(folderId) {
  const items = await api(`/item/list?folders=${folderId}&limit=1000`);
  const map = new Map();
  for (const item of items || []) {
    const tag = (item.tags || []).find((value) => value.startsWith("intake-id:"));
    if (tag) map.set(tag.slice("intake-id:".length), item.id);
  }
  return map;
}

function extensionFrom(bytes, contentType = "") {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (contentType.includes("webp") || String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  throw new Error("Unsupported image signature");
}

async function materialize(item, group) {
  if (item.file) {
    const root = group === "ghost" ? ghostPreviewRoot : albumPreviewRoot;
    const file = path.join(root, item.file);
    await fs.access(file);
    return file;
  }
  const response = await fetch(item.imageUrl, { headers: { "user-agent": "PublicDomainVisualResearch/1.0" } });
  if (!response.ok) throw new Error(`${item.id}: image HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 5000) throw new Error(`${item.id}: image too small (${bytes.length})`);
  const ext = extensionFrom(bytes, response.headers.get("content-type") || "");
  const file = path.join(tempRoot, `${item.id}.${ext}`);
  await fs.writeFile(file, bytes);
  return file;
}

async function importOne(item, folderId, group, existing) {
  if (existing.has(item.id)) return { id: existing.get(item.id), skipped: true };
  const file = await materialize(item, group);
  const tags = [
    "公版IP", group === "ghost" ? "幽灵题材" : "专辑封面源流",
    `intake-id:${item.id}`, `权利:${item.rightsStatus}`,
    `证据:${item.evidenceLevel}`, `研究日:${researchDate}`,
    ...(item.tags || []), ...(item.styles || []), ...(item.characters || []),
  ];
  const annotation = [
    `作品：${item.title}`, item.subtitle ? `原文/版本：${item.subtitle}` : "",
    `年代：${item.year}`, `权利路径：${item.copyrightRoute || item.rightsStatus}`,
    `图像权利：${item.imageRights || "以来源页为准"}`, `证据等级：${item.evidenceLevel}`,
    `可取：${item.usage || item.use}`, `避开：${item.avoid}`,
    `来源页：${item.sourceUrl}`, `研究日期：${researchDate}`,
  ].filter(Boolean).join("\n");
  const id = await api("/item/addFromPath", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: file, name: `${item.title}｜${item.year}｜${item.sourceLabel}`, website: item.sourceUrl, annotation, tags: [...new Set(tags)], folderIDs: [folderId], star: item.evidenceLevel === "A" ? 5 : 3, notification: false }),
  });
  return { id, skipped: false };
}

const ghostExisting = await existingByIntake(ghostFolder);
const albumExisting = await existingByIntake(albumFolder);
const receipt = { researchDate, intakeArchives, deferredLeads, excludedBrands, ghosts: [], publicDomainCovers: [] };

for (const item of ghosts) {
  const result = await importOne(item, ghostFolder, "ghost", ghostExisting);
  item.eagleItemId = result.id;
  receipt.ghosts.push({ intakeId: item.id, eagleItemId: result.id, skipped: result.skipped, sourceUrl: item.sourceUrl });
}

for (const item of publicDomainCovers) {
  const result = await importOne(item, albumFolder, "album", albumExisting);
  item.eagleItemId = result.id;
  receipt.publicDomainCovers.push({ intakeId: item.id, eagleItemId: result.id, skipped: result.skipped, sourceUrl: item.sourceUrl });
}

const ghostSupplement = {
  schemaVersion: "1.0",
  sourceVersion: "ghost-commercial-2026-09-16-v1",
  researchDate,
  works: ghosts.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    year: item.year,
    rightsStatus: item.rightsStatus,
    copyrightRoute: item.copyrightRoute,
    evidenceLevel: item.evidenceLevel,
    imageRights: item.imageRights,
    sourceUrl: item.sourceUrl,
    sourceLabel: item.sourceLabel,
    usage: item.usage,
    avoid: item.avoid,
    styles: item.styles,
    scenes: item.scenes,
    holidays: item.holidays,
    characters: item.characters,
    tags: item.tags,
    frames: [{ eagleItemId: item.eagleItemId, subtitle: item.subtitle || item.title }],
  })),
};

const albumResearch = {
  schemaVersion: "1.0",
  sourceVersion: "album-cover-research-2026-09-16-v1",
  researchDate,
  publicDomain: publicDomainCovers.map(({ file, ...item }) => item),
};

await fs.writeFile(path.join(projectRoot, "source/ghost-commercial-supplement.json"), `${JSON.stringify(ghostSupplement, null, 2)}\n`);
await fs.writeFile(path.join(projectRoot, "source/album-public-domain.json"), `${JSON.stringify(albumResearch, null, 2)}\n`);
await fs.writeFile(path.join(projectRoot, "source/grok-intake-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
await fs.rm(tempRoot, { recursive: true, force: true });
console.log(JSON.stringify({ ghosts: receipt.ghosts.length, publicDomainCovers: receipt.publicDomainCovers.length, importedGhosts: receipt.ghosts.filter((item) => !item.skipped).length, importedCovers: receipt.publicDomainCovers.filter((item) => !item.skipped).length }, null, 2));
