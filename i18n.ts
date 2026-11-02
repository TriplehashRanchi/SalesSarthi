import Cookies from 'universal-cookie';

import en from './public/locales/en.json';
import ae from './public/locales/ae.json';
import da from './public/locales/da.json';
import de from './public/locales/de.json';
import el from './public/locales/el.json';
import es from './public/locales/es.json';
import fr from './public/locales/fr.json';
import hu from './public/locales/hu.json';
import it from './public/locales/it.json';
import ja from './public/locales/ja.json';
import pl from './public/locales/pl.json';
import pt from './public/locales/pt.json';
import ru from './public/locales/ru.json';
import sv from './public/locales/sv.json';
import tr from './public/locales/tr.json';
import zh from './public/locales/zh.json';
const langObj: any = { en, ae, da, de, el, es, fr, hu, it, ja, pl, pt, ru, sv, tr, zh };

const getLang = () => {
    // On the server, next/headers cookies() is async in Next 15+, so it can't be read synchronously here;
    // fall back to the default language and let the browser pick up the saved cookie.
    if (typeof window === 'undefined') return null;
    const cookies = new Cookies(null, { path: '/' });
    return cookies.get('i18nextLng') as string | null;
};

export const getTranslation = () => {
    const lang = getLang();
    const data: any = langObj[lang || 'en'];

    const t = (key: string) => {
        return data[key] ? data[key] : key;
    };

    const initLocale = (themeLocale: string) => {
        const lang = getLang();
        i18n.changeLanguage(lang || themeLocale);
    };

    const i18n = {
        language: lang,
        changeLanguage: (lang: string) => {
            const cookies = new Cookies(null, { path: '/' });
            cookies.set('i18nextLng', lang);
        },
    };

    return { t, i18n, initLocale };
};
