import fs from 'fs';
import path from 'path';
import { GuildSettingsService } from './GuildSettingsService';

type LocaleData = Record<string, any>;

export class I18nService {
    private static locales: Record<string, LocaleData> = {};
    private static defaultLang = 'en';
    private static loaded = false;

    private static cache = new Map<string, { locale: string, timestamp: number }>();
    private static TTL = 30 * 1000; // 30 seconds

    static load() {
        if (this.loaded) return;
        
        const localesDir = path.join(process.cwd(), 'src/i18n/locales');
        if (!fs.existsSync(localesDir)) {
            console.warn('[I18n] Locales directory not found');
            return;
        }

        const files = fs.readdirSync(localesDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const lang = path.basename(file, '.json');
                try {
                    const content = fs.readFileSync(path.join(localesDir, file), 'utf-8');
                    this.locales[lang] = JSON.parse(content);
                    console.log(`[I18n] Loaded locale: ${lang}`);
                } catch (e) {
                    console.error(`[I18n] Failed to load ${file}:`, e);
                }
            }
        }
        this.loaded = true;
    }

   public static async getLocale(guildId?: string | null): Promise<string> {
    if (!guildId) return this.defaultLang;

    const now = Date.now();
    const cached = this.cache.get(guildId);
    
    if (cached && (now - cached.timestamp) < this.TTL) {
        return cached.locale;
    }

    const settings = await GuildSettingsService.get(guildId);
    const locale = settings?.language || this.defaultLang;
    
    this.cache.set(guildId, { locale, timestamp: now });
    
    return locale;
  }

  public static invalidate(guildId: string) {
      this.cache.delete(guildId);
  }

    public static format(text: string, args?: Record<string, any>): string {
        if (!text) return "";
        if (!args) return text;
        
        let value = text;
        for (const [k, v] of Object.entries(args)) {
            value = value.replace(new RegExp(`{${k}}`, 'g'), String(v));
        }
        return value;
    }

    public static async getArray(guildId: string | undefined | null, key: string): Promise<string[]> {
        const lang = await this.getLocale(guildId);
        let value = this.getRawValue(lang, key);

        if ((!value || !Array.isArray(value)) && lang !== this.defaultLang) {
            value = this.getRawValue(this.defaultLang, key);
        }

        return Array.isArray(value) ? value : [];
    }

    public static async t(guildId: string | undefined | null, key: string, args?: Record<string, any>): Promise<string> {
        const lang = await this.getLocale(guildId);
        return this.translate(lang, key, args);
    }

    static tSync(lang: string, key: string, args?: Record<string, any>): string {
        return this.translate(lang, key, args);
    }

    private static translate(lang: string, key: string, args?: Record<string, any>): string {
        let value = this.getRawValue(lang, key);
        
        if (!value && lang !== this.defaultLang) {
            value = this.getRawValue(this.defaultLang, key);
        }

        if (typeof value !== 'string') return key;

        return this.format(value, args);
    }

    private static getRawValue(lang: string, key: string): any {
        const data = this.locales[lang];
        if (!data) return null;

        const parts = key.split('.');
        let current = data;
        
        for (const part of parts) {
            if (current[part] === undefined) return null;
            current = current[part];
        }

        return current;
    }
}
