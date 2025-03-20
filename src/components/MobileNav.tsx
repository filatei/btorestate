import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Building2, CreditCard, Settings, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  isAdmin: boolean;
}

const MobileNav: React.FC<MobileNavProps> = ({ isAdmin }) => {
  const location = useLocation();

  const navItems = [
    {
      to: '/dashboard',
      icon: Home,
      label: 'Home'
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t z-50 w-full">
      <div className="grid grid-cols-4 h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'flex flex-col items-center justify-center transition-colors',
              location.pathname === to
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;