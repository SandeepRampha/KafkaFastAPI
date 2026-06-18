export const loadFramerFeatures = () =>
    import("./domMax").then((res) => res.default);
