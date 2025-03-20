import { Link, useLocation } from 'react-router-dom';
import { Home, Building2, CreditCard, Settings, Shield } from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

interface DesktopNavProps {
  isAdmin: boolean;
}

export function DesktopNav({ isAdmin }: DesktopNavProps) {
  const location = useLocation();

  const navItems = [
    {
      to: '/dashboard',
      icon: Home,
      label: 'Dashboard'
    },
    {
      to: '/estates',
      icon: Building2,
      label: 'Estates'
    },
    {
      to: '/payments',
      icon: CreditCard,
      label: 'Payments'
    },
    {
      to: isAdmin ? '/admin' : '/settings',
      icon: isAdmin ? Shield : Settings,
      label: isAdmin ? 'Admin' : 'Settings'
    }
  ];

  return (
    <NavigationMenu className="hidden md:flex mx-6">
      <NavigationMenuList>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavigationMenuItem key={to}>
            <Link to={to}>
              <NavigationMenuLink
                className={cn(
                  navigationMenuTriggerStyle(),
                  'flex items-center gap-2',
                  location.pathname === to && 'bg-accent text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}