import { Request, Response, NextFunction } from 'express';

export const validateAcademicData = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { program, programName } = req.body;
        const target = program || programName;
        
        if (target) {
            const hasYearFormat = /\d{4}/.test(target);
            const hasSemesterFormat = /S\d/i.test(target);
            if (hasYearFormat || hasSemesterFormat) {
                return res.status(400).json({ error: "Dirty Program Name: Do not include Year or Semester in Program name" });
            }
        }
        next();
    };
};
