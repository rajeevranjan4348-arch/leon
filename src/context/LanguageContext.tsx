import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'zh' | 'hi';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  dictionary: Record<string, string>;
  translations: Record<Language, Record<string, string>>;
}

const STORAGE_KEY = 'ai_studio_user_language';

const translations: Record<Language, Record<string, string>> = {
  en: {
    'search.placeholder': 'Assign a task or type / for more',
    'search.send': 'Send',
    'search.cancel': 'Cancel',
    'search.editing': 'Editing message',
    'search.offline': 'Offline AI',
    'search.dictate': 'Dictate query',
    'search.addAttachment': 'Add attachments, plugins & media',
    'nav.newChat': 'New Chat',
    'nav.settings': 'Settings',
    'nav.language': 'Language',
    'nav.chat': 'Chat',
    'nav.search': 'Search',
    'nav.research': 'Research',
    'settings.title': 'Settings',
    'settings.language': 'Language Preference',
    'common.english': 'English',
    'common.chinese': '中文 (Chinese)',
    'common.hindi': 'हिन्दी (Hindi)',
  },
  zh: {
    'search.placeholder': '分配任务或输入 / 了解更多',
    'search.send': '发送',
    'search.cancel': '取消',
    'search.editing': '正在编辑消息',
    'search.offline': '离线 AI Engine',
    'search.dictate': '语音输入',
    'search.addAttachment': '添加附件、插件与媒体',
    'nav.newChat': '新对话',
    'nav.settings': '设置',
    'nav.language': '语言',
    'nav.chat': '聊天',
    'nav.search': '搜索',
    'nav.research': '深度研究',
    'settings.title': '设置',
    'settings.language': '语言偏好',
    'common.english': 'English',
    'common.chinese': '中文',
    'common.hindi': 'हिन्दी (印地语)',
  },
  hi: {
    'search.placeholder': 'कोई कार्य सौंपें या अधिक के लिए / टाइप करें',
    'search.send': 'भेजें',
    'search.cancel': 'रद्द करें',
    'search.editing': 'संदेश संपादित किया जा रहा है',
    'search.offline': 'ऑफ़लाइन एआई',
    'search.dictate': 'वॉयस इनपुट',
    'search.addAttachment': 'अनुलग्नक, प्लगइन्स और मीडिया जोड़ें',
    'nav.newChat': 'नई बातचीत',
    'nav.settings': 'सेटिंग्स',
    'nav.language': 'भाषा',
    'nav.chat': 'चैट',
    'nav.search': 'खोज',
    'nav.research': 'शोध',
    'settings.title': 'सेटिंग्स',
    'settings.language': 'भाषा वरीयता',
    'common.english': 'English (अंग्रेज़ी)',
    'common.chinese': '中文 (चीनी)',
    'common.hindi': 'हिन्दी',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as Language;
        if (saved === 'en' || saved === 'zh' || saved === 'hi') {
          return saved;
        }
      } catch (e) {
        console.error('Failed to read language preference from localStorage:', e);
      }
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {
        console.error('Failed to save language preference to localStorage:', e);
      }
    }
  };

  const t = (key: string, fallback?: string): string => {
    return translations[language]?.[key] || translations.en[key] || fallback || key;
  };

  const dictionary = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dictionary, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key: string, fallback?: string) => translations.en[key] || fallback || key,
      dictionary: translations.en,
      translations,
    };
  }
  return context;
};
