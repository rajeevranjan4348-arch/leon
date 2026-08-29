/**
 * AppResolver Service
 * 
 * Production-ready Android Application Resolver & Discovery Service.
 * Resolves natural language queries, package names, aliases, and fuzzy names
 * against discovered installed apps and known Android application registries.
 */

import { androidNativeBridge } from '../native/AndroidNativeBridge';

export interface InstalledApp {
  id: string;
  name: string;
  packageName: string;
  normalizedName: string;
  activityName?: string;
  category: 'social' | 'media' | 'productivity' | 'utilities' | 'system' | 'tools' | 'games' | 'other';
  launchable: boolean;
  isSystemApp?: boolean;
  versionName?: string;
  iconUrl?: string;
  scheme?: string;
  fallbackUrl?: string;
  keywords: string[];
  aliases: string[];
  playStoreUrl: string;
  marketUri: string;
}

export interface LaunchIntentInfo {
  action: string;
  packageName: string;
  category?: string;
  flags?: string[];
  uri?: string;
  intentUrl: string;
}

export interface AppResolutionResult {
  matchedApp: InstalledApp | null;
  isAmbiguous: boolean;
  ambiguousMatches: InstalledApp[];
  confidence: number;
}

export interface AppResolverResult {
  success: boolean;
  appName: string;
  packageName?: string;
  installed: boolean;
  launchable?: boolean;
  launchIntent?: LaunchIntentInfo;
  message?: string;
  error?: string;
  isAmbiguous?: boolean;
  ambiguousMatches?: { name: string; packageName: string }[];
  playStoreUrl?: string;
}

// Standard aliases mapping common names and abbreviations to standard app labels
export const STANDARD_APP_ALIASES: Record<string, string[]> = {
  'whatsapp': ['wa', 'whats app', 'whatsup', 'watsapp', 'whatsapp messenger', 'whatsapp chat', 'my whatsapp'],
  'instagram': ['ig', 'insta', 'gram', 'instagram app', 'ig app', 'my instagram'],
  'youtube': ['yt', 'you tube', 'youtube app', 'yt app', 'videos', 'my youtube', 'tube'],
  'google chrome': ['chrome', 'browser', 'web browser', 'internet', 'google browser', 'chrome browser', 'my chrome', 'web'],
  'telegram': ['tg', 'telegram app', 'telegram messenger', 'my telegram'],
  'google maps': ['maps', 'gmaps', 'gmap', 'navigation', 'gps', 'navigator', 'my maps', 'directions', 'map'],
  'gmail': ['mail', 'email', 'google mail', 'g-mail', 'my mail', 'my email', 'inbox'],
  'settings': ['phone settings', 'system settings', 'preferences', 'configuration', 'config', 'gear', 'options', 'setting'],
  'camera': ['cam', 'photo camera', 'phone camera', 'take photo', 'take picture', 'selfie camera', 'my camera'],
  'calculator': ['calc', 'math', 'math calculator', 'the calculator', 'my calculator'],
  'contacts': ['people', 'address book', 'phonebook', 'directory', 'my contacts'],
  'phone': ['dialer', 'call', 'telephone', 'keypad', 'phone dialer', 'cellular', 'make call'],
  'messages': ['sms', 'text messages', 'messaging', 'texts', 'txt', 'message app', 'my messages'],
  'files by google': ['files', 'file manager', 'file explorer', 'my files', 'downloads', 'explorer'],
  'clock': ['alarm', 'alarms', 'timer', 'stopwatch', 'world clock', 'the clock'],
  'google calendar': ['calendar', 'cal', 'schedule', 'agenda', 'my calendar'],
  'spotify': ['spotify music', 'music app', 'songs', 'tunes', 'music', 'spotify player'],
  'google photos': ['photos', 'gallery', 'photo gallery', 'pictures', 'image gallery', 'my photos'],
  'google drive': ['drive', 'gdrive', 'cloud drive', 'storage', 'my drive'],
  'google keep notes': ['keep', 'notes', 'keep notes', 'memo', 'notepad', 'my notes'],
  'x (twitter)': ['twitter', 'x', 'x app', 'tweets', 'twitter app'],
  'netflix': ['netflix app', 'movies', 'series', 'stream movies'],
  'amazon shopping': ['amazon', 'amazon app', 'shop', 'shopping'],
  'reddit': ['reddit app', 'subreddits', 'threads'],
  'source ai': ['source', 'source ai', 'sourceai', 'open source ai', 'instructions', 'assistant', 'ai', 'rishi', 'workspace', 'the app', 'this app'],
};

// Base fallback catalog of popular real-world apps with explicit Android Intent schemes
export const BASE_KNOWN_APPS: InstalledApp[] = [
  {
    id: 'source_ai',
    name: 'Source AI',
    packageName: 'ai.source.workspace',
    normalizedName: 'source ai',
    activityName: 'ai.source.workspace.MainActivity',
    category: 'productivity',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://ai.source.workspace/#Intent;package=ai.source.workspace;end',
    fallbackUrl: '#',
    keywords: ['source', 'source ai', 'sourceai', 'open source ai', 'assistant', 'ai', 'rishi', 'workspace', 'the app', 'this app'],
    aliases: ['source ai', 'sourceai', 'source', 'open source ai', 'source app', 'ai assistant', 'rishi', 'rishi ai', 'the app', 'this app', 'my app'],
    playStoreUrl: 'https://play.google.com/store',
    marketUri: 'market://details?id=ai.source.workspace',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    packageName: 'com.whatsapp',
    normalizedName: 'whatsapp',
    activityName: 'com.whatsapp.Main',
    category: 'social',
    launchable: true,
    isSystemApp: false,
    scheme: 'intent://#Intent;package=com.whatsapp;scheme=whatsapp;end',
    fallbackUrl: 'https://web.whatsapp.com',
    keywords: ['whatsapp', 'wa', 'chat', 'messaging', 'messages', 'talk', 'call', 'whatsup', 'watsapp'],
    aliases: ['wa', 'whats app', 'whatsup', 'watsapp', 'whatsapp messenger', 'whatsapp chat', 'my whatsapp'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.whatsapp',
    marketUri: 'market://details?id=com.whatsapp',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    packageName: 'com.instagram.android',
    normalizedName: 'instagram',
    activityName: 'com.instagram.mainactivity.MainActivity',
    category: 'social',
    launchable: true,
    isSystemApp: false,
    scheme: 'intent://#Intent;package=com.instagram.android;scheme=instagram;end',
    fallbackUrl: 'https://www.instagram.com',
    keywords: ['instagram', 'ig', 'insta', 'reels', 'photos', 'stories', 'feed', 'gram'],
    aliases: ['ig', 'insta', 'gram', 'instagram app', 'ig app', 'my instagram'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.instagram.android',
    marketUri: 'market://details?id=com.instagram.android',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    packageName: 'com.google.android.youtube',
    normalizedName: 'youtube',
    activityName: 'com.google.android.apps.youtube.app.WatchWhileActivity',
    category: 'media',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.youtube;scheme=vnd.youtube;end',
    fallbackUrl: 'https://www.youtube.com',
    keywords: ['youtube', 'yt', 'videos', 'watch', 'shorts', 'clips', 'stream', 'music video'],
    aliases: ['yt', 'you tube', 'youtube app', 'yt app', 'videos', 'my youtube'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.youtube',
    marketUri: 'market://details?id=com.google.android.youtube',
  },
  {
    id: 'chrome',
    name: 'Google Chrome',
    packageName: 'com.android.chrome',
    normalizedName: 'google chrome',
    activityName: 'com.google.android.apps.chrome.Main',
    category: 'utilities',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.android.chrome;scheme=googlechrome;end',
    fallbackUrl: 'https://www.google.com',
    keywords: ['chrome', 'browser', 'google chrome', 'internet', 'web', 'surf', 'search', 'sites'],
    aliases: ['chrome', 'browser', 'web browser', 'internet', 'google browser', 'chrome browser', 'my chrome', 'web'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.android.chrome',
    marketUri: 'market://details?id=com.android.chrome',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    packageName: 'org.telegram.messenger',
    normalizedName: 'telegram',
    activityName: 'org.telegram.ui.LaunchActivity',
    category: 'social',
    launchable: true,
    isSystemApp: false,
    scheme: 'intent://#Intent;package=org.telegram.messenger;scheme=tg;end',
    fallbackUrl: 'https://web.telegram.org',
    keywords: ['telegram', 'tg', 'chat', 'channels', 'groups', 'messaging'],
    aliases: ['tg', 'telegram app', 'telegram messenger', 'my telegram'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=org.telegram.messenger',
    marketUri: 'market://details?id=org.telegram.messenger',
  },
  {
    id: 'maps',
    name: 'Google Maps',
    packageName: 'com.google.android.apps.maps',
    normalizedName: 'google maps',
    activityName: 'com.google.android.maps.MapsActivity',
    category: 'utilities',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.apps.maps;scheme=geo;end',
    fallbackUrl: 'https://maps.google.com',
    keywords: ['maps', 'google maps', 'navigation', 'gps', 'directions', 'traffic', 'transit', 'places'],
    aliases: ['maps', 'gmaps', 'gmap', 'navigation', 'gps', 'navigator', 'my maps', 'directions'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.maps',
    marketUri: 'market://details?id=com.google.android.apps.maps',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    packageName: 'com.google.android.gm',
    normalizedName: 'gmail',
    activityName: 'com.google.android.gm.ConversationListActivityGmail',
    category: 'productivity',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.gm;scheme=mailto;end',
    fallbackUrl: 'https://mail.google.com',
    keywords: ['gmail', 'email', 'mail', 'inbox', 'google mail', 'messages', 'compose'],
    aliases: ['mail', 'email', 'google mail', 'g-mail', 'my mail', 'my email', 'inbox'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.gm',
    marketUri: 'market://details?id=com.google.android.gm',
  },
  {
    id: 'settings',
    name: 'Settings',
    packageName: 'com.android.settings',
    normalizedName: 'settings',
    activityName: 'com.android.settings.Settings',
    category: 'system',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.android.settings;action=android.settings.SETTINGS;end',
    fallbackUrl: '#',
    keywords: ['settings', 'system settings', 'phone settings', 'preferences', 'configuration', 'wifi', 'bluetooth', 'display'],
    aliases: ['phone settings', 'system settings', 'preferences', 'configuration', 'config', 'gear', 'options'],
    playStoreUrl: 'https://play.google.com/store',
    marketUri: 'market://details?id=com.android.settings',
  },
  {
    id: 'camera',
    name: 'Camera',
    packageName: 'com.android.camera',
    normalizedName: 'camera',
    activityName: 'com.android.camera.Camera',
    category: 'utilities',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;action=android.media.action.IMAGE_CAPTURE;end',
    fallbackUrl: '#',
    keywords: ['camera', 'photo', 'picture', 'video', 'record', 'cam', 'selfie', 'lens'],
    aliases: ['cam', 'photo camera', 'phone camera', 'take photo', 'take picture', 'selfie camera', 'my camera'],
    playStoreUrl: 'https://play.google.com/store',
    marketUri: 'market://details?id=com.android.camera',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    packageName: 'com.google.android.calculator',
    normalizedName: 'calculator',
    activityName: 'com.android.calculator2.Calculator',
    category: 'utilities',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.calculator;end',
    fallbackUrl: '#',
    keywords: ['calculator', 'calc', 'math', 'numbers', 'arithmetic', 'calculate'],
    aliases: ['calc', 'math', 'math calculator', 'the calculator', 'my calculator'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.calculator',
    marketUri: 'market://details?id=com.google.android.calculator',
  },
  {
    id: 'contacts',
    name: 'Contacts',
    packageName: 'com.google.android.contacts',
    normalizedName: 'contacts',
    activityName: 'com.android.contacts.activities.PeopleActivity',
    category: 'productivity',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.contacts;end',
    fallbackUrl: 'https://contacts.google.com',
    keywords: ['contacts', 'people', 'phonebook', 'address book', 'numbers', 'friends'],
    aliases: ['people', 'address book', 'phonebook', 'directory', 'my contacts'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.contacts',
    marketUri: 'market://details?id=com.google.android.contacts',
  },
  {
    id: 'phone',
    name: 'Phone',
    packageName: 'com.google.android.dialer',
    normalizedName: 'phone',
    activityName: 'com.google.android.dialer.extensions.GoogleDialtactsActivity',
    category: 'system',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;action=android.intent.action.DIAL;end',
    fallbackUrl: '#',
    keywords: ['phone', 'dialer', 'call', 'keypad', 'telephone', 'dial'],
    aliases: ['dialer', 'call', 'telephone', 'keypad', 'phone dialer', 'cellular', 'make call'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.dialer',
    marketUri: 'market://details?id=com.google.android.dialer',
  },
  {
    id: 'messages',
    name: 'Messages',
    packageName: 'com.google.android.apps.messaging',
    normalizedName: 'messages',
    activityName: 'com.google.android.apps.messaging.ui.ConversationListActivity',
    category: 'social',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.apps.messaging;scheme=sms;end',
    fallbackUrl: 'https://messages.google.com/web',
    keywords: ['messages', 'sms', 'text', 'texts', 'chat', 'messaging', 'txt'],
    aliases: ['sms', 'text messages', 'messaging', 'texts', 'txt', 'message app', 'my messages'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.messaging',
    marketUri: 'market://details?id=com.google.android.apps.messaging',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    packageName: 'com.spotify.music',
    normalizedName: 'spotify',
    activityName: 'com.spotify.music.MainActivity',
    category: 'media',
    launchable: true,
    isSystemApp: false,
    scheme: 'intent://#Intent;package=com.spotify.music;scheme=spotify;end',
    fallbackUrl: 'https://open.spotify.com',
    keywords: ['spotify', 'music', 'songs', 'audio', 'stream', 'podcasts', 'playlist'],
    aliases: ['spotify music', 'music app', 'songs', 'tunes', 'music', 'spotify player'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.spotify.music',
    marketUri: 'market://details?id=com.spotify.music',
  },
  {
    id: 'files',
    name: 'Files by Google',
    packageName: 'com.google.android.apps.nbu.files',
    normalizedName: 'files by google',
    activityName: 'com.google.android.apps.nbu.files.home.HomeActivity',
    category: 'utilities',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.apps.nbu.files;end',
    fallbackUrl: '#',
    keywords: ['files', 'file manager', 'storage', 'downloads', 'explorer', 'docs'],
    aliases: ['files', 'file manager', 'file explorer', 'my files', 'downloads', 'explorer'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.files',
    marketUri: 'market://details?id=com.google.android.apps.nbu.files',
  },
  {
    id: 'clock',
    name: 'Clock',
    packageName: 'com.google.android.deskclock',
    normalizedName: 'clock',
    activityName: 'com.android.deskclock.DeskClock',
    category: 'utilities',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.deskclock;end',
    fallbackUrl: '#',
    keywords: ['clock', 'alarm', 'timer', 'stopwatch', 'time', 'wake up', 'alarms'],
    aliases: ['alarm', 'alarms', 'timer', 'stopwatch', 'world clock', 'the clock'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.deskclock',
    marketUri: 'market://details?id=com.google.android.deskclock',
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    packageName: 'com.google.android.calendar',
    normalizedName: 'google calendar',
    activityName: 'com.android.calendar.AllInOneActivity',
    category: 'productivity',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.calendar;end',
    fallbackUrl: 'https://calendar.google.com',
    keywords: ['calendar', 'google calendar', 'events', 'schedule', 'agenda', 'reminders', 'meetings'],
    aliases: ['calendar', 'cal', 'schedule', 'agenda', 'my calendar'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.calendar',
    marketUri: 'market://details?id=com.google.android.calendar',
  },
  {
    id: 'photos',
    name: 'Google Photos',
    packageName: 'com.google.android.apps.photos',
    normalizedName: 'google photos',
    activityName: 'com.google.android.apps.photos.home.HomeActivity',
    category: 'media',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.apps.photos;end',
    fallbackUrl: 'https://photos.google.com',
    keywords: ['photos', 'google photos', 'gallery', 'pictures', 'images', 'albums'],
    aliases: ['photos', 'gallery', 'photo gallery', 'pictures', 'image gallery', 'my photos'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.photos',
    marketUri: 'market://details?id=com.google.android.apps.photos',
  },
  {
    id: 'drive',
    name: 'Google Drive',
    packageName: 'com.google.android.apps.docs',
    normalizedName: 'google drive',
    activityName: 'com.google.android.apps.docs.app.NewMainProxyActivity',
    category: 'productivity',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.apps.docs;end',
    fallbackUrl: 'https://drive.google.com',
    keywords: ['drive', 'google drive', 'docs', 'cloud', 'files', 'storage', 'backup'],
    aliases: ['drive', 'gdrive', 'cloud drive', 'storage', 'my drive'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.docs',
    marketUri: 'market://details?id=com.google.android.apps.docs',
  },
  {
    id: 'keep',
    name: 'Google Keep Notes',
    packageName: 'com.google.android.keep',
    normalizedName: 'google keep notes',
    activityName: 'com.google.android.keep.activities.BrowseActivity',
    category: 'productivity',
    launchable: true,
    isSystemApp: true,
    scheme: 'intent://#Intent;package=com.google.android.keep;end',
    fallbackUrl: 'https://keep.google.com',
    keywords: ['keep', 'notes', 'google keep', 'memo', 'checklist', 'todo'],
    aliases: ['keep', 'notes', 'keep notes', 'memo', 'notepad', 'my notes'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.keep',
    marketUri: 'market://details?id=com.google.android.keep',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    packageName: 'com.twitter.android',
    normalizedName: 'x (twitter)',
    activityName: 'com.twitter.android.MainActivity',
    category: 'social',
    launchable: true,
    isSystemApp: false,
    scheme: 'intent://#Intent;package=com.twitter.android;scheme=twitter;end',
    fallbackUrl: 'https://twitter.com',
    keywords: ['twitter', 'x', 'social', 'tweets', 'posts', 'news'],
    aliases: ['twitter', 'x', 'x app', 'tweets', 'twitter app'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.twitter.android',
    marketUri: 'market://details?id=com.twitter.android',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    packageName: 'com.netflix.mediaclient',
    normalizedName: 'netflix',
    activityName: 'com.netflix.mediaclient.ui.launch.UIWebViewActivity',
    category: 'media',
    launchable: true,
    isSystemApp: false,
    scheme: 'intent://#Intent;package=com.netflix.mediaclient;scheme=nflx;end',
    fallbackUrl: 'https://www.netflix.com',
    keywords: ['netflix', 'movies', 'shows', 'series', 'stream', 'tv'],
    aliases: ['netflix app', 'movies', 'series', 'stream movies'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.netflix.mediaclient',
    marketUri: 'market://details?id=com.netflix.mediaclient',
  },
  {
    id: 'amazon',
    name: 'Amazon Shopping',
    packageName: 'com.amazon.mShop.android.shopping',
    normalizedName: 'amazon shopping',
    activityName: 'com.amazon.mShop.home.HomeActivity',
    category: 'other',
    launchable: true,
    isSystemApp: false,
    scheme: 'intent://#Intent;package=com.amazon.mShop.android.shopping;end',
    fallbackUrl: 'https://www.amazon.com',
    keywords: ['amazon', 'shopping', 'store', 'buy', 'orders', 'deals'],
    aliases: ['amazon', 'amazon app', 'shop', 'shopping'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.amazon.mShop.android.shopping',
    marketUri: 'market://details?id=com.amazon.mShop.android.shopping',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    packageName: 'com.reddit.frontpage',
    normalizedName: 'reddit',
    activityName: 'com.reddit.frontpage.MainActivity',
    category: 'social',
    launchable: true,
    isSystemApp: false,
    scheme: 'intent://#Intent;package=com.reddit.frontpage;end',
    fallbackUrl: 'https://www.reddit.com',
    keywords: ['reddit', 'subreddits', 'threads', 'posts', 'community', 'forum'],
    aliases: ['reddit app', 'subreddits', 'threads'],
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.reddit.frontpage',
    marketUri: 'market://details?id=com.reddit.frontpage',
  },
];

export class AppResolver {
  private static instance: AppResolver;
  private appRegistry: Map<string, InstalledApp> = new Map();
  private packageRegistry: Map<string, InstalledApp> = new Map();
  private aliasRegistry: Map<string, string> = new Map();
  private isInitialized: boolean = false;

  private constructor() {
    this.initializeRegistry();
  }

  public static getInstance(): AppResolver {
    if (!AppResolver.instance) {
      AppResolver.instance = new AppResolver();
    }
    return AppResolver.instance;
  }

  /**
   * Get all registered applications
   */
  public getAllApps(): InstalledApp[] {
    return Array.from(this.appRegistry.values());
  }

  /**
   * Initializes the registry with base known apps and standard alias mappings
   */
  private initializeRegistry(): void {
    if (this.isInitialized) return;

    for (const app of BASE_KNOWN_APPS) {
      this.registerApp(app);
    }

    for (const [canonicalKey, aliases] of Object.entries(STANDARD_APP_ALIASES)) {
      for (const alias of aliases) {
        this.aliasRegistry.set(this.normalizeAppName(alias), canonicalKey);
      }
    }

    this.discoverNativeInstalledApps();
    this.isInitialized = true;
  }

  /**
   * Normalizes an app name: lowercases, removes punctuation and extra whitespace
   */
  public normalizeAppName(raw: string): string {
    if (!raw) return '';
    return raw
      .toLowerCase()
      .trim()
      .replace(/['".,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts clean target application name from natural language command or user input
   */
  public extractAppName(input: string): string {
    if (!input) return '';
    let text = input.trim();

    // Strip common action prefixes
    const prefixes = [
      /^can you please open (the |my )?/i,
      /^can you open (the |my )?/i,
      /^please open (the |my )?/i,
      /^could you open (the |my )?/i,
      /^open up (the |my )?/i,
      /^open (the |my )?/i,
      /^launch (the |my )?/i,
      /^start (the |my )?/i,
      /^go to (the |my )?/i,
      /^run (the |my )?/i,
      /^switch to (the |my )?/i,
      /^show (the |my )?/i,
    ];

    for (const prefix of prefixes) {
      if (prefix.test(text)) {
        text = text.replace(prefix, '').trim();
        break;
      }
    }

    // Strip common action suffixes
    text = text
      .replace(/\s+(app|application|program)$/i, '')
      .replace(/\s+for me$/i, '')
      .replace(/\s+please$/i, '')
      .trim();

    return text;
  }

  /**
   * Discovers installed applications from Android native bridge if present
   */
  public discoverNativeInstalledApps(): void {
    if (typeof window === 'undefined') return;

    try {
      const win = window as any;

      // 1. AndroidAppLauncher native bridge
      if (win.AndroidAppLauncher && typeof win.AndroidAppLauncher.getInstalledAppsJson === 'function') {
        const json = win.AndroidAppLauncher.getInstalledAppsJson();
        if (json && typeof json === 'string') {
          try {
            const parsed = JSON.parse(json);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                this.ingestNativeApp(item);
              }
            }
          } catch (e) {
            console.warn('[AppResolver] Error parsing AndroidAppLauncher JSON:', e);
          }
        }
      }

      // 2. AndroidControl bridge
      if (win.AndroidControl && typeof win.AndroidControl.getInstalledApps === 'function') {
        const raw = win.AndroidControl.getInstalledApps();
        if (raw && typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                this.ingestNativeApp(item);
              }
            }
          } catch {}
        }
      }

      // 3. AndroidNativeBridge service
      androidNativeBridge.getInstalledApps().then(apps => {
        if (Array.isArray(apps)) {
          for (const app of apps) {
            this.ingestNativeApp(app);
          }
        }
      }).catch(() => {});
    } catch (err) {
      console.warn('[AppResolver] Error discovering native apps:', err);
    }
  }

  private ingestNativeApp(rawItem: any): void {
    if (!rawItem) return;
    const pkg = rawItem.packageName || rawItem.package_name || rawItem.package || rawItem.id;
    if (!pkg || typeof pkg !== 'string') return;

    const name = rawItem.appName || rawItem.name || rawItem.label || pkg.split('.').pop() || pkg;
    const norm = this.normalizeAppName(name);
    const id = pkg.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const app: InstalledApp = {
      id,
      name,
      packageName: pkg,
      normalizedName: norm,
      activityName: rawItem.activityName || rawItem.activity || rawItem.mainActivity,
      category: rawItem.category || 'other',
      launchable: rawItem.launchable !== false,
      isSystemApp: Boolean(rawItem.isSystemApp || rawItem.is_system_app),
      versionName: rawItem.versionName,
      iconUrl: rawItem.iconUrl,
      scheme: `intent://#Intent;package=${encodeURIComponent(pkg)};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;launchFlags=0x10000000;end`,
      fallbackUrl: `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`,
      keywords: [norm, name.toLowerCase(), pkg.toLowerCase()],
      aliases: [norm, name.toLowerCase()],
      playStoreUrl: `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`,
      marketUri: `market://details?id=${encodeURIComponent(pkg)}`,
    };

    this.registerApp(app);
  }

  /**
   * Registers or updates an app in the registry
   */
  public registerApp(app: InstalledApp): void {
    this.appRegistry.set(app.id, app);
    this.packageRegistry.set(app.packageName.toLowerCase(), app);

    const norm = app.normalizedName || this.normalizeAppName(app.name);
    this.aliasRegistry.set(norm, norm);

    for (const alias of app.aliases || []) {
      this.aliasRegistry.set(this.normalizeAppName(alias), norm);
    }
  }

  /**
   * Invalidate cached application list and refresh
   */
  public invalidateCache(): void {
    this.discoverNativeInstalledApps();
  }

  /**
   * Fetch all launchable installed applications
   */
  public async getLaunchableApps(forceRefresh = false): Promise<InstalledApp[]> {
    if (forceRefresh) {
      this.discoverNativeInstalledApps();
    }
    return Array.from(this.appRegistry.values()).filter(a => a.launchable);
  }

  /**
   * Resolves an app query to the best matching installed package
   */
  public resolveApp(appNameQuery: string): AppResolutionResult {
    const raw = (appNameQuery || '').trim();
    if (!raw) {
      return { matchedApp: null, isAmbiguous: false, ambiguousMatches: [], confidence: 0 };
    }

    this.discoverNativeInstalledApps();

    const clean = this.extractAppName(raw);
    const normalizedQuery = this.normalizeAppName(clean);

    // 1. Direct Package Name Match
    if (clean.includes('.')) {
      const byPkg = this.packageRegistry.get(clean.toLowerCase());
      if (byPkg) {
        return { matchedApp: byPkg, isAmbiguous: false, ambiguousMatches: [], confidence: 1.0 };
      }
    }

    // 2. Direct Normalized Name or Alias Match
    const canonicalKey = this.aliasRegistry.get(normalizedQuery);
    if (canonicalKey) {
      for (const app of this.appRegistry.values()) {
        if (app.normalizedName === canonicalKey || this.normalizeAppName(app.name) === canonicalKey) {
          return { matchedApp: app, isAmbiguous: false, ambiguousMatches: [], confidence: 1.0 };
        }
      }
    }

    // 3. Exact matching on name or aliases
    for (const app of this.appRegistry.values()) {
      if (app.normalizedName === normalizedQuery || this.normalizeAppName(app.name) === normalizedQuery) {
        return { matchedApp: app, isAmbiguous: false, ambiguousMatches: [], confidence: 0.98 };
      }

      for (const alias of app.aliases || []) {
        if (this.normalizeAppName(alias) === normalizedQuery) {
          return { matchedApp: app, isAmbiguous: false, ambiguousMatches: [], confidence: 0.95 };
        }
      }
    }

    // 4. Fuzzy & Substring Match Scoring
    const candidateMatches: { app: InstalledApp; score: number }[] = [];

    for (const app of this.appRegistry.values()) {
      let score = 0;
      const appNorm = app.normalizedName;

      if (appNorm.startsWith(normalizedQuery)) {
        score = Math.max(score, 90);
      } else if (appNorm.includes(normalizedQuery)) {
        score = Math.max(score, 75);
      } else if (normalizedQuery.includes(appNorm) && appNorm.length > 2) {
        score = Math.max(score, 70);
      }

      for (const alias of app.aliases || []) {
        const normAl = this.normalizeAppName(alias);
        if (normAl === normalizedQuery) {
          score = Math.max(score, 95);
        } else if (normAl.startsWith(normalizedQuery)) {
          score = Math.max(score, 85);
        } else if (normAl.includes(normalizedQuery)) {
          score = Math.max(score, 65);
        }
      }

      for (const kw of app.keywords || []) {
        const normKw = this.normalizeAppName(kw);
        if (normKw === normalizedQuery) {
          score = Math.max(score, 80);
        } else if (normKw.includes(normalizedQuery) || normalizedQuery.includes(normKw)) {
          score = Math.max(score, 60);
        }
      }

      if (score >= 60) {
        candidateMatches.push({ app, score });
      }
    }

    candidateMatches.sort((a, b) => b.score - a.score);

    if (candidateMatches.length === 0) {
      return { matchedApp: null, isAmbiguous: false, ambiguousMatches: [], confidence: 0 };
    }

    const top = candidateMatches[0];

    // Ambiguity detection
    if (candidateMatches.length > 1) {
      const second = candidateMatches[1];
      if (top.score < 88 && Math.abs(top.score - second.score) < 10) {
        const topMatches = candidateMatches.slice(0, 3).map(c => c.app);
        return {
          matchedApp: null,
          isAmbiguous: true,
          ambiguousMatches: topMatches,
          confidence: top.score / 100,
        };
      }
    }

    return {
      matchedApp: top.app,
      isAmbiguous: false,
      ambiguousMatches: [],
      confidence: top.score / 100,
    };
  }

  /**
   * Searches for installed applications matching query string
   */
  public searchApps(query: string): InstalledApp[] {
    if (!query || !query.trim()) return [];
    const normalized = this.normalizeAppName(query);
    const results: InstalledApp[] = [];
    const seen = new Set<string>();

    for (const app of this.appRegistry.values()) {
      if (app.normalizedName.includes(normalized) || app.keywords.some(k => k.includes(normalized))) {
        if (!seen.has(app.packageName)) {
          seen.add(app.packageName);
          results.push(app);
        }
      }
    }
    return results;
  }

  /**
   * Resolves an app name to its corresponding Android package name.
   */
  public async getPackageName(appNameQuery: string): Promise<string | null> {
    if (!appNameQuery || !appNameQuery.trim()) return null;
    const res = this.resolveApp(appNameQuery.trim());
    return res.matchedApp?.packageName || null;
  }

  /**
   * Generates Android launch intent structure with FLAG_ACTIVITY_NEW_TASK
   */
  public async getLaunchIntent(appNameOrPackage: string): Promise<LaunchIntentInfo | null> {
    if (!appNameOrPackage || !appNameOrPackage.trim()) return null;
    const clean = appNameOrPackage.trim();

    const res = this.resolveApp(clean);
    const targetApp = res.matchedApp;
    if (!targetApp) return null;

    const pkg = targetApp.packageName;
    const intentUrl = targetApp.scheme || `intent://#Intent;package=${encodeURIComponent(pkg)};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;launchFlags=0x10000000;end`;

    return {
      action: 'android.intent.action.MAIN',
      packageName: pkg,
      category: 'android.intent.category.LAUNCHER',
      flags: ['FLAG_ACTIVITY_NEW_TASK'],
      uri: targetApp.scheme,
      intentUrl,
    };
  }

  /**
   * Checks if an application or package is installed on device
   */
  public isInstalled(appNameOrPackage: string): boolean {
    if (!appNameOrPackage) return false;
    const clean = appNameOrPackage.trim();
    if (clean.includes('.')) {
      if (this.packageRegistry.has(clean.toLowerCase())) return true;
    }
    const res = this.resolveApp(clean);
    return Boolean(res.matchedApp);
  }

  /**
   * Complete Open App Action: Resolves application and performs launch.
   */
  public async openApp(appNameQuery: string): Promise<AppResolverResult> {
    const raw = (appNameQuery || '').trim();
    if (!raw) {
      return {
        success: false,
        appName: '',
        installed: false,
        error: 'Application name cannot be empty',
      };
    }

    const cleanQuery = this.extractAppName(raw) || raw;
    const res = this.resolveApp(cleanQuery);

    if (res.isAmbiguous && res.ambiguousMatches.length > 0) {
      return {
        success: false,
        appName: cleanQuery,
        installed: true,
        isAmbiguous: true,
        ambiguousMatches: res.ambiguousMatches.map(a => ({
          name: a.name,
          packageName: a.packageName,
        })),
        message: `Which app do you mean? I found ${res.ambiguousMatches.length} matching apps.`,
      };
    }

    if (!res.matchedApp) {
      const playStoreUrl = `https://play.google.com/store/search?q=${encodeURIComponent(cleanQuery)}&c=apps`;
      return {
        success: false,
        appName: cleanQuery,
        installed: false,
        launchable: false,
        playStoreUrl,
        message: `"${cleanQuery}" isn't installed on this device.`,
        error: `APP_NOT_INSTALLED: "${cleanQuery}" is not installed on this device.`,
      };
    }

    const app = res.matchedApp;
    const intentInfo = await this.getLaunchIntent(app.packageName);

    // Direct Intent / bridge launch
    if (typeof window !== 'undefined') {
      const isAndroid = /android/i.test(navigator.userAgent || '');
      if (isAndroid) {
        const intentUri = `intent://#Intent;package=${encodeURIComponent(app.packageName)};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;launchFlags=0x10000000;end`;
        try {
          window.location.href = intentUri;
        } catch {}
      }
    }

    return {
      success: true,
      appName: app.name,
      packageName: app.packageName,
      installed: true,
      launchable: true,
      launchIntent: intentInfo || undefined,
      message: `Opening ${app.name}...`,
    };
  }
}

export const appResolver = AppResolver.getInstance();
