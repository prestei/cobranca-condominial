"use client";

import Link from "next/link";
import { parseAssistantMessageSegments } from "@/lib/ajuda/format-assistant-message";

type Props = {
  content: string;
  onNavegar?: () => void;
};

export function AssistantMessageContent({ content, onNavegar }: Props) {
  const segmentos = parseAssistantMessageSegments(content);

  return (
    <>
      {segmentos.map((parte, indice) =>
        parte.tipo === "link" ? (
          <Link
            key={`link-${indice}-${parte.href}`}
            href={parte.href}
            className="font-semibold text-primary-container underline decoration-primary-container/40 underline-offset-2 hover:text-brass hover:decoration-brass"
            onClick={() => onNavegar?.()}
          >
            {parte.rotulo}
          </Link>
        ) : (
          <span key={`texto-${indice}`}>{parte.valor}</span>
        ),
      )}
    </>
  );
}