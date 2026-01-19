try {
    const { heroui } = require("@heroui/react");
    console.log("HeroUI loaded via require:", typeof heroui);
} catch (e) {
    console.error("Require failed:", e.message);
}
