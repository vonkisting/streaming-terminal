import { ReactNode } from "react";

interface ContentWrapperProps {
  children: ReactNode;
}

export default function ContentWrapper({ children }: ContentWrapperProps) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-full min-w-0 bg-blue-950/40 w-full">
      {children}
    </div>
  );
}
