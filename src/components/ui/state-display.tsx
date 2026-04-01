import { AlertCircle, CheckCircle2, FileX, Info, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

export type StateVariant = 'loading' | 'empty' | 'error' | 'success' | 'info';

interface StateDisplayProps {
  variant: StateVariant;
  title?: string;
  description?: string;
  className?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

const variantConfig = {
  loading: {
    icon: Loader2,
    iconClass: 'animate-spin text-muted-foreground',
    defaultTitle: 'Pensando...',
    defaultDesc: 'Aguarde enquanto processamos as informações.',
  },
  empty: {
    icon: FileX,
    iconClass: 'text-muted-foreground/50',
    defaultTitle: 'Nenhum registro encontrado',
    defaultDesc: 'Não há dados disponíveis para os filtros selecionados.',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-destructive',
    defaultTitle: 'Ops! Ocorreu um problema',
    defaultDesc: 'Tivemos um erro inesperado ao tentar carregar estes dados.',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-green-500',
    defaultTitle: 'Concluído com sucesso',
    defaultDesc: 'A operação foi finalizada sem erros.',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    defaultTitle: 'Atenção',
    defaultDesc: 'Aqui vai uma informação importante.',
  },
};

export function StateDisplay({
  variant,
  title,
  description,
  className,
  action,
  icon: CustomIcon,
}: StateDisplayProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500", className)}>
      <div className={cn("mb-4 flex items-center justify-center rounded-full bg-muted/30 p-4 transition-all duration-300", variant === 'loading' && 'bg-transparent')}>
        {CustomIcon ? CustomIcon : <Icon className={cn("h-8 w-8", config.iconClass)} />}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title || config.defaultTitle}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {description || config.defaultDesc}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 pt-2 w-full animate-pulse">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Skeleton className="h-64 w-full rounded-2xl" />
         <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse mt-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
