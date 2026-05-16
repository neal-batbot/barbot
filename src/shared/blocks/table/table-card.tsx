import { Link } from '@/core/i18n/navigation';
import { Pagination } from '@/shared/blocks/common/pagination';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Tabs } from '@/shared/blocks/common/tabs';
import { Table } from '@/shared/blocks/table';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import {
  Button as ButtonType,
  Tab as TabType,
} from '@/shared/types/blocks/common';
import { Table as TableType } from '@/shared/types/blocks/table';

export function TableCard({
  title,
  description,
  buttons,
  tabs,
  table,
  className,
}: {
  title?: string;
  description?: string;
  buttons?: ButtonType[];
  tabs?: TabType[];
  table: TableType;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'border border-zinc-200/80 bg-white text-zinc-950 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.35)] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50',
        className
      )}
    >
      {(title || description || buttons) && (
        <CardHeader className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-5 dark:border-zinc-850">
          <div className="flex flex-col gap-2">
            {title && (
              <CardTitle className="text-xl tracking-tight text-zinc-950 dark:text-zinc-50">
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </CardDescription>
            )}
          </div>
          <div className="flex-1"></div>
          {buttons && buttons.length > 0 && (
            <div className="flex items-center gap-2">
              {buttons.map((button, idx) => (
                <Button
                  key={idx}
                  asChild
                  variant={button.variant || 'default'}
                  size={button.size || 'sm'}
                >
                  <Link
                    href={button.url || ''}
                    target={button.target || '_self'}
                  >
                    {button.icon && <SmartIcon name={button.icon as string} />}
                    {button.title}
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
      )}

      {table && (
        <CardContent className="pt-5">
          {tabs && tabs.length > 0 ? <Tabs tabs={tabs} /> : null}
          <Table {...table} />
        </CardContent>
      )}

      {table.pagination && (
        <CardFooter>
          <Pagination {...table.pagination} />
        </CardFooter>
      )}
    </Card>
  );
}
