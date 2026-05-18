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
        'border border-fd-border bg-fd-card text-fd-card-foreground shadow-lg',
        className
      )}
    >
      {(title || description || buttons) && (
        <CardHeader className="flex flex-wrap items-center gap-2 border-b border-fd-border pb-5">
          <div className="flex flex-col gap-2">
            {title && (
              <CardTitle className="text-xl tracking-normal text-fd-foreground">
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className="text-sm text-fd-muted-foreground">
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
