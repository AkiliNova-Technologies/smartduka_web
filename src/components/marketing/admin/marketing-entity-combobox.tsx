"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type MarketingEntityOption = {
  id: string;
  label: string;
  description?: string;
  searchText?: string;
};
type Props = {
  label: string;
  value: string;
  options: MarketingEntityOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  emptyText: string;
  unavailableText?: string;
  loading?: boolean;
  unavailable?: boolean;
};

export function MarketingEntityCombobox({
  label,
  value,
  options,
  onValueChange,
  placeholder,
  emptyText,
  unavailableText,
  loading = false,
  unavailable = false,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listId = React.useId();
  const selected = options.find((item) => item.id === value);
  const filtered = options.filter((item) =>
    [item.label, item.description, item.searchText]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  const pluralLabel =
    label.toLocaleLowerCase() === "category"
      ? "categories"
      : label.toLocaleLowerCase() + "s";
  const disabled = loading || unavailable;
  const statusText = loading
    ? "Loading " + label.toLocaleLowerCase() + "..."
    : unavailable
      ? (unavailableText ?? pluralLabel + " unavailable")
      : (selected?.label ?? placeholder);
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  };
  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setActiveIndex(0);
  };
  const choose = (id: string) => {
    onValueChange(id);
    setOpen(false);
    setQuery("");
  };
  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(filtered[activeIndex]?.id ?? filtered[0].id);
    }
  };
  const emptyMessage = options.length
    ? emptyText.replace("found.", "match your search.")
    : "No " + pluralLabel + " are available to select.";
  return (
    <div className="min-w-0 space-y-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-haspopup="listbox"
            className="h-10 w-full justify-between gap-2 px-3 font-normal">
            <span
              className={cn(
                "min-w-0 truncate text-left",
                !selected && "text-muted-foreground",
              )}>
              {statusText}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-2"
          onOpenAutoFocus={(event) => event.preventDefault()}>
          <Command>
            <CommandInput
              autoFocus
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={placeholder}
              aria-label={"Search " + label.toLocaleLowerCase()}
            />
            <CommandList id={listId} role="listbox" className="mt-2">
              {filtered.length ? (
                <CommandGroup>
                  {filtered.map((item, index) => (
                    <CommandItem
                      key={item.id}
                      role="option"
                      aria-selected={item.id === value}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(item.id)}
                      className={cn(index === activeIndex && "bg-muted")}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {item.label}
                        </span>
                        {item.description && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        )}
                      </span>
                      {item.id === value && (
                        <Check
                          className="size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
