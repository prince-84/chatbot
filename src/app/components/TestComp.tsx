"use client";
import { useChat } from "@ai-sdk/react";
import { useEffect } from "react";

export default function TestComp() {
  const chat = useChat();
  useEffect(() => {
    console.log("USE_CHAT_KEYS:", Object.keys(chat));
  }, []);
  return null;
}
