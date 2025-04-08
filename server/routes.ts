import type { Express } from "express";
import { storage } from "./storage";
import { 
  insertBoxSchema, 
  insertActivitySchema, 
  insertQrCodeSchema,
  insertOwnerSchema,
  BoxStatus,
  BoxPosition
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<void> {
  // Add a quick-response health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  
  // Get all boxes
  app.get("/api/boxes", async (req, res) => {
    try {
      const boxes = await storage.getBoxes();
      res.json(boxes);
    } catch (error) {
      console.error("Error getting boxes:", error);
      res.status(500).json({ message: "Failed to get boxes" });
    }
  });

  // Get box by ID
  app.get("/api/boxes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid box ID" });
      }

      const box = await storage.getBox(id);
      if (!box) {
        return res.status(404).json({ message: "Box not found" });
      }

      res.json(box);
    } catch (error) {
      console.error("Error getting box:", error);
      res.status(500).json({ message: "Failed to get box" });
    }
  });

  // Create a new box
  app.post("/api/boxes", async (req, res) => {
    try {
      const boxData = insertBoxSchema.parse(req.body);
      const box = await storage.createBox(boxData);
      res.status(201).json(box);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid box data", 
          errors: error.errors 
        });
      }
      console.error("Error creating box:", error);
      res.status(500).json({ message: "Failed to create box" });
    }
  });

  // Update a box
  app.put("/api/boxes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid box ID" });
      }

      const boxData = insertBoxSchema.parse(req.body);
      const updatedBox = await storage.updateBox(id, boxData);
      
      if (!updatedBox) {
        return res.status(404).json({ message: "Box not found" });
      }

      res.json(updatedBox);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid box data", 
          errors: error.errors 
        });
      }
      console.error("Error updating box:", error);
      res.status(500).json({ message: "Failed to update box" });
    }
  });

  // Update box status
  app.patch("/api/boxes/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid box ID" });
      }

      const statusSchema = z.object({
        status: z.enum([
          BoxStatus.Packed,
          BoxStatus.Staging,
          BoxStatus.Loaded,
          BoxStatus.Out,
          BoxStatus.Delivered,
          BoxStatus.Unpacked
        ])
      });

      const { status } = statusSchema.parse(req.body);
      const updatedBox = await storage.updateBoxStatus(id, status);
      
      if (!updatedBox) {
        return res.status(404).json({ message: "Box not found" });
      }

      res.json(updatedBox);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid status data", 
          errors: error.errors 
        });
      }
      console.error("Error updating box status:", error);
      res.status(500).json({ message: "Failed to update box status" });
    }
  });

  // Update box position
  app.patch("/api/boxes/:id/position", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid box ID" });
      }

      const positionSchema = z.object({
        position: z.object({
          depth: z.enum(["front", "middle", "back"]),
          horizontal: z.enum(["left", "center", "right"]),
          vertical: z.enum(["low", "mid", "high"])
        }),
        status: z.enum([
          BoxStatus.Packed,
          BoxStatus.Staging,
          BoxStatus.Loaded,
          BoxStatus.Out,
          BoxStatus.Delivered,
          BoxStatus.Unpacked
        ]).optional()
      });

      const { position, status } = positionSchema.parse(req.body);
      const updatedBox = await storage.updateBoxPosition(id, position, status);
      
      if (!updatedBox) {
        return res.status(404).json({ message: "Box not found" });
      }

      res.json(updatedBox);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid position data", 
          errors: error.errors 
        });
      }
      console.error("Error updating box position:", error);
      res.status(500).json({ message: "Failed to update box position" });
    }
  });

  // Delete a box
  app.delete("/api/boxes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid box ID" });
      }

      const success = await storage.deleteBox(id);
      if (!success) {
        return res.status(404).json({ message: "Box not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting box:", error);
      res.status(500).json({ message: "Failed to delete box" });
    }
  });

  // Get all activities (with optional limit)
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const activities = await storage.getActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error getting activities:", error);
      res.status(500).json({ message: "Failed to get activities" });
    }
  });

  // Get activities for a specific box
  app.get("/api/boxes/:id/activities", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid box ID" });
      }

      const activities = await storage.getBoxActivities(id);
      res.json(activities);
    } catch (error) {
      console.error("Error getting box activities:", error);
      res.status(500).json({ message: "Failed to get box activities" });
    }
  });

  // Create a new activity
  app.post("/api/activities", async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid activity data", 
          errors: error.errors 
        });
      }
      console.error("Error creating activity:", error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Get QR code for a box
  app.get("/api/boxes/:id/qrcode", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid box ID" });
      }

      // Try to get existing QR code
      let qrCode = await storage.getQrCodeByBoxId(id);

      // If no QR code exists, create one
      if (!qrCode) {
        // First check if the box exists
        const box = await storage.getBox(id);
        if (!box) {
          return res.status(404).json({ message: "Box not found" });
        }

        // Create QR code data (use the pattern boxtracker-{id})
        const qrData = `boxtracker-${id}`;
        qrCode = await storage.createQrCode({
          boxId: id,
          data: qrData
        });
      }

      res.json(qrCode);
    } catch (error) {
      console.error("Error getting QR code:", error);
      res.status(500).json({ message: "Failed to get QR code" });
    }
  });
  
  // ==== Owner Routes ====
  
  // Get all owners
  app.get("/api/owners", async (req, res) => {
    try {
      const owners = await storage.getOwners();
      res.json(owners);
    } catch (error) {
      console.error("Error getting owners:", error);
      res.status(500).json({ message: "Failed to get owners" });
    }
  });
  
  // Get owner by ID
  app.get("/api/owners/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      
      const owner = await storage.getOwner(id);
      if (!owner) {
        return res.status(404).json({ message: "Owner not found" });
      }
      
      res.json(owner);
    } catch (error) {
      console.error("Error getting owner:", error);
      res.status(500).json({ message: "Failed to get owner" });
    }
  });
  
  // Create a new owner
  app.post("/api/owners", async (req, res) => {
    try {
      const ownerData = insertOwnerSchema.parse(req.body);
      const owner = await storage.createOwner(ownerData);
      res.status(201).json(owner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid owner data",
          errors: error.errors
        });
      }
      console.error("Error creating owner:", error);
      res.status(500).json({ message: "Failed to create owner" });
    }
  });
  
  // Update an owner
  app.put("/api/owners/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      
      const ownerData = insertOwnerSchema.parse(req.body);
      const updatedOwner = await storage.updateOwner(id, ownerData);
      
      if (!updatedOwner) {
        return res.status(404).json({ message: "Owner not found" });
      }
      
      res.json(updatedOwner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid owner data",
          errors: error.errors
        });
      }
      console.error("Error updating owner:", error);
      res.status(500).json({ message: "Failed to update owner" });
    }
  });
  
  // Delete an owner
  app.delete("/api/owners/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      
      const success = await storage.deleteOwner(id);
      if (!success) {
        return res.status(400).json({ 
          message: "Cannot delete owner - it may be in use by one or more boxes"
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting owner:", error);
      res.status(500).json({ message: "Failed to delete owner" });
    }
  });

  // Initialize demo data in background (non-blocking)
  if (process.env.NODE_ENV === 'development') {
    // Create a background process for data initialization
    // Using immediate function execution to avoid blocking server startup
    (async () => {
      try {
        console.log("Background data initialization started...");
        
        // Wait 5 seconds to ensure server is fully started
        setTimeout(async () => {
          try {
            // Check for existing data
            const boxes = await storage.getBoxes();
            const owners = await storage.getOwners();
            
            // No default owners or demo boxes - users will create their own
            console.log("No default owners or demo boxes will be created - users will create their own");
          } catch (error) {
            console.error("Error initializing demo data:", error);
          }
        }, 5000); // 5 second delay before initialization
      } catch (error) {
        console.error("Error in background data initialization process:", error);
      }
    })().catch(error => {
      console.error("Unhandled error in background data initialization:", error);
    });
  }

  // Create and return the HTTP server
  // In our new approach, the HTTP server is created directly in index.ts
  // No need to return anything since we're just registering routes on the app
}
