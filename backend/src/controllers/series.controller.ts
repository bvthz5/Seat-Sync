import { Request, Response } from "express";
import { ExamSeries, ActivityLog, InternalExam, Exam, Subject, Semester } from "../models/index.js";

/**
 * Exam Series Controller
 */

export const getAllSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { semesterId } = req.query;
        const whereClause: any = {};

        if (semesterId) whereClause.SemesterID = semesterId;

        const seriesList = await ExamSeries.findAll({
            where: whereClause,
            order: [['ExamSeriesID', 'DESC']]
        });

        const enrichedSeries = await Promise.all(seriesList.map(async (s) => {
            const seriesPlain = s.get({ plain: true });

            // 1. Fetch internal exams and end semester exams for this series
            const internalExams = await InternalExam.findAll({
                where: { InternalExamSeriesID: s.ExamSeriesID },
                raw: true
            });

            const endSemExams = await Exam.findAll({
                where: { ExamSeriesID: s.ExamSeriesID },
                include: [{
                    model: Subject,
                    attributes: ['SubjectID', 'SubjectCode', 'SubjectName', 'SemesterID'],
                    include: [{ model: Semester, attributes: ['SemesterName'] }]
                }]
            });

            const allExams = [
                ...internalExams.map(e => ({
                    id: e.InternalExamID,
                    name: e.SubjectName || e.SubjectCode,
                    date: e.ExamDate,
                    session: (e.Session || '').toUpperCase(),
                    semester: e.Semester ? (String(e.Semester).startsWith('Sem') ? e.Semester : `Sem ${e.Semester}`) : null,
                    subjectCode: e.SubjectCode,
                    auditStatus: 'Clean',
                    conflictDetails: null,
                    type: 'Internal'
                })),
                ...endSemExams.map(e => {
                    const plainE = e.get({ plain: true }) as any;
                    const sub = plainE.Subject;
                    const semName = sub?.Semester?.SemesterName || (sub?.SemesterID ? `Sem ${sub.SemesterID}` : null);
                    return {
                        id: e.ExamID,
                        name: e.ExamName || sub?.SubjectName || sub?.SubjectCode || `Exam #${e.ExamID}`,
                        date: e.ExamDate,
                        session: (e.Session || '').toUpperCase(),
                        semester: semName,
                        subjectCode: sub?.SubjectCode || `SUBJ-${e.SubjectID}`,
                        subjectId: e.SubjectID,
                        auditStatus: (e as any).AuditStatus || 'Clean',
                        conflictDetails: (e as any).ConflictDetails || null,
                        type: 'EndSemester'
                    };
                })
            ];

            const totalExams = allExams.length;

            // 2. Conflict calculation & ConflictsList generation
            const conflictsList: Array<{
                examId: number;
                examName: string;
                subjectCode: string;
                date: string;
                session: string;
                semester: string;
                conflictType: string;
                details: string;
            }> = [];

            const slotMap = new Map<string, typeof allExams[0]>();

            for (const ex of allExams) {
                const dStr = ex.date ? (ex.date instanceof Date ? ex.date.toISOString().split('T')[0] : String(ex.date)) : 'nodate';

                // Check explicit audit flag
                if (ex.auditStatus === 'Conflict' || ex.conflictDetails) {
                    conflictsList.push({
                        examId: ex.id,
                        examName: ex.name || 'Exam',
                        subjectCode: ex.subjectCode || 'N/A',
                        date: dStr || '',
                        session: ex.session || '',
                        semester: ex.semester || 'All Semesters',
                        conflictType: 'Audit Flag',
                        details: String(ex.conflictDetails || 'Flagged during schedule conflict audit')
                    });
                    continue;
                }

                // Check duplicate slot overlap
                // For Internal: same Date + Session + SubjectCode/Semester
                // For EndSemester: same Date + Session + SubjectID (duplicate subject in same session)
                const key = ex.type === 'Internal'
                    ? `${dStr}_${ex.session}_${ex.subjectCode}_${ex.semester || 'all'}`
                    : `${dStr}_${ex.session}_${(ex as any).subjectId}`;

                if (slotMap.has(key)) {
                    const existing = slotMap.get(key)!;
                    conflictsList.push({
                        examId: ex.id,
                        examName: ex.name || 'Exam',
                        subjectCode: ex.subjectCode || 'N/A',
                        date: dStr || '',
                        session: ex.session || '',
                        semester: ex.semester || 'All Semesters',
                        conflictType: ex.type === 'Internal' ? 'Slot & Department Collision' : 'Duplicate Subject Session',
                        details: `Conflicting schedule with ${existing.name} (${existing.subjectCode}) in ${ex.session} session on ${dStr}`
                    });
                } else {
                    slotMap.set(key, ex);
                }
            }

            const conflictCount = conflictsList.length;
            const conflictFreeCount = Math.max(0, totalExams - conflictCount);

            // 3. Semester resolution
            const semesterSet = new Set<string>();
            if (s.SemesterID) {
                const semDoc = await Semester.findByPk(s.SemesterID as unknown as number);
                if (semDoc && semDoc.SemesterName) semesterSet.add(semDoc.SemesterName);
            }

            allExams.forEach(ex => {
                if (ex.semester) {
                    let semName = String(ex.semester).trim();
                    if (/^\d+$/.test(semName)) semName = `Sem ${semName}`;
                    semesterSet.add(semName);
                }
            });

            if (semesterSet.size === 0 && s.SeriesName) {
                const match = s.SeriesName.match(/\b([1-8])\s*sem\b|\bsem\s*([1-8])\b|\bs([1-8])\b/i);
                if (match) {
                    const num = match[1] || match[2] || match[3];
                    if (num) semesterSet.add(`Sem ${num}`);
                }
            }

            const semesterList = Array.from(semesterSet);
            const semesterDisplay = semesterList.length > 0 ? semesterList.join(', ') : 'All Semesters';

            return {
                ...seriesPlain,
                ExamsCount: totalExams,
                ConflictCount: conflictCount,
                ConflictFreeCount: conflictFreeCount,
                ConflictsList: conflictsList,
                Semesters: semesterList,
                SemesterDisplay: semesterDisplay
            };
        }));

        res.status(200).json({
            success: true,
            data: enrichedSeries
        });
    } catch (error: any) {
        console.error("Error fetching exam series:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch exam series",
            error: error.message
        });
    }
};

export const createSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { SeriesName, ExamType, Description } = req.body;
        const currentUser = (req as any).user;

        if (!SeriesName || !SeriesName.trim()) {
            res.status(400).json({
                success: false,
                message: "Series name is required"
            });
            return;
        }

        // Check if series with same name already exists
        const existing = await ExamSeries.findOne({ where: { SeriesName: SeriesName.trim() } });
        if (existing) {
            res.status(400).json({
                success: false,
                message: "A series with this name already exists"
            });
            return;
        }

        const result = await ExamSeries.create({
            SeriesName: SeriesName.trim(),
            ExamType: ExamType || 'Internal',
            Description: Description || `${SeriesName.trim()} series`,
            IsActive: true
        });

        // Log activity (optional - don't fail if this fails)
        try {
            if (currentUser?.UserID) {
                await ActivityLog.create({
                    UserID: currentUser.UserID,
                    Action: 'CREATE_EXAM_SERIES',
                    EntityType: 'ExamSeries',
                    EntityID: result.ExamSeriesID,
                    Details: `Created exam series: ${SeriesName.trim()}`,
                    IPAddress: req.ip || 'unknown',
                    UserAgent: req.get('user-agent') || 'unknown',
                    Severity: 'Info',
                    Status: 'Success'
                });
            }
        } catch (logError) {
            console.warn("Warning: Failed to log activity:", logError);
        }

        res.status(201).json({
            success: true,
            message: "Exam series created successfully",
            data: result
        });
    } catch (error: any) {
        console.error("Error creating exam series:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create exam series",
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

export const updateSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { seriesId } = req.params;
        const { SeriesName, ExamType, SemesterID, Description, IsActive } = req.body;
        const currentUser = (req as any).user;

        const series = await ExamSeries.findByPk(seriesId as string);
        if (!series) {
            res.status(404).json({
                success: false,
                message: "Exam series not found"
            });
            return;
        }

        await series.update({
            SeriesName: SeriesName || series.SeriesName,
            ExamType: ExamType || series.ExamType,
            SemesterID: SemesterID || series.SemesterID,
            Description: Description !== undefined ? Description : series.Description,
            IsActive: IsActive !== undefined ? IsActive : series.IsActive
        });

        // Log activity
        try {
            if (currentUser?.UserID) {
                await ActivityLog.create({
                    UserID: currentUser.UserID,
                    Action: 'UPDATE_EXAM_SERIES',
                    EntityType: 'ExamSeries',
                    EntityID: series.ExamSeriesID,
                    Details: `Updated exam series: ${series.SeriesName}`,
                    IPAddress: req.ip || 'unknown',
                    UserAgent: req.get('user-agent') || 'unknown',
                    Severity: 'Info',
                    Status: 'Success'
                });
            }
        } catch (logError) {
            console.warn("Warning: Failed to log activity:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Exam series updated successfully",
            data: series
        });
    } catch (error: any) {
        console.error("Error updating exam series:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update exam series",
            error: error.message
        });
    }
};

export const deleteSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { seriesId } = req.params;
        const currentUser = (req as any).user;

        const series = await ExamSeries.findByPk(seriesId as string);
        if (!series) {
            res.status(404).json({
                success: false,
                message: "Exam series not found"
            });
            return;
        }

        const seriesName = series.SeriesName;
        const seriesIdNum = series.ExamSeriesID;

        // Check if exams are linked
        // This is handled by DB FK constraint usually, but we can check or just attempt delete
        await series.destroy();

        // Log activity (optional - don't fail if this fails)
        try {
            if (currentUser?.UserID) {
                await ActivityLog.create({
                    UserID: currentUser.UserID,
                    Action: 'DELETE_EXAM_SERIES',
                    EntityType: 'ExamSeries',
                    EntityID: seriesIdNum,
                    Details: `Deleted exam series: ${seriesName}`,
                    IPAddress: req.ip || 'unknown',
                    UserAgent: req.get('user-agent') || 'unknown',
                    Severity: 'Info',
                    Status: 'Success'
                });
            }
        } catch (logError) {
            console.warn("Warning: Failed to log activity:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Exam series deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting exam series:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete exam series. It may be referenced by exams.",
            error: error.message
        });
    }
};
