import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ExternalLink,
  Flag,
  Gamepad2,
  Globe2,
  ImageIcon,
  LayoutDashboard,
  LogIn,
  LogOut,
  Medal,
  PlayCircle,
  Settings2,
  Shield,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
  Video
} from "lucide-react";

export const iconMap = {
  tournaments: Trophy,
  matches: Gamepad2,
  teams: Users,
  leaderboard: Medal,
  stats: BarChart3,
  admin: Shield,
  dashboard: LayoutDashboard,
  login: LogIn,
  logout: LogOut,
  register: UserPlus,
  media: ImageIcon,
  video: Video,
  play: PlayCircle,
  resources: Globe2,
  settings: Settings2,
  schedule: CalendarDays,
  results: ShieldCheck,
  external: Flag,
  link: ExternalLink,
  action: ArrowRight
};

export function getIcon(name) {
  return iconMap[name] || LayoutDashboard;
}
