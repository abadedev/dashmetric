// @ts-nocheck
"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date);

  // Sincroniza local quando valor mudado por fora
  React.useEffect(() => {
    if (!isOpen) {
      setTempDate(date);
    }
  }, [date, isOpen]);

  const handleSelect = (newDate: DateRange | undefined) => {
    setTempDate(newDate);
  };

  const handleApply = () => {
    if (tempDate?.from && !tempDate.to) {
      // Se só tem a data inicial, usa ela para o fim também
      setDate({ from: tempDate.from, to: tempDate.from });
    } else {
      setDate(tempDate);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempDate(undefined);
    setDate(undefined);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reverter se fechar clicando fora sem confirmar
      setTempDate(date);
    }
  };

  const displayDate = isOpen ? tempDate : date;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !displayDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayDate?.from ? (
              displayDate.to ? (
                <>
                  {format(displayDate.from, "dd 'de' MMM, yyyy", { locale: ptBR })} -{" "}
                  {format(displayDate.to, "dd 'de' MMM, yyyy", { locale: ptBR })}
                </>
              ) : (
                format(displayDate.from, "dd 'de' MMM, yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            min={0}
            defaultMonth={date?.from}
            selected={tempDate}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={ptBR}
          />
          <div className="flex items-center justify-between border-t p-3">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Limpar
            </Button>
            <Button variant="default" size="sm" onClick={handleApply}>
              Confirmar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
