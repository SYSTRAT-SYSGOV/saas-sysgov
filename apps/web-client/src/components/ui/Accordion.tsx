import * as React from 'react';
import {
  Accordion as AccordionPrimitive,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './accordion-primitive';

export interface AccordionItemProps {
  value: string;
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItemProps[];
  className?: string;
  multiple?: boolean;
  icon?: React.ReactNode;
}

/**
 * Accordion "data-driven" (API por array de `items`) usado nas telas do
 * painel do cliente. Por baixo, usa o Accordion real do shadcn/ui
 * (Radix — foco/teclado/ARIA nativos) em vez do state hand-rolled anterior.
 */
export const Accordion: React.FC<AccordionProps> = ({ items, className, multiple = false, icon }) => {
  const renderItems = () =>
    items.map((item) => (
      <AccordionItem key={item.value} value={item.value}>
        <AccordionTrigger className="px-4 hover:no-underline">
          <span className="flex flex-1 items-center gap-2 text-left">
            {icon}
            {item.title}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4">{item.children}</AccordionContent>
      </AccordionItem>
    ));

  if (multiple) {
    const defaultValue = items.filter((i) => i.defaultOpen).map((i) => i.value);
    return (
      <AccordionPrimitive type="multiple" defaultValue={defaultValue} className={className}>
        {renderItems()}
      </AccordionPrimitive>
    );
  }

  const defaultValue = items.find((i) => i.defaultOpen)?.value;
  return (
    <AccordionPrimitive type="single" collapsible defaultValue={defaultValue} className={className}>
      {renderItems()}
    </AccordionPrimitive>
  );
};

export default Accordion;
