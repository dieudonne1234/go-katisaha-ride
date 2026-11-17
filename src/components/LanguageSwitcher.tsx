import { Languages } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
      <SelectTrigger className="h-9 w-auto gap-1.5 px-2.5 text-xs font-semibold" aria-label={t("nav.language")}>
        <Languages className="size-4" />
        <SelectValue>{LANGS.find((l) => l.code === lang)?.short}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {LANGS.map((l) => (
          <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
