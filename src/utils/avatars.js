import { 
  User, Terminal, Cpu, Flame, Shield, Code, Smartphone, Database 
} from 'lucide-react';

export const AVATAR_MAP = {
  user: User,
  terminal: Terminal,
  cpu: Cpu,
  flame: Flame,
  shield: Shield,
  code: Code,
  phone: Smartphone,
  database: Database
};

export const AVATAR_IDS = Object.keys(AVATAR_MAP);

export const DEFAULT_AVATAR = 'user';
