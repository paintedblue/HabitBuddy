import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.habitbuddy.web',
  appName: 'HabitBuddy',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
