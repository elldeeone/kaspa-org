"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

import { AiLauncherView } from "./ai-launcher/AiLauncherView";
import {
  AI_KNOWLEDGE_DOCUMENT_URL,
  createAiProviderLinks,
} from "./ai-launcher/constants";
import { useAiConversation } from "./ai-launcher/useAiConversation";
import { useAiLauncherPanel } from "./ai-launcher/useAiLauncherPanel";

export default function AiLauncher(): React.JSX.Element {
  const t = useTranslations("shared.ai");
  const inputRef = useRef<HTMLInputElement>(null);
  const conversation = useAiConversation();
  const panel = useAiLauncherPanel({
    inputRef,
    setInput: conversation.setInput,
  });
  const providerLinks = createAiProviderLinks(
    t("externalPrompt", { url: AI_KNOWLEDGE_DOCUMENT_URL }),
    {
      chatgpt: t("providers.chatgpt"),
      claude: t("providers.claude"),
      perplexity: t("providers.perplexity"),
    },
  );

  return (
    <AiLauncherView
      copiedMessageId={conversation.copiedMessageId}
      input={conversation.input}
      inputRef={inputRef}
      isOpen={panel.isOpen}
      isTyping={conversation.isTyping}
      loadingMessage={conversation.loadingMessage}
      messages={conversation.messages}
      messagesEndRef={conversation.messagesEndRef}
      panelHeight={panel.panelHeight}
      panelState={panel.panelState}
      providerLinks={providerLinks}
      renderPanel={panel.renderPanel}
      onChangeInput={conversation.setInput}
      onClose={panel.closePanel}
      onCopy={conversation.handleCopy}
      onOpen={panel.openPanel}
      onSendMessage={conversation.sendMessage}
      onSubmit={conversation.handleSubmit}
      onToggleSize={panel.togglePanelSize}
    />
  );
}
