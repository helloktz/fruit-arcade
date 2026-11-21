# Super Fruit Arcade · 超级水果机

浏览器本地运行的原创虚拟积分街机。首次开机赠送 10,000 分，点击水果键加注，再按「开始游戏」。奖励结算后可以领取，或用待领取积分挑战猜大小。

## 本地运行

推荐使用 Node.js 22.12+ 或更新的受支持版本。

```sh
npm install
npm run dev
npm run build
npm run preview
```

Vite 会显示本机访问地址。生产文件在 `dist/`，可由本地 HTTP 服务器或静态站点托管。音效在首次操作后启动。一个浏览器标签页对应一台机台，刷新会完成当前局已抽取的奖励队列。

## 验证与分析

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run simulate -- 10000
npm run simulate -- 100000
npm run simulate -- 1000000
```

已有 Edge 的 Windows 环境也可用 PowerShell 设置 `$env:PW_CHANNEL='msedge'` 后执行端到端测试。模拟器默认九项各押 1 分、固定种子；其统计覆盖所有附加奖励。理论值使用解析期望，转轮组合穷举。设置中的开发调试区也支持按当前下注模拟。最近 100 局结果和最近 500 笔流水保存在浏览器中。

## 模块

- `src/config.ts` 定义灯位、赔率、权重、转轮条带及规则参数。
- `src/random.ts` 提供加密随机源、可复现测试源和拒绝采样。
- `src/rules.ts` 生成整局结果与有序奖励事件。转轮奖励没有独立扣分入口。
- `src/engine.ts` 管理下注、扣分、待领池、比倍及领取。状态转换见 `stateMachine.ts`，存档验证见 `storage.ts`。
- `src/analysis.ts` 复用游戏结果生成器进行模拟。
- `src/symbolSprites.ts` 加载并缓存共用 SVG，`screen.ts` 绘制玻璃面板。音效使用 Web Audio 合成。
- `src/ui/` 管理操作面板、快捷键和偏好设置。引擎可以脱离 DOM、Canvas 和音频独立测试。

完整奖励数学规则见 [RULES.md](RULES.md)。数字键 1–9 选择水果，上下方向键增减，空格开局，回车确认或领取，Backspace 清空，R 重复，A 切换自动，M 静音，Esc 关闭面板。

## 本地化

默认语言为繁體中文。界面、Canvas、辅助功能标签、错误文案和具名插值模板集中在 `src/locales/zh-TW.json`，规则正文位于 `src/locales/zh-TW/rules.md`。界面通过 `src/locales/index.ts` 读取资源。新增文案请使用有语义的键，带参数的句子使用完整模板，例如 `{amount}`。HTML 可使用 `data-i18n` 和 `data-i18n-aria` 绑定静态标签。

规则、统计和存档使用稳定的模式 ID。修改译文时保留 ID。旧存档的中文模式值由独立的 v1 迁移表识别，该表属于历史数据格式。

## 立式灯箱与跑灯调校

[参考裁图库](references/panel/README.md)记录了两份原图的来源、逐格裁图坐标和网络候选。原始照片及包含照片的对照图保存在本地档案。[美术验收记录](references/panel/visual-acceptance.md)包含西瓜测量数据、15 个素材的自审结果、整机截图和复核方法。

机台外壳、七段数码窗、环形灯盘和九键押注排按参考照片的功能位置重新组合。面板采用两张原创丝网印刷风格插画，玻璃边饰在 `public/art/backglass-cobalt.webp`，飞行邮差与海岸果园在 `public/art/orchard-courier.webp`。`src/style.css` 将背板从深蓝过渡到亮青蓝与草绿，由冷色网格、红色数码窗和亮黄跑灯构成冷暖层次。中央窗口显示本局押注，左右窗口分别显示待领得分和当前积分。转轮只在转轮奖励阶段出现。

《水果玛莉》机具说明书第 2 节记载了八格押分、按启动键和自动轮流点灯的流程。[机具说明书](https://gcis.nat.gov.tw/graphics/game_pic/320/game320a_002.pdf)

其他游艺机也使用延长每灯驻留时间来表现减速。此处借鉴实现原理。另有乐咖玩具的实机录像，以及从 02:09 开始的家庭机台游玩示范，可用于人工对照。[灯光控制专利](https://patents.google.com/patent/JP2010082034A/en) · [实机录像](https://www.youtube.com/watch?v=_0fobx8hUbk) · [游玩示范](https://www.youtube.com/watch?v=V2h9m2Gzq-c&t=129s)

查到的说明书未给出照片中机型的固定圈数或逐灯时序。以下为原型调校值，未经原机逐帧标定。每局取随机 UUID 的独立位选择方向及 2–5 个完整圈，再走到预抽取的目标。标准速度从约 121 毫秒/格加速到 38 毫秒/格，巡航后逐渐延长至 278 毫秒/格，最后留灯 180 毫秒。所有切换点都基于累计时间，低帧率时追上时间线。设置中的动画速度和简化动画仅改变演出时间。调校入口为 `src/timing.ts`。

九键顺序、倍率与 28 个顺时针灯位见 `src/panel.ts`，依据[露天正面照片](https://gcs.rimg.com.tw/g2/a/d4/3e/21901442501694_651.jpg)。九个押注图案与六个灯格变体分别存放在 `public/art/symbols/`，同名 SVG 可直接替换。界面文案存放在繁体语言目录，面板印字随对应 SVG 一起替换。

SVG 顶部的 `:root` 色板集中管理轮廓线、主色、阴影与高光。更换配色时直接修改对应变量。双星也可用 `--hue-shift` 整体旋转色相。验收时同时看桌面与手机的实际灯格、浏览器直接放大的 SVG。VectorCraft 批量重着色时，使用已将变量解析为明确填色和描边的 SVG 副本。

火车先响两声汽笛，再沿灯盘连续送灯。触发概率、送灯数量、全灯奖结算与时延采用本项目配置。得分曲使用合成音色重新编写。在开发模式下，通过「設定 → 開發除錯」输入种子 81 或 373，可分别重现火车和全灯奖。[列车玩法](https://mjweb.com.tw/htm/rule_mazai.htm) · [同类机全灯奖录像](https://www.youtube.com/watch?v=p3A6cJ-fPyY) · [得分音乐参考](https://www.bilibili.com/video/BV17osUexEys/)


<details>
<summary>原创机台插画生成提示词</summary>

以下两张位图由内置 imagegen 生成，分别用作中央插画和外框底图。

```text
Use case: illustration-story. Asset type: horizontal back-printed illustration within a vintage fruit-arcade glass panel, x:y about 1.38:1. Draw an original cheerful citrus fruit character wearing a teal post-pilot scarf and dark flying cap, piloting a compact cream and crimson 1930s mail plane above an orchard by a tropical coastline. Illustrate as an authentic late-1990s screen-printed arcade header, limited teal blues, cream, scarlet, and pale yellow, bold midnight ink outlines, restrained halftone only in shadows, bright clear blue sky. Wide stable composition, focal character plane on CENTER LEFT, citrus groves at edges, lower center calmer so a red LED readout will overlay it. Rich composition but silhouette reads at 320px. Image only, full bleed, front view of the illustration; no letters or numerals, no game interface, no existing mascot, no render mockup.
```

```text
Use case: illustration-story. Asset type: portrait silk-screen backglass background for an original vintage orchard fruit arcade cabinet, about 0.84:1. Flat front-on print artwork edge to edge. Make a deep cobalt and ultramarine ground with subtle screenprint dots. Frame it with original bold leaves, tangerine blossoms, small scarlet and golden citrus fruit clusters at BOTH far lower corners, stylized pale cyan clouds and two slim cream/orange pinstripes curved along the shoulders. Leave the upper-center and entire middle calm and saturated cobalt for actual digital meters, lamp board and nine keys on top; do not draw actual UI. Along the vertical edges, avoid bulky objects; thin botanical silhouette along margins only. Dense, vibrant ink accents, crisp shapes like late-1990s screen printing, very limited grain. No text, no letters, no digits, no characters, no buttons, no cabinet mockup.
```

</details>
