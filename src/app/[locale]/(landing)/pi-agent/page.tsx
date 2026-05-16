import { redirect } from 'next/navigation';

const DEFAULT_PI_AGENT_WEB_URL = 'http://localhost:5173';

export default function PiAgentEntryPage() {
  const piAgentWebUrl =
    process.env.PI_AGENT_WEB_URL ||
    process.env.NEXT_PUBLIC_PI_WEB_UI_URL ||
    process.env.PI_WEB_UI_PROXY_ORIGIN ||
    DEFAULT_PI_AGENT_WEB_URL;

  redirect(piAgentWebUrl);
}
