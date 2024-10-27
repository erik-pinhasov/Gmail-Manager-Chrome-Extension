// languageUtils.js
import { getHeaderValue, logError } from "./utils.js";
import { fetchEmailDetails, fetchWithRetries } from "./api.js";
import { SecureStorage } from "../utils/storage.js";

export class LanguageDetector {
  constructor() {
    this.keywords = {
      en: [
        "unsubscribe",
        "notifications",
        "alerts",
        "preferences",
        "mailing",
        "newsletter",
        "manage",
        "managing",
      ],
      he: [
        "הסר",
        "התראות",
        "עדכונים",
        "העדפות",
        "דיוור",
        "ניוזלטר",
        "תפוצה",
        "ניהול",
      ],
      es: [
        "desuscribir",
        "notificaciones",
        "alertas",
        "preferencias",
        "correo",
        "boletín",
        "administrar",
        "gestionar",
      ],
      fr: [
        "désabonner",
        "notifications",
        "alertes",
        "préférences",
        "diffusion",
        "bulletin",
        "gérer",
        "gestion",
      ],
      de: [
        "abmelden",
        "benachrichtigungen",
        "warnungen",
        "einstellungen",
        "mailing",
        "newsletter",
        "verwalten",
        "verwaltung",
      ],
      ar: [
        "إلغاء الاشتراك",
        "إشعارات",
        "تنبيهات",
        "تفضيلات",
        "بريد",
        "نشرة إخبارية",
        "إدارة",
        "تدير",
      ],
      hi: [
        "सदस्यता समाप्त",
        "सूचनाएं",
        "अलर्ट",
        "प्राथमिकताएं",
        "मेलिंग",
        "न्यूजलेटर",
        "प्रबंधित",
        "प्रबंधन",
      ],
      pt: [
        "cancelar inscrição",
        "notificações",
        "alertas",
        "preferências",
        "mailing",
        "boletim",
        "gerenciar",
        "gestão",
      ],
      ja: [
        "配信解除",
        "通知",
        "アラート",
        "設定",
        "メール配信",
        "ニュースレター",
        "管理",
        "管理する",
      ],
      ru: [
        "отписаться",
        "уведомления",
        "оповещения",
        "настройки",
        "рассылка",
        "новости",
        "управлять",
        "управление",
      ],
      zh: [
        "退订",
        "通知",
        "提醒",
        "偏好设置",
        "邮件",
        "通讯",
        "管理",
        "管理中",
      ],
    };

    this.languagePatterns = {
      he: /[\u0590-\u05FF]/, // Hebrew
      ar: /[\u0600-\u06FF]/, // Arabic
      hi: /[\u0900-\u097F]/, // Hindi
      ja: /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/, // Japanese
      ru: /[\u0400-\u04FF]/, // Russian
      zh: /[\u4E00-\u9FFF]/, // Chinese
      es: /[áéíóúüñ¿¡]/i, // Spanish
      pt: /[áéíóúãõâêôç]/i, // Portuguese
      fr: /[éèêëàâäôöùûüÿçœæ]/i, // French
      de: /[äöüßÄÖÜ]/i, // German
    };
  }

  async detectAndSaveUserLanguages(token) {
    try {
      const url =
        "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=200";
      const data = await fetchWithRetries(url, token);

      if (!data?.messages?.length) return ["en"];

      const detectedLanguages = new Set(["en"]); // Always include English
      const messageIds = data.messages.map((msg) => msg.id);

      await Promise.all(
        messageIds.map(async (messageId) => {
          try {
            const emailData = await fetchEmailDetails(token, messageId);
            if (!emailData?.headers) return;

            const subject = getHeaderValue(emailData.headers, "Subject") || "";
            const content = subject + " " + (emailData.snippet || "");

            this.detectLanguagesInText(content).forEach((lang) =>
              detectedLanguages.add(lang)
            );
          } catch (error) {
            logError(error, messageId);
          }
        })
      );

      const userLanguages = Array.from(detectedLanguages);
      await SecureStorage.set("userLanguages", userLanguages);
      return userLanguages;
    } catch (error) {
      logError(error);
      return ["en"];
    }
  }

  detectLanguagesInText(text) {
    const detectedLanguages = new Set();

    Object.entries(this.languagePatterns).forEach(([lang, pattern]) => {
      if (pattern.test(text)) {
        detectedLanguages.add(lang);
      }
    });

    return Array.from(detectedLanguages);
  }

  buildSearchQuery(year, languages) {
    const datePart = `after:${year}/01/01 before:${year}/12/31`;
    const allKeywords = languages.flatMap((lang) => this.keywords[lang] || []);
    const uniqueKeywords = [...new Set(allKeywords)];
    const keywordsPart = uniqueKeywords.map((kw) => `"${kw}"`).join(" OR ");

    return `${datePart} (${keywordsPart})`;
  }
}
