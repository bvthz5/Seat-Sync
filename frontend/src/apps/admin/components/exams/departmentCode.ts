export const normalizeExamDepartmentCode = (value?: string | null): string => {
    const raw = String(value || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .trim();

    if (!raw) return "GEN";
    if (raw === "INMCA" || raw === "IMCA" || raw === "INTMCA") return "INT_MCA";
    return raw;
};
