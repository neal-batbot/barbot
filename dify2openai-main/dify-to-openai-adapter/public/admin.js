(() => {
  const configText = document.getElementById('configText');
  const generateBtn = document.getElementById('generateBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  const apiBaseEl = document.getElementById('apiBase');
  const modelListEl = document.getElementById('modelList');
  const curlBlockingEl = document.getElementById('curlBlocking');
  const curlStreamingEl = document.getElementById('curlStreaming');

  const fields = {
    difyBaseUrl: document.getElementById('difyBaseUrl'),
    difyApiKey: document.getElementById('difyApiKey'),
    modelName: document.getElementById('modelName'),
    appType: document.getElementById('appType'),
    port: document.getElementById('port'),
    host: document.getElementById('host'),
    defaultModel: document.getElementById('defaultModel'),
  };

  const setStatus = (text, ok) => {
    statusEl.textContent = text || '';
    statusEl.className = ok ? 'status ok' : 'status err';
  };

  const loadConfig = async () => {
    try {
      const res = await fetch('/admin/config');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加载失败');
      configText.value = JSON.stringify(data, null, 2);
      setStatus('已加载', true);
    } catch (err) {
      setStatus(err.message, false);
    }
  };

  const renderOutputs = () => {
    let config;
    try {
      config = JSON.parse(configText.value);
    } catch (err) {
      return;
    }
    const modelNames = Object.keys(config.model_mappings || {});
    const modelName = modelNames[0] || '';
    const apiBase = `${location.origin}/v1`;
    apiBaseEl.textContent = apiBase;
    modelListEl.textContent = modelNames.length ? modelNames.join(', ') : '';
    const apiKey = config.model_mappings?.[modelName]?.dify_api_key || 'app-...';
    curlBlockingEl.textContent =
`curl -X POST ${apiBase}/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${modelName}","messages":[{"role":"user","content":"你好"}],"stream":false}'`;
    curlStreamingEl.textContent =
`curl -N ${apiBase}/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${modelName}","messages":[{"role":"user","content":"你好"}],"stream":true,"show_node_events":true}'`;
  };

  const generateConfig = async () => {
    try {
      generateBtn.disabled = true;
      setStatus('生成中...', true);
      const payload = {
        dify_base_url: fields.difyBaseUrl.value.trim(),
        dify_api_key: fields.difyApiKey.value.trim(),
        model_name: fields.modelName.value.trim(),
        app_type: fields.appType.value,
        port: fields.port.value.trim(),
        host: fields.host.value.trim(),
        default_model: fields.defaultModel.value.trim(),
      };
      const res = await fetch('/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      configText.value = JSON.stringify(data, null, 2);
      renderOutputs();
      saveBtn.disabled = false;
      setStatus('生成成功，可以保存配置', true);
    } catch (err) {
      setStatus(err.message, false);
    } finally {
      generateBtn.disabled = false;
    }
  };

  const saveConfig = async () => {
    try {
      saveBtn.disabled = true;
      setStatus('保存中...', true);
      const parsed = JSON.parse(configText.value);
      const res = await fetch('/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setStatus('保存成功，需要重启服务生效', true);
    } catch (err) {
      setStatus(err.message, false);
    } finally {
      saveBtn.disabled = false;
    }
  };

  generateBtn.addEventListener('click', generateConfig);
  saveBtn.addEventListener('click', saveConfig);
  loadConfig().then(renderOutputs);
})();

