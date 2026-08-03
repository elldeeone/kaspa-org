"use client";

import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from "react";

import { copyTextToClipboard } from "../copyTextToClipboard";
import { LOADING_MESSAGE_KEYS, LOADING_MESSAGE_ROTATE_MS } from "./constants";
import { getNextLoadingMessageIndex, requestKaspaAnswer } from "./ask";
import type { ChatRequestMessage, Message } from "./types";

type UseAiConversationResult = {
  copiedMessageId: number | null;
  handleCopy: (messageId: number, text: string) => Promise<void>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  input: string;
  isTyping: boolean;
  loadingMessage: string;
  messages: Message[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
  sendMessage: (text: string) => void;
  setInput: Dispatch<SetStateAction<string>>;
};

function buildChatHistory(
  messages: Message[],
  nextMessage: string,
): ChatRequestMessage[] {
  const history = messages.slice(-4).map((message) => {
    const role: ChatRequestMessage["role"] =
      message.role === "ai" ? "assistant" : "user";

    return {
      role,
      content: message.text,
    };
  });

  history.push({ role: "user", content: nextMessage });
  return history;
}

export function useAiConversation(): UseAiConversationResult {
  const t = useTranslations("shared.ai");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const copiedResetTimeoutRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);
  const messagesRef = useRef<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isTyping, messages]);

  useEffect(() => {
    if (!isTyping) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingMessageIndex((current) => getNextLoadingMessageIndex(current));
    }, LOADING_MESSAGE_ROTATE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isTyping]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();

      if (copiedResetTimeoutRef.current !== null) {
        window.clearTimeout(copiedResetTimeoutRef.current);
      }
    };
  }, []);

  const markCopied = useCallback((messageId: number): void => {
    setCopiedMessageId(messageId);

    if (copiedResetTimeoutRef.current !== null) {
      window.clearTimeout(copiedResetTimeoutRef.current);
    }

    copiedResetTimeoutRef.current = window.setTimeout(() => {
      setCopiedMessageId((current) => (current === messageId ? null : current));
      copiedResetTimeoutRef.current = null;
    }, 2000);
  }, []);

  const handleCopy = useCallback(
    async (messageId: number, text: string): Promise<void> => {
      const copied = await copyTextToClipboard(text);
      if (copied) {
        markCopied(messageId);
      }
    },
    [markCopied],
  );

  const sendMessage = useCallback(
    (text: string): void => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) {
        return;
      }

      const userId = nextIdRef.current;
      const aiId = userId + 1;
      nextIdRef.current += 2;

      const userMessage: Message = { id: userId, role: "user", text: trimmed };
      const aiMessage: Message = { id: aiId, role: "ai", text: "" };
      const nextMessages = [...messagesRef.current, userMessage, aiMessage];

      messagesRef.current = nextMessages;
      setMessages(nextMessages);
      setLoadingMessageIndex((current) => getNextLoadingMessageIndex(current));
      setInput("");
      setIsTyping(true);

      const controller = new AbortController();
      const history = buildChatHistory(
        messagesRef.current.slice(0, -2),
        trimmed,
      );
      abortRef.current = controller;

      void requestKaspaAnswer(history, controller.signal)
        .then((answer) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === aiId ? { ...message, text: answer } : message,
            ),
          );
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return;
          }

          setMessages((current) =>
            current.map((message) =>
              message.id === aiId
                ? {
                    ...message,
                    text: t("genericError"),
                  }
                : message,
            ),
          );
        })
        .finally(() => {
          if (abortRef.current === controller) {
            abortRef.current = null;
          }

          if (!controller.signal.aborted) {
            setIsTyping(false);
          }
        });
    },
    [isTyping, t],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage],
  );

  return {
    copiedMessageId,
    handleCopy,
    handleSubmit,
    input,
    isTyping,
    loadingMessage: t(
      `loading.${LOADING_MESSAGE_KEYS[loadingMessageIndex] ?? LOADING_MESSAGE_KEYS[0]}`,
    ),
    messages,
    messagesEndRef,
    sendMessage,
    setInput,
  };
}
