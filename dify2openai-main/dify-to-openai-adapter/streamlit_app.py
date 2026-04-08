import json
import httpx
import streamlit as st

API_BASE = "http://localhost:3100/v1"
API_KEY = "app-aVBbh5NMBP1yswkV04fn4a3T"
MODEL = "mcu-dify"

st.title("Dify → OpenAI 适配器流式测试")

if "messages" not in st.session_state:
    st.session_state.messages = []
if "workflow_events" not in st.session_state:
    st.session_state.workflow_events = []
if "workflow_nodes" not in st.session_state:
    st.session_state.workflow_nodes = {}
if "workflow_order" not in st.session_state:
    st.session_state.workflow_order = []
if "workflow_status" not in st.session_state:
    st.session_state.workflow_status = "running"


NODE_TYPE_ICONS = {
    "start": "🏠",
    "llm": "🧠",
    "code": "⚙️",
    "knowledge-retrieval": "📚",
    "if-else": "🔀",
    "rag": "🧩",
    "answer": "💬",
}


def render_workflow(panel):
    with panel:
        if not st.session_state.workflow_nodes:
            st.caption("等待工作流事件...")
            return
        status_text = "运行中" if st.session_state.workflow_status == "running" else "已完成"
        st.caption(f"工作流状态：{status_text}")
        for node_id in st.session_state.workflow_order:
            node = st.session_state.workflow_nodes.get(node_id, {})
            status = "🟢" if node.get("status") == "started" else "✅"
            title = node.get("title", "unknown")
            node_type = node.get("node_type", "unknown")
            elapsed_ms = node.get("elapsed_ms")
            elapsed_text = f"{elapsed_ms} ms" if elapsed_ms is not None else ""
            icon = NODE_TYPE_ICONS.get(node_type, "🔹")

            cols = st.columns([0.1, 0.12, 0.58, 0.2])
            cols[0].markdown(status)
            cols[1].markdown(icon)
            cols[2].markdown(f"**{title}**  `({node_type})`")
            cols[3].markdown(elapsed_text)

            output = node.get("output")
            if output:
                with st.expander("查看输出", expanded=False):
                    st.code(output)


workflow_panel = st.expander("工作流", expanded=True)
render_workflow(workflow_panel)

for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

prompt = st.chat_input("输入你的问题...")
if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.chat_message("user").write(prompt)

    with st.chat_message("assistant"):
        placeholder = st.empty()

        payload = {
            "model": MODEL,
            "messages": st.session_state.messages,
            "stream": True,
            "show_node_events": True,
        }
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        }

        state = {
            "current_event": "message",
            "data_lines": [],
            "full_text": "",
        }

        def flush_event():
            if not state["data_lines"]:
                return
            data_str = "\n".join(state["data_lines"]).strip()
            state["data_lines"] = []
            if state["current_event"] == "workflow":
                try:
                    event_data = json.loads(data_str)
                    if event_data.get("status") == "finished":
                        st.session_state.workflow_status = "finished"
                    render_workflow(workflow_panel)
                except json.JSONDecodeError:
                    pass
            elif state["current_event"] == "node":
                try:
                    event_data = json.loads(data_str)
                    node_id = event_data.get("node_id") or f"{event_data.get('title','unknown')}-{event_data.get('node_type','unknown')}"
                    if node_id not in st.session_state.workflow_nodes:
                        st.session_state.workflow_order.append(node_id)
                        st.session_state.workflow_nodes[node_id] = {}
                    node = st.session_state.workflow_nodes[node_id]
                    node.update(event_data)
                    render_workflow(workflow_panel)
                except json.JSONDecodeError:
                    pass
            else:
                if data_str == "[DONE]":
                    return
                try:
                    chunk = json.loads(data_str)
                    delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    if delta:
                        state["full_text"] += delta
                        placeholder.write(state["full_text"])
                except json.JSONDecodeError:
                    pass

        with httpx.Client(timeout=120) as client:
            with client.stream("POST", f"{API_BASE}/chat/completions", json=payload, headers=headers) as resp:
                for line in resp.iter_lines():
                    if line is None:
                        continue
                    text = line.strip()
                    if not text:
                        flush_event()
                        state["current_event"] = "message"
                        continue
                    if text.startswith("event:"):
                        state["current_event"] = text.replace("event:", "").strip()
                        continue
                    if text.startswith("data:"):
                        state["data_lines"].append(text.replace("data:", "", 1).strip())

        st.session_state.messages.append({"role": "assistant", "content": state["full_text"]})

