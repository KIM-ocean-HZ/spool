# Spool — approved version 3, restored detail and official logo

2026-10-17。

最终成图：[spool-typewriter-03-restored-official-logo.png](spool-typewriter-03-restored-official-logo.png)，1672 × 941 PNG。

用户已通过第三版设计。本轮以 ../typewriter-refinements/spool-typewriter-03-compact-portable.png 为构图与内容基准，只参照 ../spool-functional-02-working-loop.png 恢复材质细节、纹理及色彩层次；单独纠正左上 Logo。

## 保留与恢复

保留已通过的构图、标题大小与留白、轻巧打字机、完整键盘和三客户端名称、中央档案机与纸卡、全部英文、功能节点、实体线材连接。原文件未覆盖。

重点恢复档案机琥珀圆盘与线圈表面层次、透明导轨与底座边缘、文件夹覆面与层叠边缘、纸张纤维、玻璃细边反射、皮革与页边，以及线材接头细节。材质恢复使用内置 image_gen 编辑；不是产品界面实拍。

## 正式 Logo 的事实来源与合成

- 实际官网引用：[site/assets/spool-logo-full.svg](/Users/hzjin/Desktop/Knote/site/assets/spool-logo-full.svg)，与 docs/logo/spool-logo-full.svg 字节相同。
- 背景 #B45309；暖白线色 #FAF7F0 / #FFFDF8；阴影 #92400E。图形为断开的外弧与下方抽出线头、内层同心圆、透明圆盘与轴帽。
- 完整 SVG 源文件副本：official-logo-source.svg；实际 60 × 60 栅格：official-logo-60.png。
- 图像生成的两次 Logo 修正仍为近似图案，保存在 drafts/，未作为最终 Logo。
- 用户明确选择“直接合成正式 Logo（推荐）”后，将正式 SVG 按比例渲染并直接合成到左上图标原位，避免再次重绘。
- 替换区域为 x64,y68,w64,h64。小范围背景只用于去掉旧生成图标的圆角残边。正式 Logo 放置 x66,y70,w60,h60。
- **逐像素核对：替换区域外变化像素数为 0；合成后的 Logo 区域与预期官方素材合成块完全一致。** 因此替换 Logo 没有改变其他画面纹理或文字。
- 额外发现：scripts/generate-icon.mjs 仍生成旧 S 形图标，与官网当前素材不一致；本次未运行、未修改它。

## 记录与验证

PROMPTS.md：完整内置图像编辑提示词及三种输入角色。

compose-official-logo.cjs：经用户授权后的确定性素材合成与像素检查。

manifest.json：源文件、区域、尺寸、源 Logo 与最终成图 SHA-256、像素校验结果。

已查看最终成图，并独立核对官方 Logo、构图、文本和材质。输出保持原生 1672 × 941，没有把放大插值描述为原生高分辨率。没有更改产品实现、正式品牌文件或发布内容。

