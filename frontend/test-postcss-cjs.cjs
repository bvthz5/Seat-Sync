try {
    const p = require('@tailwindcss/postcss');
    console.log("Success: @tailwindcss/postcss loaded");
} catch (e) {
    console.error("Require failed:", e);
}
