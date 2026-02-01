import { Request, Response } from "express";
import { Faculty } from "../models/Faculty.js";

// Create Single Faculty
export const createFaculty = async (req: Request, res: Response): Promise<any> => {
    try {
        const { Name, Designation, ProfileImageURL, DepartmentID, isEligible } = req.body;

        if (!Name || !DepartmentID) {
            return res.status(400).json({ message: "Name and DepartmentID are required" });
        }

        const faculty = await Faculty.create({
            Name,
            Designation,
            ProfileImageURL,
            DepartmentID,
            isEligible: isEligible !== undefined ? isEligible : true
        });

        return res.status(201).json({ message: "Faculty created successfully", faculty });
    } catch (error) {
        console.error("Error creating faculty:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Import Multiple Faculties
export const importFaculties = async (req: Request, res: Response): Promise<any> => {
    try {
        const { faculties } = req.body;

        if (!faculties || !Array.isArray(faculties)) {
            return res.status(400).json({ message: "An array of faculties is required" });
        }

        // Bulk create
        const createdFaculties = await Faculty.bulkCreate(faculties);

        return res.status(201).json({
            message: `Successfully imported ${createdFaculties.length} faculties`,
            count: createdFaculties.length
        });
    } catch (error) {
        console.error("Error importing faculties:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Upload Faculty Image
export const uploadFacultyImage = async (req: Request, res: Response): Promise<any> => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Return the path that can be served statically
        const imageUrl = `${req.protocol}://${req.get("host")}/uploads/faculty/${req.file.filename}`;

        return res.json({
            message: "Image uploaded successfully",
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error("Error uploading image:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Update Faculty (including eligibility toggle)
export const updateFaculty = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { Name, Designation, ProfileImageURL, isEligible } = req.body;

        const faculty = await Faculty.findByPk(id as string);
        if (!faculty) {
            return res.status(404).json({ message: "Faculty not found" });
        }

        // Update fields if provided
        if (Name !== undefined) faculty.Name = Name;
        if (Designation !== undefined) faculty.Designation = Designation;
        if (ProfileImageURL !== undefined) faculty.ProfileImageURL = ProfileImageURL;
        if (isEligible !== undefined) faculty.isEligible = isEligible;

        await faculty.save();

        return res.json({ message: "Faculty updated successfully", faculty });
    } catch (error) {
        console.error("Error updating faculty:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Delete Faculty
export const deleteFaculty = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const faculty = await Faculty.findByPk(id as string);

        if (!faculty) {
            return res.status(404).json({ message: "Faculty not found" });
        }

        await faculty.destroy();
        return res.json({ message: "Faculty deleted successfully" });
    } catch (error) {
        console.error("Error deleting faculty:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
