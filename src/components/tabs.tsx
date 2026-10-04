"use client";

import {
  createContext,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type TabsContextValue = {
  active: string;
  setActive: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Componentes de abas devem ficar dentro de Tabs.");
  }
  return context;
}

type TabsProps = {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
};

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const active = value ?? internalValue;

  const setActive = (next: string) => {
    if (value === undefined) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={`flex flex-wrap border-b-2 border-border-subtle ${className ?? ""}`}
      {...props}
    />
  );
}

type TabsTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({ value, className, children, type = "button", ...props }: TabsTriggerProps) {
  const { active, setActive } = useTabsContext();
  const selected = active === value;

  return (
    <button
      type={type}
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => setActive(value)}
      className={`-mb-0.5 cursor-pointer border-b-2 px-lg py-md text-label-lg transition-colors duration-150 ${
        selected
          ? "border-brass text-brass"
          : "border-transparent text-on-surface-variant hover:text-primary-container"
      } ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

type TabsContentProps = HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { active } = useTabsContext();
  if (active !== value) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={`rounded-md bg-surface-subtle p-md text-body-md text-on-surface ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
}
