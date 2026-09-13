import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

export interface DropdownItem {
  label: string;
  to?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  divider?: boolean;
  destructive?: boolean;
}

interface DropdownProps {
  trigger: React.ReactElement<any>;
  items: DropdownItem[];
  align?: "left" | "right";
}

export function Dropdown(props: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const triggerElement = React.cloneElement(props.trigger as React.ReactElement<any>, {
    "aria-haspopup": true,
    "aria-expanded": isOpen,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen((prev) => !prev);
    }
  });

  const renderMenuItems = () => {
    return props.items.map((item, index) => {
      if (item.divider) {
        return <hr key={`divider-${index}`} className="my-1.5 border-gray-200" role="separator" />;
      }
      if (item.to) {
        return (<Link
            key={`link-${index}`}
            to={item.to}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
          >
            {item.icon}
            {item.label}
          </Link>);
      }
      return (<button
          key={`btn-${index}`}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            item.onClick?.();
            setIsOpen(false);
          }}
          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 disabled:opacity-50"
        >
          {item.icon}
          {item.label}
        </button>);
    });
  };

  return (<div ref={containerRef} className="relative inline-block">
      {triggerElement}
      {isOpen && (<div
          className={`absolute top-full z-50 mt-2 w-56 rounded-xl bg-white border border-gray-200 shadow-lg ${
            props.align === "right" ? "right-0" : "left-0"
          }`}
          role="menu"
        >
          <div className="py-1.5">{renderMenuItems()}</div>
        </div>)}
    </div>);
}