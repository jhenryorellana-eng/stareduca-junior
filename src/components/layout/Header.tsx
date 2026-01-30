'use client';

import { useAuth } from '@/hooks/use-auth';
import { useSuperAppBridge } from '@/hooks/use-super-app-bridge';
import { Avatar } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showAvatar?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  showBack = false,
  showAvatar = true,
  rightElement,
  className,
}: HeaderProps) {
  const { student } = useAuth();
  const { requestClose, isInWebView } = useSuperAppBridge();

  const handleBack = () => {
    if (showBack) {
      window.history.back();
    } else if (isInWebView) {
      requestClose();
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background-light/80 backdrop-blur-lg safe-area-top',
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {(showBack || isInWebView) && (
            <button
              onClick={handleBack}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <Icon name={showBack ? 'arrow_back' : 'close'} size={24} className="text-secondary" />
            </button>
          )}
          {title && (
            <h1 className="text-lg font-bold text-secondary">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {rightElement}
          {showAvatar && student && (
            <Avatar
              src={student.avatarUrl}
              fallback={`${student.firstName} ${student.lastName}`}
              size="sm"
            />
          )}
        </div>
      </div>
    </header>
  );
}
