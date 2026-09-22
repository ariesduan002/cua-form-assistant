const profileInput = document.getElementById('profile');
const results = document.getElementById('results');
const count = document.getElementById('count');
const fillButton = document.getElementById('fill');
const status = document.getElementById('status');
const overwriteInput = document.getElementById('overwrite');
let preview = [];
let tabId = null;
function parseProfile() {
  const profile = {};
  for (const line of profileInput.value.split(/\r?\n/)) {
    const separator = line.search(/[:：]/);
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key && value) profile[key] = value;
  }
  const fullName = profile['Full name'] || profile['Full Name'] || profile['姓名'];
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      profile['First Name'] ||= parts[0];
      profile['Last Name'] ||= parts.slice(1).join(' ');
    }
  }
  return profile;
}
function show(message) { status.textContent = message; }
async function currentTab() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id || !/^(https?|file):/.test(tab.url || '')) throw new Error('请打开普通网页或本地测试页面；本地页面需在扩展详情中开启“允许访问文件网址”。');
  tabId = tab.id;
  await chrome.scripting.executeScript({target: {tabId}, files: ['content.js']});
}
async function send(action, extra = {}) {
  await currentTab();
  return chrome.tabs.sendMessage(tabId, {action, profile: parseProfile(), ...extra});
}
function render(items, emptyMessage = '未找到可匹配的字段。') {
  preview = items;
  count.textContent = `${items.length} 个匹配`;
  fillButton.disabled = !items.length;
  results.replaceChildren();
  results.classList.toggle('empty', !items.length);
  if (!items.length) { results.textContent = emptyMessage; return; }
  for (const item of items) {
    const row = document.createElement('div'); row.className = 'item';
    const label = document.createElement('strong'); label.textContent = item.label;
    const source = document.createElement('small'); source.textContent = `来自：${item.key} · ${item.source === 'model' ? '模型选择' : '规则匹配'}`;
    const value = document.createElement('span'); value.className = 'value'; value.textContent = item.value;
    if (item.previous) { const previous = document.createElement('span'); previous.className = 'previous'; previous.textContent = `原内容：${item.previous}`; row.append(previous); }
    row.append(label, source, value); results.append(row);
  }
}
document.getElementById('save').onclick = async () => {
  await chrome.storage.local.set({profileText: profileInput.value});
  show('资料已保存在本机浏览器中。');
};
document.getElementById('scan').onclick = async () => {
  try {
    show('正在运行本地模型…');
    const response = await send('scan');
    const profile = parseProfile();
    if (!Object.keys(profile).length) throw new Error('请先输入填写资料。');
    const matches = [];
    let alreadyFilled = 0;
    let modelSkipped = 0;
    for (const field of response.items) {
      const result = await scoreField(response.title, field, profile, overwriteInput.checked);
      if (result?.reason === 'already-filled') alreadyFilled++;
      else if (result?.reason === 'model-skip') modelSkipped++;
      else if (result) matches.push(result);
    }
    const summary = `扫描 ${response.items.length} 个字段，匹配 ${matches.length} 个；已有内容 ${alreadyFilled} 个，模型跳过 ${modelSkipped} 个。`;
    const emptyMessage = response.items.length === 0
      ? '当前页面没有扫描到可填写的普通表单字段。'
      : alreadyFilled > 0 && !overwriteInput.checked
        ? '字段已有内容。勾选“覆盖页面上已有的内容”后重新扫描。'
        : '模型没有找到合适的候选值。请尝试使用与页面字段相近的资料名称。';
    render(matches, emptyMessage); show(`本地模型已运行。${summary}`);
  }
  catch (error) { render([], `扫描或模型加载失败：${error.message}`); show(`扫描失败：${error.message}`); }
};
fillButton.onclick = async () => {
  try {
    const response = await send('fill', {items: preview, overwrite: overwriteInput.checked});
    show(`已填写 ${response.filled} 个字段。需要再次填写时，勾选“覆盖页面上已有的内容”并重新扫描。`);
  } catch (error) { show(error.message); }
};
chrome.storage.local.get('profileText').then(({profileText}) => { profileInput.value = profileText || ''; });

overwriteInput.onchange = () => { render([]); show('填写模式已更改，请重新扫描当前页面。'); };
