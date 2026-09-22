const FIELD_NAMES = {
  '姓名': 'Full name', '真实姓名': 'Full name', '联系人': 'Contact name', '收件人': 'Full name',
  '名': 'First name', '名字': 'First name', '姓': 'Last name', '姓氏': 'Last name',
  '邮箱': 'Email', '电子邮件': 'Email', '邮件地址': 'Email',
  '电话': 'Phone number', '手机号': 'Phone number', '手机号码': 'Phone number', '联系电话': 'Phone number',
  '公司': 'Company', '企业': 'Company', '单位': 'Company', '组织': 'Organization',
  '地址': 'Street address', '详细地址': 'Street address', '街道': 'Street address',
  '城市': 'City', '市': 'City', '省份': 'State', '省': 'State', '州': 'State', '地区': 'Region',
  '邮编': 'Postal code', '邮政编码': 'Postal code', '国家': 'Country',
  '网站': 'Website', '网址': 'Website', '职位': 'Job title', '职务': 'Job title', '岗位': 'Job title',
  '留言': 'Message', '备注': 'Comments', '说明': 'Comments',
  'name': 'Full name', 'full name': 'Full name', 'contact name': 'Full name',
  'first name': 'First name', 'last name': 'Last name',
  'email address': 'Email', 'e-mail': 'Email', 'phone': 'Phone number', 'mobile': 'Phone number',
  'telephone': 'Phone number', 'organization': 'Company', 'job title': 'Job title',
  'current address': 'Street address'
};
const encoder = new TextEncoder();
let sessionPromise;
function english(label) { const value = label.trim(); return FIELD_NAMES[value] || FIELD_NAMES[value.toLowerCase()] || value; }
function normalized(text) { return String(text).toLowerCase().replace(/[\s\-_:：*（）()[\]{}]/g, ''); }
function encode(text, length) {
  const data = new BigInt64Array(length);
  const mask = new Uint8Array(length);
  encoder.encode(text).subarray(0, length).forEach((byte, index) => { data[index] = BigInt(byte + 1); mask[index] = 1; });
  return {data, mask};
}
async function session() {
  if (!sessionPromise) {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = chrome.runtime.getURL('vendor/');
    sessionPromise = fetch(chrome.runtime.getURL('model/cua-s1-forms.onnx'))
      .then(response => { if (!response.ok) throw new Error('无法加载本地模型'); return response.arrayBuffer(); })
      .then(bytes => ort.InferenceSession.create(bytes, {executionProviders: ['wasm']}));
  }
  return sessionPromise;
}
async function scoreField(title, field, profile, overwrite = false) {
  if (field.value && !overwrite) return {reason: 'already-filled'};
  const entries = Object.entries(profile);
  const options = entries.map(([key, value]) => `fill ${english(key)}: ${value}`).concat('check', 'click', 'skip');
  const context = `TASK fill the form from the document, then submit\nFORM ${title || 'Web form'}\nELEMENT ${field.type === 'select' ? 'ComboBox' : 'Edit'} "${english(field.label)}" value="${overwrite ? '' : field.value}"\n`;
  const contextBytes = encode(context, 224);
  const optionIds = new BigInt64Array(options.length * 96);
  const optionTokenMask = new Uint8Array(options.length * 96);
  options.forEach((option, index) => {
    const bytes = encode(option, 96);
    optionIds.set(bytes.data, index * 96);
    optionTokenMask.set(bytes.mask, index * 96);
  });
  const feeds = {
    context_ids: new ort.Tensor('int64', contextBytes.data, [1, 224]),
    context_mask: new ort.Tensor('bool', contextBytes.mask, [1, 224]),
    option_ids: new ort.Tensor('int64', optionIds, [1, options.length, 96]),
    option_token_mask: new ort.Tensor('bool', optionTokenMask, [1, options.length, 96]),
    option_mask: new ort.Tensor('bool', new Uint8Array(options.length).fill(1), [1, options.length])
  };
  const output = await (await session()).run(feeds);
  const logits = [...output.logits.data];
  const best = logits.indexOf(Math.max(...logits));
  const exact = entries.findIndex(([key]) => normalized(english(key)) === normalized(english(field.label)));
  const selected = exact >= 0 ? exact : best;
  const skipScore = logits[entries.length + 2];
  if (selected >= entries.length || (exact < 0 && logits[selected] - skipScore < 4)) return {reason: 'model-skip'};
  const [key, value] = entries[selected];
  return {index: field.index, label: field.label, key, value, previous: field.value, source: exact >= 0 ? 'rule' : 'model'};
}
