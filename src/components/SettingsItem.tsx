import React from "react";

type BaseProps = {
  name?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
};

export function SettingsItemSmall({
  name,
  description,
  children,
}: BaseProps) {
  return (
    <div className="setting-item">
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

export function SettingsItemLarge({ name, description, children }: BaseProps) {
  return (
    <div className="flex flex-col gap-2 items-stretch bg-gray-100 p-2 rounded-md bg-[rgb(var(--setting-items-background))]]">
      {(name || description) && (
        <div className="setting-item-info">
          {name && <div className="setting-item-name">{name}</div>}
          {description && (
            <div className="setting-item-description">{description}</div>
          )}
        </div>
      )}
      {children && <div className="">{children}</div>}
    </div>
  );
}
