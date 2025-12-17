import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

interface LanguageTabsProps {
  activeLanguage: 'en' | 'es' | 'pt';
  onLanguageChange: (lang: 'en' | 'es' | 'pt') => void;
  className?: string;
}

const languages = [
  { code: 'en' as const, name: 'English', flag: '🇺🇸' },
  { code: 'es' as const, name: 'Español', flag: '🇪🇸' },
  { code: 'pt' as const, name: 'Português', flag: '🇵🇹' },
];

export const LanguageTabs = ({ activeLanguage, onLanguageChange, className = '' }: LanguageTabsProps) => {
  return (
    <div className={`flex items-center gap-2 border-b ${className}`}>
      <Languages className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground mr-2">Languages:</span>
      {languages.map((lang) => (
        <Button
          key={lang.code}
          variant={activeLanguage === lang.code ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onLanguageChange(lang.code)}
          className={`h-8 px-3 ${
            activeLanguage === lang.code
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          <span className="mr-1">{lang.flag}</span>
          {lang.name}
        </Button>
      ))}
    </div>
  );
};

export default LanguageTabs;


