import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useScreenSize() {
  const [size, setSize] = React.useState<"mobile" | "tablet" | "desktop">("desktop");

  React.useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < MOBILE_BREAKPOINT) setSize("mobile");
      else if (w < TABLET_BREAKPOINT) setSize("tablet");
      else setSize("desktop");
    };
    const mqlMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const mqlTablet = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
    compute();
    const handler = () => compute();
    mqlMobile.addEventListener("change", handler);
    mqlTablet.addEventListener("change", handler);
    return () => {
      mqlMobile.removeEventListener("change", handler);
      mqlTablet.removeEventListener("change", handler);
    };
  }, []);

  return size;
}
