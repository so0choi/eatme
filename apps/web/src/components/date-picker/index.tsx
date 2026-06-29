'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  /** form에 submit될 hidden input name */
  name?: string;
  /** 외부에서 값 제어 (controlled) */
  value?: Date;
  /** 외부에서 값 제어 시 변경 핸들러 */
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  dateFormat?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  name,
  value,
  onChange,
  placeholder = '날짜 선택',
  dateFormat = 'yyyy. MM. dd',
  className,
  disabled,
}: DatePickerProps) {
  // controlled면 외부 상태, uncontrolled면 내부 상태 사용
  const [internalDate, setInternalDate] = React.useState<Date>();
  const date = value !== undefined ? value : internalDate;

  const handleSelect = (selected: Date | undefined) => {
    if (onChange) {
      onChange(selected);
    } else {
      setInternalDate(selected);
    }
  };

  return (
    <>
      {/* form과 함께 쓸 때 hidden input으로 값 전달 */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={date ? format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : ''}
        />
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!date}
            className={cn(
              'justify-start text-left font-normal data-[empty=true]:text-muted-foreground',
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, dateFormat, { locale: ko }) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={handleSelect} locale={ko} />
        </PopoverContent>
      </Popover>
    </>
  );
}
