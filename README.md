# Cua 表单助手

> 一个在 Chrome 中离线运行的表单填写扩展。独立社区项目，与 Cua AI 无官方关联。

## 项目介绍

Cua 表单助手帮助用户把预先整理好的资料填入当前网页的表单。用户在扩展中输入“字段: 内容”，点击扫描后，插件读取页面中可见的表单字段，给出“页面字段 → 资料值”的预览；确认后才写入页面，不会自动提交。

项目内置 [CUA-S1 Forms](https://huggingface.co/cua-ai/cua-s1-forms) 模型的 ONNX 权重和 ONNX Runtime Web，推理在浏览器本地完成。模型负责在用户提供的候选值中选择合适的值或跳过字段；对明确同名的中英文字段，扩展会用规则校正模型结果。预览会标明每项来自“模型选择”还是“规则匹配”，便于检查模型的实际作用。

CUA-S1 Forms 是针对表单动作选择的小模型，不能凭空生成资料。本项目使用的 [ONNX 转换版](https://huggingface.co/yasserrmd/cua-s1-forms-onnx) 由第三方提供，不是 Cua 官方发布的浏览器扩展。

## 功能

- **本地匹配**：模型权重和运行时随扩展打包，填写时不调用远程模型服务。
- **先预览后填写**：展示匹配来源与将写入的值，用户点击后才填写；不自动提交。
- **可再次填写**：默认跳过已有内容；勾选“覆盖页面上已有的内容”并重新扫描后，可更新先前填入的值。若页面字段在扫描后发生变化，插件会跳过该字段。
- **常见字段识别**：支持姓名、邮箱、电话、公司、地址等常见中英文名称；可读取标准关联标签，也可读取附近的页面标签。输入 `Full name: Test User` 时，还会生成 First Name = Test、Last Name = User 供分栏表单使用。
- **有限范围的网页操作**：仅在用户操作时访问当前标签页；不需要对所有网站的常驻访问权限。

## 安装

1. 从 [v0.1.0 Release](https://github.com/ariesduan002/cua-form-assistant/releases/tag/v0.1.0) 下载 ZIP 并解压；也可以下载仓库源码。
2. 在 Chrome 打开 `chrome://extensions`，开启“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择包含 `manifest.json` 的解压目录。
4. 打开表单网页，点击扩展图标开始使用。

如果要在本地 `model-test.html` 上测试，还需在扩展详情里开启“允许访问文件网址”，然后刷新扩展。

## 使用方法

在插件的“填写资料”中每行输入一项，字段名和值用半角或全角冒号分隔。例如：

```text
Full name: Test User
Email: test@example.com
Phone: 5551234567
Company: Northwind Labs
```

点击“保存资料”可供下次使用；点击“扫描当前页面”查看预览和匹配来源。确认值无误后，点击“填写匹配字段”。如需修改已有值，先更新资料，勾选覆盖选项，重新扫描并确认预览。

资料保存在本机浏览器的 `chrome.storage.local`。扩展本身不会把资料发送到模型服务；填写网页时，目标网站仍可能通过自己的脚本读取输入内容。请使用可信的网站，并在提交前检查字段。

## 如何验证模型确实起作用

用 Chrome 打开仓库中的 [`model-test.html`](model-test.html)，然后在扩展中只输入：

```text
Company: Northwind Labs
Website: https://example.com
```

扫描预览应显示 `Employer name → Northwind Labs` 和 `Homepage → https://example.com`，两项来源均为“模型选择”。页面字段名与资料名不同，不触发当前的同名规则。测试页是本地静态页面，没有提交按钮，点击“清空字段”即可重新测试。

在 [QA Practice 表单](https://www.qapractice.com/practice-forms) 上，使用 `Full name: Test User`、`Email: test@example.com`、`Phone: 5551234567`，预览应出现 First Name、Last Name、Email Address 和 Phone Number 四项。这个例子主要验证网页标签读取、姓名拆分和常见字段规则，不能单独证明模型效果。

## 工作方式

```text
用户资料 → 解析候选值
当前网页 → 扫描可见表单字段与附近标签
字段 + 候选值 → 本地 CUA-S1 Forms 打分
明确同名字段 → 规则校正
匹配预览 → 用户确认 → 写入网页字段
```

模型只在给定候选值中选择，不生成新值。预览中的“模型选择”表示该项由模型打分决定；“规则匹配”表示明确同名的字段覆盖了模型决定。

## 当前限制

- 主要支持普通网页主文档中的文本输入框、文本域和原生下拉框；下拉框需要存在与资料值一致的选项。
- 不处理 iframe、Shadow DOM、富文本编辑器、分步动态表单、文件上传、单选按钮和复选框。
- 跳过密码、隐藏、禁用和只读字段；不会填写验证码或自动点击提交。
- 模型主要在英文表单上训练。中文常见字段通过标签映射辅助识别，复杂或陌生字段可能漏填或误匹配。
- “Full name” 的自动拆分适用于用空格分开的姓名；其他姓名格式请分别提供 First Name 和 Last Name。

## 排查 0 个匹配

扫描结果会显示扫描字段数、已有内容数和模型跳过数：

- 扫描数为 0：检查网页是否为普通主页面表单，或字段是否在 iframe / Shadow DOM 中。
- 已有内容数大于 0：如要再次填写，勾选覆盖选项并重新扫描。
- 模型跳过较多：尝试使用页面上的字段名，或常见名称如“姓名、邮箱、电话、公司”。
- 出现模型加载错误：检查扩展目录中的 `model/` 和 `vendor/` 文件是否完整，并刷新扩展。

## 项目文件

| 路径 | 作用 |
| --- | --- |
| `manifest.json` | Chrome Manifest V3 配置与权限 |
| `popup.html`、`popup.js`、`style.css` | 资料输入、匹配预览与填写界面 |
| `content.js` | 扫描当前页面并写入字段 |
| `model/inference.js`、`model/*.onnx` | 候选值编码与本地模型推理 |
| `vendor/` | 随扩展打包的 ONNX Runtime Web |
| `model-test.html` | 区分模型结果与同名规则的本地测试页 |

## 许可与来源

本项目采用与 [Cua](https://github.com/trycua/cua) 相同的 [MIT 许可证](LICENSE)。内置模型、第三方 ONNX 转换和 ONNX Runtime Web 的来源及版权声明见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。
