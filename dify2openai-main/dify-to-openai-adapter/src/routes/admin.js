const express = require('express');
const fs = require('fs');
const path = require('path');

function createAdminRouter() {
  const router = express.Router();
  const configPath = path.join(__dirname, '../../config.json');

  const readConfig = () => {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  };

  const validateConfig = (config) => {
    if (!config || typeof config !== 'object') {
      return '配置必须是 JSON 对象';
    }
    if (!config.model_mappings || typeof config.model_mappings !== 'object') {
      return '缺少 model_mappings';
    }
    const models = Object.keys(config.model_mappings);
    if (models.length === 0) {
      return 'model_mappings 不能为空';
    }
    for (const modelName of models) {
      const mapping = config.model_mappings[modelName];
      if (!mapping?.dify_api_key || !mapping?.dify_base_url) {
        return `模型 ${modelName} 缺少 dify_api_key 或 dify_base_url`;
      }
    }
    return null;
  };

  router.get('/config', (req, res) => {
    try {
      const config = readConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/config', (req, res) => {
    try {
      const newConfig = req.body;
      const validationError = validateConfig(newConfig);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2) + '\n', 'utf8');
      res.json({ status: 'ok' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/generate', (req, res) => {
    try {
      const {
        dify_base_url,
        dify_api_key,
        model_name,
        app_type,
        port,
        host,
        default_model
      } = req.body || {};

      if (!dify_base_url || !dify_api_key || !model_name) {
        return res.status(400).json({ error: 'dify_base_url, dify_api_key, model_name 为必填项' });
      }

      const resolvedAppType = app_type === 'agent' ? 'agent' : 'chatbot';
      const supportsBlocking = resolvedAppType === 'chatbot';
      const defaultModelName = default_model || model_name;

      const generated = {
        model_mappings: {
          [model_name]: {
            dify_api_key: dify_api_key,
            dify_base_url: dify_base_url,
            app_name: model_name,
            description: `${model_name} ${resolvedAppType}`,
            app_type: resolvedAppType,
            supports_streaming: true,
            supports_blocking: supportsBlocking,
            default_mode: supportsBlocking ? 'blocking' : 'streaming'
          }
        },
        settings: {
          port: Number(port) || 3100,
          host: host || '0.0.0.0',
          default_model: defaultModelName,
          enable_streaming: true,
          max_concurrent_requests: 10,
          request_timeout: 30000,
          retry_attempts: 3
        }
      };

      const validationError = validateConfig(generated);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      res.json(generated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createAdminRouter };

