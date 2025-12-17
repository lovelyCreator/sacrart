import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { useLocale } from "@/hooks/useLocale";
import logoSA from "@/assets/logoSA-negro.png";

const Header = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { getPathWithLocale } = useLocale();

  const handleLanguageChange = async (language: string) => {
    const locale = language.toLowerCase();
    if (locale !== currentLanguage) {
      await changeLanguage(locale);
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background-dark/80 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <img
            alt="SACRART Logo"
            src={logoSA}
            className="h-10 md:h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(getPathWithLocale("/"))}
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={currentLanguage?.toUpperCase() || 'EN'} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-16 h-10 bg-transparent border-white/20 text-white font-display text-sm hover:border-white/40 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className="min-w-16 bg-background-dark/95 border-white/20 text-white"
              sideOffset={4}
              align="end"
              position="popper"
              side="bottom"
              avoidCollisions={true}
              collisionPadding={10}
            >
              <SelectItem value="EN" className="hover:bg-white/10 focus:bg-white/10">EN</SelectItem>
              <SelectItem value="ES" className="hover:bg-white/10 focus:bg-white/10">ES</SelectItem>
              <SelectItem value="PT" className="hover:bg-white/10 focus:bg-white/10">PT</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="flex h-10 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10"
          >
            {t('common.sign_in') || 'Iniciar sesión'}
          </Button>
          <Button
            onClick={() => navigate("/auth")}
            className="flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-[#8a4539]"
          >
            {t('common.get_started') || 'Registrarse'}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
