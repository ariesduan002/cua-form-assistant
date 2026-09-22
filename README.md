# Cua 表单助手

> 独立社区项目，与 Cua AI 无官方关联。

基于 [trycua/cua](https://github.com/trycua/cua) 的 CUA-S1 Forms 模型制作的 Chrome Manifest V3 扩展原型。插件内包含 ONNX 模型权重和 ONNX Runtime Web，推理在本机完成。ONNX 文件来自 [yasserrmd 的转换](https://huggingface.co/yasserrmd/cua-s1-forms-onnx)，非 Cua 官方发布的浏览器版本。

## 安装

1. 在 Chrome 打开 `chrome://extensions`，开启“开发者模式”。
2. 点击“加载已解压的扩展程序”，选择本目录。
3. 打开含有普通 HTML 表单的网页，点击扩展图标。
4. 按“字段: 内容”输入资料并保存。点击“扫描当前页面”检查预览，再点击“填写匹配字段”。

## 行为与范围

- 只在点击扫描或填写后访问当前标签页；资料存在 `chrome.storage.local`，不会发送到服务器。
- 默认不覆盖已有值，也不提交表单。需要再次填写时，修改资料并勾选“覆盖页面上已有的内容”，重新扫描确认预览后填写。扫描后若页面内容发生变化，对应字段会跳过，避免覆盖未预览的新内容。跳过密码、文件、验证码（未匹配）、隐藏字段等。
- 模型对每个字段从资料候选项中选择一个值或跳过；明确同名的中英文字段使用本地标签校正。支持文本框、文本域以及值或显示文本精确匹配的下拉菜单。
- 模型本身主要针对英文训练，中文常见标签由扩展翻译；未覆盖的中文或复杂字段可能遗漏或误匹配，请务必检查预览。
- 当前版本不处理 iframe、Shadow DOM、富文本编辑器和动态分步表单。

## 第三方组件

- CUA-S1 Forms 模型：MIT 许可，原始模型与说明见 [cua-ai/cua-s1-forms](https://huggingface.co/cua-ai/cua-s1-forms)。
- ONNX 转换：MIT 许可，见 [yasserrmd/cua-s1-forms-onnx](https://huggingface.co/yasserrmd/cua-s1-forms-onnx)。
- ONNX Runtime Web 1.30.0：MIT 许可，见 [Microsoft ONNX Runtime](https://github.com/microsoft/onnxruntime)。

## 扫描显示 0 个匹配时

扩展会分别显示扫描到的字段数、已有内容数和模型跳过数。若扫描数为 0，检查是否在普通网页的主页面表单（暂不支持 iframe 和 Shadow DOM）。若已有内容数大于 0，勾选覆盖选项后重新扫描。若模型跳过较多，尝试把资料名称改成网页字段名或常见名称，如“姓名、邮箱、电话、公司”。模型加载错误会直接显示在预览区。

## QA Practice 示例

在 https://www.qapractice.com/practice-forms 输入 `Full name: Test User`、`Email: test@example.com`、`Phone: 5551234567` 时，预览应出现 First Name = Test、Last Name = User、Email Address = test@example.com、Phone Number = 5551234567。该页面的文字标签没有通过 `for` 绑定输入框，扩展会读取邻近标签。其余没有资料的字段会跳过。

## 单独验证模型

用 Chrome 打开本目录中的 `model-test.html`，到 `chrome://extensions` → 本扩展详情，开启“允许访问文件网址”，然后刷新扩展。测试资料只输入：

```text
Company: Northwind Labs
Website: https://example.com
```

扫描预览应显示 Employer name 和 Homepage 两项，来源均为“模型选择”。这两项不走同名规则。填写后可在测试页点击“清空字段，重新测试”。本地静态页面没有提交按钮。如果预览显示模型加载错误，则模型没有运行成功。

## 许可与发布包

本项目采用与 Cua 相同的 MIT 许可证，见 [LICENSE](LICENSE)。内置模型与 ONNX Runtime Web 的来源和版权声明见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。发布 ZIP 可直接在 Chrome 中解压后作为扩展加载；无需安装依赖。
