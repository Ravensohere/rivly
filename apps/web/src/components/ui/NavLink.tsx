import { NavLink as RouterNavLink, LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavLinkProps extends LinkProps {
  activeClassName?: string;
  inactiveClassName?: string;
}

export const NavLink = ({ 
  className, 
  activeClassName, 
  inactiveClassName, 
  ...props 
}: NavLinkProps) => {
  return (
    <RouterNavLink
      className={({ isActive }) =>
        cn(
          className,
          isActive ? activeClassName : inactiveClassName
        )
      }
      {...props}
    />
  );
};
