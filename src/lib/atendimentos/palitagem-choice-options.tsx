import { CircleCheck, CircleX, Mail, MapPin, MessageSquare, Phone, ScrollText } from "lucide-react";
import type { IconChoiceOption } from "@/components/icon-choice-group";
import { WhatsappIcon } from "@/components/icons/whatsapp-icon";
import { canaisAtendimento } from "@/data/catalogo";

const iconePorCanal: Record<(typeof canaisAtendimento)[number], IconChoiceOption["icon"] | "whatsapp"> = {
  WhatsApp: "whatsapp",
  Telefone: Phone,
  "E-mail": Mail,
  SMS: MessageSquare,
  Presencial: MapPin,
  "Carta/notificação": ScrollText,
};

export const canalPalitagemOptions: IconChoiceOption[] = canaisAtendimento.map((canal) => {
  const icone = iconePorCanal[canal];
  const shortLabel = canal === "Carta/notificação" ? "Carta" : undefined;
  if (icone === "whatsapp") {
    return {
      value: canal,
      label: canal,
      shortLabel,
      iconNode: <WhatsappIcon className="size-5 text-[#25D366]" />,
    };
  }
  return { value: canal, label: canal, shortLabel, icon: icone };
});

export const canalPalitagemRapidoOptions = canalPalitagemOptions.filter((item) =>
  (["WhatsApp", "Telefone", "E-mail"] as const).includes(item.value as "WhatsApp" | "Telefone" | "E-mail"),
);

export const canalPalitagemExtraOptions = canalPalitagemOptions.filter(
  (item) => !canalPalitagemRapidoOptions.some((rapido) => rapido.value === item.value),
);

export const respondeuPalitagemOptions: IconChoiceOption[] = [
  { value: "Sim", label: "Sim", icon: CircleCheck },
  { value: "Não", label: "Não", icon: CircleX },
];

