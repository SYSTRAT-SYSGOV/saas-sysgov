import React, { lazy, ComponentType } from 'react';

export function lazyWithNamedExport<T extends ComponentType<any>>(
  importFn: () => Promise<Record<string, T>>,
  exportName: string = 'default'
): React.LazyExoticComponent<T> {
  return lazy(() => importFn().then(module => ({ default: module[exportName] })));
}

export function lazyDefault<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(importFn);
}