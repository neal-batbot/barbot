# dify2openai

将 Dify 应用转换为 OpenAI 兼容 API，同时提供独立的管理网关（SQLite）来管理自建 API Key、Key 与 Dify Key 映射，并对外统一转发。

## 项目结构

- `dify-to-openai-adapter/`：Dify -> OpenAI 兼容适配器
- `dify-to-openai-adapter/admin-gateway/`：独立管理服务（Express + SQLite）

## 快速开始（适配器）

```bash
cd dify-to-openai-adapter
npm install
cp config.template.json config.json
# 编辑 config.json，配置 Dify base URL / API Key / 模型映射
npm start
```

适配器默认端口（示例）：`http://localhost:3100`

## 管理网关（admin-gateway）

管理网关用于管理你自己的 API Key，并维护 Key 到 Dify Key 的映射。

```bash
cd dify-to-openai-adapter/admin-gateway
npm install
PORT=4000 ADAPTER_BASE_URL=http://localhost:3100 npm start
```

管理页面：
- `http://localhost:4000/`

OpenAI 兼容 API Base：
- `http://localhost:4000/v1`

## OpenAI 兼容接口示例

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer <你的自建Key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"mcu-dify","messages":[{"role":"user","content":"你好"}],"stream":false}'
```

## 说明

- 管理网关使用 SQLite（文件：`admin-gateway/data.db`），用于保存 Key 与映射关系。
- 适配器与网关分离部署，网关负责鉴权与转发，适配器负责格式转换。
