"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout="dropdown"
      startMonth={new Date(2015, 0)}
      endMonth={new Date(new Date().getFullYear() + 2, 11)}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "space-y-3",
        month_caption: "flex h-9 items-center justify-center px-9",
        caption_label: "text-sm font-semibold",
        dropdowns: "flex items-center justify-center gap-1.5 text-sm font-semibold",
        dropdown_root:
          "relative inline-flex items-center rounded-md border border-input bg-background px-2 py-1 hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring",
        dropdown: "absolute inset-0 cursor-pointer opacity-0",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-center text-[0.75rem] font-medium uppercase text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-md p-0 font-normal aria-selected:opacity-100"
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary [&>button]:font-semibold",
        today: "[&>button]:border [&>button]:border-primary [&>button]:font-semibold",
        outside: "text-muted-foreground opacity-40",
        disabled: "text-muted-foreground opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: c }) => {
          const Icon =
            orientation === "left" ? ChevronLeft : orientation === "right" ? ChevronRight : ChevronDown
          return <Icon className={cn("h-4 w-4", c)} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
