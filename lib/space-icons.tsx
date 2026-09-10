// ikon space 1:1 sama desktop (paperite/src/components/nav-main.tsx).
// key yang disimpan di .paperite/spaces.json = key lucide desktop
// ("cloud", "music", "pin", ...) + "custom:<nama>" buat upload.
// jangan ngarang vocabulary sendiri — nanti sync space meta antar
// desktop ↔ hp tinggal kirim key apa adanya.

import {
  BookOpen,
  Brain,
  BriefcaseBusiness,
  Bookmark,
  Camera,
  Cloud,
  Code,
  Compass,
  Folder,
  Gem,
  Heart,
  Inbox,
  Lightbulb,
  Music,
  Pin,
  Sparkles,
  Star,
  Trash2,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

export const CUSTOM_ICON_PREFIX = 'custom:';

const ICONS: Record<string, LucideIcon> = {
  cloud: Cloud,
  folder: Folder,
  briefcase: BriefcaseBusiness,
  book: BookOpen,
  idea: Lightbulb,
  code: Code,
  gem: Gem,
  heart: Heart,
  brain: Brain,
  sparkles: Sparkles,
  star: Star,
  music: Music,
  camera: Camera,
  bookmark: Bookmark,
  zap: Zap,
  compass: Compass,
  users: Users,
  pin: Pin,
  // system mobile (ga ada padanan picker desktop, tapi key-nya lucide asli)
  inbox: Inbox,
  trash: Trash2,
};

/** urutan + isi sama kayak picker desktop — user pilih dari ini. */
export const SPACE_ICON_KEYS = [
  'cloud',
  'folder',
  'briefcase',
  'book',
  'idea',
  'code',
  'gem',
  'heart',
  'brain',
  'sparkles',
  'star',
  'music',
  'camera',
  'bookmark',
  'zap',
  'compass',
  'users',
  'pin',
] as const;

export function SpaceIcon({ name, size, color }: { name: string; size: number; color: string }) {
  // custom: upload nyusul — sementara placeholder folder.
  const key = name.startsWith(CUSTOM_ICON_PREFIX) ? 'folder' : name;
  const Component = ICONS[key] ?? Folder;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Component size={size} color={color} />
    </View>
  );
}
