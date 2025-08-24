import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../utils/db';
import { boards, userOrganizations, lists } from '../db/schema';

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
}

export class BoardService {
  async create(data: {
    name: string;
    description?: string;
    organizationId: string;
    userId: string;
  }): Promise<Board> {
    console.log('🎯 Creating board:', data.name);

    // Verify user has access to the organization
    const userOrg = await db.select()
      .from(userOrganizations)
      .where(and(
        eq(userOrganizations.organizationId, data.organizationId),
        eq(userOrganizations.userId, data.userId)
      ))
      .limit(1);

    if (userOrg.length === 0) {
      throw new Error('Access denied to this organization');
    }

    // Create board
    const newBoard = await db.insert(boards).values({
      name: data.name,
      description: data.description || null,
      organizationId: data.organizationId,
      createdBy: data.userId,
    }).returning();

    if (!newBoard[0]) {
      throw new Error('Failed to create board');
    }

    const board = newBoard[0];
    console.log('✅ Board created:', board.id);

    // Create default lists
    const defaultLists = [
      { name: 'To Do', position: 1 },
      { name: 'In Progress', position: 2 },
      { name: 'Done', position: 3 },
    ];

    for (const list of defaultLists) {
      await db.insert(lists).values({
        name: list.name,
        position: list.position,
        boardId: board.id,
      });
    }

    console.log('✅ Default lists created for board');

    return {
      id: board.id,
      name: board.name,
      description: board.description,
      organizationId: board.organizationId,
      createdBy: board.createdBy,
      createdAt: board.createdAt!,
      updatedAt: board.updatedAt!,
      archivedAt: board.archivedAt,
    };
  }

  async getByOrganization(organizationId: string, userId: string): Promise<Board[]> {
    // Verify user has access to the organization
    const userOrg = await db.select()
      .from(userOrganizations)
      .where(and(
        eq(userOrganizations.organizationId, organizationId),
        eq(userOrganizations.userId, userId)
      ))
      .limit(1);

    if (userOrg.length === 0) {
      return [];
    }

    // Get non-archived boards
    const boardList = await db.select()
      .from(boards)
      .where(and(
        eq(boards.organizationId, organizationId),
        isNull(boards.archivedAt)
      ));

    return boardList.map(board => ({
      id: board.id,
      name: board.name,
      description: board.description,
      organizationId: board.organizationId,
      createdBy: board.createdBy,
      createdAt: board.createdAt!,
      updatedAt: board.updatedAt!,
      archivedAt: board.archivedAt,
    }));
  }

  async getById(boardId: string, userId: string): Promise<Board | null> {
    // Get board and verify access through organization
    const result = await db.select({
      id: boards.id,
      name: boards.name,
      description: boards.description,
      organizationId: boards.organizationId,
      createdBy: boards.createdBy,
      createdAt: boards.createdAt,
      updatedAt: boards.updatedAt,
      archivedAt: boards.archivedAt,
    })
      .from(boards)
      .innerJoin(userOrganizations, eq(userOrganizations.organizationId, boards.organizationId))
      .where(and(
        eq(boards.id, boardId),
        eq(userOrganizations.userId, userId),
        isNull(boards.archivedAt)
      ))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const board = result[0]!;
    return {
      id: board.id,
      name: board.name,
      description: board.description,
      organizationId: board.organizationId,
      createdBy: board.createdBy,
      createdAt: board.createdAt!,
      updatedAt: board.updatedAt!,
      archivedAt: board.archivedAt,
    };
  }

  async update(boardId: string, userId: string, data: { name: string; description?: string }): Promise<Board> {
    console.log('📝 Updating board:', boardId);

    // Verify user has access and get current board
    const board = await this.getById(boardId, userId);
    if (!board) {
      throw new Error('Board not found or access denied');
    }

    // Update board
    const updatedBoard = await db.update(boards)
      .set({ 
        name: data.name,
        description: data.description || null,
        updatedAt: new Date()
      })
      .where(eq(boards.id, boardId))
      .returning();

    if (!updatedBoard[0]) {
      throw new Error('Failed to update board');
    }

    const updated = updatedBoard[0];
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      organizationId: updated.organizationId,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt!,
      updatedAt: updated.updatedAt!,
      archivedAt: updated.archivedAt,
    };
  }

  async archive(boardId: string, userId: string): Promise<void> {
    console.log('🗄️ Archiving board:', boardId);

    // Verify user has access
    const board = await this.getById(boardId, userId);
    if (!board) {
      throw new Error('Board not found or access denied');
    }

    // Archive board
    await db.update(boards)
      .set({ 
        archivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(boards.id, boardId));

    console.log('✅ Board archived');
  }
}

export const boardService = new BoardService();