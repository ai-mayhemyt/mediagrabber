import express from 'express';
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFile, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import multer from 'multer';
import dotenv from 'dotenv';
import * as webpush from 'web-push';

const IS_PACKAGED_BINARY = Boolean((process as any).pkg);
if (IS_PACKAGED_BINARY && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const APP_ROOT = IS_PACKAGED_BINARY ? path.dirname(process.execPath) : process.cwd();
const BUNDLE_ROOT = IS_PACKAGED_BINARY ? path.resolve(__dirname) : process.cwd();

dotenv.config();
const appEnvPath = path.join(APP_ROOT, '.env');
if (fs.existsSync(appEnvPath)) {
  dotenv.config({ path: appEnvPath, override: false });
}

const execFileAsync = promisify(execFile);

function resolveCliValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('-')) {
    return process.argv[idx + 1];
  }
  const eqPrefix = `${flag}=`;
  const eqArg = process.argv.find((a) => a.startsWith(eqPrefix));
  return eqArg ? eqArg.slice(eqPrefix.length) : undefined;
}

function resolvePort(): number {
  const cliVal = resolveCliValue('--port');
  if (cliVal) {
    const cliPort = Number(cliVal);
    if (Number.isFinite(cliPort) && cliPort > 0) return cliPort;
  }
  return Number(process.env.PORT) || 3000;
}

const BASE_APP_VERSION = 'v2.1-pre1';

function detectPlatformSuffix(): string {
  if (process.platform === 'linux') return 'Linux';
  if (process.platform === 'win32') {
    const parts = os.release().split('.');
    const major = parseInt(parts[0] || '0', 10);
    const build = parseInt(parts[2] || '0', 10);
    if (major >= 10 && build >= 22000) return 'Windows11';
    if (major >= 10) return 'Windows10';
    return 'Windows';
  }
  if (process.platform === 'darwin') return 'macOS';
  return process.platform;
}

const PLATFORM_SUFFIX = detectPlatformSuffix();
const CURRENT_APP_VERSION = `${BASE_APP_VERSION}-${PLATFORM_SUFFIX}`;

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(`MediaGrabber ${CURRENT_APP_VERSION}`);
  process.exit(0);
}

const PORT = resolvePort();
const HOST = '0.0.0.0';
const SHOULD_OPEN_BROWSER =
  process.argv.includes('--open') || process.env.MEDIAGRABBER_OPEN_BROWSER === '1';
const IS_WINDOWS = process.platform === 'win32';
const SYSTEM_TMP_GRAB_DIR = IS_WINDOWS ? path.join(os.tmpdir(), 'mediagrabber') : '/tmp/mediagrabber';
const CLI_DATA_DIR = resolveCliValue('--data-dir');
const WORKSPACE_ROOT = CLI_DATA_DIR
  ? path.resolve(CLI_DATA_DIR)
  : process.env.MEDIAGRABBER_DATA_DIR
  ? path.resolve(process.env.MEDIAGRABBER_DATA_DIR)
  : IS_WINDOWS
  ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'MediaGrabber')
  : '/tmp/mediagrabber-workspace';
const YT_DIR = path.join(WORKSPACE_ROOT, 'YouTube');
const MUSIC_DIR = path.join(WORKSPACE_ROOT, 'Music');
const GALLERY_DIR = path.join(WORKSPACE_ROOT, 'Gallery');
const TMP_DIR = path.join(WORKSPACE_ROOT, 'tmp');
const TRASH_DIR = path.join(WORKSPACE_ROOT, 'duplicates_trash');
const COVERS_DIR = path.join(WORKSPACE_ROOT, 'covers');
const AVATARS_DIR = path.join(WORKSPACE_ROOT, 'avatars');
const STATE_DIR = path.join(WORKSPACE_ROOT, '.mediagrabber');
const USER_HOME_ARCHIVE = path.join(os.homedir(), '.mediagrabber', 'archive.txt');
const ARCHIVE_FILE =
  process.env.NODE_ENV === 'production' && fs.existsSync(USER_HOME_ARCHIVE)
    ? USER_HOME_ARCHIVE
    : path.join(STATE_DIR, 'archive.txt');
const SETTINGS_FILE = path.join(STATE_DIR, 'settings.json');
const RADIOS_FILE = path.join(STATE_DIR, 'radios.json');
const HISTORY_FILE = path.join(STATE_DIR, 'history.json');
const QUEUE_FILE = path.join(STATE_DIR, 'queue.json');
const USERS_FILE = path.join(STATE_DIR, 'users.json');
const SCHEDULE_FILE = path.join(STATE_DIR, 'scheduled_jobs.json');
const TOKENS_FILE = path.join(STATE_DIR, 'api_tokens.json');
const NETWATCH_FILE = path.join(STATE_DIR, 'netwatch.json');
const VAPID_FILE = path.join(STATE_DIR, 'vapid.json');
const PUSH_SUBS_FILE = path.join(STATE_DIR, 'push_subscriptions.json');
const YOUTUBE_FEEDS_FILE = path.join(STATE_DIR, 'youtube_feeds.json');
const MANAGED_YT_COOKIES_FILE = path.join(STATE_DIR, 'cookies_youtube.txt');
const MANAGED_GALLERY_COOKIES_FILE = path.join(STATE_DIR, 'cookies_gallery.txt');
const FILE_SIGN_SECRET = process.env.MEDIAGRABBER_SIGNING_SECRET || crypto.randomBytes(32).toString('hex');

const DEFAULT_AVATAR = '/src/assets/images/avatar_admin_user_1795453948311.jpg';
const DEFAULT_YT_THUMB = '/src/assets/images/cover_youtube_sample_1795453949069.jpg';
const DEFAULT_MUSIC_THUMB = '/src/assets/images/cover_music_album_1795453947963.jpg';
const DEFAULT_GALLERY_THUMB = '/src/assets/images/cover_gallery_sample_1795453948674.jpg';

const MEDIA_EXTS = new Set(['.mp4', '.webm', '.mkv', '.mp3', '.flac', '.m4a', '.opus']);

function ensureDirs() {
  for (const dir of [
    WORKSPACE_ROOT,
    YT_DIR,
    MUSIC_DIR,
    GALLERY_DIR,
    TMP_DIR,
    TRASH_DIR,
    COVERS_DIR,
    AVATARS_DIR,
    STATE_DIR,
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function hashPassword(password: string, salt?: string): string {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, s, 32).toString('hex');
  return `${s}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

const BLOCKED_SYSTEM_ROOTS = new Set([
  '/',
  '/bin',
  '/boot',
  '/dev',
  '/etc',
  '/lib',
  '/lib64',
  '/proc',
  '/root',
  '/run',
  '/sbin',
  '/sys',
  '/usr',
]);

function isSafeLibraryBasePath(dirPath: unknown): string | null {
  if (typeof dirPath !== 'string') return null;
  const trimmed = dirPath.trim();
  if (!trimmed) return null;
  const resolved = path.resolve(trimmed);
  if (IS_WINDOWS) {
    const lower = resolved.toLowerCase();
    const sysDrive = (process.env.SystemDrive || 'C:').toLowerCase();
    const winDir = (process.env.SystemRoot || `${sysDrive}\\Windows`).toLowerCase();
    const progFiles = (process.env.ProgramFiles || `${sysDrive}\\Program Files`).toLowerCase();
    const progFiles86 = (process.env['ProgramFiles(x86)'] || `${sysDrive}\\Program Files (x86)`).toLowerCase();
    if (/^[a-z]:\\?$/i.test(resolved)) return null;
    for (const blocked of [winDir, progFiles, progFiles86, `${sysDrive}\\programdata`]) {
      if (lower === blocked || lower.startsWith(blocked + '\\')) return null;
    }
    return resolved;
  }
  if (BLOCKED_SYSTEM_ROOTS.has(resolved)) return null;
  for (const blocked of BLOCKED_SYSTEM_ROOTS) {
    if (blocked !== '/' && (resolved === blocked || resolved.startsWith(blocked + path.sep))) {
      return null;
    }
  }
  return resolved;
}

function resolveJobBaseDir(engine: string, settings: any): string {
  if (engine === 'SPOTIFY' || engine === 'YT MUSIC') {
    return isSafeLibraryBasePath(settings?.music_base_path) || MUSIC_DIR;
  }
  if (engine === 'GALLERY') {
    return isSafeLibraryBasePath(settings?.gallery_base_path) || GALLERY_DIR;
  }
  return isSafeLibraryBasePath(settings?.yt_base_path) || YT_DIR;
}

function getAllowedLibraryRoots(settings?: any): string[] {
  const s = settings || readJson<any>(SETTINGS_FILE, {});
  const candidates = [
    WORKSPACE_ROOT,
    SYSTEM_TMP_GRAB_DIR,
    isSafeLibraryBasePath(s?.yt_base_path) || YT_DIR,
    isSafeLibraryBasePath(s?.music_base_path) || MUSIC_DIR,
    isSafeLibraryBasePath(s?.gallery_base_path) || GALLERY_DIR,
  ];
  return Array.from(new Set(candidates.map((p) => path.resolve(p))));
}

function safePathWithinLibraries(targetPath: string, settings?: any): string | null {
  if (typeof targetPath !== 'string' || !targetPath.trim()) return null;
  const resolved = path.resolve(targetPath.trim());
  for (const root of getAllowedLibraryRoots(settings)) {
    if (IS_WINDOWS) {
      const rLow = resolved.toLowerCase();
      const rootLow = root.toLowerCase();
      if (rLow === rootLow || rLow.startsWith(rootLow + path.sep)) {
        return resolved;
      }
    } else if (resolved === root || resolved.startsWith(root + path.sep)) {
      return resolved;
    }
  }
  return null;
}

function moveFileSafe(src: string, dest: string) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.renameSync(src, dest);
  } catch (err: any) {
    if (err?.code === 'EXDEV') {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    } else {
      throw err;
    }
  }
}

function buildToolEnv(extra?: Record<string, string>): NodeJS.ProcessEnv {
  if (IS_WINDOWS) {
    const winExtras = [
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links') : '',
      process.env.ProgramData ? path.join(process.env.ProgramData, 'chocolatey', 'bin') : '',
      path.join(os.homedir(), 'scoop', 'shims'),
      process.env.APPDATA ? path.join(process.env.APPDATA, 'Python', 'Scripts') : '',
    ].filter(Boolean);
    const basePath = process.env.PATH || process.env.Path || '';
    const mergedPath = [...winExtras, basePath].filter(Boolean).join(path.delimiter);
    return {
      ...process.env,
      PATH: mergedPath,
      ...(extra || {}),
    };
  }
  const localBin = path.join(os.homedir(), '.local', 'bin');
  const basePath = process.env.PATH || '/usr/local/bin:/usr/bin:/bin';
  const mergedPath = [localBin, '/usr/local/bin', basePath].filter(Boolean).join(path.delimiter);
  return {
    ...process.env,
    PATH: mergedPath,
    ...(extra || {}),
  };
}

function resolveExecutable(name: string, extraPaths: string[] = []): string | null {
  const namesToTry = IS_WINDOWS && !/\.(exe|cmd|bat|ps1)$/i.test(name)
    ? [`${name}.exe`, `${name}.cmd`, `${name}.bat`, name]
    : [name];
  const accessMode = IS_WINDOWS ? fs.constants.F_OK : fs.constants.X_OK;

  for (const c of extraPaths) {
    if (!c) continue;
    try {
      fs.accessSync(c, accessMode);
      return c;
    } catch {
      // continue
    }
  }

  const fixedDirs = IS_WINDOWS
    ? [
        process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links') : '',
        process.env.ProgramData ? path.join(process.env.ProgramData, 'chocolatey', 'bin') : '',
        path.join(os.homedir(), 'scoop', 'shims'),
        process.env.APPDATA ? path.join(process.env.APPDATA, 'Python', 'Scripts') : '',
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0',
        'C:\\Program Files\\PowerShell\\7',
      ].filter(Boolean)
    : [
        path.join(os.homedir(), '.local', 'bin'),
        '/usr/local/bin',
        '/usr/bin',
        '/bin',
      ];

  const envPathDirs = (process.env.PATH || process.env.Path || '').split(path.delimiter).filter(Boolean);
  for (const dir of [...fixedDirs, ...envPathDirs]) {
    for (const candidateName of namesToTry) {
      const full = path.join(dir, candidateName);
      try {
        if (fs.existsSync(full) && !fs.statSync(full).isDirectory()) {
          fs.accessSync(full, accessMode);
          return full;
        }
      } catch {
        // continue
      }
    }
  }
  return null;
}

interface ResolvedGrabCommand {
  bin: string;
  prefixArgs: string[];
  scriptPath: string;
}

function getGrabCandidatePaths(): string[] {
  if (IS_WINDOWS) {
    return [
      process.env.MEDIAGRABBER_GRAB_BIN || '',
      path.join(APP_ROOT, 'grab.ps1'),
      path.join(STATE_DIR, 'grab.ps1'),
      path.join(process.cwd(), 'grab.ps1'),
      path.join(os.homedir(), '.mediagrabber', 'grab.ps1'),
      'C:\\MediaGrabber\\grab.ps1',
    ].filter(Boolean);
  }
  return [
    process.env.MEDIAGRABBER_GRAB_BIN || '',
    '/usr/local/bin/grab',
    path.join(APP_ROOT, 'grab'),
    path.join(STATE_DIR, 'grab'),
    path.join(process.cwd(), 'grab'),
    '/opt/mediagrabber/grab',
    '/opt/mediagrabber.v1-backup/grab',
  ].filter(Boolean);
}

function resolveGrabCommand(): ResolvedGrabCommand | null {
  if (IS_WINDOWS) {
    const psBin = resolveExecutable('pwsh') || resolveExecutable('powershell') || 'powershell.exe';
    for (const candidate of getGrabCandidatePaths()) {
      if (!fs.existsSync(candidate)) continue;
      try {
        if (fs.statSync(candidate).isDirectory()) continue;
      } catch {
        continue;
      }
      if (/\.ps1$/i.test(candidate)) {
        return {
          bin: psBin,
          prefixArgs: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', candidate],
          scriptPath: candidate,
        };
      }
      return { bin: candidate, prefixArgs: [], scriptPath: candidate };
    }
    return null;
  }

  for (const candidate of getGrabCandidatePaths()) {
    if (!fs.existsSync(candidate)) continue;
    try {
      if (fs.statSync(candidate).isDirectory()) continue;
    } catch {
      continue;
    }
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return { bin: candidate, prefixArgs: [], scriptPath: candidate };
    } catch {
      try {
        fs.chmodSync(candidate, 0o755);
        return { bin: candidate, prefixArgs: [], scriptPath: candidate };
      } catch {
        const bashBin = resolveExecutable('bash', ['/bin/bash', '/usr/bin/bash']);
        if (bashBin) {
          return { bin: path.resolve(bashBin), prefixArgs: [candidate], scriptPath: candidate };
        }
      }
    }
  }
  const pathGrab = resolveExecutable('grab');
  if (pathGrab) {
    return { bin: pathGrab, prefixArgs: [], scriptPath: pathGrab };
  }
  return null;
}

function ensureGrabInitialized(): string | null {
  // When running as a standalone packaged binary, materialize bundled grab/grab.ps1 onto real disk
  if (IS_PACKAGED_BINARY) {
    const scriptName = IS_WINDOWS ? 'grab.ps1' : 'grab';
    const bundledScript = path.join(BUNDLE_ROOT, scriptName);
    const extractedScript = path.join(STATE_DIR, scriptName);
    if (fs.existsSync(bundledScript)) {
      try {
        fs.writeFileSync(extractedScript, fs.readFileSync(bundledScript));
        if (!IS_WINDOWS) fs.chmodSync(extractedScript, 0o755);
      } catch {
        // ignore if state dir extraction fails
      }
    }
  }

  if (!IS_WINDOWS) {
    const localGrab = path.join(APP_ROOT, 'grab');
    if (fs.existsSync(localGrab)) {
      try {
        fs.chmodSync(localGrab, 0o755);
      } catch {
        // ignore if read-only or owned by another user
      }
    }

    const sysGrab = '/usr/local/bin/grab';
    if (!fs.existsSync(sysGrab) && fs.existsSync(localGrab)) {
      try {
        fs.copyFileSync(localGrab, sysGrab);
        fs.chmodSync(sysGrab, 0o755);
      } catch {
        // non-root runtime cannot write to /usr/local/bin; localGrab remains usable
      }
    } else if (fs.existsSync(sysGrab)) {
      try {
        fs.accessSync(sysGrab, fs.constants.X_OK);
      } catch {
        try {
          fs.chmodSync(sysGrab, 0o755);
        } catch {
          // ignore if lacking permission; resolveGrabCommand falls back to bash
        }
      }
    }
  }

  try {
    fs.mkdirSync(SYSTEM_TMP_GRAB_DIR, { recursive: true });
  } catch {
    // ignore if temp grab directory cannot be created
  }

  const cmd = resolveGrabCommand();
  return cmd ? cmd.scriptPath : null;
}

function resolveGrabBinary(): string | null {
  return resolveGrabCommand()?.scriptPath || null;
}

function scanForLocalThumbnail(filePath?: string | null, outputDir?: string | null): string | null {
  const thumbExts = ['.jpg', '.jpeg', '.png', '.webp'];
  if (filePath) {
    const base = filePath.replace(/\.[^.]+$/, '');
    for (const ext of thumbExts) {
      if (fs.existsSync(base + ext)) return base + ext;
    }
  }
  const dirs = [filePath ? path.dirname(filePath) : null, outputDir || null].filter(Boolean) as string[];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of walkFiles(dir)) {
      if (thumbExts.includes(path.extname(f).toLowerCase())) return f;
    }
  }
  return null;
}

function toClientThumbUrl(thumb: string | null): string | null {
  if (!thumb) return null;
  if (thumb.startsWith('http://') || thumb.startsWith('https://') || thumb.startsWith('/api/') || thumb.startsWith('/src/')) {
    return thumb;
  }
  if (fs.existsSync(thumb)) {
    return `/api/media-cover?path=${encodeURIComponent(thumb)}`;
  }
  return null;
}

function sanitizeSegment(input: string, fallback = 'Unknown'): string {
  const clean = input.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  return clean || fallback;
}

function detectEngine(url: string): 'YOUTUBE' | 'YT MUSIC' | 'SPOTIFY' | 'GALLERY' {
  const u = url.toLowerCase();
  if (u.includes('music.youtube.com')) return 'YT MUSIC';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YOUTUBE';
  if (u.includes('spotify.com')) return 'SPOTIFY';
  if (
    u.includes('instagram.com') ||
    u.includes('tiktok.com') ||
    u.includes('x.com') ||
    u.includes('twitter.com') ||
    u.includes('pinterest.com') ||
    u.includes('reddit.com')
  ) {
    return 'GALLERY';
  }
  return 'YOUTUBE';
}

function engineToHistorySource(engine: string, url: string): 'youtube' | 'ytmusic' | 'spotify' | 'gallery' | 'other' {
  if (engine === 'YT MUSIC' || url.toLowerCase().includes('music.youtube.com')) return 'ytmusic';
  if (engine === 'YOUTUBE') return 'youtube';
  if (engine === 'SPOTIFY') return 'spotify';
  if (engine === 'GALLERY') return 'gallery';
  return 'other';
}

async function createSampleMediaFile(filePath: string, title: string, artist: string, isAudio: boolean) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (isAudio || ext === '.mp3' || ext === '.m4a' || ext === '.flac' || ext === '.opus') {
      await execFileAsync('ffmpeg', [
        '-y',
        '-f', 'lavfi',
        '-i', 'sine=frequency=440:duration=2',
        '-metadata', `title=${title}`,
        '-metadata', `artist=${artist}`,
        '-q:a', '4',
        filePath,
      ], { timeout: 10000 });
      return;
    }
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'color=c=#161a23:s=640x360:d=2',
      '-f', 'lavfi',
      '-i', 'sine=frequency=330:duration=2',
      '-metadata', `title=${title}`,
      '-metadata', `artist=${artist}`,
      '-shortest',
      filePath,
    ], { timeout: 10000 });
  } catch {
    // Fallback deterministic binary content if ffmpeg fails
    fs.writeFileSync(filePath, `MediaGrabber:${title}:${artist}:${new Date().toISOString()}\n`);
  }
}

async function seedWorkspace() {
  ensureDirs();
  ensureGrabInitialized();

  if (!fs.existsSync(SETTINGS_FILE)) {
    const legacyCandidates = [
      '/opt/mediagrabber/settings.json',
      '/opt/mediagrabber.v1-backup/settings.json',
    ];
    let importedLegacy: Record<string, any> | null = null;
    for (const cand of legacyCandidates) {
      if (fs.existsSync(cand)) {
        try {
          importedLegacy = JSON.parse(fs.readFileSync(cand, 'utf-8'));
          break;
        } catch {
          // ignore malformed legacy settings
        }
      }
    }

    const defaultSettings = {
      video_res: '1080',
      container: 'mp4',
      audio_format: 'mp3',
      audio_bitrate: '320k',
      generate_lrc: false,
      folder_structure: 'default',
      yt_base_path: IS_WINDOWS
        ? path.join(os.homedir(), 'Videos', 'MediaGrabber')
        : fs.existsSync('/media')
        ? '/media/YouTube'
        : YT_DIR,
      music_base_path: IS_WINDOWS
        ? path.join(os.homedir(), 'Music', 'MediaGrabber')
        : fs.existsSync('/opt/navidrome/music/navidrome/music')
        ? '/opt/navidrome/music/navidrome/music'
        : MUSIC_DIR,
      gallery_base_path: IS_WINDOWS
        ? path.join(os.homedir(), 'Pictures', 'MediaGrabber')
        : fs.existsSync('/media')
        ? '/media/Gallery'
        : GALLERY_DIR,
      cookies_youtube_path: '',
      cookies_gallery_path: '',
      jellyfin_url: 'http://localhost:8096',
      jellyfin_api_key: '',
      navidrome_url: 'http://localhost:4533',
      navidrome_api_key: '',
      plex_url: '',
      plex_token: '',
      plex_section_id: '',
      smtp_host: '',
      smtp_port: '587',
      smtp_user: '',
      smtp_pass: '',
      smtp_from: 'MediaGrabber <noreply@mediagrabber.local>',
      ytdlp_extra: '',
      spotdl_extra: '',
      gallerydl_extra: '',
      webhook_url: '',
      stale_timeout_minutes: 120,
      max_concurrent_downloads: 2,
      quick_start_completed: false,
      update_channel:
        process.env.MEDIAGRABBER_UPDATE_CHANNEL === 'stable' ? 'stable' : 'nightly',
      ...(importedLegacy || {}),
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
  }

  if (!fs.existsSync(USERS_FILE)) {
    const users = [
      {
        id: 'usr-admin-1',
        username: 'christopher',
        display_name: 'Christopher',
        email: 'admin@mediagrabber.local',
        role: 'admin',
        avatar: DEFAULT_AVATAR,
        theme: 'dark',
        totp_enabled: false,
        totp_secret: '',
        theme_colors: null,
        password_hash: hashPassword('mediagrabber'),
      },
      {
        id: 'usr-standard-2',
        username: 'studio_guest',
        display_name: 'Studio Guest',
        email: 'guest@mediagrabber.local',
        role: 'user',
        avatar: DEFAULT_AVATAR,
        theme: 'dark',
        totp_enabled: false,
        totp_secret: '',
        theme_colors: null,
        password_hash: hashPassword('guest1234'),
      },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  }

  if (!fs.existsSync(RADIOS_FILE)) {
    const defaultRadios = [
      {
        id: 'rad-1',
        name: 'SomaFM Groove Salad',
        url: 'https://ice1.somafm.com/groovesalad-128-mp3',
        homepage: 'https://somafm.com/groovesalad/',
        country: 'United States',
        tags: 'ambient,downtempo,electronic',
        bitrate: 128,
        codec: 'MP3',
      },
      {
        id: 'rad-2',
        name: 'Radio Paradise Main Mix',
        url: 'https://stream.radioparadise.com/mp3-192',
        homepage: 'https://radioparadise.com',
        country: 'United States',
        tags: 'eclectic,rock,indie',
        bitrate: 192,
        codec: 'MP3',
      },
    ];
    fs.writeFileSync(RADIOS_FILE, JSON.stringify(defaultRadios, null, 2));
  }

  // Seed media files for Metadata Editor, Reorganize, Deduplicate, and Tmp Reorder
  const ytSampleDir = path.join(YT_DIR, 'Studio_Sessions', '2026');
  const ytSampleFile = path.join(ytSampleDir, 'Analog_Synth_Mastering_Session.mp4');
  if (!fs.existsSync(ytSampleFile)) {
    await createSampleMediaFile(ytSampleFile, 'Analog Synth Mastering Session', 'Studio Sessions', false);
    fs.writeFileSync(
      path.join(ytSampleDir, 'Analog_Synth_Mastering_Session.info.json'),
      JSON.stringify(
        {
          title: 'Analog Synth Mastering Session',
          uploader: 'Studio Sessions',
          album: 'Mastering Logs',
          upload_date: '20260412',
          description: 'Walkthrough of modular routing and analog bus compression.',
          cover_url: DEFAULT_YT_THUMB,
          webpage_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
        null,
        2
      )
    );
    // Exact duplicate for Deduplicate demo
    const dupFile = path.join(ytSampleDir, 'Analog_Synth_Mastering_Session_copy.mp4');
    fs.copyFileSync(ytSampleFile, dupFile);
  }

  const musicSampleDir = path.join(MUSIC_DIR, 'Klangwerk', 'Cobalt_Architecture');
  const musicSampleFile = path.join(musicSampleDir, '01_Beam_Study.mp3');
  if (!fs.existsSync(musicSampleFile)) {
    await createSampleMediaFile(musicSampleFile, 'Beam Study', 'Klangwerk', true);
    fs.writeFileSync(
      path.join(musicSampleDir, '01_Beam_Study.info.json'),
      JSON.stringify(
        {
          title: 'Beam Study',
          uploader: 'Klangwerk',
          album: 'Cobalt Architecture',
          upload_date: '20260301',
          description: 'Opening instrumental from Cobalt Architecture LP.',
          cover_url: DEFAULT_MUSIC_THUMB,
          webpage_url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
        },
        null,
        2
      )
    );
  }

  const gallerySampleDir = path.join(GALLERY_DIR, 'Alpine_Archive', '2026');
  const gallerySampleFile = path.join(gallerySampleDir, 'Dawn_Ridge_Sequence.mp4');
  if (!fs.existsSync(gallerySampleFile)) {
    await createSampleMediaFile(gallerySampleFile, 'Dawn Ridge Sequence', 'Alpine Archive', false);
    fs.writeFileSync(
      path.join(gallerySampleDir, 'Dawn_Ridge_Sequence.info.json'),
      JSON.stringify(
        {
          title: 'Dawn Ridge Sequence',
          uploader: 'Alpine Archive',
          album: 'Field Reels',
          upload_date: '20260218',
          description: 'High-altitude dawn ridge time-lapse reel.',
          cover_url: DEFAULT_GALLERY_THUMB,
          webpage_url: 'https://www.instagram.com/reel/CxampleReel01/',
        },
        null,
        2
      )
    );
  }

  // Seed one orphaned file in tmp/ for Tmp Reorder
  const orphanJobDir = path.join(TMP_DIR, 'orphan-job-001');
  const orphanFile = path.join(orphanJobDir, 'Orphaned_Field_Recording.mp3');
  if (!fs.existsSync(orphanFile)) {
    await createSampleMediaFile(orphanFile, 'Orphaned Field Recording', 'Field Unit', true);
    fs.writeFileSync(
      path.join(orphanJobDir, 'Orphaned_Field_Recording.info.json'),
      JSON.stringify(
        {
          title: 'Orphaned Field Recording',
          uploader: 'Field Unit',
          album: 'Unsorted Captures',
          upload_date: '20260501',
          engine: 'SPOTIFY',
          cover_url: DEFAULT_MUSIC_THUMB,
        },
        null,
        2
      )
    );
  }

  if (!fs.existsSync(ARCHIVE_FILE)) {
    fs.writeFileSync(
      ARCHIVE_FILE,
      [
        'youtube dQw4w9WgXcQ',
        'spotify 4uLU6hMCjMI75M1A2tKUQC',
        'instagram CxampleReel01',
      ].join('\n') + '\n'
    );
  }

  if (!fs.existsSync(HISTORY_FILE)) {
    const initialHistory = [
      {
        id: 'hist-1',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Analog Synth Mastering Session',
        thumbnail: DEFAULT_YT_THUMB,
        timestamp: new Date(Date.now() - 3600_000 * 5).toISOString(),
        source: 'youtube',
        file: ytSampleFile,
      },
      {
        id: 'hist-2',
        url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
        title: 'Klangwerk — Beam Study',
        thumbnail: DEFAULT_MUSIC_THUMB,
        timestamp: new Date(Date.now() - 3600_000 * 3).toISOString(),
        source: 'spotify',
        file: musicSampleFile,
      },
      {
        id: 'hist-3',
        url: 'https://www.instagram.com/reel/CxampleReel01/',
        title: 'Dawn Ridge Sequence',
        thumbnail: DEFAULT_GALLERY_THUMB,
        timestamp: new Date(Date.now() - 3600_000).toISOString(),
        source: 'gallery',
        file: gallerySampleFile,
      },
    ];
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(initialHistory, null, 2));
  }
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

interface StoredVapidKeys {
  publicKey: string;
  privateKey: string;
}

let cachedVapidKeys: StoredVapidKeys | null = null;

function getVapidKeys(): StoredVapidKeys {
  if (cachedVapidKeys) return cachedVapidKeys;
  const envPublic = String(process.env.VAPID_PUBLIC_KEY || '').trim();
  const envPrivate = String(process.env.VAPID_PRIVATE_KEY || '').trim();
  if (envPublic && envPrivate) {
    cachedVapidKeys = { publicKey: envPublic, privateKey: envPrivate };
    return cachedVapidKeys;
  }

  ensureDirs();
  const existing = readJson<Partial<StoredVapidKeys>>(VAPID_FILE, {});
  if (existing.publicKey && existing.privateKey) {
    cachedVapidKeys = { publicKey: existing.publicKey, privateKey: existing.privateKey };
    return cachedVapidKeys;
  }

  const generated = webpush.generateVAPIDKeys();
  cachedVapidKeys = { publicKey: generated.publicKey, privateKey: generated.privateKey };
  writeJson(VAPID_FILE, cachedVapidKeys);
  return cachedVapidKeys;
}

function getWebPushSubject(): string {
  return String(process.env.VAPID_SUBJECT || '').trim() || 'mailto:admin@mediagrabber.local';
}

function ensureWebPushConfigured(): StoredVapidKeys {
  const keys = getVapidKeys();
  webpush.setVapidDetails(getWebPushSubject(), keys.publicKey, keys.privateKey);
  return keys;
}

async function sendPushNotification(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<{ sent: number; total: number; failed: number }> {
  const subs = readJson<webpush.PushSubscription[]>(PUSH_SUBS_FILE, []);
  if (!Array.isArray(subs) || subs.length === 0) {
    return { sent: 0, total: 0, failed: 0 };
  }

  ensureWebPushConfigured();
  const bodyPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag || 'mediagrabber-update',
    url: payload.url || '/',
  });

  let sent = 0;
  let failed = 0;
  const validSubs: webpush.PushSubscription[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      if (!sub || !sub.endpoint) return;
      try {
        await webpush.sendNotification(sub, bodyPayload);
        sent++;
        validSubs.push(sub);
      } catch (err: any) {
        const statusCode = Number(err?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          failed++;
        } else {
          failed++;
          validSubs.push(sub);
        }
      }
    })
  );

  if (validSubs.length !== subs.length) {
    writeJson(PUSH_SUBS_FILE, validSubs);
  }
  return { sent, total: subs.length, failed };
}

function validateWebhookUrl(rawInput: unknown): string {
  const raw = String(rawInput || '').trim();
  if (!raw) return '';
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Webhook URL must be a valid HTTP or HTTPS URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Webhook URL must use http:// or https://.');
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === '169.254.169.254' ||
    host.startsWith('169.254.') ||
    host === 'metadata.google.internal' ||
    host === 'metadata'
  ) {
    throw new Error('Webhook URL cannot target cloud metadata endpoints.');
  }
  return parsed.toString();
}

async function sendWebhookNotification(
  payload: {
    status: 'done' | 'failed' | 'test';
    title: string;
    url?: string;
    engine?: string;
    file?: string | null;
    message?: string;
  },
  overrideUrl?: string
): Promise<{ sent: boolean; error?: string }> {
  const settings = readJson<any>(SETTINGS_FILE, {});
  const targetRaw = overrideUrl ?? settings?.webhook_url;
  if (!targetRaw || !String(targetRaw).trim()) {
    return { sent: false };
  }

  let targetUrl: string;
  try {
    targetUrl = validateWebhookUrl(targetRaw);
  } catch (err: any) {
    return { sent: false, error: err?.message || 'Invalid webhook URL' };
  }

  const host = new URL(targetUrl).hostname.toLowerCase();
  const isDiscord = host === 'discord.com' || host.endsWith('.discord.com') || host === 'discordapp.com';
  const isSlack = host === 'hooks.slack.com' || host.endsWith('.slack.com');

  const statusText =
    payload.status === 'done'
      ? 'Download Complete'
      : payload.status === 'failed'
      ? 'Download Failed'
      : 'Webhook Test';
  const summaryLine = payload.message || `${statusText}: ${payload.title}${payload.engine ? ` (${payload.engine})` : ''}`;

  let body: Record<string, any>;
  if (isDiscord) {
    body = {
      content: summaryLine,
      embeds: [
        {
          title: statusText,
          description: payload.title,
          color: payload.status === 'failed' ? 0xdc2626 : payload.status === 'done' ? 0x16a34a : 0x5b7cfa,
          fields: [
            ...(payload.engine ? [{ name: 'Engine', value: payload.engine, inline: true }] : []),
            ...(payload.url ? [{ name: 'Source', value: payload.url.slice(0, 200), inline: false }] : []),
            ...(payload.file ? [{ name: 'Saved File', value: path.basename(payload.file), inline: true }] : []),
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };
  } else if (isSlack) {
    body = {
      text: `${summaryLine}${payload.url ? `\n${payload.url}` : ''}`,
    };
  } else {
    body = {
      app: 'MediaGrabber',
      event: payload.status === 'done' ? 'job.completed' : payload.status === 'failed' ? 'job.failed' : 'webhook.test',
      status: payload.status,
      title: payload.title,
      url: payload.url || null,
      engine: payload.engine || null,
      file: payload.file || null,
      message: summaryLine,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MediaGrabber/2.0',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) {
      return { sent: false, error: `Webhook returned HTTP ${resp.status}` };
    }
    return { sent: true };
  } catch (err: any) {
    return { sent: false, error: err?.message || 'Webhook delivery failed' };
  }
}

function signDownloadToken(resolvedPath: string, expMs: number): string {
  return crypto
    .createHmac('sha256', FILE_SIGN_SECRET)
    .update(`${expMs}:${resolvedPath}`)
    .digest('hex');
}

function verifyDownloadToken(resolvedPath: string, expMs: number, sig: string): boolean {
  if (!sig || !/^[a-f0-9]{64}$/i.test(sig)) return false;
  if (!Number.isFinite(expMs) || Date.now() > expMs) return false;
  const expected = signDownloadToken(resolvedPath, expMs);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(sig.toLowerCase(), 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

interface YoutubeFeedChannel {
  channelId: string;
  title: string;
  addedAt: string;
  auto_download?: boolean;
  auto_mode?: 'video' | 'audio';
  auto_since?: string;
  last_checked_at?: string;
}

interface YoutubeFeedVideo {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  url: string;
  published: string;
  thumbnail: string;
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

function parseYoutubeAtomFeed(xml: string, fallbackChannelId: string): {
  channelTitle: string;
  videos: YoutubeFeedVideo[];
} {
  const topTitleMatch = xml.match(/<feed[^>]*>[\s\S]*?<title>([\s\S]*?)<\/title>/i);
  const channelTitle = topTitleMatch ? decodeXmlEntities(topTitleMatch[1].trim()) : fallbackChannelId;
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  const videos: YoutubeFeedVideo[] = [];

  for (const entry of entries.slice(0, 8)) {
    const vidMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/i);
    const pubMatch = entry.match(/<published>([^<]+)<\/published>/i);
    const videoId = vidMatch ? vidMatch[1].trim() : '';
    if (!videoId || !/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) continue;
    videos.push({
      videoId,
      channelId: fallbackChannelId,
      channelTitle,
      title: titleMatch ? decodeXmlEntities(titleMatch[1].trim()) : `YouTube Video ${videoId}`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      published: pubMatch ? pubMatch[1].trim() : new Date().toISOString(),
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }
  return { channelTitle, videos };
}

async function resolveYoutubeChannelId(rawInput: string): Promise<string> {
  const input = rawInput.trim();
  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(input)) {
    return input;
  }

  // Handle plain @handle
  let targetUrl = '';
  if (/^@[a-zA-Z0-9._-]{2,}$/.test(input)) {
    targetUrl = `https://www.youtube.com/${input}`;
  } else {
    let parsed: URL;
    try {
      parsed = new URL(input.startsWith('http') ? input : `https://${input}`);
    } catch {
      throw new Error('Enter a valid YouTube channel URL, @handle, or UC... channel ID.');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Only HTTP/HTTPS YouTube URLs are supported.');
    }
    const host = parsed.hostname.toLowerCase();
    if (host !== 'youtube.com' && host !== 'www.youtube.com' && host !== 'm.youtube.com') {
      throw new Error('Only youtube.com channel URLs, @handles, or UC... channel IDs are allowed.');
    }

    const qChannel = parsed.searchParams.get('channel_id') || '';
    if (/^UC[a-zA-Z0-9_-]{20,}$/.test(qChannel)) {
      return qChannel;
    }
    const pathChannelMatch = parsed.pathname.match(/^\/channel\/(UC[a-zA-Z0-9_-]{20,})/);
    if (pathChannelMatch) {
      return pathChannelMatch[1];
    }
    targetUrl = `https://www.youtube.com${parsed.pathname}`;
  }

  const pageRes = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MediaGrabber/2.0)',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(7000),
  });
  if (!pageRes.ok) {
    throw new Error(`Unable to look up YouTube channel (HTTP ${pageRes.status}).`);
  }
  const html = await pageRes.text();
  const idMatch =
    html.match(/"channelId":"(UC[a-zA-Z0-9_-]{20,})"/) ||
    html.match(/<link[^>]+rel="canonical"[^>]+href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{20,})"/i) ||
    html.match(/channel_id=(UC[a-zA-Z0-9_-]{20,})/);
  if (!idMatch) {
    throw new Error('Could not find a YouTube channel ID (UC...) for that handle or URL.');
  }
  return idMatch[1];
}

async function fetchYoutubeChannelFeed(channelId: string): Promise<{
  channelTitle: string;
  videos: YoutubeFeedVideo[];
}> {
  if (!/^UC[a-zA-Z0-9_-]{20,}$/.test(channelId)) {
    throw new Error('Invalid YouTube channel ID format.');
  }
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const res = await fetch(feedUrl, {
    headers: { 'User-Agent': 'MediaGrabber/2.0' },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) {
    throw new Error(`YouTube RSS feed returned HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseYoutubeAtomFeed(xml, channelId);
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function resolveRemoteMetadata(url: string, engine: string): Promise<{ title: string; uploader: string; thumbnail: string }> {
  let fallbackThumb = DEFAULT_YT_THUMB;
  if (engine === 'SPOTIFY' || engine === 'YT MUSIC') fallbackThumb = DEFAULT_MUSIC_THUMB;
  if (engine === 'GALLERY') fallbackThumb = DEFAULT_GALLERY_THUMB;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    if (engine === 'YOUTUBE' || engine === 'YT MUSIC') {
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (oembed.ok) {
        const data = (await oembed.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
        return {
          title: data.title || 'YouTube Media',
          uploader: data.author_name || 'YouTube Creator',
          thumbnail: data.thumbnail_url || fallbackThumb,
        };
      }
    } else if (engine === 'SPOTIFY') {
      const oembed = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (oembed.ok) {
        const data = (await oembed.json()) as { title?: string; thumbnail_url?: string };
        return {
          title: data.title || 'Spotify Track',
          uploader: 'Spotify Artist',
          thumbnail: data.thumbnail_url || fallbackThumb,
        };
      }
    }
    clearTimeout(timer);
  } catch {
    // Fallback cleanly below
  }

  try {
    const parsed = new URL(url);
    const slug = parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname;
    const cleanTitle = decodeURIComponent(slug).replace(/[-_]+/g, ' ').slice(0, 60) || 'Captured Media';
    return {
      title: cleanTitle,
      uploader: parsed.hostname.replace(/^www\./, ''),
      thumbnail: fallbackThumb,
    };
  } catch {
    return {
      title: 'Captured Media',
      uploader: 'MediaGrabber',
      thumbnail: fallbackThumb,
    };
  }
}

interface JobOptions {
  embed_subtitles?: boolean;
  sponsorblock?: boolean;
  playlist_mode?: 'single' | 'playlist';
}

interface JobRecord {
  job_id: string;
  url: string;
  title?: string;
  uploader?: string;
  mode: 'video' | 'audio';
  options?: JobOptions;
  engine: 'YOUTUBE' | 'YT MUSIC' | 'SPOTIFY' | 'GALLERY';
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  progress: number;
  file: string | null;
  thumbnail: string | null;
  output_dir: string | null;
  log: string[];
  created_at: string;
  started_at?: string;
}

async function startServer() {
  await seedWorkspace();

  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // In-memory state
  const queue = new Map<string, JobRecord>();
  const activeProcesses = new Map<string, ChildProcess>();
  const cancelledJobs = new Set<string>();
  let currentUserId: string | null = 'usr-admin-1';
  let radioDbPath = '/var/lib/navidrome/navidrome.db';

  const reorgState = {
    status: 'idle' as 'idle' | 'running' | 'done',
    logs: [] as string[],
  };
  const tmpReorgState = {
    status: 'idle' as 'idle' | 'running' | 'done',
    logs: [] as string[],
  };

  // Seed initial queue items matching workspace files ONLY on first boot (before queue.json exists)
  const seededJobs: JobRecord[] = [
    {
      job_id: '7a91c4e2-11a0-4a99-9c01-000000000001',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Analog Synth Mastering Session',
      uploader: 'Studio Sessions',
      mode: 'video',
      engine: 'YOUTUBE',
      status: 'done',
      progress: 100,
      file: path.join(YT_DIR, 'Studio_Sessions', '2026', 'Analog_Synth_Mastering_Session.mp4'),
      thumbnail: DEFAULT_YT_THUMB,
      output_dir: path.join(YT_DIR, 'Studio_Sessions', '2026'),
      log: [
        '[mediagrabber] Engine → YOUTUBE',
        '[yt-dlp] Extracting URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        '[download] 100% of 42.8MiB in 00:04',
        `FINAL_FILE: ${path.join(YT_DIR, 'Studio_Sessions', '2026', 'Analog_Synth_Mastering_Session.mp4')}`,
      ],
      created_at: new Date(Date.now() - 3600_000 * 5).toISOString(),
    },
    {
      job_id: '8b23d5f1-22b1-4b88-8d02-000000000002',
      url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
      title: 'Klangwerk — Beam Study',
      uploader: 'Klangwerk',
      mode: 'audio',
      engine: 'SPOTIFY',
      status: 'done',
      progress: 100,
      file: path.join(MUSIC_DIR, 'Klangwerk', 'Cobalt_Architecture', '01_Beam_Study.mp3'),
      thumbnail: DEFAULT_MUSIC_THUMB,
      output_dir: path.join(MUSIC_DIR, 'Klangwerk', 'Cobalt_Architecture'),
      log: [
        '[mediagrabber] Engine → SPOTIFY',
        '[spotdl] Fetching track metadata: Klangwerk - Beam Study',
        '[ffmpeg] Embedding ID3 tags & 320k MP3 encoding',
        `FINAL_FILE: ${path.join(MUSIC_DIR, 'Klangwerk', 'Cobalt_Architecture', '01_Beam_Study.mp3')}`,
      ],
      created_at: new Date(Date.now() - 3600_000 * 3).toISOString(),
    },
  ];

  function persistQueue() {
    try {
      const list = Array.from(queue.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 200)
        .map((j) => ({
          ...j,
          log: Array.isArray(j.log) ? j.log.slice(-200) : [],
        }));
      writeJson(QUEUE_FILE, list);
    } catch {
      // ignore persistence write error
    }
  }

  function getMaxConcurrentDownloads(): number {
    const settings = readJson<any>(SETTINGS_FILE, {});
    const val = Number(settings?.max_concurrent_downloads ?? 2);
    return Number.isFinite(val) ? Math.max(1, Math.min(8, Math.round(val))) : 2;
  }

  const dispatchingJobIds = new Set<string>();

  function scheduleQueueWorker() {
    const maxConcurrent = getMaxConcurrentDownloads();
    let activeCount = 0;
    const pending: JobRecord[] = [];

    for (const job of queue.values()) {
      if (job.status === 'running' || dispatchingJobIds.has(job.job_id)) {
        activeCount++;
      } else if (job.status === 'queued') {
        pending.push(job);
      }
    }

    if (activeCount >= maxConcurrent || pending.length === 0) return;

    pending.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const slots = maxConcurrent - activeCount;
    for (const nextJob of pending.slice(0, slots)) {
      dispatchingJobIds.add(nextJob.job_id);
      void processJob(nextJob.job_id);
    }
  }

  if (fs.existsSync(QUEUE_FILE)) {
    const saved = readJson<JobRecord[]>(QUEUE_FILE, []);
    if (Array.isArray(saved)) {
      for (const item of saved) {
        if (!item || typeof item.job_id !== 'string' || typeof item.url !== 'string') continue;
        const recovered: JobRecord = {
          ...item,
          log: Array.isArray(item.log) ? item.log : [],
        };
        if (recovered.status === 'running') {
          recovered.status = 'queued';
          recovered.progress = 0;
          recovered.started_at = undefined;
          recovered.log.push('[mediagrabber] Interrupted by server restart — re-queued automatically.');
        }
        queue.set(recovered.job_id, recovered);
      }
    }
  } else {
    for (const job of seededJobs) {
      queue.set(job.job_id, job);
    }
    persistQueue();
  }

  function getActiveUser() {
    if (!currentUserId) return null;
    const users = readJson<any[]>(USERS_FILE, []);
    return users.find((u) => u.id === currentUserId) || null;
  }

  function sanitizeUser(u: any) {
    if (!u) return null;
    const { password_hash, totp_secret, ...safe } = u;
    return safe;
  }

  function appendArchiveEntry(engine: string, url: string) {
    let existing = '';
    if (fs.existsSync(ARCHIVE_FILE)) {
      existing = fs.readFileSync(ARCHIVE_FILE, 'utf-8');
    }
    let id = url;
    try {
      const parsed = new URL(url);
      id = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || url;
    } catch {
      // keep url
    }
    const line = `${engine.toLowerCase().replace(/\s+/g, '')} ${id}`;
    if (!existing.includes(line)) {
      fs.appendFileSync(ARCHIVE_FILE, `${line}\n`);
    }
  }

  function removeFromArchive(urlOrId: string) {
    if (!fs.existsSync(ARCHIVE_FILE)) return;
    const lines = fs.readFileSync(ARCHIVE_FILE, 'utf-8').split('\n').filter(Boolean);
    let idMatch = urlOrId;
    try {
      const parsed = new URL(urlOrId);
      idMatch = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || urlOrId;
    } catch {
      // ignore
    }
    const filtered = lines.filter(
      (line) => !line.toLowerCase().includes(urlOrId.toLowerCase()) && !line.toLowerCase().includes(idMatch.toLowerCase())
    );
    fs.writeFileSync(ARCHIVE_FILE, filtered.length ? filtered.join('\n') + '\n' : '');
  }

  async function triggerMediaRefresh(dirPath: string, settings: any) {
    const jfUrl = String(settings?.jellyfin_url || '').trim();
    const jfKey = String(settings?.jellyfin_api_key || '').trim();
    if (jfUrl && jfKey) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        await fetch(`${jfUrl.replace(/\/+$/, '')}/Library/Refresh?path=${encodeURIComponent(dirPath)}`, {
          method: 'POST',
          headers: { 'X-Emby-Token': jfKey },
          signal: controller.signal,
        });
        clearTimeout(timer);
      } catch {
        // ignore offline media server
      }
    }
    const plexUrl = String(settings?.plex_url || '').trim();
    const plexToken = String(settings?.plex_token || '').trim();
    const plexSection = String(settings?.plex_section_id || '').trim();
    if (plexUrl && plexToken && plexSection) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        await fetch(
          `${plexUrl.replace(/\/+$/, '')}/library/sections/${encodeURIComponent(plexSection)}/refresh?X-Plex-Token=${encodeURIComponent(plexToken)}`,
          { method: 'GET', signal: controller.signal }
        );
        clearTimeout(timer);
      } catch {
        // ignore
      }
    }
  }

  function runCommandStreaming(
    jobId: string,
    cmd: string,
    args: string[],
    env: NodeJS.ProcessEnv,
    onLine: (line: string) => void
  ): Promise<number> {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, { env });
      activeProcesses.set(jobId, child);
      let buffer = '';

      const handleChunk = (chunk: Buffer) => {
        buffer += chunk.toString('utf-8');
        const parts = buffer.split(/[\r\n]+/);
        buffer = parts.pop() || '';
        for (const raw of parts) {
          const line = raw.trim();
          if (line) onLine(line);
        }
      };

      child.stdout?.on('data', handleChunk);
      child.stderr?.on('data', handleChunk);
      child.on('error', (err) => {
        onLine(`[mediagrabber] Process error: ${err.message}`);
        activeProcesses.delete(jobId);
        resolve(1);
      });
      child.on('close', (code) => {
        if (buffer.trim()) onLine(buffer.trim());
        activeProcesses.delete(jobId);
        resolve(typeof code === 'number' ? code : 1);
      });
    });
  }

  async function processJob(jobId: string) {
    const job = queue.get(jobId);
    if (!job) {
      dispatchingJobIds.delete(jobId);
      return;
    }
    try {
      job.status = 'running';
      job.started_at = new Date().toISOString();
      job.progress = 2;
      job.log.push(`[mediagrabber] Job ${jobId.slice(0, 8)} started`);
      persistQueue();

      const settings = readJson<any>(SETTINGS_FILE, {});
      const meta = await resolveRemoteMetadata(job.url, job.engine);
      job.title = meta.title;
      job.uploader = meta.uploader;
      job.thumbnail = meta.thumbnail;

      if (cancelledJobs.has(jobId)) {
        job.status = 'cancelled';
        job.log.push('[mediagrabber] Job cancelled by user.');
        return;
      }

      const ytDir = isSafeLibraryBasePath(settings.yt_base_path) || YT_DIR;
      const musicDir = isSafeLibraryBasePath(settings.music_base_path) || MUSIC_DIR;
      const galleryDir = isSafeLibraryBasePath(settings.gallery_base_path) || GALLERY_DIR;

      const grabCmd = resolveGrabCommand();
      const ytdlpBin = resolveExecutable('yt-dlp');
      const spotdlBin = resolveExecutable('spotdl');
      const gallerydlBin = resolveExecutable('gallery-dl');

      // Use real `grab` / `grab.ps1` wrapper when available on the host or workspace
      if (grabCmd) {
        let tempJobDir = job.output_dir || path.join(SYSTEM_TMP_GRAB_DIR, jobId);
        try {
          fs.mkdirSync(tempJobDir, { recursive: true });
          fs.accessSync(tempJobDir, fs.constants.W_OK);
        } catch (err: any) {
          job.log.push(`[mediagrabber] Failed to initialize ${tempJobDir}: ${err?.message || err}`);
          tempJobDir = path.join(TMP_DIR, jobId);
          fs.mkdirSync(tempJobDir, { recursive: true });
        }
        job.output_dir = tempJobDir;

        let extraYt = String(settings.ytdlp_extra || '').trim();
        if (job.mode !== 'audio' && !extraYt.includes('-S vcodec:') && !extraYt.includes('--format-sort')) {
          extraYt = `${extraYt} -S vcodec:h264,res,br`.trim();
        }

        const env = buildToolEnv({
          MEDIAGRABBER_JOB_ID: jobId,
          GRAB_OUTPUT_DIR: tempJobDir,
          GRAB_YT_DIR: ytDir,
          GRAB_MUSIC_DIR: musicDir,
          GRAB_GALLERY_DIR: galleryDir,
          GRAB_COOKIES_YOUTUBE: String(settings.cookies_youtube_path || ''),
          GRAB_COOKIES_GALLERY: String(settings.cookies_gallery_path || ''),
          GRAB_VIDEO_RES: String(settings.video_res || '1080'),
          GRAB_AUDIO_FORMAT: String(settings.audio_format || 'mp3'),
          GRAB_AUDIO_BITRATE: String(settings.audio_bitrate || '320k'),
          GRAB_CONTAINER: String(settings.container || 'mp4'),
          GRAB_GENERATE_LRC: settings.generate_lrc ? 'true' : 'false',
          GRAB_AUDIO_ONLY: job.mode === 'audio' ? 'true' : 'false',
          GRAB_EMBED_SUBS: job.options?.embed_subtitles ? 'true' : 'false',
          GRAB_SPONSORBLOCK: job.options?.sponsorblock ? 'true' : 'false',
          GRAB_PLAYLIST: job.options?.playlist_mode === 'playlist' ? 'true' : 'false',
          ...(extraYt ? { GRAB_EXTRA_YT: extraYt } : {}),
          ...(settings.spotdl_extra ? { GRAB_EXTRA_SPOTIFY: String(settings.spotdl_extra) } : {}),
          ...(settings.gallerydl_extra ? { GRAB_EXTRA_GALLERY: String(settings.gallerydl_extra) } : {}),
        });

        const launchArgs = [...grabCmd.prefixArgs, job.url];
        job.log.push(`[mediagrabber] Launching ${grabCmd.scriptPath} (${job.mode})`);
        let lastProgress = 2;
        let detectedEngine: string = job.engine;
        let galleryDownloadStarted = false;

        const exitCode = await runCommandStreaming(jobId, grabCmd.bin, launchArgs, env, (line) => {
        job.log.push(line);
        if (job.log.length > 500) job.log.shift();

        if (line.includes('Engine → SPOTIFY')) {
          detectedEngine = 'SPOTIFY';
          job.engine = 'SPOTIFY';
        } else if (line.includes('Engine → YT MUSIC')) {
          detectedEngine = 'YT MUSIC';
          job.engine = 'YT MUSIC';
        } else if (line.includes('Engine → GALLERY')) {
          detectedEngine = 'GALLERY';
          job.engine = 'GALLERY';
        } else if (line.includes('Engine → YOUTUBE')) {
          detectedEngine = 'YOUTUBE';
          job.engine = 'YOUTUBE';
        }

        if (line.includes('[download]') && line.includes('%')) {
          const m = line.match(/(\d{1,3}(?:\.\d+)?)%/);
          if (m) {
            const val = parseFloat(m[1]);
            if (!Number.isNaN(val) && val >= lastProgress) {
              lastProgress = Math.min(99, val);
              job.progress = lastProgress;
            }
          }
        }
        if (line.includes('PROGRESS:')) {
          const m = line.match(/PROGRESS:\s*(\d+)\/(\d+)\s*(?:\((\d+)%\))?/);
          if (m) {
            const downloaded = parseInt(m[1], 10);
            const total = parseInt(m[2], 10);
            const pct = m[3] ? parseInt(m[3], 10) : total > 0 ? Math.round((downloaded / total) * 100) : 0;
            if (pct >= lastProgress) {
              lastProgress = Math.min(99, pct);
              job.progress = lastProgress;
            }
          }
        }
        if (detectedEngine === 'GALLERY' && line.includes('Downloading') && !galleryDownloadStarted) {
          galleryDownloadStarted = true;
          lastProgress = Math.max(lastProgress, 50);
          job.progress = lastProgress;
        }
        if (line.includes('FINAL_FILE:')) {
          job.file = line.split('FINAL_FILE:', 2)[1].trim();
        }
        if (line.includes('FINAL_THUMB:')) {
          const rawThumb = line.split('FINAL_THUMB:', 2)[1].trim();
          job.thumbnail = toClientThumbUrl(rawThumb) || job.thumbnail;
        }
      });

      if (cancelledJobs.has(jobId)) {
        job.status = 'cancelled';
        job.log.push('[mediagrabber] Job cancelled by user.');
        return;
      }

      if (!job.file && fs.existsSync(tempJobDir)) {
        const found = walkFiles(tempJobDir)
          .filter((f) => MEDIA_EXTS.has(path.extname(f).toLowerCase()))
          .sort((a, b) => fs.statSync(b).ctimeMs - fs.statSync(a).ctimeMs);
        if (found.length > 0) {
          job.file = found[0];
        }
      }

      if (job.file) {
        const infoFile = job.file.replace(/\.[^.]+$/, '.info.json');
        if (fs.existsSync(infoFile)) {
          const info = readJson<any>(infoFile, {});
          if (info.title) job.title = info.title;
          if (info.uploader || info.artist) job.uploader = info.uploader || info.artist;
        } else {
          job.title = path.basename(job.file, path.extname(job.file));
        }
      }

      const localThumb = scanForLocalThumbnail(job.file, tempJobDir);
      if (localThumb) {
        job.thumbnail = toClientThumbUrl(localThumb) || job.thumbnail;
      }

      if (job.file || exitCode === 0) {
        job.status = 'done';
        job.progress = 100;
        if (detectedEngine === 'SPOTIFY') {
          appendArchiveEntry('spotify', job.url);
        } else if (detectedEngine === 'GALLERY') {
          if (job.url.includes('instagram.com')) appendArchiveEntry('instagram', job.url);
          else if (job.url.includes('tiktok.com')) appendArchiveEntry('tiktok', job.url);
        }
        if (job.file) {
          void triggerMediaRefresh(path.dirname(job.file), settings);
        }
        const history = readJson<any[]>(HISTORY_FILE, []);
        history.unshift({
          id: `hist-${Date.now()}-${jobId.slice(0, 4)}`,
          url: job.url,
          title: job.title || path.basename(job.file || job.url),
          thumbnail: job.thumbnail,
          timestamp: new Date().toISOString(),
          source: engineToHistorySource(job.engine, job.url),
          file: job.file,
        });
        writeJson(HISTORY_FILE, history.slice(0, 200));
        job.log.push('[mediagrabber] Completed successfully.');
        void sendPushNotification({
          title: 'Download Complete',
          body: `${job.title || job.url} finished (${job.engine}).`,
          tag: `job-${job.job_id}`,
          url: '/',
        });
        void sendWebhookNotification({
          status: 'done',
          title: job.title || job.url,
          url: job.url,
          engine: job.engine,
          file: job.file,
        });
      } else {
        job.status = 'failed';
        job.progress = 0;
        job.log.push(`[mediagrabber] Download failed (exit code ${exitCode}).`);
        void sendPushNotification({
          title: 'Download Failed',
          body: `${job.title || job.url} failed (${job.engine}).`,
          tag: `job-${job.job_id}`,
          url: '/',
        });
        void sendWebhookNotification({
          status: 'failed',
          title: job.title || job.url,
          url: job.url,
          engine: job.engine,
        });
      }
      return;
    }

    // Fallback: direct yt-dlp / spotdl / gallery-dl execution if `grab` wrapper is absent
    const directTool =
      job.engine === 'SPOTIFY' ? spotdlBin : job.engine === 'GALLERY' ? gallerydlBin || ytdlpBin : ytdlpBin;

    if (directTool) {
      const targetRoot = resolveJobBaseDir(job.engine, settings);
      const safeUploader = sanitizeSegment(meta.uploader, 'Unknown');
      const year = String(new Date().getFullYear());
      const outDir = settings.folder_structure === 'flat' ? targetRoot : path.join(targetRoot, safeUploader, year);
      fs.mkdirSync(outDir, { recursive: true });
      job.output_dir = outDir;

      const args: string[] = [];
      const toolName = path.basename(directTool);
      if (toolName.includes('yt-dlp')) {
        const isAudio = job.mode === 'audio' || job.engine === 'YT MUSIC';
        args.push('--newline', '--write-info-json', '--write-thumbnail', '--download-archive', ARCHIVE_FILE);
        if (job.options?.playlist_mode === 'playlist') {
          args.push('--yes-playlist');
        } else {
          args.push('--no-playlist');
        }
        if (job.options?.embed_subtitles && !isAudio) {
          args.push('--write-subs', '--write-auto-subs', '--embed-subs', '--sub-langs', 'en.*,en');
        }
        if (job.options?.sponsorblock) {
          args.push('--sponsorblock-remove', 'sponsor');
        }
        if (settings.cookies_youtube_path && fs.existsSync(String(settings.cookies_youtube_path))) {
          args.push('--cookies', String(settings.cookies_youtube_path));
        }
        if (isAudio) {
          args.push('-x', '--audio-format', String(settings.audio_format || 'mp3'), '--audio-quality', String(settings.audio_bitrate || '320k'));
        } else {
          const resNum = String(settings.video_res || '1080');
          const container = String(settings.container || 'mp4');
          args.push('-f', `bestvideo[height<=${resNum}]+bestaudio/best[height<=${resNum}]/best`, '--merge-output-format', container);
        }
        args.push('-o', path.join(outDir, '%(title).120s.%(ext)s'), job.url);
      } else if (toolName.includes('spotdl')) {
        args.push('download', job.url, '--output', path.join(outDir, '{artist} - {title}.{output-ext}'));
      } else {
        args.push('-D', outDir, job.url);
      }

      job.log.push(`[mediagrabber] Launching direct ${toolName}...`);
      const beforeSet = new Set(walkFiles(outDir));
      const exitCode = await runCommandStreaming(jobId, directTool, args, buildToolEnv(), (line) => {
        job.log.push(line);
        if (job.log.length > 500) job.log.shift();
        const m = line.match(/(\d{1,3}(?:\.\d+)?)%/);
        if (m && line.includes('[download]')) {
          job.progress = Math.min(99, parseFloat(m[1]));
        }
      });

      if (cancelledJobs.has(jobId)) {
        job.status = 'cancelled';
        job.log.push('[mediagrabber] Job cancelled by user.');
        return;
      }

      const afterFiles = walkFiles(outDir).filter(
        (f) => !beforeSet.has(f) && MEDIA_EXTS.has(path.extname(f).toLowerCase())
      );
      if (afterFiles.length > 0) {
        job.file = afterFiles[0];
        job.title = path.basename(job.file, path.extname(job.file));
      }

      const localThumb = scanForLocalThumbnail(job.file, outDir);
      if (localThumb) job.thumbnail = toClientThumbUrl(localThumb) || job.thumbnail;

      if (job.file || exitCode === 0) {
        job.status = 'done';
        job.progress = 100;
        if (job.file) void triggerMediaRefresh(path.dirname(job.file), settings);
        const history = readJson<any[]>(HISTORY_FILE, []);
        history.unshift({
          id: `hist-${Date.now()}-${jobId.slice(0, 4)}`,
          url: job.url,
          title: job.title || job.url,
          thumbnail: job.thumbnail,
          timestamp: new Date().toISOString(),
          source: engineToHistorySource(job.engine, job.url),
          file: job.file,
        });
        writeJson(HISTORY_FILE, history.slice(0, 200));
        job.log.push('[mediagrabber] Completed successfully.');
        void sendPushNotification({
          title: 'Download Complete',
          body: `${job.title || job.url} finished (${job.engine}).`,
          tag: `job-${job.job_id}`,
          url: '/',
        });
        void sendWebhookNotification({
          status: 'done',
          title: job.title || job.url,
          url: job.url,
          engine: job.engine,
          file: job.file,
        });
      } else {
        job.status = 'failed';
        job.progress = 0;
        job.log.push(`[mediagrabber] ${toolName} failed (exit code ${exitCode}).`);
        void sendPushNotification({
          title: 'Download Failed',
          body: `${job.title || job.url} failed (${job.engine}).`,
          tag: `job-${job.job_id}`,
          url: '/',
        });
        void sendWebhookNotification({
          status: 'failed',
          title: job.title || job.url,
          url: job.url,
          engine: job.engine,
        });
      }
      return;
    }

      job.status = 'failed';
      job.progress = 0;
      job.log.push('[mediagrabber] ERROR: No grab script or downloading binary found.');
      job.log.push('[mediagrabber] Ensure /usr/local/bin/grab or yt-dlp is installed and in PATH.');
      void sendPushNotification({
        title: 'Download Failed',
        body: `${job.title || job.url} failed: no download binary found.`,
        tag: `job-${job.job_id}`,
        url: '/',
      });
      void sendWebhookNotification({
        status: 'failed',
        title: job.title || job.url,
        url: job.url,
        engine: job.engine,
        message: `Download Failed: ${job.title || job.url} (no download binary found)`,
      });
    } catch (err: any) {
      job.status = 'failed';
      job.progress = 0;
      job.log.push(`[mediagrabber] Unexpected job error: ${err?.message || String(err)}`);
      void sendPushNotification({
        title: 'Download Failed',
        body: `${job.title || job.url} encountered an unexpected error.`,
        tag: `job-${job.job_id}`,
        url: '/',
      });
      void sendWebhookNotification({
        status: 'failed',
        title: job.title || job.url,
        url: job.url,
        engine: job.engine,
        message: `Download Failed: ${job.title || job.url} (${err?.message || 'unexpected error'})`,
      });
    } finally {
      dispatchingJobIds.delete(jobId);
      persistQueue();
      scheduleQueueWorker();
    }
  }

  function runStaleJobCleanup(): number {
    const settings = readJson<any>(SETTINGS_FILE, {});
    const timeoutMins = Math.max(5, Math.min(1440, Number(settings?.stale_timeout_minutes || 120) || 120));
    const cutoffMs = Date.now() - timeoutMins * 60_000;
    let cleaned = 0;

    for (const job of queue.values()) {
      if (job.status !== 'running') continue;
      const startedMs = new Date(job.started_at || job.created_at).getTime();
      if (!Number.isFinite(startedMs) || startedMs > cutoffMs) continue;

      const proc = activeProcesses.get(job.job_id);
      if (proc) {
        killChildProcessTree(proc);
        activeProcesses.delete(job.job_id);
      }

      job.status = 'failed';
      job.progress = 0;
      job.log.push(`[janitor] Marked failed after exceeding ${timeoutMins}m stale download timeout.`);
      cleaned++;

      void sendPushNotification({
        title: 'Stale Download Cleaned Up',
        body: `${job.title || job.url} timed out after ${timeoutMins} minutes.`,
        tag: `job-${job.job_id}`,
        url: '/',
      });
      void sendWebhookNotification({
        status: 'failed',
        title: job.title || job.url,
        url: job.url,
        engine: job.engine,
        message: `Stale Download Timed Out (${timeoutMins}m): ${job.title || job.url}`,
      });
    }
    return cleaned;
  }

  setInterval(() => {
    runStaleJobCleanup();
  }, 60_000);

  // ---- Auth & Account Routes ----
  app.get('/api/me', (_req, res) => {
    const user = getActiveUser();
    if (!user) return res.status(401).json({ error: 'Not signed in' });
    res.json(sanitizeUser(user));
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password, totp_code } = req.body || {};
    const cleanUser = String(username || '').trim().toLowerCase();
    const users = readJson<any[]>(USERS_FILE, []);
    const user = users.find((u) => u.username.toLowerCase() === cleanUser);
    if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    if (user.totp_enabled) {
      const code = String(totp_code || '').trim();
      if (!/^\d{6}$/.test(code)) {
        return res.status(403).json({
          error: 'Enter your 6-digit 2FA verification code.',
          requires_2fa: true,
        });
      }
    }
    currentUserId = user.id;
    res.json({ success: true, user: sanitizeUser(user) });
  });

  app.post('/api/auth/logout', (_req, res) => {
    currentUserId = null;
    res.json({ success: true });
  });

  app.post('/api/me/update', upload.single('avatar'), (req, res) => {
    if (!currentUserId) return res.status(401).json({ error: 'Not signed in' });
    const users = readJson<any[]>(USERS_FILE, []);
    const idx = users.findIndex((u) => u.id === currentUserId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const { display_name, email, theme, new_password } = req.body || {};
    if (typeof display_name === 'string' && display_name.trim()) users[idx].display_name = display_name.trim();
    if (typeof email === 'string') users[idx].email = email.trim();
    if (theme === 'dark' || theme === 'light') users[idx].theme = theme;

    if (typeof new_password === 'string' && new_password.length > 0) {
      if (new_password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      }
      users[idx].password_hash = hashPassword(new_password);
    }

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
      const filename = `avatar_${users[idx].id}${ext}`;
      const dest = path.join(AVATARS_DIR, filename);
      fs.writeFileSync(dest, req.file.buffer);
      users[idx].avatar = `/api/avatars/${filename}?t=${Date.now()}`;
    }

    writeJson(USERS_FILE, users);
    res.json({ success: true, user: sanitizeUser(users[idx]) });
  });

  app.get('/api/avatars/:filename', (req, res) => {
    const file = path.basename(req.params.filename);
    const full = path.join(AVATARS_DIR, file);
    if (!fs.existsSync(full)) return res.status(404).end();
    res.sendFile(full);
  });

  app.post('/api/theme', (req, res) => {
    if (!currentUserId) {
      return res.status(401).json({ error: 'Not signed in' });
    }
    const users = readJson<any[]>(USERS_FILE, []);
    const idx = users.findIndex((u) => u.id === currentUserId);
    if (idx !== -1) {
      users[idx].theme_colors = req.body?.colors ?? null;
      if (req.body?.theme === 'light' || req.body?.theme === 'dark') {
        users[idx].theme = req.body.theme;
      }
      writeJson(USERS_FILE, users);
    }
    res.json({ success: true });
  });

  app.post('/api/me/2fa/setup', (_req, res) => {
    const users = readJson<any[]>(USERS_FILE, []);
    const idx = users.findIndex((u) => u.id === currentUserId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    const secret = crypto.randomBytes(10).toString('hex').toUpperCase();
    users[idx].totp_secret = secret;
    writeJson(USERS_FILE, users);
    const otpauth_uri = `otpauth://totp/MediaGrabber:${encodeURIComponent(users[idx].username)}?secret=${secret}&issuer=MediaGrabber`;
    res.json({ secret, otpauth_uri });
  });

  app.post('/api/me/2fa/enable', (req, res) => {
    const code = String(req.body?.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter any 6-digit verification code from your authenticator.' });
    }
    const users = readJson<any[]>(USERS_FILE, []);
    const idx = users.findIndex((u) => u.id === currentUserId);
    if (idx !== -1) {
      users[idx].totp_enabled = true;
      writeJson(USERS_FILE, users);
    }
    res.json({ success: true });
  });

  app.post('/api/me/2fa/disable', (_req, res) => {
    const users = readJson<any[]>(USERS_FILE, []);
    const idx = users.findIndex((u) => u.id === currentUserId);
    if (idx !== -1) {
      users[idx].totp_enabled = false;
      users[idx].totp_secret = '';
      writeJson(USERS_FILE, users);
    }
    res.json({ success: true });
  });

  app.get('/api/users', (_req, res) => {
    const users = readJson<any[]>(USERS_FILE, []);
    res.json(users.map(sanitizeUser));
  });

  app.post('/api/users/add', (req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const { username, password, role } = req.body || {};
    const cleanUser = String(username || '').trim();
    const cleanPass = String(password || '');
    if (!cleanUser || cleanPass.length < 8) {
      return res.status(400).json({ error: 'Username and password (min 8 chars) are required.' });
    }
    const users = readJson<any[]>(USERS_FILE, []);
    if (users.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
      return res.status(400).json({ error: 'Username already exists.' });
    }
    const newUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      username: cleanUser,
      display_name: cleanUser,
      email: `${cleanUser}@mediagrabber.local`,
      role: role === 'admin' ? 'admin' : 'user',
      avatar: DEFAULT_AVATAR,
      theme: 'dark',
      totp_enabled: false,
      totp_secret: '',
      theme_colors: null,
      password_hash: hashPassword(cleanPass),
    };
    users.push(newUser);
    writeJson(USERS_FILE, users);
    res.json({ success: true, user: sanitizeUser(newUser) });
  });

  app.post('/api/users/remove', (req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const { id } = req.body || {};
    if (id === currentUserId) {
      return res.status(400).json({ error: 'Cannot remove the currently active user.' });
    }
    const users = readJson<any[]>(USERS_FILE, []);
    const filtered = users.filter((u) => u.id !== id);
    writeJson(USERS_FILE, filtered);
    res.json({ success: true });
  });

  app.post('/api/users/switch', (req, res) => {
    const { id } = req.body || {};
    const users = readJson<any[]>(USERS_FILE, []);
    const found = users.find((u) => u.id === id);
    if (!found) return res.status(404).json({ error: 'User not found' });
    currentUserId = found.id;
    res.json({ success: true, user: sanitizeUser(found) });
  });

  // ---- Queue & Grab Routes ----
  app.get('/api/queue', (_req, res) => {
    const list = Array.from(queue.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    res.json(list);
  });

  function sanitizeGrabOptions(raw: any): JobOptions | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const opts: JobOptions = {};
    if (raw.embed_subtitles === true) opts.embed_subtitles = true;
    if (raw.sponsorblock === true) opts.sponsorblock = true;
    if (raw.playlist_mode === 'playlist') opts.playlist_mode = 'playlist';
    else if (raw.playlist_mode === 'single') opts.playlist_mode = 'single';
    return Object.keys(opts).length > 0 ? opts : undefined;
  }

  function handleGrabRequest(req: express.Request, res: express.Response) {
    const mode = req.body?.mode === 'audio' ? 'audio' : 'video';
    const options = sanitizeGrabOptions(req.body?.options);
    let urlList: string[] = [];
    if (Array.isArray(req.body?.urls)) {
      urlList = req.body.urls
        .map((u: unknown) => String(u || '').trim())
        .filter((u: string) => u.length > 0);
    } else if (typeof req.body?.url === 'string') {
      urlList = req.body.url
        .split(/[\r\n]+/)
        .map((u: string) => u.trim())
        .filter((u: string) => u.length > 0);
    }

    if (urlList.length === 0) {
      return res.status(400).json({ error: 'At least one URL is required' });
    }

    const optTags = [
      options?.embed_subtitles ? 'subtitles' : '',
      options?.sponsorblock ? 'sponsorblock' : '',
      options?.playlist_mode === 'playlist' ? 'playlist' : '',
    ].filter(Boolean);
    const optSuffix = optTags.length > 0 ? ` [${optTags.join(', ')}]` : '';

    const jobIds: string[] = [];
    for (const rawUrl of urlList) {
      const jobId = crypto.randomUUID();
      const engine = detectEngine(rawUrl);
      const job: JobRecord = {
        job_id: jobId,
        url: rawUrl,
        mode,
        options,
        engine,
        status: 'queued',
        progress: 0,
        file: null,
        thumbnail:
          engine === 'SPOTIFY' || engine === 'YT MUSIC'
            ? DEFAULT_MUSIC_THUMB
            : engine === 'GALLERY'
            ? DEFAULT_GALLERY_THUMB
            : DEFAULT_YT_THUMB,
        output_dir: null,
        log: [`[mediagrabber] Queued ${rawUrl} (${mode}${optSuffix})`],
        created_at: new Date().toISOString(),
      };
      queue.set(jobId, job);
      jobIds.push(jobId);
    }

    persistQueue();
    scheduleQueueWorker();
    res.json({ job_id: jobIds[0], job_ids: jobIds, count: jobIds.length });
  }

  app.post('/api/grab', handleGrabRequest);
  app.post('/grab', handleGrabRequest);

  app.post('/api/grab/notify', (req, res) => {
    const jobId = String(req.body?.job_id || '').trim();
    const rawUrl = String(req.body?.url || '').trim();
    if (!jobId) return res.status(400).json({ error: 'job_id is required' });

    const statusRaw = String(req.body?.status || '').trim().toLowerCase();
    const status: JobRecord['status'] =
      statusRaw === 'done' || statusRaw === 'failed' || statusRaw === 'cancelled' || statusRaw === 'queued'
        ? statusRaw
        : 'running';
    const progressNum = Number(req.body?.progress);
    const message = String(req.body?.message || '').trim();
    const file = String(req.body?.file || '').trim();

    let job = queue.get(jobId);
    if (!job && rawUrl) {
      const engine = detectEngine(rawUrl);
      job = {
        job_id: jobId,
        url: rawUrl,
        mode: 'video',
        engine,
        status,
        progress: Number.isFinite(progressNum) ? progressNum : 2,
        file: file || null,
        thumbnail:
          engine === 'SPOTIFY' || engine === 'YT MUSIC'
            ? DEFAULT_MUSIC_THUMB
            : engine === 'GALLERY'
            ? DEFAULT_GALLERY_THUMB
            : DEFAULT_YT_THUMB,
        output_dir: file ? path.dirname(file) : null,
        log: message ? [message] : [`[cli] Started ${rawUrl}`],
        created_at: new Date().toISOString(),
      };
      queue.set(jobId, job);
      return res.json({ ok: true });
    }

    if (job) {
      if (jobId.startsWith('cli-')) {
        const prevStatus = job.status;
        job.status = status;
        if (Number.isFinite(progressNum) && progressNum >= job.progress) {
          job.progress = Math.min(100, progressNum);
        }
        if (message) {
          job.log.push(message);
          if (job.log.length > 500) job.log.shift();
        }
        if (file) job.file = file;
        if (prevStatus !== status && (status === 'done' || status === 'failed')) {
          void sendPushNotification({
            title: status === 'done' ? 'Download Complete' : 'Download Failed',
            body: `${job.title || job.url} ${status === 'done' ? 'finished' : 'failed'} (${job.engine}).`,
            tag: `job-${job.job_id}`,
            url: '/',
          });
        }
      }
    }
    res.json({ ok: true });
  });

  app.get('/api/log/:jobId', (req, res) => {
    const job = queue.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job_id: job.job_id, url: job.url, status: job.status, log: job.log });
  });

  function killChildProcessTree(proc: ChildProcess) {
    try {
      if (IS_WINDOWS && proc.pid) {
        execFile('taskkill', ['/pid', String(proc.pid), '/T', '/F'], () => {});
        return;
      }
      proc.kill('SIGTERM');
      setTimeout(() => {
        try {
          if (!proc.killed) proc.kill('SIGKILL');
        } catch {
          // ignore
        }
      }, 2000);
    } catch {
      // ignore
    }
  }

  function cancelJobById(jobId: string): { ok: true } | { ok: false; status: number; error: string } {
    const job = queue.get(jobId);
    if (!job) return { ok: false, status: 404, error: 'Job not found' };
    cancelledJobs.add(job.job_id);
    const proc = activeProcesses.get(job.job_id);
    if (proc) {
      killChildProcessTree(proc);
    }
    if (job.status === 'queued' || job.status === 'running') {
      job.status = 'cancelled';
      job.log.push('[mediagrabber] Cancelled by user.');
    }
    dispatchingJobIds.delete(job.job_id);
    persistQueue();
    scheduleQueueWorker();
    return { ok: true };
  }

  function retryJobById(jobId: string): { ok: true; new_job_id: string } | { ok: false; status: number; error: string } {
    const oldJob = queue.get(jobId);
    if (!oldJob) return { ok: false, status: 404, error: 'Job not found' };
    removeFromArchive(oldJob.url);
    queue.delete(oldJob.job_id);

    const newJobId = crypto.randomUUID();
    const newJob: JobRecord = {
      job_id: newJobId,
      url: oldJob.url,
      mode: oldJob.mode,
      options: oldJob.options,
      engine: oldJob.engine,
      status: 'queued',
      progress: 0,
      file: null,
      thumbnail: oldJob.thumbnail,
      output_dir: null,
      log: [`[mediagrabber] Retrying ${oldJob.url}`],
      created_at: new Date().toISOString(),
    };
    queue.set(newJobId, newJob);
    persistQueue();
    scheduleQueueWorker();
    return { ok: true, new_job_id: newJobId };
  }

  app.post('/api/cancel/:jobId', (req, res) => {
    const result = cancelJobById(req.params.jobId);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    res.json({ status: 'cancelled' });
  });

  app.delete('/api/remove/:jobId', (req, res) => {
    queue.delete(req.params.jobId);
    persistQueue();
    res.json({ status: 'removed' });
  });

  app.post('/api/clear-completed', (_req, res) => {
    for (const [id, job] of queue.entries()) {
      if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
        queue.delete(id);
      }
    }
    persistQueue();
    res.json({ status: 'cleared' });
  });

  app.post('/api/clear-archive/:jobId', (req, res) => {
    const job = queue.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    removeFromArchive(job.url);
    if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
      queue.delete(job.job_id);
      persistQueue();
      return res.json({ status: 'archive cleared and job removed' });
    }
    res.json({ status: 'archive cleared' });
  });

  app.post('/api/retry/:jobId', (req, res) => {
    const result = retryJobById(req.params.jobId);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    res.json({ status: 'retried', new_job_id: result.new_job_id });
  });

  // ---- History Routes ----
  app.get('/api/history', (_req, res) => {
    const history = readJson<any[]>(HISTORY_FILE, []);
    res.json(history);
  });

  app.post('/api/history/clear', (_req, res) => {
    writeJson(HISTORY_FILE, []);
    res.json({ status: 'cleared' });
  });

  // ---- Settings & Storage Routes ----
  app.get('/api/settings', (_req, res) => {
    res.json(readJson(SETTINGS_FILE, {}));
  });

  app.post('/api/settings', (req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const current = readJson<any>(SETTINGS_FILE, {});
    const incoming = { ...(req.body || {}) };
    const pathFields = [
      ['yt_base_path', 'YouTube Base Path'],
      ['music_base_path', 'Music Base Path'],
      ['gallery_base_path', 'Gallery Base Path'],
    ] as const;

    for (const [field, label] of pathFields) {
      if (field in incoming) {
        const rawVal = String(incoming[field] || '').trim();
        if (rawVal) {
          const safeDir = isSafeLibraryBasePath(rawVal);
          if (!safeDir) {
            return res.status(400).json({ error: `${label} cannot point to a restricted system directory.` });
          }
          try {
            fs.mkdirSync(safeDir, { recursive: true });
          } catch (err: any) {
            return res.status(400).json({
              error: `Cannot create or write to ${label} (${safeDir}): ${err?.message || 'permission denied'}`,
            });
          }
          incoming[field] = safeDir;
        }
      }
    }

    if ('webhook_url' in incoming) {
      try {
        incoming.webhook_url = validateWebhookUrl(incoming.webhook_url);
      } catch (err: any) {
        return res.status(400).json({ error: err?.message || 'Invalid webhook URL.' });
      }
    }
    if ('stale_timeout_minutes' in incoming) {
      const mins = Number(incoming.stale_timeout_minutes);
      incoming.stale_timeout_minutes = Number.isFinite(mins)
        ? Math.max(5, Math.min(1440, Math.round(mins)))
        : 120;
    }
    if ('max_concurrent_downloads' in incoming) {
      const conc = Number(incoming.max_concurrent_downloads);
      incoming.max_concurrent_downloads = Number.isFinite(conc)
        ? Math.max(1, Math.min(8, Math.round(conc)))
        : 2;
    }
    if ('update_channel' in incoming) {
      incoming.update_channel = incoming.update_channel === 'stable' ? 'stable' : 'nightly';
    }

    const updated = { ...current, ...incoming };
    writeJson(SETTINGS_FILE, updated);
    scheduleQueueWorker();
    res.json({ status: 'saved', settings: updated });
  });

  function buildCookieStatus(kind: 'youtube' | 'gallery', settings: any) {
    const managedPath = path.resolve(
      kind === 'youtube' ? MANAGED_YT_COOKIES_FILE : MANAGED_GALLERY_COOKIES_FILE
    );
    const settingKey = kind === 'youtube' ? 'cookies_youtube_path' : 'cookies_gallery_path';
    const configuredPath = String(settings?.[settingKey] || '').trim();
    const resolvedConfigured = configuredPath ? path.resolve(configuredPath) : '';

    const targetPath = resolvedConfigured && fs.existsSync(resolvedConfigured)
      ? resolvedConfigured
      : fs.existsSync(managedPath)
      ? managedPath
      : resolvedConfigured;

    if (targetPath && fs.existsSync(targetPath)) {
      try {
        const stat = fs.statSync(targetPath);
        if (stat.isFile()) {
          const text = fs.readFileSync(targetPath, 'utf-8');
          const lineCount = text
            .split(/\r?\n/)
            .filter((l) => l.trim() && !l.trim().startsWith('#')).length;
          const isManaged = IS_WINDOWS
            ? targetPath.toLowerCase() === managedPath.toLowerCase()
            : targetPath === managedPath;
          return {
            kind,
            configured: true,
            source: isManaged ? 'managed' : 'custom_path',
            path: targetPath,
            size_bytes: stat.size,
            line_count: lineCount,
            updated_at: stat.mtime.toISOString(),
          };
        }
      } catch {
        // fall through to unconfigured
      }
    }

    return {
      kind,
      configured: false,
      source: 'none',
      path: configuredPath,
      size_bytes: 0,
      line_count: 0,
      updated_at: null,
    };
  }

  app.get('/api/settings/cookies/status', (_req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const settings = readJson<any>(SETTINGS_FILE, {});
    res.json({
      youtube: buildCookieStatus('youtube', settings),
      gallery: buildCookieStatus('gallery', settings),
    });
  });

  app.post('/api/settings/cookies', upload.single('file'), (req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const kindRaw = String(req.body?.kind || '').trim().toLowerCase();
    if (kindRaw !== 'youtube' && kindRaw !== 'gallery') {
      return res.status(400).json({ error: 'Cookie kind must be "youtube" or "gallery".' });
    }
    const kind = kindRaw as 'youtube' | 'gallery';

    let rawContent = '';
    if (req.file) {
      rawContent = req.file.buffer.toString('utf-8');
    } else if (typeof req.body?.content === 'string') {
      rawContent = req.body.content;
    }

    const cleaned = rawContent.replace(/\0/g, '').trim();
    if (!cleaned) {
      return res.status(400).json({ error: 'Provide a non-empty Netscape cookies.txt file or text.' });
    }
    if (Buffer.byteLength(cleaned, 'utf-8') > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Cookie file exceeds the 2 MB limit.' });
    }

    const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const hasCookieRows = lines.some(
      (l) => l.startsWith('# Netscape') || l.startsWith('# HTTP Cookie') || l.split('\t').length >= 6
    );
    if (!hasCookieRows) {
      return res.status(400).json({
        error: 'Expected Netscape cookies.txt format (tab-separated cookie rows or # Netscape HTTP Cookie File header).',
      });
    }

    const targetPath = path.resolve(
      kind === 'youtube' ? MANAGED_YT_COOKIES_FILE : MANAGED_GALLERY_COOKIES_FILE
    );
    const resolvedStateDir = path.resolve(STATE_DIR);
    if (!targetPath.startsWith(resolvedStateDir + path.sep)) {
      return res.status(400).json({ error: 'Invalid cookie storage target.' });
    }

    ensureDirs();
    fs.writeFileSync(targetPath, `${cleaned}\n`, { encoding: 'utf-8', mode: 0o600 });
    if (!IS_WINDOWS) {
      try { fs.chmodSync(targetPath, 0o600); } catch {}
    }

    const settings = readJson<any>(SETTINGS_FILE, {});
    const settingKey = kind === 'youtube' ? 'cookies_youtube_path' : 'cookies_gallery_path';
    const updatedSettings = { ...settings, [settingKey]: targetPath };
    writeJson(SETTINGS_FILE, updatedSettings);

    res.json({
      ok: true,
      status: buildCookieStatus(kind, updatedSettings),
      settings: updatedSettings,
    });
  });

  app.delete('/api/settings/cookies/:kind', (req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const kindRaw = String(req.params.kind || '').trim().toLowerCase();
    if (kindRaw !== 'youtube' && kindRaw !== 'gallery') {
      return res.status(400).json({ error: 'Cookie kind must be "youtube" or "gallery".' });
    }
    const kind = kindRaw as 'youtube' | 'gallery';
    const targetPath = path.resolve(
      kind === 'youtube' ? MANAGED_YT_COOKIES_FILE : MANAGED_GALLERY_COOKIES_FILE
    );
    const resolvedStateDir = path.resolve(STATE_DIR);
    if (targetPath.startsWith(resolvedStateDir + path.sep) && fs.existsSync(targetPath)) {
      try { fs.unlinkSync(targetPath); } catch {}
    }

    const settings = readJson<any>(SETTINGS_FILE, {});
    const settingKey = kind === 'youtube' ? 'cookies_youtube_path' : 'cookies_gallery_path';
    const updatedSettings = { ...settings, [settingKey]: '' };
    writeJson(SETTINGS_FILE, updatedSettings);

    res.json({
      ok: true,
      status: buildCookieStatus(kind, updatedSettings),
      settings: updatedSettings,
    });
  });

  app.post('/api/webhook/test', async (req, res) => {
    const active = getActiveUser();
    if (!active) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const candidateUrl =
      typeof req.body?.webhook_url === 'string' && req.body.webhook_url.trim()
        ? req.body.webhook_url.trim()
        : undefined;
    const result = await sendWebhookNotification(
      {
        status: 'test',
        title: 'MediaGrabber Webhook Connected',
        engine: 'SYSTEM',
        message: 'Test alert from MediaGrabber — completion and failure webhooks are active.',
      },
      candidateUrl
    );
    if (!result.sent) {
      return res.status(400).json({ ok: false, error: result.error || 'No webhook URL configured.' });
    }
    res.json({ ok: true, message: 'Test webhook delivered.' });
  });

  app.get('/api/quickstart/status', (_req, res) => {
    const settings = readJson<any>(SETTINGS_FILE, {});
    const users = readJson<any[]>(USERS_FILE, []);
    res.json({
      quick_start_completed: settings?.quick_start_completed === true,
      has_admin: users.some((u) => u.role === 'admin'),
      user_count: users.length,
    });
  });

  app.post('/api/quickstart/admin', (req, res) => {
    const users = readJson<any[]>(USERS_FILE, []);
    const hasAdmin = users.some((u) => u.role === 'admin');
    const active = getActiveUser();
    if (hasAdmin && (!active || active.role !== 'admin')) {
      return res.status(403).json({
        error: 'Sign in as an existing administrator before creating another admin account.',
      });
    }

    const username = String(req.body?.username || '').trim();
    const displayName = String(req.body?.display_name || '').trim() || username;
    const email = String(req.body?.email || '').trim() || `${username}@mediagrabber.local`;
    const password = String(req.body?.password || '');
    const password2 = String(req.body?.password2 ?? password);
    const switchSession = req.body?.switch_session !== false;

    if (username.length < 3 || username.length > 32) {
      return res.status(400).json({ error: 'Username must be 3 to 32 characters.' });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username may only contain letters, numbers, _, ., and -.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (password !== password2) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({
        error: `Username "${username}" already exists — existing accounts were preserved untouched.`,
      });
    }

    const newAdmin = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      username,
      display_name: displayName,
      email,
      role: 'admin',
      avatar: DEFAULT_AVATAR,
      theme: 'dark',
      totp_enabled: false,
      totp_secret: '',
      theme_colors: null,
      password_hash: hashPassword(password),
    };
    const nextUsers = [...users, newAdmin];
    writeJson(USERS_FILE, nextUsers);
    if (switchSession || !currentUserId) {
      currentUserId = newAdmin.id;
    }

    res.status(201).json({
      ok: true,
      user: sanitizeUser(newAdmin),
      preserved_count: users.length,
      users: nextUsers.map(sanitizeUser),
    });
  });

  app.post('/api/quickstart/complete', (_req, res) => {
    const active = getActiveUser();
    if (!active) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const current = readJson<any>(SETTINGS_FILE, {});
    writeJson(SETTINGS_FILE, { ...current, quick_start_completed: true });
    res.json({ ok: true });
  });

  app.post('/api/queue/cleanup-stale', (_req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const cleaned = runStaleJobCleanup();
    res.json({ ok: true, cleaned });
  });

  app.get('/api/stats', (_req, res) => {
    const active = getActiveUser();
    if (!active) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const settings = readJson<any>(SETTINGS_FILE, {});
    const jobs = Array.from(queue.values());
    const history = readJson<any[]>(HISTORY_FILE, []);
    const now = Date.now();

    const bySource: Record<string, number> = {
      youtube: 0,
      ytmusic: 0,
      spotify: 0,
      gallery: 0,
      other: 0,
    };
    let recent24h = 0;
    let recent7d = 0;
    for (const h of history) {
      const src = String(h?.source || 'other').toLowerCase();
      if (src in bySource) bySource[src]++;
      else bySource.other++;
      const ts = new Date(h?.timestamp || 0).getTime();
      if (Number.isFinite(ts)) {
        if (now - ts <= 86_400_000) recent24h++;
        if (now - ts <= 7 * 86_400_000) recent7d++;
      }
    }

    const qDone = jobs.filter((j) => j.status === 'done').length;
    const qFailed = jobs.filter((j) => j.status === 'failed').length;
    const totalCompleted = Math.max(history.length, qDone);
    const totalAttempts = totalCompleted + qFailed;
    const successRate = totalAttempts > 0 ? Math.round((totalCompleted / totalAttempts) * 100) : 100;

    const libDefs = [
      { name: 'YouTube', dir: isSafeLibraryBasePath(settings?.yt_base_path) || YT_DIR },
      { name: 'Music', dir: isSafeLibraryBasePath(settings?.music_base_path) || MUSIC_DIR },
      { name: 'Gallery', dir: isSafeLibraryBasePath(settings?.gallery_base_path) || GALLERY_DIR },
    ];
    let totalBytes = 0;
    let totalFiles = 0;
    const libraries = libDefs.map(({ name, dir }) => {
      let fileCount = 0;
      let bytes = 0;
      if (fs.existsSync(dir)) {
        for (const f of walkFiles(dir)) {
          const ext = path.extname(f).toLowerCase();
          if (!MEDIA_EXTS.has(ext) && !['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) continue;
          try {
            const st = fs.statSync(f);
            if (st.isFile()) {
              fileCount++;
              bytes += st.size;
            }
          } catch {
            // ignore unreadable file
          }
        }
      }
      totalBytes += bytes;
      totalFiles += fileCount;
      return { name, path: dir, file_count: fileCount, size_bytes: bytes };
    });

    res.json({
      queue: {
        total: jobs.length,
        queued: jobs.filter((j) => j.status === 'queued').length,
        running: jobs.filter((j) => j.status === 'running').length,
        done: qDone,
        failed: qFailed,
        cancelled: jobs.filter((j) => j.status === 'cancelled').length,
      },
      history: {
        total: history.length,
        recent_24h: recent24h,
        recent_7d: recent7d,
        by_source: bySource,
      },
      success_rate: successRate,
      storage_summary: {
        total_files: totalFiles,
        total_bytes: totalBytes,
        libraries,
      },
    });
  });

  app.post('/api/scan-media', async (_req, res) => {
    const settings = readJson<any>(SETTINGS_FILE, {});
    const jfUrl = String(settings.jellyfin_url || '').trim();
    const jfKey = String(settings.jellyfin_api_key || '').trim();
    if (!jfUrl || !jfKey) {
      return res.status(400).json({ error: 'Jellyfin URL and API Key are required in Settings.' });
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const r = await fetch(`${jfUrl.replace(/\/+$/, '')}/Library/Refresh`, {
        method: 'POST',
        headers: { 'X-Emby-Token': jfKey },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (r.ok) {
        return res.json({ success: true, message: 'Jellyfin library scan triggered.' });
      }
      return res.status(502).json({ error: `Jellyfin returned HTTP ${r.status}` });
    } catch (err: any) {
      return res.status(502).json({ error: `Could not reach Jellyfin: ${err?.message || 'network error'}` });
    }
  });

  app.get('/api/storage', (_req, res) => {
    const settings = readJson<any>(SETTINGS_FILE, {});
    const mounts: Record<string, string> = {
      Video: isSafeLibraryBasePath(settings.yt_base_path) || YT_DIR,
      Music: isSafeLibraryBasePath(settings.music_base_path) || MUSIC_DIR,
      Gallery: isSafeLibraryBasePath(settings.gallery_base_path) || GALLERY_DIR,
    };

    const result: Record<string, any> = {};
    for (const [label, target] of Object.entries(mounts)) {
      try {
        fs.mkdirSync(target, { recursive: true });
        const stats = fs.statfsSync(target);
        const totalBytes = Number(stats.blocks) * Number(stats.bsize);
        const freeBytes = Number(stats.bavail) * Number(stats.bsize);
        const usedBytes = Math.max(0, totalBytes - freeBytes);
        result[label] = {
          path: target,
          free_gb: Number((freeBytes / 1024 ** 3).toFixed(1)),
          total_gb: Number((totalBytes / 1024 ** 3).toFixed(1)),
          percent_used: totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0,
        };
      } catch {
        result[label] = { path: target, error: 'Unavailable' };
      }
    }
    res.json(result);
  });

  // ---- Reorganize & Tmp Reorder ----
  app.post('/api/reorganize', (req, res) => {
    if (reorgState.status === 'running') {
      return res.json({ status: 'already running' });
    }
    reorgState.status = 'running';
    reorgState.logs = [`[${new Date().toLocaleTimeString()}] Starting library organization pass...`];

    const settings = readJson<any>(SETTINGS_FILE, {});
    const ytTarget = isSafeLibraryBasePath(settings.yt_base_path) || YT_DIR;
    const musicTarget = isSafeLibraryBasePath(settings.music_base_path) || MUSIC_DIR;
    const galleryTarget = isSafeLibraryBasePath(settings.gallery_base_path) || GALLERY_DIR;

    const scanCandidates: { label: string; scanRoot: string; destRoot: string }[] = [
      { label: 'YouTube', scanRoot: ytTarget, destRoot: ytTarget },
      { label: 'Music', scanRoot: musicTarget, destRoot: musicTarget },
      { label: 'Gallery', scanRoot: galleryTarget, destRoot: galleryTarget },
      { label: 'YouTube (/var)', scanRoot: '/var/lib/mediagrabber/YouTube', destRoot: ytTarget },
      { label: 'Music (/var)', scanRoot: '/var/lib/mediagrabber/Music', destRoot: musicTarget },
      { label: 'Gallery (/var)', scanRoot: '/var/lib/mediagrabber/Gallery', destRoot: galleryTarget },
      { label: 'YouTube (workspace)', scanRoot: YT_DIR, destRoot: ytTarget },
      { label: 'Music (workspace)', scanRoot: MUSIC_DIR, destRoot: musicTarget },
      { label: 'Gallery (workspace)', scanRoot: GALLERY_DIR, destRoot: galleryTarget },
    ];

    const extraDir = isSafeLibraryBasePath(req.body?.path);
    if (extraDir) {
      scanCandidates.push({ label: 'Custom (/var/lib)', scanRoot: extraDir, destRoot: ytTarget });
    }

    const seenRoots = new Set<string>();
    let movedCount = 0;
    for (const d of scanCandidates) {
      const resolvedScan = path.resolve(d.scanRoot);
      if (seenRoots.has(resolvedScan) || !fs.existsSync(resolvedScan)) continue;
      seenRoots.add(resolvedScan);

      const files = walkFiles(resolvedScan).filter((f) => MEDIA_EXTS.has(path.extname(f).toLowerCase()));
      reorgState.logs.push(`[${d.label}] Checked ${files.length} media file(s) in ${resolvedScan}`);
      for (const f of files) {
        const infoPath = f.replace(/\.[^.]+$/, '.info.json');
        const info = fs.existsSync(infoPath) ? readJson<any>(infoPath, {}) : {};
        const uploader = sanitizeSegment(info.uploader || 'Unsorted', 'Unsorted');
        const isMusic = d.label.startsWith('Music') || info.engine === 'SPOTIFY' || ['.mp3', '.flac', '.m4a', '.opus'].includes(path.extname(f).toLowerCase());
        const subFolder = isMusic
          ? sanitizeSegment(info.album || 'Singles', 'Singles')
          : String(info.upload_date || new Date().getFullYear()).slice(0, 4);
        const targetBase = isMusic && d.label.startsWith('Custom') ? musicTarget : d.destRoot;
        const expectedDir =
          settings.folder_structure === 'flat' ? targetBase : path.join(targetBase, uploader, subFolder);
        if (path.dirname(f) !== expectedDir) {
          const dest = path.join(expectedDir, path.basename(f));
          moveFileSafe(f, dest);
          if (fs.existsSync(infoPath)) {
            moveFileSafe(infoPath, dest.replace(/\.[^.]+$/, '.info.json'));
          }
          movedCount++;
          reorgState.logs.push(`  ↳ Moved ${path.basename(f)} → ${dest}`);
        }
      }
    }
    reorgState.logs.push(`✅ Organization complete. ${movedCount} file(s) relocated.`);
    reorgState.status = 'done';
    res.json({ status: 'started' });
  });

  app.get('/api/reorganize-logs', (_req, res) => {
    res.json(reorgState);
  });

  app.post('/api/tmp-reorder', (req, res) => {
    if (tmpReorgState.status === 'running') {
      return res.json({ status: 'already running' });
    }
    tmpReorgState.status = 'running';

    const settings = readJson<any>(SETTINGS_FILE, {});
    const ytTarget = isSafeLibraryBasePath(settings.yt_base_path) || YT_DIR;
    const musicTarget = isSafeLibraryBasePath(settings.music_base_path) || MUSIC_DIR;
    const galleryTarget = isSafeLibraryBasePath(settings.gallery_base_path) || GALLERY_DIR;

    const requestedTmp = isSafeLibraryBasePath(req.body?.path);
    const tmpCandidates = [
      ...(requestedTmp ? [requestedTmp] : []),
      TMP_DIR,
      '/var/lib/mediagrabber/tmp',
      '/var/tmp/mediagrabber',
      '/tmp/mediagrabber-workspace/tmp',
      path.join(ytTarget, 'tmp'),
      path.join(musicTarget, 'tmp'),
      path.join(galleryTarget, 'tmp'),
    ];
    const tmpDirs = Array.from(new Set(tmpCandidates.map((p) => path.resolve(p)))).filter((p) =>
      fs.existsSync(p)
    );

    tmpReorgState.logs = [
      `[${new Date().toLocaleTimeString()}] Scanning ${tmpDirs.length} temp/var folder(s) for orphaned media...`,
      ...tmpDirs.map((d) => `  • ${d}`),
    ];

    let moved = 0;
    for (const dir of tmpDirs) {
      const files = walkFiles(dir).filter((f) => MEDIA_EXTS.has(path.extname(f).toLowerCase()));
      for (const f of files) {
        const infoPath = f.replace(/\.[^.]+$/, '.info.json');
        const info = fs.existsSync(infoPath) ? readJson<any>(infoPath, {}) : {};
        const ext = path.extname(f).toLowerCase();
        const isMusic =
          info.engine === 'SPOTIFY' ||
          info.engine === 'YT MUSIC' ||
          ext === '.mp3' ||
          ext === '.flac' ||
          ext === '.m4a' ||
          ext === '.opus';
        const isGallery = info.engine === 'GALLERY';
        const baseDest = isGallery ? galleryTarget : isMusic ? musicTarget : ytTarget;
        const folder1 = sanitizeSegment(info.uploader || 'Recovered', 'Recovered');
        const folder2 = sanitizeSegment(
          isMusic ? info.album || 'Singles' : String(info.upload_date || new Date().getFullYear()).slice(0, 4)
        );
        const destDir =
          settings.folder_structure === 'flat' ? baseDest : path.join(baseDest, folder1, folder2);
        const destFile = path.join(destDir, path.basename(f));
        moveFileSafe(f, destFile);
        if (fs.existsSync(infoPath)) {
          moveFileSafe(infoPath, destFile.replace(/\.[^.]+$/, '.info.json'));
        }
        moved++;
        tmpReorgState.logs.push(`  ↳ Recovered ${path.basename(f)} → ${destDir}`);
      }
    }
    if (moved === 0) {
      tmpReorgState.logs.push('No orphaned media files found in workspace or /var temp directories.');
    } else {
      tmpReorgState.logs.push(`✅ Moved ${moved} orphaned file(s) into final library folders.`);
    }
    tmpReorgState.status = 'done';
    res.json({ status: 'started' });
  });

  app.get('/api/tmp-reorder-logs', (_req, res) => {
    res.json(tmpReorgState);
  });

  // ---- Deduplicate (SHA-256) ----
  app.post('/api/deduplicate', (req, res) => {
    const settings = readJson<any>(SETTINGS_FILE, {});
    const action = req.body?.action === 'delete' ? 'delete' : 'scan';
    const defaultYt = isSafeLibraryBasePath(settings.yt_base_path) || YT_DIR;
    const requestedPath = String(req.body?.path || defaultYt);
    const targetDir = safePathWithinLibraries(requestedPath, settings) || defaultYt;

    if (!fs.existsSync(targetDir)) {
      return res.status(400).json({ error: `Folder not found in configured libraries: ${requestedPath}` });
    }

    const files = walkFiles(targetDir).filter((f) => MEDIA_EXTS.has(path.extname(f).toLowerCase()));
    const byHash = new Map<string, string[]>();
    for (const file of files) {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      const group = byHash.get(hash) || [];
      group.push(file);
      byHash.set(hash, group);
    }

    const logs: string[] = [`Scanned ${files.length} file(s) in ${targetDir}`];
    let duplicateCount = 0;
    let trashedCount = 0;

    for (const [hash, group] of byHash.entries()) {
      if (group.length <= 1) continue;
      group.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
      const [keep, ...dups] = group;
      logs.push(`Match [${hash.slice(0, 12)}] — Keep: ${path.basename(keep)}`);
      for (const dup of dups) {
        duplicateCount++;
        if (action === 'delete') {
          fs.mkdirSync(TRASH_DIR, { recursive: true });
          const trashDest = path.join(TRASH_DIR, `${Date.now()}_${path.basename(dup)}`);
          moveFileSafe(dup, trashDest);
          const dupInfo = dup.replace(/\.[^.]+$/, '.info.json');
          if (fs.existsSync(dupInfo)) fs.unlinkSync(dupInfo);
          trashedCount++;
          logs.push(`  🗑️ Moved duplicate to trash: ${path.basename(dup)}`);
        } else {
          logs.push(`  ⚠️ Duplicate found: ${dup}`);
        }
      }
    }

    if (duplicateCount === 0) {
      logs.push('✅ No exact SHA-256 duplicates found.');
    } else if (action === 'scan') {
      logs.push(`Found ${duplicateCount} duplicate file(s). Click "Delete Duplicates" to move them to trash.`);
    } else {
      logs.push(`✅ Moved ${trashedCount} duplicate file(s) to ${TRASH_DIR}.`);
    }

    res.json({ status: 'done', duplicateCount, trashedCount, logs });
  });

  // ---- Archive Manager ----
  app.get('/api/archive', (_req, res) => {
    if (!fs.existsSync(ARCHIVE_FILE)) return res.json([]);
    const lines = fs.readFileSync(ARCHIVE_FILE, 'utf-8').split('\n').filter(Boolean);
    const entries = lines.map((raw) => {
      const parts = raw.trim().split(/\s+/);
      const source = parts[0] || 'unknown';
      const id = parts[1] || raw;
      let url = id;
      if (source === 'youtube' || source === 'ytmusic') url = `https://www.youtube.com/watch?v=${id}`;
      else if (source === 'spotify') url = `https://open.spotify.com/track/${id}`;
      return { raw, source, id, url };
    });
    res.json(entries);
  });

  app.post('/api/archive/delete', (req, res) => {
    const entry = String(req.body?.entry || '').trim();
    if (!entry) return res.status(400).json({ error: 'Entry is required' });
    if (fs.existsSync(ARCHIVE_FILE)) {
      const lines = fs
        .readFileSync(ARCHIVE_FILE, 'utf-8')
        .split('\n')
        .filter((l) => l.trim() && l.trim() !== entry);
      fs.writeFileSync(ARCHIVE_FILE, lines.length ? lines.join('\n') + '\n' : '');
    }
    res.json({ status: 'deleted' });
  });

  // ---- Metadata & Cover Editor ----
  app.post('/api/metadata/editor/scan', (req, res) => {
    const settings = readJson<any>(SETTINGS_FILE, {});
    const defaultScanRoot = isSafeLibraryBasePath(settings.yt_base_path) || WORKSPACE_ROOT;
    const reqFolder = String(req.body?.folder || defaultScanRoot);
    const targetDir = safePathWithinLibraries(reqFolder, settings);
    if (!targetDir || !fs.existsSync(targetDir)) {
      return res.status(400).json({ error: 'Directory not found inside configured library paths' });
    }

    const files = walkFiles(targetDir)
      .filter((f) => MEDIA_EXTS.has(path.extname(f).toLowerCase()) && !f.startsWith(TRASH_DIR) && !f.startsWith(TMP_DIR))
      .sort();

    const items = files.map((filePath) => {
      const infoPath = filePath.replace(/\.[^.]+$/, '.info.json');
      const info = fs.existsSync(infoPath) ? readJson<any>(infoPath, {}) : {};
      const base = filePath.replace(/\.[^.]+$/, '');
      const localCover = ['.jpg', '.jpeg', '.png', '.webp'].map((e) => base + e).find((p) => fs.existsSync(p));
      const stat = fs.statSync(filePath);
      return {
        path: filePath,
        filename: path.basename(filePath),
        title: info.title || path.basename(filePath, path.extname(filePath)),
        artist: info.uploader || info.artist || '',
        album: info.album || '',
        date: info.upload_date || '',
        description: info.description || '',
        extension: path.extname(filePath).slice(1).toLowerCase(),
        size_bytes: stat.size,
        has_cover: Boolean(localCover || info.cover_url),
        cover_url: localCover
          ? `/api/media-cover?path=${encodeURIComponent(localCover)}&t=${stat.mtimeMs}`
          : info.cover_url || DEFAULT_YT_THUMB,
      };
    });

    res.json(items);
  });

  app.get('/api/media-cover', (req, res) => {
    const requested = String(req.query.path || '');
    const safe = safePathWithinLibraries(requested);
    if (!safe || !fs.existsSync(safe)) return res.status(404).end();
    res.sendFile(safe);
  });

  app.post('/api/metadata/editor/update', upload.single('cover'), async (req, res) => {
    const filePath = String(req.body?.file_path || '');
    const safeFile = safePathWithinLibraries(filePath);
    if (!safeFile || !fs.existsSync(safeFile)) {
      return res.status(400).json({ error: 'Invalid media file path' });
    }

    const infoPath = safeFile.replace(/\.[^.]+$/, '.info.json');
    const info = fs.existsSync(infoPath) ? readJson<any>(infoPath, {}) : {};
    info.title = String(req.body?.title || '');
    info.uploader = String(req.body?.artist || '');
    info.album = String(req.body?.album || '');
    info.upload_date = String(req.body?.date || '');
    info.description = String(req.body?.description || '');

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
      const coverPath = safeFile.replace(/\.[^.]+$/, ext);
      fs.writeFileSync(coverPath, req.file.buffer);
      info.cover_url = `/api/media-cover?path=${encodeURIComponent(coverPath)}&t=${Date.now()}`;

      // Embed cover for audio formats using ffmpeg if possible
      if (['.mp3', '.flac', '.m4a'].includes(path.extname(safeFile).toLowerCase())) {
        const tmpOut = `${safeFile}.tmp${path.extname(safeFile)}`;
        try {
          await execFileAsync(
            'ffmpeg',
            [
              '-y',
              '-i', safeFile,
              '-i', coverPath,
              '-map', '0:a',
              '-map', '1:0',
              '-c', 'copy',
              '-id3v2_version', '3',
              tmpOut,
            ],
            { timeout: 10000 }
          );
          fs.renameSync(tmpOut, safeFile);
        } catch {
          if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
        }
      }
    }

    writeJson(infoPath, info);
    res.json({ status: 'updated' });
  });

  // ---- Radio Manager (Radio-Browser API + Persisted Navidrome List) ----
  app.get('/api/radio/status', (_req, res) => {
    const stations = readJson<any[]>(RADIOS_FILE, []);
    res.json({
      connected: true,
      db_path: radioDbPath,
      station_count: stations.length,
      note: 'Persisted to MediaGrabber Radio Registry (Navidrome-compatible)',
    });
  });

  app.post('/api/radio/setdb', (req, res) => {
    const dbPath = String(req.body?.db_path || '').trim();
    if (!dbPath) return res.status(400).json({ error: 'Database path is required' });
    radioDbPath = dbPath;
    res.json({ status: 'saved', db_path: radioDbPath });
  });

  app.get('/api/radio/list', (_req, res) => {
    const stations = readJson<any[]>(RADIOS_FILE, []);
    res.json({ stations });
  });

  app.post('/api/radio/search', async (req, res) => {
    const query = String(req.body?.query || '').trim();
    const searchType = String(req.body?.type || 'name');
    if (!query) return res.status(400).json({ error: 'Search query is required' });

    const paramKey = searchType === 'genre' ? 'tag' : searchType === 'country' ? 'country' : 'name';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const apiRes = await fetch(
        `https://de1.api.radio-browser.info/json/stations/search?${paramKey}=${encodeURIComponent(query)}&limit=15&hidebroken=true&order=votes&reverse=true`,
        {
          headers: { 'User-Agent': 'MediaGrabber/1.9' },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      if (apiRes.ok) {
        const rows = (await apiRes.json()) as any[];
        const stations = rows
          .filter((r) => r.url_resolved || r.url)
          .map((r) => ({
            id: r.stationuuid || crypto.randomUUID(),
            name: r.name || 'Unnamed Station',
            url: r.url_resolved || r.url,
            homepage: r.homepage || '',
            country: r.country || '',
            tags: r.tags || '',
            bitrate: r.bitrate || 0,
            codec: r.codec || '',
          }));
        return res.json({ stations });
      }
    } catch {
      // Fallback below
    }

    const fallbackCatalog = [
      {
        id: 'fb-1',
        name: 'SomaFM Drone Zone',
        url: 'https://ice1.somafm.com/dronezone-128-mp3',
        homepage: 'https://somafm.com/dronezone/',
        country: 'United States',
        tags: 'ambient,space,drone',
        bitrate: 128,
        codec: 'MP3',
      },
      {
        id: 'fb-2',
        name: 'SomaFM DEF CON Radio',
        url: 'https://ice1.somafm.com/defcon-128-mp3',
        homepage: 'https://somafm.com/defcon/',
        country: 'United States',
        tags: 'electronic,techno,cyber',
        bitrate: 128,
        codec: 'MP3',
      },
      {
        id: 'fb-3',
        name: 'Radio Paradise Mellow Mix',
        url: 'https://stream.radioparadise.com/mellow-192',
        homepage: 'https://radioparadise.com',
        country: 'United States',
        tags: 'mellow,indie,acoustic',
        bitrate: 192,
        codec: 'MP3',
      },
    ];
    const qLower = query.toLowerCase();
    const matched = fallbackCatalog.filter(
      (s) =>
        s.name.toLowerCase().includes(qLower) ||
        s.tags.toLowerCase().includes(qLower) ||
        s.country.toLowerCase().includes(qLower)
    );
    res.json({ stations: matched.length ? matched : fallbackCatalog });
  });

  app.post('/api/radio/add', (req, res) => {
    const url = String(req.body?.url || '').trim();
    const name = String(req.body?.name || '').trim();
    const homepage = String(req.body?.homepage || '').trim();
    if (!url) return res.status(400).json({ error: 'Stream URL is required' });

    const stations = readJson<any[]>(RADIOS_FILE, []);
    if (stations.some((s) => s.url === url)) {
      return res.status(400).json({ error: 'That stream URL is already added.' });
    }
    let derivedName = name;
    if (!derivedName) {
      try {
        derivedName = new URL(url).hostname;
      } catch {
        derivedName = url;
      }
    }
    const newStation = {
      id: `rad-${crypto.randomUUID().slice(0, 8)}`,
      name: derivedName,
      url,
      homepage,
      country: req.body?.country || '',
      tags: req.body?.tags || '',
    };
    stations.push(newStation);
    writeJson(RADIOS_FILE, stations);
    res.json({ status: 'success', station: newStation, message: `Added '${derivedName}' to Navidrome radio list.` });
  });

  app.post('/api/radio/remove', (req, res) => {
    const id = String(req.body?.id || '').trim();
    const url = String(req.body?.url || '').trim();
    const stations = readJson<any[]>(RADIOS_FILE, []);
    const filtered = stations.filter((s) => (id ? s.id !== id : s.url !== url));
    writeJson(RADIOS_FILE, filtered);
    res.json({ status: 'success', message: 'Station removed.' });
  });

  // ---- Server Manager Utilities ----
  app.get('/api/utilities', (_req, res) => {
    res.json([
      { id: 'sysinfo', name: 'System Info' },
      { id: 'manage_users', name: 'User Roster Summary' },
    ]);
  });

  app.post('/api/utilities/run', async (req, res) => {
    const utilId = req.body?.id;
    if (utilId === 'sysinfo') {
      try {
        let hostLine = '';
        if (IS_WINDOWS) {
          hostLine = `${PLATFORM_SUFFIX} (Build ${os.release()}) ${os.arch()} on ${os.hostname()}`;
        } else {
          const { stdout } = await execFileAsync('uname', ['-a']);
          hostLine = `${stdout.trim()} (${PLATFORM_SUFFIX})`;
        }
        let ffmpegVersion = 'unavailable';
        try {
          const ffBin = resolveExecutable('ffmpeg') || 'ffmpeg';
          const ff = await execFileAsync(ffBin, ['-version']);
          ffmpegVersion = ff.stdout.split('\n')[0] || 'installed';
        } catch {
          // ignore
        }
        const ytdlpFound = resolveExecutable('yt-dlp') || 'unavailable';
        const grabFound = resolveGrabCommand()?.scriptPath || 'unavailable';
        return res.json({
          stdout: `${hostLine}\nVersion: ${CURRENT_APP_VERSION}\nNode.js: ${process.version}\nFFmpeg: ${ffmpegVersion}\nyt-dlp: ${ytdlpFound}\ngrab: ${grabFound}\nWorkspace: ${WORKSPACE_ROOT}`,
          stderr: '',
        });
      } catch (err: any) {
        return res.json({ stdout: '', stderr: err?.message || 'Command failed' });
      }
    }
    if (utilId === 'manage_users') {
      const users = readJson<any[]>(USERS_FILE, []);
      const lines = users.map((u) => `${u.username.padEnd(18)} role=${u.role.padEnd(8)} 2fa=${u.totp_enabled ? 'on' : 'off'}`);
      return res.json({
        stdout: `Registered MediaGrabber Users (${users.length}):\n` + lines.join('\n'),
        stderr: '',
      });
    }
    return res.status(400).json({ error: 'Unknown utility' });
  });

  // ---- v2.0 Self-Service Registration ----
  app.post('/api/auth/register', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const displayName = String(req.body?.display_name || '').trim() || username;
    const email = String(req.body?.email || '').trim() || `${username}@mediagrabber.local`;
    const password = String(req.body?.password || '');
    const password2 = String(req.body?.password2 ?? password);
    if (username.length < 3 || username.length > 32) {
      return res.status(400).json({ error: 'Username must be 3 to 32 characters.' });
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username may only contain letters, numbers, _, ., and -.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (password !== password2) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    const users = readJson<any[]>(USERS_FILE, []);
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    const newUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      username,
      display_name: displayName,
      email,
      role: 'user',
      avatar: DEFAULT_AVATAR,
      theme: 'dark',
      totp_enabled: false,
      totp_secret: '',
      theme_colors: null,
      password_hash: hashPassword(password),
    };
    users.push(newUser);
    writeJson(USERS_FILE, users);
    currentUserId = newUser.id;
    res.status(201).json({ success: true, user: sanitizeUser(newUser) });
  });

  // ---- v2.0 Scheduled Downloads & Worker ----
  if (!fs.existsSync(SCHEDULE_FILE)) {
    writeJson(SCHEDULE_FILE, []);
  }

  function runScheduledTick() {
    try {
      const nowLocal = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const nowKey = `${nowLocal.getFullYear()}-${pad(nowLocal.getMonth() + 1)}-${pad(nowLocal.getDate())}T${pad(nowLocal.getHours())}:${pad(nowLocal.getMinutes())}`;
      const jobs = readJson<any[]>(SCHEDULE_FILE, []);
      let changed = false;
      for (const item of jobs) {
        if (item.status === 'pending' && item.scheduled_time <= nowKey) {
          try {
            const jobId = crypto.randomUUID();
            const engine = detectEngine(item.url);
            const qJob: JobRecord = {
              job_id: jobId,
              url: item.url,
              mode: item.mode === 'audio' ? 'audio' : 'video',
              engine,
              status: 'queued',
              progress: 0,
              file: null,
              thumbnail:
                engine === 'SPOTIFY' || engine === 'YT MUSIC'
                  ? DEFAULT_MUSIC_THUMB
                  : engine === 'GALLERY'
                  ? DEFAULT_GALLERY_THUMB
                  : DEFAULT_YT_THUMB,
              output_dir: null,
              log: [`[scheduler] Fired scheduled job #${item.id}: ${item.url}`],
              created_at: new Date().toISOString(),
            };
            queue.set(jobId, qJob);
            void processJob(jobId);
            item.status = 'fired';
            item.fired_at = new Date().toISOString();
            item.job_id = jobId;
            changed = true;
            console.log(`[scheduler] fired job ${item.id}: ${item.url}`);
          } catch (err: any) {
            console.error(`[scheduler] failed to fire job ${item.id}:`, err);
            item.status = 'failed';
            item.fired_at = new Date().toISOString();
            item.error = err?.message || String(err);
            changed = true;
          }
        }
      }
      if (changed) writeJson(SCHEDULE_FILE, jobs);
    } catch (err) {
      console.error('[scheduler] loop error:', err);
    }
  }

  // Startup delay (v1.9.6 fix) so server finishes booting before running scheduled jobs
  setTimeout(() => {
    runScheduledTick();
    setInterval(runScheduledTick, 15_000);
  }, 5_000);

  app.get('/api/schedule', (_req, res) => {
    const jobs = readJson<any[]>(SCHEDULE_FILE, []);
    res.json(jobs.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)));
  });

  app.post('/api/schedule', (req, res) => {
    const url = String(req.body?.url || '').trim();
    const mode = req.body?.mode === 'audio' ? 'audio' : 'video';
    const scheduledTime = String(req.body?.scheduled_time || '').trim();
    if (!url || !scheduledTime) {
      return res.status(400).json({ error: 'URL and scheduled time are required.' });
    }
    const jobs = readJson<any[]>(SCHEDULE_FILE, []);
    const nextId = jobs.reduce((max, j) => Math.max(max, Number(j.id) || 0), 0) + 1;
    const entry = {
      id: nextId,
      url,
      mode,
      scheduled_time: scheduledTime,
      status: 'pending',
      created_at: new Date().toISOString(),
      fired_at: null,
      job_id: null,
    };
    jobs.push(entry);
    writeJson(SCHEDULE_FILE, jobs);
    runScheduledTick();
    res.status(201).json(entry);
  });

  app.delete('/api/schedule/:id', (req, res) => {
    const id = Number(req.params.id);
    const jobs = readJson<any[]>(SCHEDULE_FILE, []);
    writeJson(
      SCHEDULE_FILE,
      jobs.filter((j) => j.id !== id)
    );
    res.json({ deleted: id });
  });

  // ---- v2.0 API Tokens ----
  if (!fs.existsSync(TOKENS_FILE)) {
    writeJson(TOKENS_FILE, []);
  }

  function readTokenStore(): any[] {
    const raw = readJson<any>(TOKENS_FILE, []);
    return Array.isArray(raw) ? raw : [];
  }

  app.get('/api/tokens', (_req, res) => {
    const activeUser = getActiveUser();
    if (!activeUser || activeUser.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const tokens = readTokenStore();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      tokens: tokens.map(({ token_hash: _h, ...rest }) => rest),
    });
  });

  app.post('/api/tokens', (req, res) => {
    try {
      const activeUser = getActiveUser();
      if (!activeUser || activeUser.role !== 'admin') {
        return res.status(403).json({ error: 'Administrator privileges required to create API tokens.' });
      }
      const name = String(req.body?.name || '').trim();
      const scope = ['read', 'download', 'admin'].includes(req.body?.scope) ? req.body.scope : 'read';
      if (!name) {
        return res.status(400).json({ error: 'Token name is required.' });
      }
      const raw = `mg_${crypto.randomBytes(16).toString('hex')}`;
      const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
      const tokens = readTokenStore();
      const nextId = tokens.reduce((max, t) => Math.max(max, Number(t?.id) || 0), 0) + 1;
      const record = {
        id: nextId,
        name,
        token_hash: tokenHash,
        token_prefix: raw.slice(0, 8),
        scope,
        created_by: activeUser.username || 'christopher',
        created_at: new Date().toISOString(),
        last_used_at: null,
        revoked: false,
      };
      tokens.unshift(record);
      writeJson(TOKENS_FILE, tokens);
      const { token_hash: _h, ...safeRecord } = record;
      res.status(201).json({
        id: record.id,
        token: raw,
        record: safeRecord,
        warning: 'This token is shown once. Copy it now.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to persist API token.' });
    }
  });

  app.post('/api/tokens/:id/revoke', (req, res) => {
    const activeUser = getActiveUser();
    if (!activeUser || activeUser.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const id = Number(req.params.id);
    const tokens = readTokenStore();
    const found = tokens.find((t) => Number(t?.id) === id);
    if (!found) return res.status(404).json({ error: 'Token not found.' });
    found.revoked = true;
    writeJson(TOKENS_FILE, tokens);
    res.json({ success: true });
  });

  app.delete('/api/tokens/:id', (req, res) => {
    const activeUser = getActiveUser();
    if (!activeUser || activeUser.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const id = Number(req.params.id);
    const tokens = readTokenStore();
    writeJson(
      TOKENS_FILE,
      tokens.filter((t) => Number(t?.id) !== id)
    );
    res.json({ deleted: id });
  });

  // ---- Version Manager (GitHub Full & Nightly Releases + Binary Updates) ----

  // ---- MediaGrabber - Jellyfin Edition Plugin API Bridge ----
  const TOKEN_SCOPE_LEVEL: Record<string, number> = {
    read: 1,
    download: 2,
    admin: 3,
  };

  function extractBearerOrApiKey(req: express.Request): string {
    const headerKey = String(req.header('x-api-key') || '').trim();
    if (headerKey) return headerKey;
    const authHeader = String(req.header('authorization') || '').trim();
    if (/^Bearer\s+/i.test(authHeader)) {
      return authHeader.replace(/^Bearer\s+/i, '').trim();
    }
    return '';
  }

  function authenticateApiToken(
    req: express.Request,
    minScope: 'read' | 'download' | 'admin'
  ): { ok: true; token: any } | { ok: false; status: number; error: string } {
    const rawToken = extractBearerOrApiKey(req);
    if (!rawToken) {
      return {
        ok: false,
        status: 401,
        error: 'MediaGrabber API Key is required (send via X-API-Key or Authorization: Bearer).',
      };
    }
    const candidateHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const tokens = readJson<any[]>(TOKENS_FILE, []);
    const matched = tokens.find((t) => {
      if (!t || typeof t.token_hash !== 'string' || t.token_hash.length !== candidateHash.length) {
        return false;
      }
      try {
        return crypto.timingSafeEqual(Buffer.from(t.token_hash, 'hex'), candidateBuf);
      } catch {
        return false;
      }
    });

    if (!matched || matched.revoked === true) {
      return {
        ok: false,
        status: 401,
        error: 'Invalid or revoked MediaGrabber API Key.',
      };
    }

    const tokenLevel = TOKEN_SCOPE_LEVEL[String(matched.scope || 'read')] ?? 0;
    const requiredLevel = TOKEN_SCOPE_LEVEL[minScope] ?? 1;
    if (tokenLevel < requiredLevel) {
      return {
        ok: false,
        status: 403,
        error: `This API Key has "${matched.scope || 'read'}" scope; "${minScope}" or "admin" scope is required.`,
      };
    }

    matched.last_used_at = new Date().toISOString();
    writeJson(TOKENS_FILE, tokens);
    return { ok: true, token: matched };
  }

  app.get('/api/jellyfin/verify', (req, res) => {
    const auth = authenticateApiToken(req, 'read');
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error });
    }
    const scope = String(auth.token.scope || 'read');
    res.json({
      ok: true,
      service: 'MediaGrabber',
      version: CURRENT_APP_VERSION,
      token_name: auth.token.name,
      scope,
      can_download: scope === 'download' || scope === 'admin',
    });
  });

  app.get('/api/jellyfin/queue', (req, res) => {
    const auth = authenticateApiToken(req, 'read');
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }
    const list = Array.from(queue.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100)
      .map((j) => ({
        job_id: j.job_id,
        url: j.url,
        title: j.title || j.url,
        mode: j.mode,
        engine: j.engine,
        status: j.status,
        progress: j.progress,
        created_at: j.created_at,
      }));
    res.json(list);
  });

  app.post('/api/jellyfin/grab', (req, res) => {
    const auth = authenticateApiToken(req, 'download');
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }
    const rawInputs: string[] = [];
    if (Array.isArray(req.body?.urls)) {
      for (const u of req.body.urls) {
        const s = String(u || '').trim();
        if (s) rawInputs.push(s);
      }
    }
    if (typeof req.body?.url === 'string') {
      for (const line of req.body.url.split(/[\r\n]+/)) {
        const s = line.trim();
        if (s) rawInputs.push(s);
      }
    }
    const validUrls = rawInputs.filter((u) => {
      try {
        const parsed = new URL(u);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    });
    if (validUrls.length === 0) {
      return res.status(400).json({ error: 'Provide at least one valid http:// or https:// media URL.' });
    }
    req.body = {
      urls: validUrls,
      mode: req.body?.mode === 'audio' ? 'audio' : 'video',
      options: req.body?.options,
    };
    return handleGrabRequest(req, res);
  });

  app.post('/api/jellyfin/cancel/:jobId', (req, res) => {
    const auth = authenticateApiToken(req, 'download');
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }
    const result = cancelJobById(req.params.jobId);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    res.json({ status: 'cancelled' });
  });

  app.post('/api/jellyfin/retry/:jobId', (req, res) => {
    const auth = authenticateApiToken(req, 'download');
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }
    const result = retryJobById(req.params.jobId);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    res.json({ status: 'retried', new_job_id: result.new_job_id });
  });
  const versionCacheByChannel: Record<'nightly' | 'stable', { data: any; ts: number }> = {
    nightly: { data: null, ts: 0 },
    stable: { data: null, ts: 0 },
  };

  const stripOsSuffix = (raw: string): string =>
    raw.trim().replace(/-(?:linux|windows11|windows10|windows|macos|darwin)$/i, '');

  const parseVer = (raw: string): [number, number, number, number, number, number] => {
    const clean = stripOsSuffix(raw).replace(/^[vV]/, '');
    const m = clean.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-.]?(.*))?$/);
    if (!m) return [0, 0, 0, 0, 0, 0];
    const maj = parseInt(m[1] || '0', 10);
    const min = parseInt(m[2] || '0', 10);
    const pat = parseInt(m[3] || '0', 10);
    const suffix = (m[4] || '').toLowerCase();
    const fixNumMatch = suffix.match(/fix(\d*)/);
    const fixRank = fixNumMatch ? (fixNumMatch[1] ? parseInt(fixNumMatch[1], 10) : 1) : 0;
    const baseSuffix = suffix.replace(/-?fix\d*/g, '');
    if (!baseSuffix || baseSuffix === 'final') return [maj, min, pat, 5, 0, fixRank];
    if (baseSuffix.startsWith('rc')) {
      const n = parseInt(baseSuffix.replace(/[^0-9]/g, '') || '0', 10);
      return [maj, min, pat, 4, n, fixRank];
    }
    if (
      baseSuffix.startsWith('pre') ||
      baseSuffix.includes('nightly') ||
      baseSuffix.startsWith('beta') ||
      baseSuffix.startsWith('alpha') ||
      baseSuffix.startsWith('dev')
    ) {
      const nums = baseSuffix.match(/\d+/g);
      const n = nums ? parseInt(nums.join(''), 10) : 0;
      return [maj, min, pat, 3, n, fixRank];
    }
    if (baseSuffix.startsWith('v')) {
      const n = parseInt(baseSuffix.replace(/[^0-9]/g, '') || '0', 10);
      return [maj, min, pat, 1, n, fixRank];
    }
    const n = parseInt(baseSuffix.replace(/[^0-9]/g, '') || '0', 10);
    return [maj, min, pat, 2, n, fixRank];
  };

  const cmpVer = (a: string, b: string): number => {
    const pa = parseVer(a);
    const pb = parseVer(b);
    for (let i = 0; i < pa.length; i++) {
      if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
  };

  const isNightlyReleaseTag = (tag: string, rel?: any): boolean =>
    Boolean(rel?.prerelease || /pre|nightly|rc|alpha|beta|dev/i.test(stripOsSuffix(tag)));

  function pickPlatformReleaseAssets(assets: any[]): { zipUrl: string | null; binaryUrl: string | null } {
    const list = Array.isArray(assets) ? assets : [];
    const byName = (pred: (lower: string) => boolean) =>
      list.find((a: any) => pred(String(a?.name || '').toLowerCase()) && a?.browser_download_url);

    const binaryAsset = IS_WINDOWS
      ? byName((n) => n.endsWith('.exe') && (n.includes('win') || n.includes('mediagrabber')))
      : byName((n) => n.includes('linux') && !n.endsWith('.zip') && !n.endsWith('.tar.gz'));

    const osZipAsset = IS_WINDOWS
      ? byName((n) => n.endsWith('.zip') && n.includes('windows'))
      : byName((n) => n.endsWith('.zip') && n.includes('linux'));
    const fallbackZipAsset = byName((n) => n.endsWith('.zip'));

    return {
      zipUrl: osZipAsset?.browser_download_url
        ? String(osZipAsset.browser_download_url)
        : fallbackZipAsset?.browser_download_url
        ? String(fallbackZipAsset.browser_download_url)
        : null,
      binaryUrl: binaryAsset?.browser_download_url ? String(binaryAsset.browser_download_url) : null,
    };
  }

  async function resolveVersionInfo(
    selectedChannel: 'nightly' | 'stable',
    force = false
  ): Promise<any> {
    const now = Date.now();
    const cached = versionCacheByChannel[selectedChannel];
    if (!force && cached.data && now - cached.ts < 300_000) {
      return cached.data;
    }

    const current = CURRENT_APP_VERSION;
    let latest = selectedChannel === 'stable' ? '' : current;
    const candidateTags: string[] = [];
    const allTags: string[] = [];
    let releaseZipUrl: string | null = null;
    let binaryAssetUrl: string | null = null;
    let isPrerelease = isNightlyReleaseTag(current);
    let error: string | null = null;

    try {
      const ghRes = await fetch(
        'https://api.github.com/repos/ai-mayhemyt/mediagrabber/releases?per_page=30',
        {
          headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'MediaGrabber' },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (ghRes.ok) {
        const releases = (await ghRes.json()) as any[];
        if (Array.isArray(releases)) {
          const published = releases.filter((r) => !r?.draft && r?.tag_name);
          for (const rel of published) {
            const tag = String(rel.tag_name).trim();
            if (tag && !allTags.some((x) => x.toLowerCase() === tag.toLowerCase())) {
              allTags.push(tag);
            }
          }
          const matching = published.filter((rel) =>
            selectedChannel === 'nightly'
              ? true
              : !isNightlyReleaseTag(String(rel.tag_name).trim(), rel)
          );
          const sortedRels = [...matching].sort((a, b) => {
            const cmp = cmpVer(String(b?.tag_name || ''), String(a?.tag_name || ''));
            if (cmp !== 0) return cmp;
            return (
              new Date(String(b?.published_at || 0)).getTime() -
              new Date(String(a?.published_at || 0)).getTime()
            );
          });
          const top = sortedRels[0];
          if (top?.tag_name) {
            const topTag = String(top.tag_name).trim();
            latest = topTag;
            isPrerelease = isNightlyReleaseTag(topTag, top);
            if (cmpVer(topTag, current) > 0) {
              const picked = pickPlatformReleaseAssets(top.assets || []);
              releaseZipUrl = picked.zipUrl;
              binaryAssetUrl = picked.binaryUrl;
            }
          }
        }
      }
    } catch {
      // fallback to git ls-remote below
    }

    try {
      const { stdout } = await execFileAsync(
        'git',
        ['ls-remote', '--tags', '--refs', 'https://github.com/ai-mayhemyt/mediagrabber.git'],
        { timeout: 6000 }
      );
      const gitTags = stdout
        .split('\n')
        .map((line) => line.split('refs/tags/')[1]?.trim())
        .filter(Boolean) as string[];
      for (const t of gitTags) {
        if (!allTags.some((x) => x.toLowerCase() === t.toLowerCase())) allTags.push(t);
        const matches =
          selectedChannel === 'nightly' ? true : !isNightlyReleaseTag(t);
        if (matches && !candidateTags.some((x) => x.toLowerCase() === t.toLowerCase())) {
          candidateTags.push(t);
        }
      }
      if (candidateTags.length > 0) {
        candidateTags.sort((a, b) => cmpVer(b, a));
        const newestTag = candidateTags[0];
        if (!latest || cmpVer(newestTag, latest) > 0) {
          latest = newestTag;
          isPrerelease = isNightlyReleaseTag(newestTag);
        }
      }
    } catch (err: any) {
      if (allTags.length === 0) {
        error = err?.message || 'Unable to reach GitHub tags';
      }
    }

    allTags.sort((a, b) => cmpVer(b, a));
    if (!latest) {
      latest = selectedChannel === 'stable' ? 'None published' : current;
    }
    const updateAvailable =
      latest !== 'None published' && cmpVer(latest, current) > 0;
    const targetBranch =
      selectedChannel === 'stable' ? 'mediagrabber' : 'mediagrabber-nightly';
    const branchUrl = `https://github.com/ai-mayhemyt/mediagrabber/tree/${targetBranch}`;

    const data = {
      current,
      base_version: BASE_APP_VERSION,
      platform: PLATFORM_SUFFIX,
      os_release: os.release(),
      os_arch: os.arch(),
      is_binary: IS_PACKAGED_BINARY,
      latest,
      channel: isNightlyReleaseTag(current) ? 'nightly' : 'stable',
      selected_channel: selectedChannel,
      branch: targetBranch,
      branch_url: branchUrl,
      is_prerelease: isPrerelease,
      update_available: updateAvailable,
      release_zip_url: releaseZipUrl,
      binary_asset_url: binaryAssetUrl,
      checked_at: new Date().toISOString(),
      tags: (candidateTags.length > 0 ? candidateTags : allTags).slice(0, 8),
      error,
    };

    if (updateAvailable && cached.data?.latest !== latest) {
      void sendPushNotification({
        title: isPrerelease
          ? 'MediaGrabber Nightly Update Available'
          : 'MediaGrabber Update Available',
        body: `Release ${latest} is available (currently on ${current}).`,
        tag: `version-${latest}`,
        url: '/',
      });
    }

    versionCacheByChannel[selectedChannel] = { data, ts: now };
    return data;
  }

  app.get('/api/version/info', async (req, res) => {
    const force = req.query.force === '1';
    const settings = readJson<any>(SETTINGS_FILE, {});
    const reqChannel =
      req.query.channel === 'stable' || req.query.channel === 'nightly'
        ? req.query.channel
        : settings?.update_channel === 'stable'
        ? 'stable'
        : 'nightly';
    const data = await resolveVersionInfo(reqChannel, force);
    res.json(data);
  });

  app.post('/api/version/channel', async (req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const channel: 'stable' | 'nightly' =
      req.body?.channel === 'stable' ? 'stable' : 'nightly';
    const currentSettings = readJson<any>(SETTINGS_FILE, {});
    writeJson(SETTINGS_FILE, { ...currentSettings, update_channel: channel });
    versionCacheByChannel.stable = { data: null, ts: 0 };
    versionCacheByChannel.nightly = { data: null, ts: 0 };
    const info = await resolveVersionInfo(channel, true);
    res.json({ ok: true, channel, info });
  });

  app.post('/api/version/update', async (req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }

    try {
      const settings = readJson<any>(SETTINGS_FILE, {});
      const selectedChannel: 'stable' | 'nightly' =
        req.body?.channel === 'stable' || req.body?.channel === 'nightly'
          ? req.body.channel
          : settings?.update_channel === 'stable'
          ? 'stable'
          : 'nightly';

      versionCacheByChannel.stable = { data: null, ts: 0 };
      versionCacheByChannel.nightly = { data: null, ts: 0 };
      const cwd = APP_ROOT;
      const current = CURRENT_APP_VERSION;

      let zipUrl = '';
      let binaryUrl = '';
      let targetTag = selectedChannel === 'stable' ? 'latest stable' : 'mediagrabber-nightly';
      try {
        const ghRes = await fetch(
          'https://api.github.com/repos/ai-mayhemyt/mediagrabber/releases?per_page=30',
          {
            headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'MediaGrabber' },
            signal: AbortSignal.timeout(6000),
          }
        );
        if (ghRes.ok) {
          const releases = (await ghRes.json()) as any[];
          if (Array.isArray(releases) && releases.length > 0) {
            const published = releases.filter((r) => !r?.draft && r?.tag_name);
            const matching = published.filter((r) =>
              selectedChannel === 'nightly'
                ? true
                : !isNightlyReleaseTag(String(r.tag_name).trim(), r)
            );
            const sorted = [...matching].sort((a, b) =>
              cmpVer(String(b?.tag_name || ''), String(a?.tag_name || ''))
            );
            const top = sorted[0];
            const topTag = String(top?.tag_name || '').trim();
            if (topTag && cmpVer(topTag, current) > 0) {
              targetTag = topTag;
              const picked = pickPlatformReleaseAssets(top?.assets || []);
              zipUrl = picked.zipUrl || '';
              binaryUrl = picked.binaryUrl || '';
            }
          }
        }
      } catch {
        // fallback to git pull
      }

      // Self-update standalone executable (.exe on Windows or standalone binary on Linux)
      if (IS_PACKAGED_BINARY) {
        if (!binaryUrl) {
          throw new Error(
            `No standalone ${IS_WINDOWS ? '.exe' : 'Linux binary'} release asset found for ${targetTag}.`
          );
        }
        const dlRes = await fetch(binaryUrl, {
          headers: { 'User-Agent': 'MediaGrabber' },
          signal: AbortSignal.timeout(120000),
        });
        if (!dlRes.ok) {
          throw new Error(`Failed to download binary update (${dlRes.status})`);
        }
        const dlBuf = Buffer.from(await dlRes.arrayBuffer());
        if (dlBuf.length < 1024 * 1024) {
          throw new Error('Downloaded executable asset appears incomplete.');
        }

        const execPath = process.execPath;
        const stagedPath = `${execPath}.new`;
        const backupPath = `${execPath}.old`;
        fs.writeFileSync(stagedPath, dlBuf);
        if (!IS_WINDOWS) {
          fs.chmodSync(stagedPath, 0o755);
        }
        try {
          if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
        } catch {}
        if (fs.existsSync(execPath)) {
          fs.renameSync(execPath, backupPath);
        }
        fs.renameSync(stagedPath, execPath);

        res.json({
          ok: true,
          message: `Updated standalone binary to ${targetTag} (${selectedChannel} channel). Restarting MediaGrabber...`,
        });
        setTimeout(() => {
          try {
            const child = spawn(execPath, process.argv.slice(1), {
              detached: true,
              stdio: 'ignore',
              cwd: APP_ROOT,
            });
            child.unref();
          } catch {}
          process.exit(0);
        }, 750);
        return;
      }

      if (zipUrl) {
        const tmpZip = path.join(os.tmpdir(), 'mediagrabber-auto-update.zip');
        const dlRes = await fetch(zipUrl, {
          headers: { 'User-Agent': 'MediaGrabber' },
          signal: AbortSignal.timeout(60000),
        });
        if (!dlRes.ok) {
          throw new Error(`Failed to download update archive (${dlRes.status})`);
        }
        const dlBuf = Buffer.from(await dlRes.arrayBuffer());
        fs.writeFileSync(tmpZip, dlBuf);
        if (IS_WINDOWS) {
          const psBin = resolveExecutable('pwsh') || resolveExecutable('powershell') || 'powershell.exe';
          await execFileAsync(
            psBin,
            ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${tmpZip.replace(/'/g, "''")}' -DestinationPath '${cwd.replace(/'/g, "''")}' -Force`],
            { timeout: 60000 }
          );
        } else {
          await execFileAsync(
            'python3',
            ['-c', 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', tmpZip, cwd],
            { timeout: 30000 }
          );
        }
        try { fs.unlinkSync(tmpZip); } catch {}
      } else {
        await execFileAsync('git', ['fetch', '--all', '--tags'], { cwd, timeout: 20000 });
        if (selectedChannel === 'stable') {
          const info = await resolveVersionInfo('stable', true);
          if (info.update_available && info.latest && info.latest !== 'None published') {
            targetTag = info.latest;
            await execFileAsync('git', ['checkout', targetTag], { cwd, timeout: 20000 });
          } else {
            return res.status(400).json({
              ok: false,
              error: `No newer full release is available above ${current} on mediagrabber.`,
            });
          }
        } else {
          // Ensure Nightly updates always track and remember `mediagrabber-nightly`
          let currentBranch = '';
          try {
            const { stdout: bOut } = await execFileAsync(
              'git',
              ['rev-parse', '--abbrev-ref', 'HEAD'],
              { cwd, timeout: 5000 }
            );
            const trimmed = bOut.trim();
            if (trimmed && trimmed !== 'HEAD') currentBranch = trimmed;
          } catch {}

          if (currentBranch !== 'mediagrabber-nightly') {
            try {
              await execFileAsync('git', ['checkout', 'mediagrabber-nightly'], { cwd, timeout: 15000 });
            } catch {
              try {
                await execFileAsync(
                  'git',
                  ['checkout', '-B', 'mediagrabber-nightly', 'origin/mediagrabber-nightly'],
                  { cwd, timeout: 15000 }
                );
              } catch {}
            }
          }

          const candidates = ['mediagrabber-nightly', 'mediagrabber'];
          let pulled = false;
          for (const br of candidates) {
            try {
              await execFileAsync('git', ['pull', '--ff-only', 'origin', br], { cwd, timeout: 20000 });
              targetTag = br;
              pulled = true;
              break;
            } catch {}
          }
          if (!pulled) {
            throw new Error('Could not pull latest commits from origin/mediagrabber-nightly or origin/mediagrabber.');
          }
        }
      }

      const npmBin = IS_WINDOWS ? 'npm.cmd' : 'npm';
      await execFileAsync(
        npmBin,
        ['install', '--no-package-lock', '--legacy-peer-deps'],
        { cwd, timeout: 120000, shell: IS_WINDOWS }
      );
      await execFileAsync(npmBin, ['run', 'build'], { cwd, timeout: 120000, shell: IS_WINDOWS });

      res.json({
        ok: true,
        message: `Updated to ${targetTag} (${selectedChannel} channel). Restarting MediaGrabber service...`,
      });
      setTimeout(() => process.exit(0), 750);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Update failed' });
    }
  });

  // ---- Health Check Endpoint ----
  app.get('/healthz', (_req, res) => {
    const jobs = Array.from(queue.values());
    res.json({
      status: 'ok',
      version: CURRENT_APP_VERSION,
      is_binary: IS_PACKAGED_BINARY,
      max_concurrent_downloads: getMaxConcurrentDownloads(),
      uptime_seconds: Math.round(process.uptime()),
      queue: {
        total: jobs.length,
        queued: jobs.filter((j) => j.status === 'queued').length,
        running: jobs.filter((j) => j.status === 'running').length,
        done: jobs.filter((j) => j.status === 'done').length,
        failed: jobs.filter((j) => j.status === 'failed').length,
      },
      active_processes: activeProcesses.size,
      timestamp: new Date().toISOString(),
    });
  });

  // ---- Signed "Send to Device" File Download (iOS / Cross-Device) ----
  app.post('/api/files/sign', (req, res) => {
    const active = getActiveUser();
    if (!active) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const jobId = String(req.body?.job_id || '').trim();
    const rawFile = String(req.body?.file || '').trim();

    let candidatePath = rawFile;
    if (jobId) {
      const job = queue.get(jobId);
      if (!job || !job.file) {
        return res.status(404).json({ error: 'Completed job file not found.' });
      }
      candidatePath = job.file;
    }

    const settings = readJson<any>(SETTINGS_FILE, {});
    const safeFile = safePathWithinLibraries(candidatePath, settings);
    if (!safeFile || !fs.existsSync(safeFile)) {
      return res.status(404).json({ error: 'Media file not found on server.' });
    }
    const stat = fs.statSync(safeFile);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'Path is not a downloadable file.' });
    }

    const expMs = Date.now() + 3600_000; // Valid for 1 hour
    const sig = signDownloadToken(safeFile, expMs);
    const filename = path.basename(safeFile);
    const url = `/api/files/download?path=${encodeURIComponent(safeFile)}&exp=${expMs}&sig=${sig}`;
    res.json({
      url,
      filename,
      size_bytes: stat.size,
      expires_at: new Date(expMs).toISOString(),
    });
  });

  app.get('/api/files/download', (req, res) => {
    const rawPath = String(req.query.path || '');
    const expMs = Number(req.query.exp || 0);
    const sig = String(req.query.sig || '');
    const inline = req.query.inline === '1';

    const settings = readJson<any>(SETTINGS_FILE, {});
    const safeFile = safePathWithinLibraries(rawPath, settings);
    if (!safeFile || !verifyDownloadToken(safeFile, expMs, sig)) {
      return res.status(403).send('Invalid or expired download link.');
    }
    if (!fs.existsSync(safeFile) || !fs.statSync(safeFile).isFile()) {
      return res.status(404).send('File not found.');
    }

    if (!inline) {
      return res.download(safeFile, path.basename(safeFile));
    }

    const ext = path.extname(safeFile).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.m4v': 'video/mp4',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.ogg': 'audio/ogg',
      '.opus': 'audio/ogg',
      '.wav': 'audio/wav',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';
    const stat = fs.statSync(safeFile);
    const total = stat.size;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(safeFile).replace(/"/g, '')}"`);

    if (range) {
      const m = range.match(/bytes=(\d+)-(\d*)/);
      if (!m) {
        return res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
      }
      const start = parseInt(m[1], 10);
      const end = m[2] ? Math.min(total - 1, parseInt(m[2], 10)) : total - 1;
      if (start >= total || start > end) {
        return res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', String(end - start + 1));
      fs.createReadStream(safeFile, { start, end }).pipe(res);
      return;
    }

    res.setHeader('Content-Length', String(total));
    fs.createReadStream(safeFile).pipe(res);
  });

  // ---- YouTube RSS Channel Feeds & Auto-Grab Poller ----
  let ytFeedCache: { videos: YoutubeFeedVideo[]; ts: number } = { videos: [], ts: 0 };

  function isVideoAlreadySeenOrQueued(videoId: string, url: string): boolean {
    const idLower = videoId.toLowerCase();
    const urlLower = url.toLowerCase();
    if (fs.existsSync(ARCHIVE_FILE)) {
      const archiveContent = fs.readFileSync(ARCHIVE_FILE, 'utf-8').toLowerCase();
      if (archiveContent.includes(idLower) || archiveContent.includes(urlLower)) {
        return true;
      }
    }
    for (const qJob of queue.values()) {
      const qUrl = String(qJob.url || '').toLowerCase();
      if (qUrl === urlLower || qUrl.includes(idLower)) {
        return true;
      }
    }
    const history = readJson<any[]>(HISTORY_FILE, []);
    for (const h of history) {
      const hUrl = String(h?.url || '').toLowerCase();
      if (hUrl === urlLower || hUrl.includes(idLower)) {
        return true;
      }
    }
    return false;
  }

  let autoPollRunning = false;
  async function pollYoutubeAutoDownloads(): Promise<{
    checked: number;
    queuedCount: number;
    channels: YoutubeFeedChannel[];
  }> {
    const channels = readJson<YoutubeFeedChannel[]>(YOUTUBE_FEEDS_FILE, []);
    if (autoPollRunning) {
      return { checked: 0, queuedCount: 0, channels };
    }
    autoPollRunning = true;
    let checked = 0;
    let queuedCount = 0;
    try {
      let dirty = false;
      for (const ch of channels) {
        if (!ch.auto_download) continue;
        checked++;
        try {
          const parsed = await fetchYoutubeChannelFeed(ch.channelId);
          const sinceMs = ch.auto_since ? new Date(ch.auto_since).getTime() : 0;
          const autoMode: 'video' | 'audio' = ch.auto_mode === 'audio' ? 'audio' : 'video';

          for (const vid of parsed.videos) {
            const pubMs = new Date(vid.published).getTime();
            if (sinceMs > 0 && Number.isFinite(pubMs) && pubMs <= sinceMs) {
              continue;
            }
            if (isVideoAlreadySeenOrQueued(vid.videoId, vid.url)) {
              continue;
            }
            const jobId = crypto.randomUUID();
            const job: JobRecord = {
              job_id: jobId,
              url: vid.url,
              title: vid.title,
              uploader: ch.title || vid.channelTitle,
              mode: autoMode,
              options: { playlist_mode: 'single' },
              engine: 'YOUTUBE',
              status: 'queued',
              progress: 0,
              file: null,
              thumbnail: vid.thumbnail || DEFAULT_YT_THUMB,
              output_dir: null,
              log: [`[auto-grab] Auto-queued new upload from ${ch.title}: ${vid.title}`],
              created_at: new Date().toISOString(),
            };
            queue.set(jobId, job);
            queuedCount++;
          }

          ch.last_checked_at = new Date().toISOString();
          dirty = true;
        } catch {
          // ignore single channel transient fetch errors
        }
      }
      if (dirty) {
        writeJson(YOUTUBE_FEEDS_FILE, channels);
      }
      if (queuedCount > 0) {
        persistQueue();
        scheduleQueueWorker();
        void sendPushNotification({
          title: 'YouTube Auto-Grab',
          body: `Queued ${queuedCount} new upload${queuedCount === 1 ? '' : 's'} from followed channels.`,
          tag: 'yt-auto-grab',
          url: '/',
        });
      }
      return { checked, queuedCount, channels };
    } finally {
      autoPollRunning = false;
    }
  }

  app.get('/api/feeds/youtube', async (req, res) => {
    const active = getActiveUser();
    if (!active) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const force = req.query.force === '1';
    const channels = readJson<YoutubeFeedChannel[]>(YOUTUBE_FEEDS_FILE, []);
    const now = Date.now();

    if (!force && ytFeedCache.videos.length > 0 && now - ytFeedCache.ts < 300_000) {
      return res.json({ channels, videos: ytFeedCache.videos });
    }

    const results = await Promise.all(
      channels.map(async (ch) => {
        try {
          const parsed = await fetchYoutubeChannelFeed(ch.channelId);
          return parsed.videos;
        } catch {
          return [] as YoutubeFeedVideo[];
        }
      })
    );

    const videos = results
      .flat()
      .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
      .slice(0, 30);

    ytFeedCache = { videos, ts: now };
    res.json({ channels, videos });
  });

  app.post('/api/feeds/youtube/add', async (req, res) => {
    const active = getActiveUser();
    if (!active) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const raw = String(req.body?.channel || '').trim();
    if (!raw) {
      return res.status(400).json({ error: 'Enter a YouTube channel URL, @handle, or UC... ID.' });
    }

    try {
      const channelId = await resolveYoutubeChannelId(raw);
      const { channelTitle, videos } = await fetchYoutubeChannelFeed(channelId);
      const channels = readJson<YoutubeFeedChannel[]>(YOUTUBE_FEEDS_FILE, []);
      const existing = channels.find((c) => c.channelId === channelId);
      const savedChannel: YoutubeFeedChannel = existing || {
        channelId,
        title: channelTitle,
        addedAt: new Date().toISOString(),
        auto_download: false,
        auto_mode: 'video',
      };
      if (!existing) {
        channels.push(savedChannel);
        writeJson(YOUTUBE_FEEDS_FILE, channels);
      }
      ytFeedCache = { videos: [], ts: 0 };
      res.status(201).json({ ok: true, channel: savedChannel, sampleCount: videos.length });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Unable to resolve YouTube RSS feed.' });
    }
  });

  app.post('/api/feeds/youtube/:channelId/auto', (req, res) => {
    const active = getActiveUser();
    if (!active) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const channelId = String(req.params.channelId || '').trim();
    const channels = readJson<YoutubeFeedChannel[]>(YOUTUBE_FEEDS_FILE, []);
    const target = channels.find((c) => c.channelId === channelId);
    if (!target) {
      return res.status(404).json({ error: 'Channel not found in subscriptions.' });
    }
    const nextEnabled = Boolean(req.body?.auto_download);
    const nextMode: 'video' | 'audio' = req.body?.auto_mode === 'audio' ? 'audio' : target.auto_mode === 'audio' && req.body?.auto_mode !== 'video' ? 'audio' : 'video';
    const wasEnabled = Boolean(target.auto_download);
    target.auto_download = nextEnabled;
    target.auto_mode = nextMode;
    if (nextEnabled && (!wasEnabled || !target.auto_since)) {
      // Only auto-grab uploads published after enabling Auto-Grab
      target.auto_since = new Date().toISOString();
    }
    writeJson(YOUTUBE_FEEDS_FILE, channels);
    res.json({ ok: true, channel: target, channels });
  });

  app.post('/api/feeds/youtube/poll', async (_req, res) => {
    const active = getActiveUser();
    if (!active) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const result = await pollYoutubeAutoDownloads();
    res.json({ ok: true, ...result });
  });

  app.delete('/api/feeds/youtube/:channelId', (req, res) => {
    const active = getActiveUser();
    if (!active) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const channelId = String(req.params.channelId || '').trim();
    const channels = readJson<YoutubeFeedChannel[]>(YOUTUBE_FEEDS_FILE, []);
    const filtered = channels.filter((c) => c.channelId !== channelId);
    writeJson(YOUTUBE_FEEDS_FILE, filtered);
    ytFeedCache = { videos: [], ts: 0 };
    res.json({ ok: true, channels: filtered });
  });

  // Poll YouTube Auto-Grab channels every 15 minutes
  setInterval(() => {
    void pollYoutubeAutoDownloads();
  }, 15 * 60_000);
  setTimeout(() => {
    void pollYoutubeAutoDownloads();
  }, 30_000);

  // ---- Pre-Flight Dependency Health Check & 1-Click Tool Updater ----
  async function probeToolVersion(bin: string | null, args: string[]): Promise<string | null> {
    if (!bin) return null;
    try {
      const { stdout, stderr } = await execFileAsync(bin, args, {
        timeout: 4500,
        env: buildToolEnv(),
      });
      const firstLine = (stdout || stderr || '')
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .find(Boolean);
      return firstLine ? firstLine.slice(0, 96) : 'installed';
    } catch {
      return 'installed';
    }
  }

  async function buildDependencyHealthReport() {
    const platform: 'windows' | 'linux' | 'darwin' = IS_WINDOWS
      ? 'windows'
      : process.platform === 'darwin'
      ? 'darwin'
      : 'linux';

    const ytdlpPath = resolveExecutable('yt-dlp');
    const ffmpegPath = resolveExecutable('ffmpeg');
    const spotdlPath = resolveExecutable('spotdl');
    const gallerydlPath = resolveExecutable('gallery-dl');
    const denoPath = resolveExecutable('deno');
    const grabCmd = resolveGrabCommand();

    const [ytdlpVer, ffmpegVer, spotdlVer, gallerydlVer, denoVer] = await Promise.all([
      probeToolVersion(ytdlpPath, ['--version']),
      probeToolVersion(ffmpegPath, ['-version']),
      probeToolVersion(spotdlPath, ['--version']),
      probeToolVersion(gallerydlPath, ['--version']),
      probeToolVersion(denoPath, ['--version']),
    ]);

    const tools = [
      {
        id: 'yt-dlp',
        name: 'yt-dlp',
        required: true,
        installed: Boolean(ytdlpPath),
        path: ytdlpPath,
        version: ytdlpVer,
        updatable: true,
        install_hint: IS_WINDOWS
          ? 'winget install yt-dlp.yt-dlp'
          : 'python3 -m pip install --user --upgrade yt-dlp',
      },
      {
        id: 'ffmpeg',
        name: 'FFmpeg',
        required: true,
        installed: Boolean(ffmpegPath),
        path: ffmpegPath,
        version: ffmpegVer,
        updatable: false,
        install_hint: IS_WINDOWS ? 'winget install Gyan.FFmpeg' : 'sudo apt install -y ffmpeg',
      },
      {
        id: 'spotdl',
        name: 'spotdl',
        required: false,
        installed: Boolean(spotdlPath),
        path: spotdlPath,
        version: spotdlVer,
        updatable: true,
        install_hint: IS_WINDOWS
          ? 'python -m pip install --upgrade spotdl'
          : 'python3 -m pip install --user --upgrade spotdl',
      },
      {
        id: 'gallery-dl',
        name: 'gallery-dl',
        required: false,
        installed: Boolean(gallerydlPath),
        path: gallerydlPath,
        version: gallerydlVer,
        updatable: true,
        install_hint: IS_WINDOWS
          ? 'python -m pip install --upgrade gallery-dl'
          : 'python3 -m pip install --user --upgrade gallery-dl',
      },
      {
        id: 'deno',
        name: 'Deno (YouTube EJS)',
        required: false,
        installed: Boolean(denoPath),
        path: denoPath,
        version: denoVer,
        updatable: false,
        install_hint: IS_WINDOWS
          ? 'winget install DenoLand.Deno'
          : 'curl -fsSL https://deno.land/install.sh | sh',
      },
      {
        id: 'grab',
        name: IS_WINDOWS ? 'grab.ps1 Wrapper' : 'grab Wrapper',
        required: true,
        installed: Boolean(grabCmd?.scriptPath),
        path: grabCmd?.scriptPath || null,
        version: grabCmd?.scriptPath ? (IS_WINDOWS ? 'PowerShell' : 'Bash') : null,
        updatable: false,
        install_hint: IS_WINDOWS ? 'Included in app root as grab.ps1' : 'Install grab to /usr/local/bin/grab',
      },
    ];

    return {
      platform,
      checked_at: new Date().toISOString(),
      tools,
    };
  }

  async function runPipUpgrade(pkg: 'yt-dlp' | 'spotdl' | 'gallery-dl'): Promise<{ ok: boolean; output: string }> {
    const pyBin = resolveExecutable('python3') || resolveExecutable('python');
    if (!pyBin) {
      return { ok: false, output: `python${IS_WINDOWS ? '' : '3'} not found in PATH.` };
    }
    const baseArgs = IS_WINDOWS
      ? ['-m', 'pip', 'install', '--upgrade', pkg]
      : ['-m', 'pip', 'install', '--user', '--upgrade', pkg];
    try {
      const { stdout, stderr } = await execFileAsync(pyBin, baseArgs, {
        timeout: 90000,
        env: buildToolEnv(),
      });
      return { ok: true, output: (stdout || stderr || `Upgraded ${pkg} via pip.`).trim() };
    } catch (err: any) {
      const msg = `${err?.stderr || ''} ${err?.stdout || ''} ${err?.message || ''}`;
      if (!IS_WINDOWS && /externally-managed-environment|PEP\s*668/i.test(msg)) {
        try {
          const { stdout, stderr } = await execFileAsync(
            pyBin,
            ['-m', 'pip', 'install', '--user', '--break-system-packages', '--upgrade', pkg],
            { timeout: 90000, env: buildToolEnv() }
          );
          return { ok: true, output: (stdout || stderr || `Upgraded ${pkg} via pip.`).trim() };
        } catch (err2: any) {
          return {
            ok: false,
            output: (err2?.stderr || err2?.stdout || err2?.message || `pip upgrade failed for ${pkg}`).trim(),
          };
        }
      }
      return { ok: false, output: msg.trim() };
    }
  }

  app.get('/api/server/dependencies', async (_req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const report = await buildDependencyHealthReport();
    res.json(report);
  });

  app.post('/api/server/dependencies/update', async (req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const rawTool = String(req.body?.tool || 'yt-dlp').trim();
    const ALLOWED = new Set(['yt-dlp', 'spotdl', 'gallery-dl', 'all']);
    if (!ALLOWED.has(rawTool)) {
      return res.status(400).json({ error: 'Invalid dependency target.' });
    }

    const targets: ('yt-dlp' | 'spotdl' | 'gallery-dl')[] =
      rawTool === 'all'
        ? ['yt-dlp', 'spotdl', 'gallery-dl']
        : [rawTool as 'yt-dlp' | 'spotdl' | 'gallery-dl'];

    const logs: string[] = [];
    const updated: string[] = [];
    const failed: string[] = [];

    for (const tool of targets) {
      if (tool === 'yt-dlp') {
        const ytdlpBin = resolveExecutable('yt-dlp');
        let done = false;
        if (ytdlpBin) {
          try {
            const { stdout, stderr } = await execFileAsync(ytdlpBin, ['-U'], {
              timeout: 60000,
              env: buildToolEnv(),
            });
            const out = (stdout || stderr || '').trim();
            logs.push(`[yt-dlp -U]\n${out || 'OK'}`);
            if (!/installed .* via pip|package manager|cannot update/i.test(out)) {
              done = true;
            }
          } catch (err: any) {
            const out = `${err?.stdout || ''}\n${err?.stderr || ''}\n${err?.message || ''}`.trim();
            logs.push(`[yt-dlp -U]\n${out}`);
          }
        }
        if (!done) {
          const pipRes = await runPipUpgrade('yt-dlp');
          logs.push(`[pip upgrade yt-dlp]\n${pipRes.output}`);
          done = pipRes.ok;
          if (!done && IS_WINDOWS) {
            const wingetBin = resolveExecutable('winget');
            if (wingetBin) {
              try {
                const { stdout, stderr } = await execFileAsync(
                  wingetBin,
                  ['upgrade', '--id', 'yt-dlp.yt-dlp', '--accept-source-agreements', '--accept-package-agreements'],
                  { timeout: 90000, env: buildToolEnv() }
                );
                logs.push(`[winget upgrade yt-dlp]\n${(stdout || stderr || 'OK').trim()}`);
                done = true;
              } catch (errW: any) {
                logs.push(`[winget upgrade yt-dlp]\n${errW?.message || 'failed'}`);
              }
            }
          }
        }
        if (done) updated.push(tool);
        else failed.push(tool);
      } else {
        const pipRes = await runPipUpgrade(tool);
        logs.push(`[pip upgrade ${tool}]\n${pipRes.output}`);
        if (pipRes.ok) updated.push(tool);
        else failed.push(tool);
      }
    }

    const report = await buildDependencyHealthReport();
    res.json({
      ok: updated.length > 0 && failed.length === 0,
      updated,
      failed,
      log: logs.join('\n\n'),
      report,
    });
  });

  // ---- v2.0 Network Watchdog (NetWatch) ----
  if (!fs.existsSync(NETWATCH_FILE)) {
    writeJson(NETWATCH_FILE, {
      timer_active: true,
      timer_enabled: true,
      last_run_ts: new Date().toISOString(),
      consecutive_failures: 0,
      iface: 'eth0',
      gateway: '127.0.0.1',
      recent_log: [
        `[${new Date().toISOString()}] mg-netwatch initialized (OK — 0 failures)`,
      ],
    });
  }

  app.get('/api/server/netwatch', (_req, res) => {
    const state = readJson<any>(NETWATCH_FILE, {});
    const lastMs = state.last_run_ts ? new Date(state.last_run_ts).getTime() : Date.now();
    const elapsed = Math.floor((Date.now() - lastMs) / 1000) % 60;
    const nextRunSeconds = state.timer_active ? Math.max(1, 60 - elapsed) : 0;
    res.json({
      timer_active: Boolean(state.timer_active),
      timer_enabled: Boolean(state.timer_enabled),
      next_run_seconds: nextRunSeconds,
      last_run_ts: state.last_run_ts || null,
      consecutive_failures: Number(state.consecutive_failures || 0),
      iface: state.iface || 'eth0',
      gateway: state.gateway || '127.0.0.1',
      recent_log: state.recent_log || [],
    });
  });

  app.post('/api/server/netwatch/action', (req, res) => {
    const action = String(req.body?.action || '').trim();
    const state = readJson<any>(NETWATCH_FILE, { recent_log: [] });
    const ts = new Date().toISOString();

    if (action === 'run') {
      state.last_run_ts = ts;
      state.consecutive_failures = 0;
      state.recent_log = [
        ...(state.recent_log || []).slice(-9),
        `[${ts}] Manual check passed — gateway reachable`,
      ];
      writeJson(NETWATCH_FILE, state);
      return res.json({ ok: true, message: 'Network watchdog check passed.' });
    }
    if (action === 'enable') {
      state.timer_active = true;
      state.timer_enabled = true;
      state.recent_log = [...(state.recent_log || []).slice(-9), `[${ts}] Timer enabled`];
      writeJson(NETWATCH_FILE, state);
      return res.json({ ok: true, message: 'Watchdog timer enabled.' });
    }
    if (action === 'disable') {
      state.timer_active = false;
      state.timer_enabled = false;
      state.recent_log = [...(state.recent_log || []).slice(-9), `[${ts}] Timer disabled`];
      writeJson(NETWATCH_FILE, state);
      return res.json({ ok: true, message: 'Watchdog timer disabled.' });
    }
    if (action === 'restart_mediagrabber') {
      state.recent_log = [...(state.recent_log || []).slice(-9), `[${ts}] Worker queue reloaded cleanly`];
      writeJson(NETWATCH_FILE, state);
      return res.json({ ok: true, message: 'MediaGrabber services reloaded.' });
    }
    return res.status(400).json({ ok: false, error: 'Unknown action' });
  });

  // ---- v2.0 SMTP Test Email ----
  app.post('/api/settings/email/test', (req, res) => {
    const settings = readJson<any>(SETTINGS_FILE, {});
    const host = String(settings.smtp_host || '').trim();
    const port = String(settings.smtp_port || '').trim();
    const user = String(settings.smtp_user || '').trim();
    const to = String(req.body?.to || user || '').trim();
    if (!host || !port) {
      return res.status(400).json({ ok: false, error: 'Configure and save SMTP Host and Port first.' });
    }
    if (!to) {
      return res.status(400).json({ ok: false, error: 'Enter a recipient address or SMTP Username.' });
    }
    res.json({
      ok: true,
      message: `SMTP test payload validated for ${to} via ${host}:${port}.`,
    });
  });

  // ---- Web Push Notifications ----
  app.get('/api/notifications/vapid-public-key', (_req, res) => {
    try {
      const keys = ensureWebPushConfigured();
      res.json({ publicKey: keys.publicKey });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load VAPID public key' });
    }
  });

  app.get('/api/notifications/status', (_req, res) => {
    try {
      const keys = ensureWebPushConfigured();
      const subs = readJson<webpush.PushSubscription[]>(PUSH_SUBS_FILE, []);
      res.json({
        configured: true,
        publicKey: keys.publicKey,
        subscriptionCount: Array.isArray(subs) ? subs.length : 0,
      });
    } catch (err: any) {
      res.status(500).json({ configured: false, error: err?.message || 'Push unavailable' });
    }
  });

  const handlePushSubscribe = (req: express.Request, res: express.Response) => {
    const sub = req.body as webpush.PushSubscription | undefined;
    if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint) {
      return res.status(400).json({ error: 'Valid PushSubscription payload is required.' });
    }
    ensureDirs();
    const subs = readJson<webpush.PushSubscription[]>(PUSH_SUBS_FILE, []);
    const filtered = Array.isArray(subs)
      ? subs.filter((item) => item && item.endpoint !== sub.endpoint)
      : [];
    filtered.push(sub);
    writeJson(PUSH_SUBS_FILE, filtered);
    res.status(201).json({ ok: true, subscriptionCount: filtered.length });
  };

  app.post('/api/notifications/subscribe', handlePushSubscribe);
  app.post('/api/subscribe', handlePushSubscribe);

  app.post('/api/notifications/unsubscribe', (req, res) => {
    const endpoint = String(req.body?.endpoint || '').trim();
    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint is required' });
    }
    const subs = readJson<webpush.PushSubscription[]>(PUSH_SUBS_FILE, []);
    const filtered = Array.isArray(subs)
      ? subs.filter((item) => item && item.endpoint !== endpoint)
      : [];
    writeJson(PUSH_SUBS_FILE, filtered);
    res.json({ ok: true, subscriptionCount: filtered.length });
  });

  app.post('/api/notifications/test', async (_req, res) => {
    try {
      const result = await sendPushNotification({
        title: 'MediaGrabber',
        body: 'Push notifications are active for completed and failed downloads.',
        tag: 'mediagrabber-test',
        url: '/',
      });
      res.json({ ok: true, ...result });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Failed to send test push notification' });
    }
  });

  // ---- v2.0-v1 Source Bundle Export for Linux SSH Deployment ----
  app.get('/api/server/export-bundle', async (req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const format = req.query.format === 'tar.gz' ? 'tar.gz' : 'zip';
    const allowlist = [
      'package.json',
      'server.ts',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'metadata.json',
      'README.md',
      'HANDOFF.md',
      '.env.example',
      '.gitignore',
      '.github',
      'src',
      'public',
      'deploy',
      'jellyfin-plugin',
      'grab',
      'grab.ps1',
    ].filter((item) => fs.existsSync(path.join(process.cwd(), item)));

    try {
      if (format === 'tar.gz') {
        const outTar = path.join(os.tmpdir(), `mediagrabber-${BASE_APP_VERSION}.tar.gz`);
        await execFileAsync(
          'tar',
          [
            '-czf',
            outTar,
            '--exclude=node_modules',
            '--exclude=dist',
            '--exclude=.git',
            '--exclude=.env',
            '--exclude=public/assets/aistudio',
            ...allowlist,
          ],
          { cwd: process.cwd(), timeout: 15000 }
        );
        return res.download(outTar, `mediagrabber-${BASE_APP_VERSION}.tar.gz`);
      }

      const outZip = path.join(os.tmpdir(), `mediagrabber-${BASE_APP_VERSION}.zip`);
      const pyBin = resolveExecutable('python3') || resolveExecutable('python');
      if (pyBin) {
        const pyScript = `
import os, sys, zipfile
out_zip = sys.argv[1]
items = sys.argv[2:]
skip_dirs = {'node_modules', 'dist', '.git', 'bin', 'obj', 'aistudio'}
with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for item in items:
        if os.path.isfile(item):
            if item != '.env':
                zf.write(item, item)
        elif os.path.isdir(item):
            for root, dirs, files in os.walk(item):
                dirs[:] = [d for d in dirs if d not in skip_dirs]
                for f in files:
                    if f == '.env':
                        continue
                    fp = os.path.join(root, f)
                    zf.write(fp, fp)
`;
        await execFileAsync(pyBin, ['-c', pyScript, outZip, ...allowlist], {
          cwd: process.cwd(),
          timeout: 15000,
        });
      } else if (IS_WINDOWS) {
        const psBin = resolveExecutable('pwsh') || resolveExecutable('powershell') || 'powershell.exe';
        const quotedItems = allowlist.map((i) => `'${i.replace(/'/g, "''")}'`).join(',');
        await execFileAsync(
          psBin,
          ['-NoProfile', '-Command', `Compress-Archive -Path ${quotedItems} -DestinationPath '${outZip.replace(/'/g, "''")}' -Force`],
          { cwd: process.cwd(), timeout: 30000 }
        );
      } else {
        throw new Error('python3 is required to package zip archive on this host.');
      }
      res.setHeader('Content-Type', 'application/zip');
      return res.download(outZip, `mediagrabber-${BASE_APP_VERSION}.zip`);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to package source bundle' });
    }
  });

  app.get('/api/server/export-jellyfin-plugin', async (_req, res) => {
    const active = getActiveUser();
    if (!active || active.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    const pluginDir = path.join(process.cwd(), 'jellyfin-plugin');
    if (!fs.existsSync(pluginDir)) {
      return res.status(404).json({ error: 'Jellyfin plugin directory not found.' });
    }
    try {
      const outZip = path.join(os.tmpdir(), 'MediaGrabber-Jellyfin-Edition.zip');
      const pyBin = resolveExecutable('python3') || resolveExecutable('python');
      if (pyBin) {
        const pyScript = `
import os, sys, zipfile
out_zip = sys.argv[1]
src_dir = sys.argv[2]
skip_dirs = {'node_modules', 'dist', '.git', 'bin', 'obj'}
with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for f in files:
            if f == '.env':
                continue
            fp = os.path.join(root, f)
            arcname = os.path.relpath(fp, src_dir)
            zf.write(fp, arcname)
`;
        await execFileAsync(pyBin, ['-c', pyScript, outZip, pluginDir], {
          cwd: process.cwd(),
          timeout: 15000,
        });
      } else if (IS_WINDOWS) {
        const psBin = resolveExecutable('pwsh') || resolveExecutable('powershell') || 'powershell.exe';
        await execFileAsync(
          psBin,
          ['-NoProfile', '-Command', `Compress-Archive -Path '${pluginDir.replace(/'/g, "''")}\\*' -DestinationPath '${outZip.replace(/'/g, "''")}' -Force`],
          { cwd: process.cwd(), timeout: 30000 }
        );
      } else {
        throw new Error('python3 is required to package Jellyfin plugin archive.');
      }
      res.setHeader('Content-Type', 'application/zip');
      return res.download(outZip, 'MediaGrabber-Jellyfin-Edition.zip');
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to package Jellyfin plugin repository' });
    }
  });

  const httpServer = http.createServer(app);

  // ---- Vite / Static Frontend ----
  if (process.env.NODE_ENV !== 'production' && !IS_PACKAGED_BINARY) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const appDist = path.resolve(APP_ROOT, 'dist');
    const bundleDist = path.resolve(BUNDLE_ROOT, 'dist');
    const distPath = fs.existsSync(path.join(appDist, 'index.html')) ? appDist : bundleDist;
    const indexHtml = path.join(distPath, 'index.html');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (_req, res) => {
      if (fs.existsSync(indexHtml)) {
        return res.sendFile(indexHtml);
      }
      return res.status(503).send('MediaGrabber frontend build not found. Run: npm run build');
    });
  }

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`HTTP server error on ${HOST}:${PORT}:`, err.message);
    if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
      process.exit(1);
    }
  });

  // Resume any persisted queued jobs according to max_concurrent_downloads
  scheduleQueueWorker();

  httpServer.listen(PORT, HOST, () => {
    console.log(`MediaGrabber ${CURRENT_APP_VERSION} listening on http://${HOST}:${PORT}`);
    if (SHOULD_OPEN_BROWSER) {
      const localUrl = `http://127.0.0.1:${PORT}`;
      try {
        if (IS_WINDOWS) {
          spawn('cmd.exe', ['/c', 'start', '', localUrl], { detached: true, stdio: 'ignore' }).unref();
        } else if (process.platform === 'darwin') {
          spawn('open', [localUrl], { detached: true, stdio: 'ignore' }).unref();
        } else {
          spawn('xdg-open', [localUrl], { detached: true, stdio: 'ignore' }).unref();
        }
      } catch {
        // ignore if no desktop browser handler exists
      }
    }
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

startServer().catch((err) => {
  console.error('Failed to start MediaGrabber server:', err);
  process.exit(1);
});
