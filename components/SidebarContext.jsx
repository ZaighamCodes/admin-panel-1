'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const SidebarContext = createContext({
  open: true,
  collapsed: false,
  toggleOpen: () => {},
  toggleCollapsed: () => {},
  setOpen: () => {},
});

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('docspot-sidebar-collapsed');
      if (saved === '1') setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('docspot-sidebar-collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <SidebarContext.Provider
      value={{ open, collapsed, toggleOpen, toggleCollapsed, setOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
