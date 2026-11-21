# 水果機原始參考裁圖

用同一編號對照兩份原圖。`photo` 是實機照，`ruten` 是較清楚的正面面板照。正面照仍有拍攝和 JPEG 壓縮痕跡。這兩份照片及其裁圖用於參考和驗收，未查到面板印刷圖的公開再使用授權。

公開版本保留來源網址、座標索引、量測數據與生成腳本。本頁的原圖、裁圖與含原照的對照圖連結適用於有這些檔案的本機工作區。要重新生成裁圖，先把可用的兩張參考照放到下表對應的 `sources/` 路徑。

| 來源代號 | 原圖 | 觀察條件 |
| --- | --- | --- |
| `photo` | [用戶提供的實機照，640×640](sources/cabinet-photo.png) | 斜拍、玻璃反光，`L26` 當時亮燈。保留了機櫃和數字窗在使用時的狀態。 |
| `ruten` | [露天正面照，768×800](sources/ruten-front.jpg) · [原圖片地址](https://gcs.rimg.com.tw/g2/a/d4/3e/21901442501694_651.jpg) | 以這份確認格序、字形及大色塊。原商品頁本次未能開啟，原始 JPEG 已保存。 |

## 查找裁圖

[逐圖索引 CSV](index.csv) 記載來源、檔案、位置、裁切座標、像素尺寸和影響判讀的現象。`crop_from` 指向座標所在的圖，原點為該圖左上角，`right` 和 `bottom` 為排除邊界。每個來源各有 **54 張元素裁圖**。

| 目錄 | 內容 |
| --- | --- |
| `lamps/` | `L01` 至 `L28`。從左上角開始，順時針編號。`row` 和 `column` 使用 1 起算的燈盤行列。 |
| `keys/` | `K01` 至 `K09`。由左到右，保留倍率、圖案與下方數字窗。 |
| `key-symbols/` | 同樣的 `K01` 至 `K09`。只裁按鍵圖案區，水平邊界依兩份照片分別校準。 |
| `features/` | `F01` 至 `F08`。得分窗、積分窗、中央主畫、黃色 8 號球、JP 圖區、中央數字窗與大小圓標。 |

每份來源也保存了獨立校正後的 `panel.png`、`board.png`、`keytray.png` 和 `keyicons.png`。下列對照圖每組左邊是實機照、右邊是露天照。預覽採用最近鄰放大，便於看像素邊界。

- [28 個燈位對照](compare-lamps.png)
- [九個押注圖案對照](compare-key-symbols.png)
- [九組完整押注鍵對照](compare-keys.png)

| 重點 | 實機照 | 露天照 |
| --- | --- | --- |
| 西瓜燈格 `L10` | [查看](photo/lamps/L10-watermelon.png) | [查看](ruten/lamps/L10-watermelon.png) |
| 西瓜押注圖 `K02` | [查看](photo/key-symbols/K02-watermelon.png) | [查看](ruten/key-symbols/K02-watermelon.png) |
| 機會 `L12` | [查看](photo/lamps/L12-chance.png) | [查看](ruten/lamps/L12-chance.png) |
| 列車 `L18` | [查看](photo/lamps/L18-train.png) | [查看](ruten/lamps/L18-train.png) |
| 全燈獎 `L19` | [查看](photo/lamps/L19-all.png) | [查看](ruten/lamps/L19-all.png) |
| 雙星 `L24` | [查看](photo/lamps/L24-double_star.png) | [查看](ruten/lamps/L24-double_star.png) |
| 命運 `L26` | [查看](photo/lamps/L26-fate.png) | [查看](ruten/lamps/L26-fate.png) |

## 網路素材核對

2026-11-21 按面板線索和單元素分別檢索。查到了同版樣式的另一張機台照，以及公開授權的通用水果素材。本次尚未找到可確認為同款、比露天裁圖更清楚的獨立印刷原畫。

| 來源 | 核對結果 | 素材狀態 |
| --- | --- | --- |
| [GM-95 舊機台照片](https://fuji.12bit.club/gm95/xml/a4-smb3.jpg) | 另一種機櫃，能核對黃色 8 號球、三組 BAR、右側機會與底排列車。全圖 398×599，燈格比露天版更小。 | 歷史比對資料，未見公開重用授權。 |
| [露天白殼小瑪莉](https://www.ruten.com.tw/item/22312267891317/) | 有近似的雙切面西瓜，另有單切面與 ×2 變體。中央插畫與按鍵配置不同，照片中單個西瓜格也較小。 | 同類機參考，未見公開重用授權。 |
| [Watermelon.svg，James Kilfiger](https://commons.wikimedia.org/wiki/File:Watermelon.svg) | 可縮放的單一西瓜插畫。頁面提供 SVG 原檔，構圖和色塊與雙切面燈格不同。 | 頁面標注 CC0。下載直連本次回應 429，保留來源頁以供檢視。 |
| [Slot Machine，gnokii](https://openclipart.org/detail/171715/slot-machine) | 作者提供可下載的矢量圖，含蘋果、櫻桃、鈴、橘子、西瓜和 BAR 等元素。西瓜是扇形切片。 | 平台採用 [CC0](https://openclipart.org/share)，可比較單元素的復古畫法。 |
| [Good Fruits，Master484](https://opengameart.org/content/good-fruits-m484-games) | 作者提供包含蘋果、櫻桃、橘子等通用元素的像素圖集。適合像素風方案。 | 頁面標注 CC0。 |
| [A watermelon，nevak](https://opengameart.org/content/a-watermelon) | 提供整瓜與半瓜的低多邊形模型及 1024×1024 手繪貼圖，可用來試不同觀看方向。 | 頁面標注 CC0，屬獨立 3D 參考。 |

## 重建與檢查

校正角點、按鍵圖案邊界與來源條件見 [layout.json](layout.json)。每個裁圖都能從保存的原圖再生成。使用 Python 3.10 以上及 PATH 中的 ImageMagick 7，從倉庫根目錄執行。

```powershell
python references/panel/build_crops.py
```

接下來檢驗一張原創候選時，先用 `ruten` 的 `L10` 和 `K02` 記錄可交叉確認的幾何。以輪廓、兩塊的位移、切面方向、瓜紋條數和對稱性為驗收項。反光、陰影和精確油墨色單獨標記，再驗真實尺寸及直接放大的 SVG。照片校正和放大只用於判讀。

[美術驗收方法與本輪記錄](visual-acceptance.md) 包含西瓜的量測與終稿、15 種素材逐項自審及桌面、手機和獎勵模式的實際畫面。
