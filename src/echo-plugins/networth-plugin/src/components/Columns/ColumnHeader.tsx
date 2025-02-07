// import { ArrowDownIcon, ArrowUpIcon, CaretSortIcon, EyeNoneIcon } from '@radix-ui/react-icons'
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, EyeOffIcon } from 'lucide-react'

import { Column } from '@tanstack/react-table'

import { cn } from 'echo-common'
import { DropdownMenu, Button } from 'echo-common/components-v1'
import { useTranslation } from 'react-i18next'

interface TableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
  titleParams?: Record<string, string>
  align: 'left' | 'right' | 'center'
}

export function TableColumnHeader<TData, TValue>({
  column,
  title,
  titleParams,
  align,
  className
}: TableColumnHeaderProps<TData, TValue>) {
  const { t } = useTranslation()

  const alignDir =
    align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'
  if (!column.getCanSort()) {
    return (
      <div className={cn('flex whitespace-nowrap', alignDir, className)}>
        {t(`columnTitle.${title}` as any, titleParams)}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center space-x-2', alignDir, className)}>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 data-[state=open]:bg-accent px-2',
              align === 'left' ? '-mx-2' : '-mx-3'
            )}
          >
            <span>{t(`columnTitle.${title}` as any, titleParams)}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDownIcon className="ml-1 h-4 w-4" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUpIcon className="ml-1 h-4 w-4" />
            ) : (
              <ChevronsUpDownIcon className="ml-1 h-4 w-4" />
            )}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start">
          <DropdownMenu.Item onClick={() => column.toggleSorting(false)}>
            <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {t('action.asc')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => column.toggleSorting(true)}>
            <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {t('action.desc')}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onClick={() => column.toggleVisibility(false)}>
            <EyeOffIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            {t('action.hide')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  )
}
