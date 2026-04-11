'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ServiceListing } from '@/lib/db/infra-schema';
import { InfraDispatchModal } from './infra-dispatch-modal';

interface ShareOsMessageButtonProps {
  record: ServiceListing;
}

export function ShareOsMessageButton({ record }: ShareOsMessageButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        title="Compartilhar"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-3.5 w-3.5" />
      </Button>

      <InfraDispatchModal record={record} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
