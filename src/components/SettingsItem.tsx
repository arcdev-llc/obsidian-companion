import clsx from 'clsx';
import React from "react";

type BaseProps = {
  className?: string;
  name?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
};

export function SettingsItemSmall({
  className,
  name,
  description,
  children,
}: BaseProps) {
  return (
    <div className={clsx("setting-item", className)}>
      {(name || description) && (
        <div className="setting-item-info">
          {name && <div className="setting-item-name">{name}</div>}
          {description && (
            <div className="setting-item-description">{description}</div>
          )}
        </div>
      )}
      {children && <div className="setting-item-control">{children}</div>}
    </div>
  );
}

export function SettingsItemLarge({ className, name, description, children }: BaseProps) {
  return (
    <div className={clsx("setting-item flex-col", className)}>
      {(name || description) && (
        <div className="self-start">
          {name && <div className="setting-item-name">{name}</div>}
          {description && (
            <div className="setting-item-description">{description}</div>
          )}
        </div>
      )}
      {children && <div className="setting-item-content w-full">{children}</div>}
    </div>
  );
}
