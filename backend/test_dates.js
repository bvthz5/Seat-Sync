
const dates = [
    "15 Nov 2025",
    "15/11/2025",
    "2025-11-15",
    "15-11-2025",
    "15.11.2025"
];

dates.forEach(d => {
    const parsed = new Date(d);
    console.log(`Input: ${d} -> Result: ${parsed.toString()} (Valid: ${!isNaN(parsed.getTime())})`);
    if (!isNaN(parsed.getTime())) {
        console.log(`   ISO: ${parsed.toISOString().split('T')[0]}`);
    }
});
