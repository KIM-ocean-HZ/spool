# Spool 宣传渲染图 · 三个方向

2026-10-16。用户本轮明确要求直接阅读 Knote 代码库并生成三个版本。使用内置 imagegen，以真实品牌和产品理念为依据；全部为 AI 生成的宣传视觉，C 为品牌角色概念。最终图不含生成界面。

## 设计依据

- `PLAN_EN.md` §2：长期项目的上下文中心；捕捉时绕上线轴，取用时抽出，线始终连续；一次粘贴重新进入项目；用户判断具有独特价值。
- `docs/SPOOL_OVERVIEW.md` §0–§3：Capture → Project → Pack → re-enter。该文档含历史版本快照，未采用旧版本号、工具数、效果数字或隐私绝对表述。
- `docs/DESIGN_PROJECT_MEMORY.md` §8.3、§8.7：用户拥有的长期项目上下文。工作指南属于研究前设计，没有将其画成已实现功能。
- `src/styles/tokens.css`、`site/assets/site.css`：纸色 #FAF7F0、次纸色 #F3EEE2、深墨 #1C1A16、琥珀 #B45309；标题衬线、正文简洁、轻暖阴影与留白。B 以深墨作底、纸色作字，是这套品牌色的暗色宣传延展。
- `src/components/Sidebar/SpoolMeter.tsx`：真实线轴由两端轮缘、轴和随积累变厚的线圈组成。
- `src/lib/pack/forThread.ts`：沿用实际 Pack 组装，来源、用户注解与 AI 注解具有各自语义。
- `docs/archive/PROMO-VERDICT-2026-08-20.md` §3–§4：海报面向用户，围绕线轴，形式稍大于内容；不用技术叙事、旧数字、打包面板主视觉；渲染图应有真实截图跟随作依据。
- 官方 logo：`src-tauri/icons/icon.png`。已检查官网公开演示截图 `site/assets/shots/project-window.png`。官网 https://spoolapp.org/ 已打开核对，与本地官网源及视觉体系一致。

## 三个最终版本

| 文件 | 设计理由 | 适用位置 |
| --- | --- | --- |
| spool-a-continuity.png | 密集线圈与单根出线形成疏密对比，表达保存上下文与继续项目；线轴成为核心品牌识别。 | 官网主视觉、品牌发布海报 |
| spool-b-origins.png | 深墨底衬出引用纸、个人手写笔记、链接书签；材料形态各异、来路不同，由连续线串起，同属一个项目。 | 产品理念介绍、研究与创作场景宣传 |
| spool-c-companion.png | 线轴轻轻抱住已有笔记，表达珍惜想法与日积月累；温暖人格适合个人研究与创作。 | 社交传播、品牌故事、欢迎画面 |

推荐 A 作为主宣传图：最贴合“一次接上项目”的核心，识别快、留白清楚。B 解释更深的产品价值；C 更有亲近感。

## 验证与范围

已逐张视觉检查中文主副标题、Spool 思簿、网址、纸墨琥珀风格、构图和线轴结构。三个最终版均为 1672 × 941 横版 PNG，单张约 2 MB。B 和 C 是物理品牌隐喻，不代表新增自动整理或宠物功能。

首次 B 曾以界面为中心，复核历史裁决后被替换；仅保存在 `drafts/spool-b-product-draft.png`，不属于最终三版，也不能作为真实界面截图。真实界面应直接使用官网原始 `site/assets/shots/project-window.png`。

完整最终提示词见 `PROMPTS.md`。没有改动产品实现、现有官网或发布状态，也没有将图片写回 Spool。

本次为用户明确要求的一次性宣传素材制作（owner interruption）。长期执行方针不变；返回点为 `docs/HANDOFF-2026-09-04.md` §9.8 原有产品任务。
