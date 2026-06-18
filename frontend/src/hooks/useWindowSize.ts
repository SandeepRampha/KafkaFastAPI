import { useState, useEffect } from "react";

export function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
    });

    useEffect(() => {
        let timeoutId: number | null = null;
        
        function handleResize() {
            if (timeoutId === null) {
                timeoutId = window.setTimeout(() => {
                    setWindowSize({
                        width: window.innerWidth,
                        height: window.innerHeight,
                    });
                    timeoutId = null;
                }, 100); // 100ms throttle
            }
        }

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => {
            window.removeEventListener("resize", handleResize);
            if (timeoutId) window.clearTimeout(timeoutId);
        };
    }, []);

    return windowSize;
}
