# PowerEN — 英语学习平台设计文档

> 版本：v1.1 | 日期：2026-03-28

## 概述

PowerEN 是一款桌面端英语学习应用，核心场景是用户将日常接触到的英文文本粘贴进来，由 AI 自动翻译并分析句子结构，用户可将单词/短语收入词库，并通过艾宾浩斯记忆曲线进行间隔复习。

## 目标用户

通用英语学习者，不限定特定群体。

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.0 (Rust) |
| 前端 | React + TypeScript |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand |
| 本地数据库 | SQLite (tauri-plugin-sql) |
| AI 翻译/分析 | Claude / GPT API |
| 未来扩展 | 可选云同步 |

## 应用架构

```
┌─────────────────────────────────────────────┐
│                  Tauri Shell                 │
│  ┌──────────┐  ┌──────────────────────────┐  │
│  │  侧边栏   │  │       内容区              │  │
│  │          │  │                          │  │
│  │ 📝 文本  │  │  根据导航切换模块：        │  │
│  │ 📚 词库  │  │  - 文本输入与分析          │  │
│  │ 🔄 复习  │  │  - 词库管理               │  │
│  │ 📊 统计  │  │  - 复习模块               │  │
│  │          │  │  - 学习统计               │  │
│  │ ──────── │  │                          │  │
│  │ 待复习:12│  │                          │  │
│  └──────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 前后端通信

- 前端通过 Tauri `invoke` 调用 Rust 命令
- Rust 端负责：SQLite 读写、文件系统操作、AI API 调用
- 前端负责：UI 渲染、交互逻辑、状态管理

## 模块设计

### 1. 侧边栏导航

**布局**：宽侧边栏，图标 + 文字标签 + 快捷信息。

**导航项**：
- 📝 文本输入 — 粘贴和分析英文文本
- 📚 我的词库 — 管理收藏的单词/短语
- 🔄 今日复习 — 基于艾宾浩斯的间隔复习
- 📊 学习统计 — 学习数据可视化
- ⚙️ 设置 — API 配置、应用偏好

**底部快捷信息**：显示今日待复习词汇数量。

### 2. 文本输入与分析

**布局**：左右对照。

- **左侧 — 英文原文**：
  - 文本输入区，支持粘贴
  - 提交后 AI 自动分析，原文中重点内容高亮：
    - 红色：重点单词
    - 黄色：常用短语
    - 绿色：语法结构
  - 用户可点击高亮词/短语加入词库
  - 用户可框选任意文本自定义选择短语加入词库

- **右侧 — 分析结果**：
  - 中文翻译
  - 句子结构分析（主语、谓语、宾语、定语、状语等拆解）
  - 重点词汇/短语的详细释义

**文本历史**：
- 左侧输入区上方有"历史记录"按钮，点击展开已分析文本列表
- 支持搜索历史文本、删除单条记录
- 删除文本时保留已收录词汇，仅删除 vocab_sources 中的关联记录

**文本长度限制**：
- 单次分析上限 3000 字符
- 超长文本按段落自动切分，逐段调用 AI API
- UI 显示分段进度

**数据流**：
1. 用户粘贴文本 → 前端发送至 Rust 端
2. Rust 端调用 AI API → 返回翻译 + 分析 JSON
3. 前端渲染高亮原文 + 分析结果
4. 用户选词 → 写入 SQLite vocabulary 表 + vocab_sources 关联
5. 若 vocabulary 中已存在相同单词（word 字段 UNIQUE），仅新增 vocab_sources 关联记录

### 3. 词库管理

**布局**：卡片网格视图。

**顶部功能栏**：
- 筛选标签：全部 / 单词 / 短语（显示各自数量）
- 搜索框：模糊搜索单词或短语
- 排序：按添加时间、字母、掌握状态

**卡片内容**：
- 单词/短语
- 释义（词性 + 中文释义）
- 掌握状态标签：
  - 🔴 待复习（红色）
  - 🟡 学习中（黄色）
  - 🟢 已掌握（绿色）
- 来源句子数量，点击展开查看

**点击卡片展开详情**：
- 音标
- 完整释义
- 来源句子列表（可跳转到原始文本）
- 例句
- 手动编辑/删除

**反查功能**：每个词汇关联来源句子，点击"查看 N 个来源句子"可展开列表，点击句子可跳转到原始文本分析页。

**其他**：
- 支持手动添加单词/短语
- 支持标签分组管理

### 4. 复习模块

基于艾宾浩斯遗忘曲线的间隔复习系统，包含两种模式。

#### 4.1 闪卡模式

逐个深度复习。

**界面**：
- 顶部进度条（当前 / 总数）
- 居中大卡片，正面显示提示（释义或单词）
- 下方输入框（键盘拼写模式时）
- 底部来源句子（填空形式）
- 三档自评按钮：不认识 / 模糊 / 记住了

**三种子模式**：
- 看释义 → 想单词
- 看单词 → 想释义
- 键盘拼写（输入后自动校验）

#### 4.2 速览模式

批量快速复习。

**界面**：
- 顶部切换按钮：隐藏释义 / 隐藏单词 / 全部显示
- 列表形式，左列单词、右列释义
- 被隐藏的一侧显示统一宽度的遮挡条（不暴露内容长度）
- 逐行点击揭示，或用键盘 ↓ / Space 快速翻下一个
- 揭示后标记：✓ 记住了 / ✗ 没记住
- 支持随机打乱顺序

#### 4.3 复习入口页

用户点击"今日复习"时，先进入入口页：
- 显示今日待复习词汇数量
- 选择复习模式：闪卡模式 / 速览模式
- 闪卡模式下可选子模式（看释义想单词 / 看单词想释义 / 键盘拼写）
- 点击"开始复习"进入

#### 4.4 艾宾浩斯间隔算法

采用固定间隔序列：1 → 2 → 4 → 7 → 15 → 30 天。

**自评影响**：
- 记住了：进入下一个间隔等级
- 模糊：保持当前间隔等级不变，下次复习时间按当前间隔重新计算
- 不认识：重置到第 1 级（1 天间隔）

**掌握状态流转**：
- **新词 (new)**：刚加入词库，尚未复习
- **学习中 (learning)**：已开始复习，间隔 < 30 天
- **已掌握 (mastered)**：在 30 天间隔下连续 2 次"记住了"，退出复习队列。用户可手动将已掌握的词重新加入复习

**积压处理**：用户多天未打开应用时，所有过期词汇统一进入待复习队列，按到期时间排序。每次复习可设上限（默认 50 词），超出部分下次复习。

**应用内提醒**：打开应用时，侧边栏显示今日待复习数量。

### 5. 设置模块

**功能项**：
- **AI 配置**：选择 AI 服务商（Claude / OpenAI）、输入 API Key、测试连接
- **应用偏好**：主题（暗色/亮色）、默认复习模式
- **数据管理**：导出词库（CSV/JSON）、导入词库、清空数据

API Key 存储在本地系统 keychain（macOS Keychain / Windows Credential Manager）中，不明文存储。

### 6. 学习统计

- 词汇量增长趋势图
- 每日复习完成情况
- 掌握率分布（待复习 / 学习中 / 已掌握）
- 复习连续天数

## 数据模型

### texts（文本记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| content | TEXT | 英文原文 |
| translation | TEXT | 中文翻译 |
| analysis_json | TEXT | AI 分析结果 JSON（句子结构、词汇标注等） |
| created_at | DATETIME | 创建时间 |

### vocabulary（词库）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| word | TEXT UNIQUE | 单词或短语（唯一，重复收录时合并来源） |
| type | TEXT | 类型：word / phrase |
| definition | TEXT | 释义 |
| phonetic | TEXT | 音标（可选） |
| status | TEXT | 掌握状态：new / learning / mastered |
| tags | TEXT | 标签（JSON 数组） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### vocab_sources（词汇来源关联）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| vocab_id | INTEGER FK | 关联 vocabulary.id |
| text_id | INTEGER FK | 关联 texts.id |
| context_sentence | TEXT | 该词在原文中的上下文句子 |

### review_schedule（复习计划）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| vocab_id | INTEGER FK | 关联 vocabulary.id（UNIQUE） |
| next_review_at | DATETIME | 下次复习时间 |
| last_reviewed_at | DATETIME | 上次复习时间（NULL 表示从未复习） |
| interval_level | INTEGER | 当前间隔等级（0-5，对应 1/2/4/7/15/30 天） |
| consecutive_correct | INTEGER | 在当前最高等级连续"记住了"的次数 |
| review_count | INTEGER | 累计复习次数 |

### review_logs（复习记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| vocab_id | INTEGER FK | 关联 vocabulary.id |
| reviewed_at | DATETIME | 复习时间 |
| mode | TEXT | 复习模式：flashcard / quick_scan |
| sub_mode | TEXT | 子模式：def_to_word / word_to_def / spelling / hide_def / hide_word |
| result | TEXT | 结果：forgot / fuzzy / remembered |

## AI API 调用设计

### 文本分析请求

向 AI 发送结构化 prompt，要求返回 JSON：

```json
{
  "translation": "人工智能的快速发展从根本上改变了我们与技术互动的方式。",
  "sentences": [
    {
      "original": "The rapid advancement of artificial intelligence has fundamentally transformed the way we interact with technology.",
      "structure": {
        "subject": { "text": "The rapid advancement of artificial intelligence", "role": "主语" },
        "predicate": { "text": "has transformed", "role": "谓语" },
        "object": { "text": "the way we interact with technology", "role": "宾语" },
        "modifiers": [
          { "text": "fundamentally", "role": "状语", "modifies": "predicate" },
          { "text": "we interact with technology", "role": "定语从句", "modifies": "the way" }
        ]
      }
    }
  ],
  "highlights": [
    {
      "text": "artificial intelligence",
      "type": "phrase",
      "definition": "n. 人工智能"
    },
    {
      "text": "fundamentally",
      "type": "word",
      "definition": "adv. 根本地，从根本上"
    }
  ]
}
```

**高亮定位策略**：不使用字符偏移量（AI 模型计算不可靠），前端通过 `highlights[].text` 在原文中进行精确字符串匹配来定位高亮区域。

### API Key 管理

- 用户在设置中配置自己的 API Key
- 存储在本地系统 keychain 或加密本地文件中
- 支持 Claude 和 OpenAI 两种 API

## 异常处理

| 场景 | 处理策略 |
|------|----------|
| AI API 调用失败（网络错误） | 显示错误提示，保留用户输入文本，支持重试 |
| API Key 无效 / 配额耗尽 | 弹窗提示，引导用户前往设置页检查 API 配置 |
| AI 返回非预期 JSON 格式 | Rust 端做 JSON Schema 校验，校验失败则重试 1 次，仍失败则提示"分析失败，请重试" |
| 数据库读写失败 | 显示错误提示，不丢失用户操作数据（前端暂存） |
| 复习积压（多天未开应用） | 按到期时间排序，每次上限 50 词，超出部分顺延 |

## 非功能性需求

- **性能**：AI 分析请求需显示 loading 状态，建议流式返回
- **离线能力**：词库管理和复习功能完全离线可用，仅文本分析需联网
- **数据安全**：API Key 通过系统 keychain 加密存储，用户数据仅在本地
- **可扩展**：预留云同步接口，未来可对接后端服务
