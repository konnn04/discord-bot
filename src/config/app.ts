// Import database soon ...
const initConfig = () => {
  return {
    info: {
      appName: {
        vi: "FoxyBot",
        en: "FoxyBot",
      },
      description: {
        vi: "FoxyBot - Bot Discord đa năng với nhiều tính năng hữu ích dùng trong server discord, được phát triển bởi MPClub - CLB Lập trình trên thiết bị di động, trường Đại học Mở TP.HCM",
        en: "FoxyBot - A multifunctional Discord bot with many useful features for Discord servers, developed by MPClub - Mobile Programming Club, Ho Chi Minh City Open University",
      },
    },
    discord: {
      prefix: "f!",
      cooldown: 3000, // in miliseconds
      lang: "vi",
    },
  };
};

export const appConfig = initConfig();
