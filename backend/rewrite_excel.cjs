const fs = require('fs');
const file = 'src/controllers/seating.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const startIndex = code.indexOf('export const exportSeatingToExcel = async (req: Request, res: Response) => {');
if (startIndex === -1) throw new Error('Not found');

let depth = 0;
let endIndex = -1;
for (let i = startIndex + 'export const exportSeatingToExcel = async (req: Request, res: Response) => {'.length - 1; i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}') {
        depth--;
        if (depth === 0) {
            endIndex = i + 1;
            break;
        }
    }
}

if (endIndex === -1) throw new Error('End not found');

const newFunc = `export const exportSeatingToExcel = async (req: Request, res: Response) => {
    try {
        const { examDate, session } = req.query;

        if (!examDate || !session) {
            return res.status(400).json({ message: "examDate and session are required" });
        }

        const examIds = await resolveExamIds(String(examDate), String(session));
        if (examIds.length === 0) {
            return res.status(400).json({ message: "No exams found for this date and session" });
        }

        const allocations = await SeatAllocation.findAll({
            attributes: ["SeatID", "StudentID"],
            include: [
                { model: Seat, attributes: ["SeatID", "RoomID", "RowIndex", "BenchIndex", "SeatIndex"] },
                { model: Student, attributes: ["StudentID", "RegisterNumber", "DepartmentID"] },
            ],
            where: { ExamID: { [Op.in]: examIds } },
            raw: false,
        } as any);

        if (allocations.length === 0) {
            return res.status(400).json({ message: "No seating allocations found for this date and session" });
        }

        // Fetch subject codes
        const studentIds = [...new Set((allocations as any[]).map(a => Number(a.StudentID)))];
        const regsWithSubject = await sequelize.query<any>(\`
            SELECT er.StudentID, s.SubjectCode, s.SubjectName
            FROM   ExamRegistrations er
            INNER JOIN Exams e ON e.ExamID = er.ExamID
            INNER JOIN Subjects s ON s.SubjectID = e.SubjectID
            WHERE  er.StudentID IN (:studentIds) AND er.ExamID IN (:examIds)
        \`, {
            type: QueryTypes.SELECT,
            replacements: { studentIds, examIds },
        });

        const subjectByStudent = new Map<number, string>();
        for (const r of regsWithSubject) subjectByStudent.set(Number(r.StudentID), r.SubjectCode);

        const hallMap = new Map<number, any[]>();
        for (const alloc of allocations) {
            const roomId = Number((alloc as any).Seat?.RoomID);
            if (!Number.isFinite(roomId) || roomId <= 0) continue;
            if (!hallMap.has(roomId)) hallMap.set(roomId, []);
            hallMap.get(roomId)!.push(alloc);
        }

        const wb = XLSX.utils.book_new();
        const borderStyle: any = {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" }
        };
        const centerAlign: any = { horizontal: "center", vertical: "center" };
        const titleStyle: any = { font: { bold: true, size: 14 }, alignment: centerAlign, border: borderStyle };
        const subtitleStyle: any = { font: { bold: true, size: 11 }, alignment: centerAlign, border: borderStyle };
        const seatHeaderStyle: any = { font: { bold: true, size: 11 }, alignment: centerAlign, fill: { patternType: "solid", fgColor: { rgb: "E5E7EB" } }, border: borderStyle };
        const bodyStyleBase: any = { alignment: centerAlign, border: borderStyle, font: { size: 10 } };
        const summaryStyle: any = { font: { bold: true, size: 11 }, alignment: centerAlign, border: borderStyle };

        const normalizeSeatSide = (seatIndexRaw: number): "A" | "B" => {
            if (seatIndexRaw === 0 || seatIndexRaw <= 0) return "A";
            return "B";
        };

        for (const [roomId, hallAllocs] of hallMap) {
            const hall = await Room.findByPk(roomId);
            if (!hall) continue;

            const roomSeats = await Seat.findAll({
                where: { RoomID: roomId, IsActive: true } as any,
                attributes: ["SeatID", "RowIndex", "BenchIndex", "SeatIndex"],
                raw: true,
            }) as any[];

            const rowBenchSlots = new Map<string, Map<number, { A: boolean; B: boolean }>>();
            for (const s of roomSeats) {
                const rowIndex = String(s.RowIndex ?? "").trim();
                const benchIndex = Number(s.BenchIndex);
                if (!rowIndex || !Number.isFinite(benchIndex) || benchIndex <= 0) continue;
                if (!rowBenchSlots.has(rowIndex)) rowBenchSlots.set(rowIndex, new Map());
                const benchMap = rowBenchSlots.get(rowIndex)!;
                if (!benchMap.has(benchIndex)) benchMap.set(benchIndex, { A: false, B: false });
                const side = normalizeSeatSide(Number(s.SeatIndex));
                if (side === "A") benchMap.get(benchIndex)!.A = true;
                else benchMap.get(benchIndex)!.B = true;
            }

            const rowKeys = Array.from(rowBenchSlots.keys()).sort();
            const benchIndexes = Array.from(new Set(Array.from(rowBenchSlots.values()).flatMap((m) => Array.from(m.keys())))).sort((a, b) => a - b);
            const outputCols = Math.max(rowKeys.length, 1);

            // Populate exact assignments from DB
            const seatingGrid = new Map<string, Map<number, { A: string; A_Subj: string; B: string; B_Subj: string }>>();
            for (const rowKey of rowKeys) seatingGrid.set(rowKey, new Map());
            
            const studentCounts = new Map<string, number>();
            const roomSubjectsSet = new Set<string>();

            for (const alloc of hallAllocs) {
                const seat = (alloc as any).Seat;
                const student = (alloc as any).Student;
                if (!seat || !student) continue;

                const rowKey = String(seat.RowIndex).trim();
                const benchIdx = Number(seat.BenchIndex);
                const side = normalizeSeatSide(Number(seat.SeatIndex));
                
                const regNo = String(student.RegisterNumber || "");
                const subjCode = subjectByStudent.get(Number(student.StudentID)) || "NA";
                
                studentCounts.set(subjCode, (studentCounts.get(subjCode) || 0) + 1);
                if (subjCode !== "NA") roomSubjectsSet.add(subjCode);

                if (!seatingGrid.has(rowKey)) seatingGrid.set(rowKey, new Map());
                const rowMap = seatingGrid.get(rowKey)!;
                if (!rowMap.has(benchIdx)) rowMap.set(benchIdx, { A: "", A_Subj: "", B: "", B_Subj: "" });
                
                const cell = rowMap.get(benchIdx)!;
                if (side === "A") { cell.A = regNo; cell.A_Subj = subjCode; }
                else { cell.B = regNo; cell.B_Subj = subjCode; }
            }

            const roomSubjectTitle = Array.from(roomSubjectsSet).join(' / ') || 'Exam';

            const wsData: any[][] = [];
            wsData.push(["ST. JOSEPH'S COLLEGE OF ENGINEERING & TECHNOLOGY, PALAI (Autonomous)"]);
            wsData.push([roomSubjectTitle]);
            wsData.push([\`SEATING ARRANGEMENT - \${examDate} (\${session === "FN" ? "Forenoon" : "Afternoon"})\`]);
            wsData.push([\`Room: \${String((hall as any).RoomCode || "Hall_" + roomId)}\`]);
            
            wsData.push(rowKeys);

            // Print Subjects below the column header
            const subjRow: string[] = [];
            for (const rowKey of rowKeys) {
                const rowGrid = seatingGrid.get(rowKey);
                const colSubjects = new Set<string>();
                if (rowGrid) {
                    for (const bench of rowGrid.values()) {
                        if (bench.A_Subj) colSubjects.add(bench.A_Subj);
                        if (bench.B_Subj) colSubjects.add(bench.B_Subj);
                    }
                }
                subjRow.push(Array.from(colSubjects).join('/') || "NA");
            }
            wsData.push(subjRow);

            // Seat grids
            for (const benchIndex of benchIndexes) {
                const rowA: string[] = [];
                const rowB: string[] = [];
                for (const rowKey of rowKeys) {
                    const seat = seatingGrid.get(rowKey)?.get(benchIndex);
                    rowA.push(seat?.A || "EMPTY");
                    rowB.push(seat?.B || "EMPTY");
                }
                if (rowA.some(x => x !== "EMPTY")) wsData.push(rowA);
                if (rowB.some(x => x !== "EMPTY")) wsData.push(rowB);
            }

            wsData.push([]);
            wsData.push(["Number of Students:"]);
            const sortedSubjects = Array.from(studentCounts.keys()).sort();
            for (const code of sortedSubjects) wsData.push([code, studentCounts.get(code) || 0]);
            wsData.push([]);
            wsData.push(["Total number of students", Array.from(studentCounts.values()).reduce((s, n) => s + n, 0)]);

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws["!cols"] = Array(outputCols).fill({ wch: 20 });
            ws["!merges"] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: outputCols - 1 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: outputCols - 1 } },
                { s: { r: 2, c: 0 }, e: { r: 2, c: outputCols - 1 } },
                { s: { r: 3, c: 0 }, e: { r: 3, c: outputCols - 1 } },
            ];

            const seatHeaderRow = 4;
            const subjHeaderRow = 5;
            const dataStart = 6;
            let dataEnd = dataStart;
            while (wsData[dataEnd] && wsData[dataEnd].length > 0 && wsData[dataEnd][0] !== "") dataEnd++;
            dataEnd -= 1;

            for (let r = 0; r < wsData.length; r++) {
                for (let c = 0; c < outputCols; c++) {
                    const ref = XLSX.utils.encode_cell({ r, c });
                    if (!ws[ref]) ws[ref] = { t: "s", v: "" };

                    if (r === 0) ws[ref].s = titleStyle;
                    else if (r === 1 || r === 2) ws[ref].s = subtitleStyle;
                    else if (r === 3) ws[ref].s = titleStyle;
                    else if (r === seatHeaderRow) ws[ref].s = seatHeaderStyle;
                    else if (r === subjHeaderRow) ws[ref].s = seatHeaderStyle;
                    else if (r >= dataStart && r <= dataEnd) {
                        const cellVal = wsData[r][c];
                        ws[ref].s = { ...bodyStyleBase, fill: cellVal === "EMPTY" ? { patternType: "solid", fgColor: { rgb: "F3F4F6" } } : undefined, font: { size: 10, color: cellVal === "EMPTY" ? { rgb: "9CA3AF" } : { rgb: "000000" } } };
                    } else {
                        if (c === 0 || c === 1) ws[ref].s = summaryStyle;
                        else ws[ref].s = { alignment: centerAlign };
                    }
                }
            }

            let sName = String((hall as any).RoomCode || "Hall_" + roomId).replace(/[\\\\/?*[\\]]/g, "_").substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sName);
        }

        if (wb.SheetNames.length === 0) return res.status(400).json({ message: "No layout data generated" });

        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
        res.setHeader("Content-Disposition", \`attachment; filename="Seating_\${examDate}_\${session}.xlsx"\`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.end(buffer);
    } catch (error: any) {
        console.error("EXPORT ERROR:", error);
        res.status(500).json({ message: "Error generating Excel file", error: error.message });
    }
};`;

code = code.substring(0, startIndex) + newFunc + code.substring(endIndex);
fs.writeFileSync(file, code, 'utf8');
