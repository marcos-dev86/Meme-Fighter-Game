// Lets TypeScript accept the side-effect `import '@/global.css'` used by
// src/constants/theme.ts for react-native-web font variables. Expo's CLI
// normally emits an equivalent declaration into expo-env.d.ts the first
// time `expo start` runs; this file just makes `tsc --noEmit` clean before
// that has happened once.
declare module '*.css';
