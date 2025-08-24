import { eq, and, asc } from 'drizzle-orm';
import { db } from '../utils/db';
import { lists, boards, userOrganizations, organizations } from '../db/schema';

export interface List {
  id: string;
  name: string;
  position: number;
  boardId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ListService {
  async getByBoard(boardId: string, userId: string): Promise<List[]> {
    // Verify user has access to the board through organization
    const result = await db.select({
      id: lists.id,
      name: lists.name,
      position: lists.position,
      boardId: lists.boardId,
      createdAt: lists.createdAt,
      updatedAt: lists.updatedAt,
    })
      .from(lists)
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(lists.boardId, boardId),
        eq(userOrganizations.userId, userId)
      ))
      .orderBy(asc(lists.position));

    return result.map(list => ({
      id: list.id,
      name: list.name,
      position: list.position,
      boardId: list.boardId,
      createdAt: list.createdAt!,
      updatedAt: list.updatedAt!,
    }));
  }

  async create(data: {
    name: string;
    boardId: string;
    userId: string;
    position?: number;
  }): Promise<List> {
    console.log('📝 Creating list:', data.name, 'for board:', data.boardId);

    // Verify user has access to the board
    const boardAccess = await db.select()
      .from(boards)
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(boards.id, data.boardId),
        eq(userOrganizations.userId, data.userId)
      ))
      .limit(1);

    if (boardAccess.length === 0) {
      throw new Error('Access denied to this board');
    }

    // If no position provided, get next position
    let position = data.position;
    if (!position) {
      const lastList = await db.select({ position: lists.position })
        .from(lists)
        .where(eq(lists.boardId, data.boardId))
        .orderBy(asc(lists.position))
        .limit(1);
      
      position = lastList.length > 0 ? lastList[0]!.position + 1 : 1;
    }

    // Create list
    const newList = await db.insert(lists).values({
      name: data.name,
      boardId: data.boardId,
      position: position,
    }).returning();

    if (!newList[0]) {
      throw new Error('Failed to create list');
    }

    const list = newList[0];
    console.log('✅ List created:', list.id);

    return {
      id: list.id,
      name: list.name,
      position: list.position,
      boardId: list.boardId,
      createdAt: list.createdAt!,
      updatedAt: list.updatedAt!,
    };
  }

  async update(listId: string, userId: string, data: { name: string }): Promise<List> {
    console.log('📝 Updating list:', listId);

    // Verify user has access to the list through board/organization
    const access = await db.select()
      .from(lists)
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(lists.id, listId),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    if (access.length === 0) {
      throw new Error('List not found or access denied');
    }

    // Update list
    const updatedList = await db.update(lists)
      .set({ 
        name: data.name,
        updatedAt: new Date()
      })
      .where(eq(lists.id, listId))
      .returning();

    if (!updatedList[0]) {
      throw new Error('Failed to update list');
    }

    const updated = updatedList[0];
    return {
      id: updated.id,
      name: updated.name,
      position: updated.position,
      boardId: updated.boardId,
      createdAt: updated.createdAt!,
      updatedAt: updated.updatedAt!,
    };
  }

  async updatePosition(listId: string, userId: string, newPosition: number): Promise<void> {
    console.log('🔄 Moving list:', listId, 'to position:', newPosition);

    // Verify access
    const access = await db.select()
      .from(lists)
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(lists.id, listId),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    if (access.length === 0) {
      throw new Error('List not found or access denied');
    }

    // Update position
    await db.update(lists)
      .set({ 
        position: newPosition,
        updatedAt: new Date()
      })
      .where(eq(lists.id, listId));

    console.log('✅ List position updated');
  }

  async delete(listId: string, userId: string): Promise<void> {
    console.log('🗑️ Deleting list:', listId);

    // Verify access
    const access = await db.select()
      .from(lists)
      .innerJoin(boards, eq(boards.id, lists.boardId))
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(lists.id, listId),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    if (access.length === 0) {
      throw new Error('List not found or access denied');
    }

    // TODO: Handle cards in this list (move to another list or delete)
    
    // Delete list
    await db.delete(lists).where(eq(lists.id, listId));

    console.log('✅ List deleted');
  }

  async getBoardInfo(boardId: string): Promise<{ organizationSlug: string } | null> {
    const result = await db.select({
      organizationSlug: organizations.slug,
    })
      .from(boards)
      .innerJoin(organizations, eq(organizations.id, boards.organizationId))
      .where(eq(boards.id, boardId))
      .limit(1);

    return result.length > 0 ? result[0]! : null;
  }
}

export const listService = new ListService();