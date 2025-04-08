import { 
  Box, 
  InsertBox, 
  Activity, 
  InsertActivity,
  QrCode,
  InsertQrCode,
  BoxPosition,
  BoxStatus,
  boxes,
  activities,
  qrCodes,
  Owner,
  InsertOwner,
  owners
} from "@shared/schema";
import { db } from './db';
import { eq, desc } from 'drizzle-orm';

// Storage interface
export interface IStorage {
  // Box operations
  getBoxes(): Promise<Box[]>;
  getBox(id: number): Promise<Box | undefined>;
  getBoxByNumber(boxNumber: number): Promise<Box | undefined>;
  createBox(box: InsertBox): Promise<Box>;
  updateBox(id: number, box: Partial<InsertBox>): Promise<Box | undefined>;
  updateBoxPosition(id: number, position: BoxPosition, status?: BoxStatus): Promise<Box | undefined>;
  updateBoxStatus(id: number, status: BoxStatus): Promise<Box | undefined>;
  deleteBox(id: number): Promise<boolean>;
  
  // Activity operations
  getActivities(limit?: number): Promise<Activity[]>;
  getBoxActivities(boxId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // QR Code operations
  getQrCode(id: number): Promise<QrCode | undefined>;
  getQrCodeByBoxId(boxId: number): Promise<QrCode | undefined>;
  createQrCode(qrCode: InsertQrCode): Promise<QrCode>;
  
  // Owner operations
  getOwners(): Promise<Owner[]>;
  getOwner(id: number): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined>;
  deleteOwner(id: number): Promise<boolean>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private boxes: Map<number, Box>;
  private activities: Map<number, Activity>;
  private qrCodes: Map<number, QrCode>;
  private owners: Map<number, Owner>;
  private boxCounter: number;
  private activityCounter: number;
  private qrCodeCounter: number;
  private ownerCounter: number;

  constructor() {
    this.boxes = new Map();
    this.activities = new Map();
    this.qrCodes = new Map();
    this.owners = new Map();
    this.boxCounter = 1;
    this.activityCounter = 1;
    this.qrCodeCounter = 1;
    this.ownerCounter = 1;
    
    // No default owners - users will create their own
  }

  // Box operations
  async getBoxes(): Promise<Box[]> {
    return Array.from(this.boxes.values());
  }

  async getBox(id: number): Promise<Box | undefined> {
    return this.boxes.get(id);
  }

  async getBoxByNumber(boxNumber: number): Promise<Box | undefined> {
    return Array.from(this.boxes.values()).find(box => box.boxNumber === boxNumber);
  }

  async createBox(boxData: InsertBox): Promise<Box> {
    const id = this.boxCounter++;
    const now = new Date();
    
    // Ensure we're using the BoxStatus enum - this is critical for type safety
    let boxStatus: BoxStatus;
    if (typeof boxData.status === 'string') {
      // Convert string to BoxStatus enum
      boxStatus = boxData.status as BoxStatus;
      // Verify it's a valid enum value
      if (!Object.values(BoxStatus).includes(boxStatus)) {
        boxStatus = BoxStatus.Packed; // default fallback
      }
    } else {
      boxStatus = BoxStatus.Packed; // default fallback
    }
    
    const box: Box = {
      id,
      boxNumber: boxData.boxNumber,
      owner: boxData.owner,
      room: boxData.room,
      contents: boxData.contents,
      status: boxStatus,
      position: null,
      createdAt: now,
      updatedAt: now,
    };
    
    this.boxes.set(id, box);
    
    // Create an activity for the new box
    await this.createActivity({
      boxId: id,
      type: 'created',
      description: `Box #${box.boxNumber} created`
    });
    
    return box;
  }

  async updateBox(id: number, boxData: Partial<InsertBox>): Promise<Box | undefined> {
    const box = this.boxes.get(id);
    if (!box) return undefined;
    
    // Type safety for status if it's being updated - ensure we're using BoxStatus enum
    const typeSafeData = {
      ...(boxData.boxNumber !== undefined ? { boxNumber: boxData.boxNumber } : {}),
      ...(boxData.owner !== undefined ? { owner: boxData.owner } : {}),
      ...(boxData.room !== undefined ? { room: boxData.room } : {}),
      ...(boxData.contents !== undefined ? { contents: boxData.contents } : {}),
      ...(boxData.status !== undefined ? { status: boxData.status as BoxStatus } : {})
    };
    
    const updatedBox: Box = {
      ...box,
      ...typeSafeData,
      updatedAt: new Date()
    };
    
    this.boxes.set(id, updatedBox);
    
    // Create an activity for the update
    await this.createActivity({
      boxId: id,
      type: 'updated',
      description: `Box #${box.boxNumber} updated`
    });
    
    return updatedBox;
  }

  async updateBoxPosition(id: number, position: BoxPosition, status?: BoxStatus): Promise<Box | undefined> {
    const box = this.boxes.get(id);
    if (!box) return undefined;
    
    const updatedBox: Box = {
      ...box,
      position,
      ...(status ? { status } : {}),
      updatedAt: new Date()
    };
    
    this.boxes.set(id, updatedBox);
    
    // Create an activity
    if (status === BoxStatus.Loaded) {
      await this.createActivity({
        boxId: id,
        type: 'loaded',
        description: `Box #${box.boxNumber} loaded onto truck (${position.depth}-${position.horizontal}-${position.vertical})`
      });
    } else {
      await this.createActivity({
        boxId: id,
        type: 'moved',
        description: `Box #${box.boxNumber} moved to position ${position.depth}-${position.horizontal}-${position.vertical}`
      });
    }
    
    return updatedBox;
  }

  async updateBoxStatus(id: number, status: BoxStatus): Promise<Box | undefined> {
    const box = this.boxes.get(id);
    if (!box) return undefined;
    
    // If the box is currently loaded and we're changing status to something else,
    // clear the position
    const shouldClearPosition = box.status === BoxStatus.Loaded && status !== BoxStatus.Loaded;
    
    const updatedBox: Box = {
      ...box,
      status,
      position: shouldClearPosition ? null : box.position,
      updatedAt: new Date()
    };
    
    this.boxes.set(id, updatedBox);
    
    // Create an activity for the status change
    await this.createActivity({
      boxId: id,
      type: status.toLowerCase(),
      description: `Box #${box.boxNumber} marked as ${status}`
    });
    
    return updatedBox;
  }

  async deleteBox(id: number): Promise<boolean> {
    const box = this.boxes.get(id);
    if (!box) return false;
    
    // Delete the box
    this.boxes.delete(id);
    
    // Clean up related records
    // Remove QR codes for this box
    // Use Array.from to avoid the MapIterator issue
    Array.from(this.qrCodes.entries()).forEach(([qrId, qrCode]) => {
      if (qrCode.boxId === id) {
        this.qrCodes.delete(qrId);
      }
    });
    
    // Create an activity for the deletion
    await this.createActivity({
      boxId: id,
      type: 'deleted',
      description: `Box #${box.boxNumber} deleted`
    });
    
    return true;
  }

  // Activity operations
  async getActivities(limit?: number): Promise<Activity[]> {
    const activities = Array.from(this.activities.values());
    // Sort by timestamp, newest first
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return limit ? activities.slice(0, limit) : activities;
  }

  async getBoxActivities(boxId: number): Promise<Activity[]> {
    const activities = Array.from(this.activities.values())
      .filter(activity => activity.boxId === boxId);
    
    // Sort by timestamp, newest first
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return activities;
  }

  async createActivity(activityData: InsertActivity): Promise<Activity> {
    const id = this.activityCounter++;
    
    // Ensure boxId is null if not provided
    const boxId = activityData.boxId === undefined ? null : activityData.boxId;
    
    const activity: Activity = {
      id,
      ...activityData,
      boxId,
      timestamp: new Date()
    };
    
    this.activities.set(id, activity);
    return activity;
  }

  // QR Code operations
  async getQrCode(id: number): Promise<QrCode | undefined> {
    return this.qrCodes.get(id);
  }

  async getQrCodeByBoxId(boxId: number): Promise<QrCode | undefined> {
    return Array.from(this.qrCodes.values()).find(qrCode => qrCode.boxId === boxId);
  }

  async createQrCode(qrCodeData: InsertQrCode): Promise<QrCode> {
    const id = this.qrCodeCounter++;
    const qrCode: QrCode = {
      id,
      ...qrCodeData,
      createdAt: new Date()
    };
    
    this.qrCodes.set(id, qrCode);
    return qrCode;
  }
  
  // Owner operations
  async getOwners(): Promise<Owner[]> {
    return Array.from(this.owners.values());
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    return this.owners.get(id);
  }

  async createOwner(ownerData: InsertOwner): Promise<Owner> {
    const id = this.ownerCounter++;
    const now = new Date();
    const owner: Owner = {
      id,
      ...ownerData,
      createdAt: now,
      updatedAt: now
    };
    
    this.owners.set(id, owner);
    return owner;
  }

  async updateOwner(id: number, ownerData: Partial<InsertOwner>): Promise<Owner | undefined> {
    const owner = this.owners.get(id);
    if (!owner) return undefined;
    
    const updatedOwner: Owner = {
      ...owner,
      ...ownerData,
      updatedAt: new Date()
    };
    
    this.owners.set(id, updatedOwner);
    return updatedOwner;
  }

  async deleteOwner(id: number): Promise<boolean> {
    const owner = this.owners.get(id);
    if (!owner) return false;
    
    // Check if any boxes are using this owner
    const boxesWithOwner = Array.from(this.boxes.values())
      .filter(box => box.owner.toLowerCase() === owner.name.toLowerCase());
      
    if (boxesWithOwner.length > 0) {
      // Can't delete an owner that is being used by boxes
      return false;
    }
    
    this.owners.delete(id);
    return true;
  }
}

// Database storage implementation

export class DatabaseStorage implements IStorage {
  // Box operations
  async getBoxes(): Promise<Box[]> {
    return await db.select().from(boxes).orderBy(desc(boxes.updatedAt));
  }

  async getBox(id: number): Promise<Box | undefined> {
    const result = await db.select().from(boxes).where(eq(boxes.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getBoxByNumber(boxNumber: number): Promise<Box | undefined> {
    const result = await db.select().from(boxes).where(eq(boxes.boxNumber, boxNumber));
    return result.length > 0 ? result[0] : undefined;
  }

  async createBox(boxData: InsertBox): Promise<Box> {
    const now = new Date();
    
    // Ensure we're using the BoxStatus enum - this is critical for type safety
    let boxStatus: BoxStatus;
    if (typeof boxData.status === 'string') {
      // Convert string to BoxStatus enum
      boxStatus = boxData.status as BoxStatus;
      // Verify it's a valid enum value
      if (!Object.values(BoxStatus).includes(boxStatus)) {
        boxStatus = BoxStatus.Packed; // default fallback
      }
    } else {
      boxStatus = BoxStatus.Packed; // default fallback
    }
    
    // Create a typed object with explicit properties
    const boxValues = {
      boxNumber: boxData.boxNumber,
      owner: boxData.owner,
      room: boxData.room,
      contents: boxData.contents,
      status: boxStatus,
      position: null,
      createdAt: now,
      updatedAt: now
    };
    
    const [box] = await db.insert(boxes).values(boxValues).returning();
    
    // Create an activity for the new box
    await this.createActivity({
      boxId: box.id,
      type: 'created',
      description: `Box #${box.boxNumber} created`
    });
    
    return box;
  }

  async updateBox(id: number, boxData: Partial<InsertBox>): Promise<Box | undefined> {
    const box = await this.getBox(id);
    if (!box) return undefined;
    
    // Type safety for status if it's being updated - ensure we're using BoxStatus enum
    const typeSafeData = {
      ...(boxData.boxNumber !== undefined ? { boxNumber: boxData.boxNumber } : {}),
      ...(boxData.owner !== undefined ? { owner: boxData.owner } : {}),
      ...(boxData.room !== undefined ? { room: boxData.room } : {}),
      ...(boxData.contents !== undefined ? { contents: boxData.contents } : {}),
      ...(boxData.status !== undefined ? { status: boxData.status as BoxStatus } : {})
    };
    
    const [updatedBox] = await db.update(boxes)
      .set({
        ...typeSafeData,
        updatedAt: new Date()
      })
      .where(eq(boxes.id, id))
      .returning();
    
    // Create an activity for the update
    await this.createActivity({
      boxId: id,
      type: 'updated',
      description: `Box #${box.boxNumber} updated`
    });
    
    return updatedBox;
  }

  async updateBoxPosition(id: number, position: BoxPosition, status?: BoxStatus): Promise<Box | undefined> {
    const box = await this.getBox(id);
    if (!box) return undefined;
    
    const [updatedBox] = await db.update(boxes)
      .set({
        position,
        ...(status ? { status } : {}),
        updatedAt: new Date()
      })
      .where(eq(boxes.id, id))
      .returning();
    
    // Create an activity
    if (status === BoxStatus.Loaded) {
      await this.createActivity({
        boxId: id,
        type: 'loaded',
        description: `Box #${box.boxNumber} loaded onto truck (${position.depth}-${position.horizontal}-${position.vertical})`
      });
    } else {
      await this.createActivity({
        boxId: id,
        type: 'moved',
        description: `Box #${box.boxNumber} moved to position ${position.depth}-${position.horizontal}-${position.vertical}`
      });
    }
    
    return updatedBox;
  }

  async updateBoxStatus(id: number, status: BoxStatus): Promise<Box | undefined> {
    const box = await this.getBox(id);
    if (!box) return undefined;
    
    // If the box is currently loaded and we're changing status to something else,
    // clear the position
    const shouldClearPosition = box.status === BoxStatus.Loaded && status !== BoxStatus.Loaded;
    
    const [updatedBox] = await db.update(boxes)
      .set({
        status,
        position: shouldClearPosition ? null : box.position,
        updatedAt: new Date()
      })
      .where(eq(boxes.id, id))
      .returning();
    
    // Create an activity for the status change
    await this.createActivity({
      boxId: id,
      type: status.toLowerCase(),
      description: `Box #${box.boxNumber} marked as ${status}`
    });
    
    return updatedBox;
  }

  async deleteBox(id: number): Promise<boolean> {
    const box = await this.getBox(id);
    if (!box) return false;
    
    // Delete the box - this will cascade to related records due to foreign key constraints
    await db.delete(boxes).where(eq(boxes.id, id));
    
    // Create an activity for the deletion
    await this.createActivity({
      boxId: id,
      type: 'deleted',
      description: `Box #${box.boxNumber} deleted`
    });
    
    return true;
  }

  // Activity operations
  async getActivities(limit?: number): Promise<Activity[]> {
    const query = db.select().from(activities).orderBy(desc(activities.timestamp));
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }

  async getBoxActivities(boxId: number): Promise<Activity[]> {
    return await db.select()
      .from(activities)
      .where(eq(activities.boxId, boxId))
      .orderBy(desc(activities.timestamp));
  }

  async createActivity(activityData: InsertActivity): Promise<Activity> {
    // Ensure boxId is null if not provided
    const boxId = activityData.boxId === undefined ? null : activityData.boxId;
    
    const [activity] = await db.insert(activities)
      .values({
        ...activityData,
        boxId,
        timestamp: new Date()
      })
      .returning();
    
    return activity;
  }

  // QR Code operations
  async getQrCode(id: number): Promise<QrCode | undefined> {
    const result = await db.select().from(qrCodes).where(eq(qrCodes.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getQrCodeByBoxId(boxId: number): Promise<QrCode | undefined> {
    const result = await db.select().from(qrCodes).where(eq(qrCodes.boxId, boxId));
    return result.length > 0 ? result[0] : undefined;
  }

  async createQrCode(qrCodeData: InsertQrCode): Promise<QrCode> {
    const [qrCode] = await db.insert(qrCodes)
      .values({
        ...qrCodeData,
        createdAt: new Date()
      })
      .returning();
    
    return qrCode;
  }
  
  // Owner operations
  async getOwners(): Promise<Owner[]> {
    return await db.select().from(owners).orderBy(desc(owners.updatedAt));
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    const result = await db.select().from(owners).where(eq(owners.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async createOwner(ownerData: InsertOwner): Promise<Owner> {
    const now = new Date();
    const [owner] = await db.insert(owners)
      .values({
        ...ownerData,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    return owner;
  }

  async updateOwner(id: number, ownerData: Partial<InsertOwner>): Promise<Owner | undefined> {
    const owner = await this.getOwner(id);
    if (!owner) return undefined;
    
    const [updatedOwner] = await db.update(owners)
      .set({
        ...ownerData,
        updatedAt: new Date()
      })
      .where(eq(owners.id, id))
      .returning();
    
    return updatedOwner;
  }

  async deleteOwner(id: number): Promise<boolean> {
    const owner = await this.getOwner(id);
    if (!owner) return false;
    
    // Check if any boxes are using this owner
    const boxesWithOwner = await db.select()
      .from(boxes)
      .where(eq(boxes.owner, owner.name));
      
    if (boxesWithOwner.length > 0) {
      // Can't delete an owner that is being used by boxes
      return false;
    }
    
    await db.delete(owners).where(eq(owners.id, id));
    return true;
  }
}

// Create and export a single instance for the app to use
// Switch to database storage now that connection issues are resolved
export const storage = new DatabaseStorage();
